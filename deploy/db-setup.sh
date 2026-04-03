#!/bin/bash
set -e

echo "=== Setting up PostgreSQL for Lenda ==="

# Create database user and database
sudo -u postgres psql << SQL
CREATE USER lenda WITH PASSWORD 'CHANGE_THIS_PASSWORD';
CREATE DATABASE lenda_prod OWNER lenda;
GRANT ALL PRIVILEGES ON DATABASE lenda_prod TO lenda;
SQL

echo "=== Database setup complete ==="
echo "Remember to update DATABASE_URL in your .env files with the password you set"
