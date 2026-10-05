// One chess game: seats, turn order, server-side move validation and clocks.
// Pure logic with no database or network code, so it can be unit-tested directly.
// The browser loads the same chess.js version (served from node_modules) for
// instant feedback, but only this class decides what actually happens.
const { Chess } = require('chess.js');

const INITIAL_MS = 5 * 60 * 1000; // 5 minutes per side
const PROMOTION_PIECES = ['q', 'r', 'b', 'n'];

class GameRoom {
  constructor(
    {
      id,
      white = null,
      black = null,
      status = 'waiting',
      winner = null,
      endReason = null,
      moves = [],
      whiteMs = INITIAL_MS,
      blackMs = INITIAL_MS,
    },
    { now = Date.now } = {}
  ) {
    this.id = id;
    this.white = white;
    this.black = black;
    this.status = status; // waiting | active | finished | aborted
    this.winner = winner; // username, 'draw', or null
    this.endReason = endReason;
    this.now = now;
    this.clocks = { w: whiteMs, b: blackMs };

    this.chess = new Chess();
    for (const san of moves) {
      if (!this.chess.move(san)) throw new Error(`Game ${id}: stored move "${san}" is not legal`);
    }

    // When the side to move's clock started running; null while no clock runs.
    // Clocks start after White's first move, so nobody loses time waiting for
    // an opponent. After a server restart an active game resumes from the
    // stored clock values.
    this.turnStartedAt = status === 'active' && moves.length > 0 ? now() : null;
  }

  colorOf(username) {
    if (username === this.white) return 'w';
    if (username === this.black) return 'b';
    return null;
  }

  playerOf(color) {
    return color === 'w' ? this.white : this.black;
  }

  runningColor() {
    return this.status === 'active' && this.turnStartedAt !== null ? this.chess.turn() : null;
  }

  clocksNow() {
    const clocks = { ...this.clocks };
    const running = this.runningColor();
    if (running) clocks[running] = Math.max(0, clocks[running] - (this.now() - this.turnStartedAt));
    return clocks;
  }

  // Puts the creator of the game in a specific seat
  seat(username, color) {
    if (color === 'w') this.white = username;
    else this.black = username;
  }

  // Seats a user in the free seat, if there is one. Returns their colour, or
  // null for a spectator.
  join(username) {
    const existing = this.colorOf(username);
    if (existing) return { color: existing, changed: false };
    if (this.status !== 'waiting') return { color: null, changed: false };

    let color;
    if (!this.white) {
      this.white = username;
      color = 'w';
    } else if (!this.black) {
      this.black = username;
      color = 'b';
    } else {
      return { color: null, changed: false };
    }
    if (this.white && this.black) this.status = 'active';
    return { color, changed: true };
  }

  move(username, { from, to, promotion } = {}) {
    if (this.status === 'waiting') return { ok: false, error: 'Waiting for an opponent to join' };
    if (this.status !== 'active') return { ok: false, error: 'The game is over' };

    const color = this.colorOf(username);
    if (!color) return { ok: false, error: 'You are not playing in this game' };
    if (this.chess.turn() !== color) return { ok: false, error: 'It is not your turn' };

    const piece = promotion === undefined || promotion === null ? 'q' : promotion;
    if (!PROMOTION_PIECES.includes(piece)) return { ok: false, error: 'Invalid promotion piece' };

    let timeLeft = null;
    if (this.turnStartedAt !== null) {
      timeLeft = this.clocksNow()[color];
      if (timeLeft <= 0) {
        this.timeout();
        return { ok: false, error: 'You ran out of time', ended: true };
      }
    }

    const move = this.chess.move({ from, to, promotion: piece });
    if (!move) return { ok: false, error: 'Illegal move' };

    if (timeLeft !== null) this.clocks[color] = timeLeft;
    this.turnStartedAt = this.now(); // the opponent's clock starts now

    if (this.chess.in_checkmate()) this.finish(username, 'checkmate');
    else if (this.chess.in_stalemate()) this.finish('draw', 'stalemate');
    else if (this.chess.insufficient_material()) this.finish('draw', 'insufficient material');
    else if (this.chess.in_threefold_repetition()) this.finish('draw', 'threefold repetition');
    else if (this.chess.in_draw()) this.finish('draw', '50-move rule');

    return { ok: true, move, ply: this.chess.history().length };
  }

  resign(username) {
    const color = this.colorOf(username);
    if (!color) return { ok: false, error: 'You are not playing in this game' };
    if (this.status === 'waiting') {
      this.status = 'aborted';
      this.endReason = 'aborted';
      return { ok: true };
    }
    if (this.status !== 'active') return { ok: false, error: 'The game is over' };
    this.finish(this.playerOf(color === 'w' ? 'b' : 'w'), 'resignation');
    return { ok: true };
  }

  // Ends the game if the running clock has hit zero. Returns true if it did.
  timeout() {
    const running = this.runningColor();
    if (!running || this.clocksNow()[running] > 0) return false;
    this.finish(this.playerOf(running === 'w' ? 'b' : 'w'), 'timeout');
    return true;
  }

  finish(winner, reason) {
    this.clocks = this.clocksNow(); // freeze the clocks
    this.turnStartedAt = null;
    this.status = 'finished';
    this.winner = winner;
    this.endReason = reason;
  }

  state() {
    return {
      id: this.id,
      white: this.white,
      black: this.black,
      status: this.status,
      winner: this.winner,
      endReason: this.endReason,
      fen: this.chess.fen(),
      history: this.chess.history(),
      turn: this.chess.turn(),
      inCheck: this.chess.in_check(),
      clocks: this.clocksNow(),
      running: this.runningColor(),
    };
  }
}

module.exports = { GameRoom, INITIAL_MS };
