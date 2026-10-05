const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chess',
};

const pool = mysql.createPool({ ...config, connectionLimit: 10 });

// Columns that databases created by the old PHP version are missing
const ADDED_COLUMNS = {
  games: {
    status: "VARCHAR(16) NOT NULL DEFAULT 'waiting'",
    end_reason: 'VARCHAR(32) DEFAULT NULL',
    fen: 'VARCHAR(100) DEFAULT NULL',
    white_ms: 'INT NOT NULL DEFAULT 300000',
    black_ms: 'INT NOT NULL DEFAULT 300000',
  },
};

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const conn = await mysql.createConnection({ ...config, multipleStatements: true });
  try {
    await conn.query(schema);

    for (const [table, columns] of Object.entries(ADDED_COLUMNS)) {
      const [rows] = await conn.query(
        'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
        [config.database, table]
      );
      const existing = new Set(rows.map((r) => r.COLUMN_NAME));
      for (const [column, definition] of Object.entries(columns)) {
        if (!existing.has(column)) {
          await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        }
      }
      // Games from the PHP version were one person playing both sides against
      // "Guest"; they can't be continued, so close them instead of leaving them "waiting"
      if (table === 'games' && !existing.has('status')) {
        await conn.query("UPDATE games SET status = IF(winner IS NULL, 'aborted', 'finished')");
      }
    }
    await convertGameIdsToText(conn);

    // The old PHP version stored the winner in a VARCHAR(30), too short for some usernames
    await conn.query('ALTER TABLE games MODIFY winner VARCHAR(255) DEFAULT NULL');

    // Needed for the INSERT ... ON DUPLICATE KEY UPDATE in games.js
    const [indexes] = await conn.query("SHOW INDEX FROM game_moves WHERE Key_name = 'game_move'");
    if (indexes.length === 0) {
      await conn.query('ALTER TABLE game_moves ADD UNIQUE KEY game_move (game_id, move_number)');
    }
  } finally {
    await conn.end();
  }
}

// The first PHP schema used INT game IDs; games now use 32-character hex IDs.
// The foreign key has to be dropped while both columns change type.
async function convertGameIdsToText(conn) {
  const [[idColumn]] = await conn.query(
    "SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'games' AND COLUMN_NAME = 'id'",
    [config.database]
  );
  if (idColumn.DATA_TYPE === 'varchar') return;

  const [foreignKeys] = await conn.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'game_moves' AND REFERENCED_TABLE_NAME = 'games'`,
    [config.database]
  );
  for (const fk of foreignKeys) {
    await conn.query(`ALTER TABLE game_moves DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
  }
  await conn.query('ALTER TABLE game_moves MODIFY game_id VARCHAR(32) NOT NULL');
  await conn.query('ALTER TABLE games MODIFY id VARCHAR(32) NOT NULL');
  await conn.query('ALTER TABLE game_moves ADD FOREIGN KEY (game_id) REFERENCES games(id)');
}

// MySQL can take a few seconds to accept connections after the container starts
async function waitForDatabase(attempts = 30) {
  for (let i = 1; ; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (i >= attempts) throw err;
      console.log(`Waiting for MySQL (${err.code || err.message})...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

module.exports = { pool, config, migrate, waitForDatabase };
