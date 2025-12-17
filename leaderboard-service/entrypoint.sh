#!/bin/sh

export DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}?schema=public"

RESET="\033[0m"
RED_BOLD="\033[31;49;1m"
GREEN="\033[32;49m"

echo "\n${RED_BOLD}==== STARTING APP ====${RESET}\n"

echo "${GREEN}Starting leaderboard-service...${RESET}"

npm run start