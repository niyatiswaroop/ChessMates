# ChessMates

Real-time multiplayer chess. Start a game, send the link to a friend, and play
from two browsers with moves, clocks and results kept in sync over WebSockets.

**Stack:** Node.js, Express, Socket.IO, chess.js, MySQL, Docker Compose.
The front end is plain HTML, CSS and JavaScript with chessboard.js.

## Running it

You need Docker Desktop.

```bash
docker compose up -d
```

Open http://localhost:3000, sign up, press **Play Now**, and open the invite
link in a second browser (or a private window) signed in as another user.

- `docker compose logs -f web` shows the server log.
- `docker compose down` stops everything; your data is kept.
- `docker compose down -v` also deletes the database.

In this setup the server restarts automatically when you edit a file under
`server/`. Changes under `public/` only need a browser refresh.

## How it works

```
browser (game.js) ── Socket.IO ──> server/index.js ──> GameManager ──> GameRoom (rules, turns, clocks)
                                                           │
                                                           └──> GameStore ──> MySQL
```

- **Server-side rules.** `server/game-room.js` holds one game. It seats the
  players, enforces turn order, validates every move with chess.js, runs the
  clocks, and detects checkmate, stalemate, draws, timeouts and resignation.
  The browser loads the same chess.js file (served at `/vendor/chess.js`) only
  to snap illegal drags back instantly; the server still decides every move.
- **Game rooms.** `server/game-manager.js` keeps every active game in memory,
  each in its own Socket.IO room, so many games run at once without seeing
  each other's updates. It loads a game from MySQL on first use (for example
  after a restart) and ends games on the server when a clock runs out, even if
  nobody moves.
- **Real-time sync.** After any change the server sends the full game state to
  everyone in that game's room: both players and any spectators. A player who
  reconnects gets their seat and the full position back.
- **Persistence.** Every move, the current position, both clocks and the
  result are saved in MySQL (`server/game-store.js`).
- **Accounts.** Sign-up and sign-in with bcrypt-hashed passwords; sessions
  are stored in MySQL and shared with Socket.IO, so only signed-in players can
  connect.

### Socket.IO events

| Client sends | Payload | Reply |
| --- | --- | --- |
| `join` | game ID | `{ ok, color: 'w' \| 'b' \| null, state }` (`null` means you're watching) |
| `move` | `{ from, to, promotion? }` | `{ ok }`, or `{ ok: false, error, state }` |
| `resign` | | `{ ok }` or `{ ok: false, error }` |

The server sends `state` to everyone in the game after each change.

### HTTP routes

| Route | |
| --- | --- |
| `POST /signup`, `POST /signin`, `GET /logout` | Account forms |
| `GET /api/me` | Signed-in username |
| `POST /api/games` | Create a game; you get a random colour |
| `GET /api/games` | Your 10 most recent games |
| `GET/POST /api/reviews` | Landing-page reviews (`data/reviews.json`) |
| `/game/<id>` | Game page; the invite link |

## Project layout

```
server/       Express + Socket.IO server, game logic, MySQL access
public/       Pages: landing, signin, signup, welcome (lobby), game
test/         Unit tests and end-to-end multiplayer tests
data/         reviews.json
```

The database tables are created and upgraded automatically on start-up
(`server/schema.sql` and `server/db.js`), including databases from the old
PHP version of this project.

## Tests

```bash
npm install
npm test                                   # rules, clocks, game manager
E2E_URL=http://localhost:3000 npm test     # plus multiplayer tests against the running server
```

The end-to-end tests sign up throwaway users named `e2e_...` in whichever
database the server uses.

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `PORT` | `3000` | |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | `localhost`, `3306`, `root`, empty, `chess` | |
| `SESSION_SECRET` | random | Set it, or everyone is signed out when the server restarts |
