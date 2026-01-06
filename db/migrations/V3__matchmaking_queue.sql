-- V2__matchmaking_queue.sql
CREATE TABLE matchmaking_queue (
    userId UUID PRIMARY KEY REFERENCES users(userId) ON DELETE CASCADE,
    elo INTEGER NOT NULL DEFAULT 1000,
    queue_start_time TIMESTAMP NOT NULL DEFAULT NOW()
);