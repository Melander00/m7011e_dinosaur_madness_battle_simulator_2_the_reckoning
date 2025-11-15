# Development
Create `.env` file with:

## Environmental Variables
```env
PORT=3005

PG_DATABASE="leaderboard"
PG_USER="postgres"
PG_PASSWORD=""
PG_HOST=""

DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:5432/${PG_DATABASE}?schema=public"
```


## Scripts
```bash
npm install # Install dependencies
npm run prisma:push # Updates db schema 
npm run watch # Starts the typescript compiler
npm run start # Starts the app
```

