#!/bin/sh
set -e
npm run migrate || true
exec "$@"
