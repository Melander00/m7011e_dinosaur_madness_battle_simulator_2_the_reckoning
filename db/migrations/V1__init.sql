-- V1__init
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    userId UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote TEXT
);