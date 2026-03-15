#!/bin/bash
set -e
while ! nc -z $DB_HOST 3306; do
  sleep 1
done
alembic upgrade head
if ! alembic check; then
    alembic revision --autogenerate -m "auto_sync_$(date +%Y%m%d_%H%M%S)"
    alembic upgrade head
fi
exec "$@"