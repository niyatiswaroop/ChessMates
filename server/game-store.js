// Reads and writes games in MySQL. GameManager is the only caller.
class GameStore {
  constructor(pool) {
    this.pool = pool;
  }

  async load(id) {
    const [games] = await this.pool.query('SELECT * FROM games WHERE id = ?', [id]);
    if (games.length === 0) return null;
    const g = games[0];

    const [rows] = await this.pool.query(
      'SELECT white_move, black_move FROM game_moves WHERE game_id = ? ORDER BY move_number',
      [id]
    );
    const moves = [];
    for (const row of rows) {
      if (row.white_move) moves.push(row.white_move);
      if (row.black_move) moves.push(row.black_move);
    }

    return {
      id: g.id,
      white: g.player_white,
      black: g.player_black,
      status: g.status,
      winner: g.winner,
      endReason: g.end_reason,
      moves,
      whiteMs: g.white_ms,
      blackMs: g.black_ms,
    };
  }

  async create(room) {
    await this.pool.query(
      'INSERT INTO games (id, player_white, player_black, status, fen, white_ms, black_ms) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [room.id, room.white, room.black, room.status, room.chess.fen(), room.clocks.w, room.clocks.b]
    );
  }

  async save(room) {
    await this.pool.query(
      `UPDATE games SET player_white = ?, player_black = ?, status = ?, winner = ?, end_reason = ?,
       fen = ?, white_ms = ?, black_ms = ? WHERE id = ?`,
      [
        room.white,
        room.black,
        room.status,
        room.winner,
        room.endReason,
        room.chess.fen(),
        room.clocks.w,
        room.clocks.b,
        room.id,
      ]
    );
  }

  // ply is the 1-based half-move count: odd = White's move, even = Black's
  async saveMove(gameId, ply, san) {
    const moveNumber = Math.ceil(ply / 2);
    const column = ply % 2 === 1 ? 'white_move' : 'black_move';
    await this.pool.query(
      `INSERT INTO game_moves (game_id, move_number, ${column}) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE ${column} = VALUES(${column})`,
      [gameId, moveNumber, san]
    );
  }

  async historyFor(username, limit = 10) {
    const [rows] = await this.pool.query(
      `SELECT id, player_white, player_black, status, winner, end_reason, created_at
       FROM games WHERE player_white = ? OR player_black = ?
       ORDER BY created_at DESC LIMIT ?`,
      [username, username, limit]
    );
    return rows;
  }
}

module.exports = { GameStore };
