// End-to-end test against a running server (docker compose up), using real
// accounts, sessions and Socket.IO connections. Skipped unless E2E_URL is set:
//   E2E_URL=http://localhost:8080 npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { io } = require('socket.io-client');

const BASE = process.env.E2E_URL;
const run = BASE ? test : test.skip;
const sockets = [];

// Signs up a fresh user and returns their session cookie
async function newUser(prefix) {
  const username = `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
  const response = await fetch(`${BASE}/signup`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username,
      email: `${username}@example.com`,
      password: 'secret123',
      confirmPassword: 'secret123',
    }),
  });
  assert.equal(response.headers.get('location'), '/welcome/', 'sign-up should succeed');
  const cookie = response.headers.get('set-cookie').split(';')[0];
  return { username, cookie };
}

async function createGame(user) {
  const response = await fetch(`${BASE}/api/games`, { method: 'POST', headers: { cookie: user.cookie } });
  assert.equal(response.status, 201);
  return (await response.json()).id;
}

// Connects a user and records every 'state' broadcast they receive
function connect(user) {
  const socket = io(BASE, { extraHeaders: { cookie: user.cookie }, transports: ['websocket'] });
  socket.states = [];
  socket.on('state', (s) => socket.states.push(s));
  sockets.push(socket);
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

const emit = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

// Waits until a socket has received a state matching the check
async function waitForState(socket, check, timeout = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = socket.states.find(check);
    if (found) return found;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('Timed out waiting for state');
}

test.after(() => sockets.forEach((s) => s.close()));

run('two players play a synchronized game', async () => {
  const alice = await newUser('e2e');
  const bob = await newUser('e2e');
  const gameId = await createGame(alice);

  const a = await connect(alice);
  const joinA = await emit(a, 'join', gameId);
  assert.ok(joinA.ok);
  assert.equal(joinA.state.status, 'waiting');

  const b = await connect(bob);
  const joinB = await emit(b, 'join', gameId);
  assert.ok(joinB.ok);
  assert.notEqual(joinB.color, joinA.color, 'players get opposite colours');
  assert.equal(joinB.state.status, 'active');

  // Alice is told the game started as soon as Bob joined
  await waitForState(a, (s) => s.status === 'active' && s.white && s.black);

  const [white, black] = joinA.color === 'w' ? [a, b] : [b, a];

  // Out-of-turn and illegal moves are refused by the server
  assert.equal((await emit(black, 'move', { from: 'e7', to: 'e5' })).error, 'It is not your turn');
  assert.equal((await emit(white, 'move', { from: 'e2', to: 'e5' })).error, 'Illegal move');

  // Each move reaches the other player in real time
  assert.ok((await emit(white, 'move', { from: 'e2', to: 'e4' })).ok);
  await waitForState(black, (s) => s.history.join() === 'e4');
  assert.ok((await emit(black, 'move', { from: 'e7', to: 'e5' })).ok);
  await waitForState(white, (s) => s.history.join() === 'e4,e5');

  // After both moves the clocks are running
  const latest = white.states.at(-1);
  assert.equal(latest.running, 'w');
  assert.ok(latest.clocks.b < 300000);

  // A spectator sees the same position but cannot move
  const carol = await newUser('e2e');
  const c = await connect(carol);
  const joinC = await emit(c, 'join', gameId);
  assert.equal(joinC.color, null);
  assert.deepEqual(joinC.state.history, ['e4', 'e5']);
  assert.equal((await emit(c, 'move', { from: 'g1', to: 'f3' })).error, 'You are not playing in this game');

  // Scholar's mate: white mates on f7
  for (const [socket, move] of [[white, ['f1', 'c4']], [black, ['b8', 'c6']], [white, ['d1', 'h5']], [black, ['g8', 'f6']], [white, ['h5', 'f7']]]) {
    const res = await emit(socket, 'move', { from: move[0], to: move[1] });
    assert.ok(res.ok, `${move}: ${res.error}`);
  }
  const final = await waitForState(c, (s) => s.status === 'finished');
  assert.equal(final.endReason, 'checkmate');
  assert.equal(final.winner, white === a ? alice.username : bob.username);
  assert.equal((await emit(black, 'move', { from: 'a7', to: 'a6' })).error, 'The game is over');

  // The result and moves were saved: the game history API shows it
  const history = await (await fetch(`${BASE}/api/games`, { headers: { cookie: alice.cookie } })).json();
  const saved = history.find((g) => g.id === gameId);
  assert.equal(saved.status, 'finished');
  assert.equal(saved.result, white === a ? 'won' : 'lost');
});

run('separate games run at the same time without affecting each other', async () => {
  const players = await Promise.all([1, 2, 3, 4].map(() => newUser('e2e')));
  const game1 = await createGame(players[0]);
  const game2 = await createGame(players[2]);
  const s = await Promise.all(players.map(connect));

  const joins = [
    await emit(s[0], 'join', game1),
    await emit(s[1], 'join', game1),
    await emit(s[2], 'join', game2),
    await emit(s[3], 'join', game2),
  ];
  const whiteOf = (i, j) => (joins[i].color === 'w' ? s[i] : s[j]);

  await Promise.all([
    emit(whiteOf(0, 1), 'move', { from: 'd2', to: 'd4' }),
    emit(whiteOf(2, 3), 'move', { from: 'c2', to: 'c4' }),
  ]);

  await waitForState(s[1], (st) => st.history.join() === 'd4');
  await waitForState(s[3], (st) => st.history.join() === 'c4');
  // No game-2 updates leak into game 1 and vice versa
  assert.ok(s[1].states.every((st) => st.id === game1));
  assert.ok(s[3].states.every((st) => st.id === game2));
});

run('a third player cannot take a seat, and resigning ends the game for both', async () => {
  const [p1, p2, p3] = await Promise.all([1, 2, 3].map(() => newUser('e2e')));
  const gameId = await createGame(p1);
  const [s1, s2, s3] = await Promise.all([p1, p2, p3].map(connect));
  await emit(s1, 'join', gameId);
  await emit(s2, 'join', gameId);
  assert.equal((await emit(s3, 'join', gameId)).color, null);

  assert.ok((await emit(s2, 'resign')).ok);
  const final = await waitForState(s1, (st) => st.status === 'finished');
  assert.equal(final.endReason, 'resignation');
  assert.equal(final.winner, p1.username);
});

run('a reconnecting player gets their seat and the full position back', async () => {
  const [p1, p2] = await Promise.all([1, 2].map(() => newUser('e2e')));
  const gameId = await createGame(p1);
  const s1 = await connect(p1);
  const s2 = await connect(p2);
  const j1 = await emit(s1, 'join', gameId);
  await emit(s2, 'join', gameId);
  const white = j1.color === 'w' ? s1 : s2;
  await emit(white, 'move', { from: 'g1', to: 'f3' });

  s1.close();
  const again = await connect(p1);
  const rejoin = await emit(again, 'join', gameId);
  assert.equal(rejoin.color, j1.color);
  assert.deepEqual(rejoin.state.history, ['Nf3']);
});

run('signed-out sockets and unknown games are refused', async () => {
  await assert.rejects(connect({ cookie: '' }), /Not signed in/);
  const user = await newUser('e2e');
  const s = await connect(user);
  assert.equal((await emit(s, 'join', '0'.repeat(32))).error, 'Game not found');
  assert.equal((await emit(s, 'join', 'not-an-id')).error, 'Game not found');
});
