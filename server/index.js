const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { Server } = require('socket.io');

const { pool, migrate, waitForDatabase } = require('./db');
const { GameStore } = require('./game-store');
const { GameManager } = require('./game-manager');
const auth = require('./auth');
const reviews = require('./reviews');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

async function start() {
  await waitForDatabase();
  await migrate();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    console.warn('SESSION_SECRET is not set; everyone will be signed out when the server restarts.');
  }
  const sessionMiddleware = session({
    name: 'chessmates.sid',
    secret,
    store: new MySQLStore({}, pool),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
  });

  const games = new GameManager({
    store: new GameStore(pool),
    onChange: (room) => io.to(roomKey(room.id)).emit('state', room.state()),
  });

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(sessionMiddleware);

  // ---- Pages ----
  app.get('/', (req, res) => res.redirect(req.session.username ? '/welcome/' : '/landing/'));
  app.get(['/welcome', '/welcome/'], auth.requireLogin, (req, res) =>
    res.sendFile(path.join(PUBLIC_DIR, 'welcome', 'index.html'))
  );
  // Only real game IDs, so /game/game.js and /game/game.css still reach the static files
  app.get('/game/:id', (req, res, next) => (/^[0-9a-f]{32}$/.test(req.params.id) ? next() : next('route')),
    auth.requireLogin,
    (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'game', 'index.html'))
  );
  // The browser uses the exact chess.js the server validates with
  app.get('/vendor/chess.js', (req, res) =>
    res.sendFile(require.resolve('chess.js/chess.js'))
  );
  app.use(express.static(PUBLIC_DIR));

  // ---- Accounts ----
  app.post('/signup', auth.signup);
  app.post('/signin', auth.signin);
  app.get('/logout', auth.logout);
  app.get('/api/me', (req, res) =>
    req.session.username ? res.json({ username: req.session.username }) : res.status(401).json({})
  );

  // ---- Games ----
  app.post('/api/games', auth.requireLoginApi, async (req, res, next) => {
    try {
      const room = await games.create(req.session.username);
      res.status(201).json({ id: room.id, url: `/game/${room.id}` });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/games', auth.requireLoginApi, async (req, res, next) => {
    try {
      const me = req.session.username;
      const rows = await games.store.historyFor(me);
      res.json(
        rows.map((g) => ({
          id: g.id,
          white: g.player_white,
          black: g.player_black,
          opponent: (g.player_white === me ? g.player_black : g.player_white) || null,
          status: g.status,
          winner: g.winner,
          endReason: g.end_reason,
          createdAt: g.created_at,
          result:
            g.status === 'finished'
              ? g.winner === 'draw'
                ? 'draw'
                : g.winner === me
                  ? 'won'
                  : 'lost'
              : g.status, // waiting | active | aborted
        }))
      );
    } catch (err) {
      next(err);
    }
  });

  // ---- Reviews on the landing page ----
  app.get('/api/reviews', reviews.list);
  app.post('/api/reviews', reviews.add);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  });

  // ---- Real-time games ----
  io.engine.use(sessionMiddleware);
  io.use((socket, next) => {
    const username = socket.request.session?.username;
    if (!username) return next(new Error('Not signed in'));
    socket.data.username = username;
    next();
  });

  io.on('connection', (socket) => {
    const { username } = socket.data;

    // Every handler answers through the acknowledgement callback; on an error
    // it also returns the real game state so the browser can undo its preview.
    const handle = (fn) => async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        reply(await fn(payload));
      } catch (err) {
        console.error(err);
        reply({ ok: false, error: 'Server error' });
      }
    };

    const currentRoom = async () => {
      const room = socket.data.gameId && (await games.get(socket.data.gameId));
      if (!room) throw new Error('Socket has not joined a game');
      return room;
    };

    socket.on(
      'join',
      handle(async (gameId) => {
        const room = await games.get(gameId);
        if (!room) return { ok: false, error: 'Game not found' };
        if (socket.data.gameId) socket.leave(roomKey(socket.data.gameId));
        socket.data.gameId = room.id;
        socket.join(roomKey(room.id));
        const { color } = await games.join(room, username);
        return { ok: true, color, state: room.state() };
      })
    );

    socket.on(
      'move',
      handle(async (move) => {
        const room = await currentRoom();
        const result = await games.move(room, username, move);
        return result.ok ? { ok: true } : { ok: false, error: result.error, state: room.state() };
      })
    );

    socket.on(
      'resign',
      handle(async () => {
        const room = await currentRoom();
        const result = await games.resign(room, username);
        return result.ok ? { ok: true } : { ok: false, error: result.error };
      })
    );
  });

  server.listen(PORT, () => console.log(`ChessMates running on http://localhost:${PORT}`));

  const shutdown = () => {
    games.shutdown();
    io.close();
    server.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

function roomKey(gameId) {
  return `game:${gameId}`;
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
