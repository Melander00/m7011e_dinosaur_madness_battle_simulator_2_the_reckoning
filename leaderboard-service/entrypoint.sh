#!/bin/sh

FLAG="/home/hasbuilt.flag"

RESET="\033[0m"
RED_BOLD="\033[31;49;1m"
GREEN="\033[32;49m"
YELLOW="\033[33;49m"

echo "\n${RED_BOLD}==== STARTING APP ====${RESET}\n"

if [ ! -f "$FLAG" ]; then
    echo "${GREEN}Migrating.${RESET}"
    npm run db:deploy
    touch "$FLAG"
else
    echo "${YELLOW}Nothing to migrate. Skipping...${RESET}"
fi

npm run start