-- Run by server/db.js on every start-up; every statement is safe to re-run.
-- Columns added after the first version are added in db.js (migrate) so
-- existing databases are upgraded in place.

CREATE TABLE IF NOT EXISTS userinfo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,          -- bcrypt hash
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
    id VARCHAR(32) PRIMARY KEY NOT NULL,     -- 32-char hex, also the invite link
    player_white VARCHAR(255) DEFAULT NULL,  -- NULL until someone takes the seat
    player_black VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    winner VARCHAR(255) DEFAULT NULL,        -- username, 'draw', or NULL
    status VARCHAR(16) NOT NULL DEFAULT 'waiting',  -- waiting | active | finished | aborted
    end_reason VARCHAR(32) DEFAULT NULL,     -- checkmate | timeout | resignation | stalemate | ...
    fen VARCHAR(100) DEFAULT NULL,           -- current position
    white_ms INT NOT NULL DEFAULT 300000,    -- clock time left
    black_ms INT NOT NULL DEFAULT 300000
);

CREATE TABLE IF NOT EXISTS game_moves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id VARCHAR(32) NOT NULL,
    move_number INT NOT NULL,
    white_move VARCHAR(255),
    black_move VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY game_move (game_id, move_number),
    FOREIGN KEY (game_id) REFERENCES games(id)
);
