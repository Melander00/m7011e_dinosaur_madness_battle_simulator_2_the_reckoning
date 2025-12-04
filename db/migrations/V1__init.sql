-- V1 init tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- User --
CREATE TABLE IF NOT EXISTS users (
    userId INTEGER PRIMARY KEY,
    quote TEXT,
    profilePicture BYTEA,
    profileBanner BYTEA
);

-- Rank --
CREATE TABLE IF NOT EXISTS ranks (
    userId INTEGER PRIMARY KEY,
    rankedPoints INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT fk_rank_user FOREIGN KEY (userId)
        REFERENCES users(userId)
        ON DELETE CASCADE
);

-- Relationship --
CREATE TABLE IF NOT EXISTS relationships (
    userId1 INTEGER NOT NULL,
    userId2 INTEGER NOT NULL,
    
    PRIMARY KEY (userId1, userId2),
    CONSTRAINT fk_rel_user1 FOREIGN KEY (userId1)
        REFERENCES users(userId)
        ON DELETE CASCADE,
    CONSTRAINT fk_rel_user2 FOREIGN KEY (userId2)
        REFERENCES users(userId)
        ON DELETE CASCADE,
    CONSTRAINT chk_not_same CHECK (userId1 <> userId2)
);

-- Blocking --
CREATE TABLE IF NOT EXISTS relationshipBlocked (
    fromUserId INTEGER NOT NULL,
    toUserId INTEGER NOT NULL,
    
    PRIMARY KEY (fromUserId, toUserId),
    CONSTRAINT fk_block_from FOREIGN KEY (fromUserId)
        REFERENCES users(userId)
        ON DELETE CASCADE,
    CONSTRAINT fk_block_to FOREIGN KEY (toUserId)
        REFERENCES users(userId)
        ON DELETE CASCADE
);

-- Relationship Requests --
CREATE TABLE IF NOT EXISTS relationshipRequests (
    fromUserId INTEGER NOT NULL,
    toUserId   INTEGER NOT NULL,
    status     INTEGER NOT NULL,
    PRIMARY KEY (fromUserId, toUserId),
    CONSTRAINT fk_req_from FOREIGN KEY (fromUserId)
        REFERENCES users(userId)
        ON DELETE CASCADE,
    CONSTRAINT fk_req_to FOREIGN KEY (toUserId)
        REFERENCES users(userId)
        ON DELETE CASCADE,
    CONSTRAINT chk_req_not_same CHECK (fromUserId <> toUserId)
);

-- Game History --
CREATE TABLE IF NOT EXISTS games (
    gameId UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    winnerUserId INTEGER,
    timeStarted TIMESTAMP NOT NULL,
    timeFinished TIMESTAMP NOT NULL,
    CONSTRAINT fk_game_winner FOREIGN KEY (winnerUserId)
        REFERENCES users(userId)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gamePlayers (
    gameId UUID NOT NULL,
    userId INTEGER NOT NULL,
    -- Game specific stats --
    -- hits
    -- powerups
    -- etc.
    PRIMARY KEY (gameId, userId),
    CONSTRAINT fk_gp_game FOREIGN KEY (gameId)
        REFERENCES games(gameId)
        ON DELETE CASCADE,
    CONSTRAINT fk_gp_user FOREIGN KEY (userId)
        REFERENCES users(userId)
        ON DELETE CASCADE
);