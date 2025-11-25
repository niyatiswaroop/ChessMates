-- database chess
-- localhost 
-- xampp server

create table userinfo (
    id int primary key auto_increment,  
    -- email for uniquely identifying users
    email varchar(255) not null,
    -- username for each users  
    username varchar(255) not null UNIQUE,    
    -- storing hashed password
    password varchar(255) not null, 
    -- storing information when account was created 
    -- not necessary but aise hi bana diya
    created_at timestamp default CURRENT_TIMESTAMP
);

-- create table games (
--     id int AUTO_INCREMENT PRIMARY KEY,  -- game id
--     player_white varchar(255),           --username of the white player
--     player_black varchar(255),           -- username of the black player
--     created_at timestamp default CURRENT_TIMESTAMP,  -- when the game is created
--     winner varchar(30)
-- );

CREATE TABLE games (
    id INT(11) PRIMARY KEY NOT NULL,
    player_white VARCHAR(255) DEFAULT NULL,
    player_black VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    winner VARCHAR(30) DEFAULT NULL
);

CREATE TABLE game_moves (
    id int AUTO_INCREMENT PRIMARY KEY,  
    game_id int not null,               -- game id which it belong to
    move_number int not null,           -- The move number 
    white_move varchar(255),            
    black_move varchar(255),            
    created_at timestamp DEFAULT CURRENT_TIMESTAMP, 
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  
    FOREIGN KEY (game_id) references games(id)
);