# DB Schema
To allow for extensibility and modifiability the db schemas are defined as flyway migrations files. Flyway automatically applies the sql files in `migrations/` in order if they haven't already. This makes sure the schema in the database is always up to date regardless of which internal version it was in before migrations were applied.

## Usage
To utilize flyway there are some small things to consider.
1. SQL files are to be placed in `migrations/` folder.
2. Don't modify other migration files.
3. Filename format follows `VX__Y.sql` where `X` is the version number (one more than previous) and `Y` is a short description of the change.
4. When writing migration files, assume all previous files have been applied already.
5. Make sure the file contains valid SQL.