const test = require('node:test');
const assert = require('node:assert/strict');
const { GameManager } = require('../server/game-manager');

// Stands in for MySQL
function memoryStore(games = {}) {
  return {
    games,
    moves: [],
    saves: 0,
    async load(id) {
      return games[id] ? structuredClone(games[id]) : null;
    },
    async create(room) {
      games[room.id] = { id: room.id };
    },
    async save() {
      this.saves++;
    },
    async saveMove(id, ply, san) {
      this.moves.push([ply, san]);
    },
  };
}

test('a running clock ends the game on the server even if nobody moves', async () => {
  const id = 'a'.repeat(32);
  const store = memoryStore({
    [id]: { id, white: 'alice', black: 'bob', status: 'active', moves: ['e4'], whiteMs: 300000, blackMs: 150 },
  });
  const changed = [];
  const manager = new GameManager({ store, onChange: (room) => changed.push(room.state()) });

  const room = await manager.get(id);
  assert.equal(room.runningColor(), 'b');
  await new Promise((r) => setTimeout(r, 400));

  assert.equal(changed.length, 1, 'players were told about the timeout');
  assert.equal(changed[0].status, 'finished');
  assert.equal(changed[0].endReason, 'timeout');
  assert.equal(changed[0].winner, 'alice');
  assert.equal(store.saves, 1, 'the result was saved');
  manager.shutdown();
});

test('a game is loaded from the database only once, even when requested in parallel', async () => {
  const id = 'b'.repeat(32);
  const store = memoryStore({ [id]: { id, white: 'alice', status: 'waiting', moves: [] } });
  let loads = 0;
  const load = store.load.bind(store);
  store.load = (gameId) => {
    loads++;
    return load(gameId);
  };
  const manager = new GameManager({ store });

  const [r1, r2] = await Promise.all([manager.get(id), manager.get(id)]);
  assert.equal(r1, r2);
  assert.equal(loads, 1);
  assert.equal(await manager.get('not-a-game-id'), null);
  manager.shutdown();
});

test('moves are saved in order with their half-move number', async () => {
  const store = memoryStore();
  const manager = new GameManager({ store });
  const room = await manager.create('alice');
  await manager.join(room, 'bob');
  const white = room.white;
  const black = room.black;

  // Fired without waiting, the way two quick socket events would arrive
  await Promise.all([
    manager.move(room, white, { from: 'e2', to: 'e4' }),
    manager.move(room, black, { from: 'e7', to: 'e5' }),
    manager.move(room, white, { from: 'g1', to: 'f3' }),
  ]);
  assert.deepEqual(store.moves, [[1, 'e4'], [2, 'e5'], [3, 'Nf3']]);
  manager.shutdown();
});
