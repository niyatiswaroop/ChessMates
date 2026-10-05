// Keeps every game that is being played in memory, one GameRoom each, and
// handles the parts around the rules: loading from and saving to MySQL,
// firing clock timeouts, and telling Socket.IO when a game changed.
const crypto = require('crypto');
const { GameRoom } = require('./game-room');

const UNLOAD_AFTER_MS = 30 * 60 * 1000; // drop finished games from memory after 30 min

class GameManager {
  // onChange(room) is called after every change, once it has been saved
  constructor({ store, onChange = () => {}, now = Date.now }) {
    this.store = store;
    this.onChange = onChange;
    this.now = now;
    this.rooms = new Map();
    this.loading = new Map(); // id -> Promise, so a game is only loaded once
  }

  async create(username) {
    const id = crypto.randomBytes(16).toString('hex');
    const room = this.#track(new GameRoom({ id }, { now: this.now }));
    room.seat(username, Math.random() < 0.5 ? 'w' : 'b');
    await this.store.create(room);
    return room;
  }

  async get(id) {
    if (typeof id !== 'string' || !/^[0-9a-f]{32}$/.test(id)) return null;
    if (this.rooms.has(id)) return this.rooms.get(id);
    if (!this.loading.has(id)) {
      const promise = this.store
        .load(id)
        .then((data) => (data ? this.#track(new GameRoom(data, { now: this.now })) : null))
        .finally(() => this.loading.delete(id));
      this.loading.set(id, promise);
    }
    return this.loading.get(id);
  }

  async join(room, username) {
    const result = room.join(username);
    if (result.changed) await this.#commit(room);
    return result;
  }

  async move(room, username, move) {
    // The rules check and the state change happen synchronously, so two moves
    // arriving at once can't both be accepted. Saving happens afterwards.
    const result = room.move(username, move);
    if (result.ok) await this.#commit(room, { ply: result.ply, san: result.move.san });
    else if (result.ended) await this.#commit(room);
    return result;
  }

  async resign(room, username) {
    const result = room.resign(username);
    if (result.ok) await this.#commit(room);
    return result;
  }

  #track(room) {
    room.saveQueue = Promise.resolve();
    room.timer = null;
    this.rooms.set(room.id, room);
    this.#schedule(room);
    return room;
  }

  // Saves in order (a queue per game), then notifies and re-arms the clock timer
  async #commit(room, newMove) {
    const write = room.saveQueue.then(async () => {
      if (newMove) await this.store.saveMove(room.id, newMove.ply, newMove.san);
      await this.store.save(room);
    });
    room.saveQueue = write.catch((err) => console.error(`Saving game ${room.id} failed:`, err));
    await write;
    this.#schedule(room);
    this.onChange(room);
  }

  #schedule(room) {
    clearTimeout(room.timer);
    room.timer = null;

    const running = room.runningColor();
    if (running) {
      const left = room.clocksNow()[running];
      room.timer = setTimeout(() => {
        if (room.timeout()) this.#commit(room).catch(() => {});
        else this.#schedule(room);
      }, left + 20);
    } else if (room.status === 'finished' || room.status === 'aborted') {
      room.timer = setTimeout(() => this.rooms.delete(room.id), UNLOAD_AFTER_MS);
    }
    room.timer?.unref?.();
  }

  shutdown() {
    for (const room of this.rooms.values()) clearTimeout(room.timer);
  }
}

module.exports = { GameManager };
