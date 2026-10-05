const test = require('node:test');
const assert = require('node:assert/strict');
const { GameRoom, INITIAL_MS } = require('../server/game-room');

// A clock the tests move by hand
function fakeClock(start = 1_000_000) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => (t += ms);
  return now;
}

function activeGame(now = fakeClock()) {
  const room = new GameRoom({ id: 'g1' }, { now });
  room.join('alice'); // white
  room.join('bob'); // black
  return room;
}

function play(room, moves) {
  for (const m of moves) {
    const user = room.chess.turn() === 'w' ? room.white : room.black;
    const result = room.move(user, { from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
    assert.ok(result.ok, `${m}: ${result.error}`);
  }
}

test('first two users take white then black; the game starts when both are seated', () => {
  const room = new GameRoom({ id: 'g1' });
  assert.deepEqual(room.join('alice'), { color: 'w', changed: true });
  assert.equal(room.status, 'waiting');
  assert.deepEqual(room.join('bob'), { color: 'b', changed: true });
  assert.equal(room.status, 'active');
});

test('rejoining keeps your seat; a third user is a spectator', () => {
  const room = activeGame();
  assert.deepEqual(room.join('alice'), { color: 'w', changed: false });
  assert.deepEqual(room.join('carol'), { color: null, changed: false });
});

test('the creator can be seated as black and the joiner gets white', () => {
  const room = new GameRoom({ id: 'g1' });
  room.seat('alice', 'b');
  assert.equal(room.join('bob').color, 'w');
  assert.equal(room.status, 'active');
});

test('no moves before an opponent joins', () => {
  const room = new GameRoom({ id: 'g1' });
  room.join('alice');
  assert.equal(room.move('alice', { from: 'e2', to: 'e4' }).error, 'Waiting for an opponent to join');
});

test('turn order is enforced', () => {
  const room = activeGame();
  assert.equal(room.move('bob', { from: 'e7', to: 'e5' }).error, 'It is not your turn');
  play(room, ['e2e4']);
  assert.equal(room.move('alice', { from: 'd2', to: 'd4' }).error, 'It is not your turn');
  assert.ok(room.move('bob', { from: 'e7', to: 'e5' }).ok);
});

test('players can only move their own pieces and spectators cannot move', () => {
  const room = activeGame();
  assert.equal(room.move('alice', { from: 'e7', to: 'e5' }).error, 'Illegal move');
  assert.equal(room.move('carol', { from: 'e2', to: 'e4' }).error, 'You are not playing in this game');
});

test('illegal moves are rejected and do not change the position', () => {
  const room = activeGame();
  const fen = room.chess.fen();
  assert.equal(room.move('alice', { from: 'e2', to: 'e5' }).error, 'Illegal move');
  assert.equal(room.move('alice', { from: 'z9', to: 'e4' }).error, 'Illegal move');
  assert.equal(room.move('alice', {}).error, 'Illegal move');
  assert.equal(room.chess.fen(), fen);
});

test('black can castle, capture en passant and under-promote', () => {
  const room = activeGame();
  play(room, ['e2e4', 'a7a6', 'e4e5', 'd7d5', 'e5d6', 'c7d6']); // white takes en passant
  play(room, ['a2a3', 'd6d5', 'b2b4', 'd5d4', 'c2c4', 'd4c3']); // black takes en passant
  assert.equal(room.chess.history().at(-1), 'dxc3');

  const room2 = activeGame();
  play(room2, ['g1f3', 'g8f6', 'g2g3', 'g7g6', 'f1g2', 'f8g7', 'e1g1', 'e8g8']);
  assert.equal(room2.chess.history().at(-1), 'O-O');

  const room3 = activeGame();
  play(room3, ['a2a3', 'd7d5', 'a3a4', 'd5d4', 'e2e4', 'd4e3', 'b1c3', 'e3f2', 'e1e2', 'f2g1n']);
  assert.equal(room3.chess.history().at(-1), 'fxg1=N+');
});

test('an invalid promotion piece is rejected', () => {
  const room = activeGame();
  assert.equal(room.move('alice', { from: 'e2', to: 'e4', promotion: 'k' }).error, 'Invalid promotion piece');
});

test('checkmate ends the game with the mover as winner', () => {
  const room = activeGame();
  play(room, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
  assert.equal(room.status, 'finished');
  assert.equal(room.winner, 'bob');
  assert.equal(room.endReason, 'checkmate');
  assert.equal(room.move('alice', { from: 'a2', to: 'a3' }).error, 'The game is over');
});

test('stalemate is a draw', () => {
  const room = new GameRoom({ id: 'g1' });
  room.join('alice');
  room.join('bob');
  // Shortest known stalemate (Sam Loyd)
  play(room, ['e2e3', 'a7a5', 'd1h5', 'a8a6', 'h5a5', 'h7h5', 'h2h4', 'a6h6', 'a5c7', 'f7f6',
    'c7d7', 'e8f7', 'd7b7', 'd8d3', 'b7b8', 'd3h7', 'b8c8', 'f7g6', 'c8e6']);
  assert.equal(room.status, 'finished');
  assert.equal(room.winner, 'draw');
  assert.equal(room.endReason, 'stalemate');
});

test('resigning gives the win to the opponent; resigning before anyone joins aborts', () => {
  const room = activeGame();
  assert.ok(room.resign('bob').ok);
  assert.equal(room.winner, 'alice');
  assert.equal(room.endReason, 'resignation');
  assert.equal(room.resign('alice').error, 'The game is over');

  const waiting = new GameRoom({ id: 'g2' });
  waiting.join('alice');
  assert.ok(waiting.resign('alice').ok);
  assert.equal(waiting.status, 'aborted');
  assert.equal(waiting.winner, null);
});

test('clocks start after white\'s first move and only the side to move loses time', () => {
  const now = fakeClock();
  const room = activeGame(now);
  now.advance(60_000);
  assert.deepEqual(room.clocksNow(), { w: INITIAL_MS, b: INITIAL_MS }); // nobody's clock before move 1
  play(room, ['e2e4']);
  now.advance(10_000);
  assert.deepEqual(room.clocksNow(), { w: INITIAL_MS, b: INITIAL_MS - 10_000 });
  play(room, ['e7e5']);
  now.advance(4_000);
  assert.deepEqual(room.clocksNow(), { w: INITIAL_MS - 4_000, b: INITIAL_MS - 10_000 });
});

test('running out of time loses, and a late move is refused', () => {
  const now = fakeClock();
  const room = activeGame(now);
  play(room, ['e2e4']);
  now.advance(INITIAL_MS + 1);
  const late = room.move('bob', { from: 'e7', to: 'e5' });
  assert.equal(late.ok, false);
  assert.equal(late.ended, true);
  assert.equal(room.winner, 'alice');
  assert.equal(room.endReason, 'timeout');
});

test('timeout() only ends the game once the clock reaches zero', () => {
  const now = fakeClock();
  const room = activeGame(now);
  play(room, ['e2e4']);
  now.advance(INITIAL_MS - 1);
  assert.equal(room.timeout(), false);
  now.advance(1);
  assert.equal(room.timeout(), true);
  assert.equal(room.winner, 'alice');
});

test('a game rebuilt from stored moves continues where it left off', () => {
  const room = new GameRoom({
    id: 'g1', white: 'alice', black: 'bob', status: 'active', moves: ['e4', 'e5', 'Nf3'], whiteMs: 250_000, blackMs: 200_000,
  });
  assert.equal(room.chess.turn(), 'b');
  assert.equal(room.runningColor(), 'b');
  assert.deepEqual(room.clocks, { w: 250_000, b: 200_000 });
  assert.ok(room.move('bob', { from: 'b8', to: 'c6' }).ok);
});
