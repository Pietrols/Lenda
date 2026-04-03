#!/bin/bash
set -e

echo "=== Deploying Lenda ==="

APP_DIR="/home/ubuntu/lenda"

# Pull latest code
cd $APP_DIR
git pull origin main

# Install dependencies
pnpm install --frozen-lockfile

# Build packages
pnpm --filter @lenda/types build
pnpm --filter @lenda/schemas build
pnpm --filter @lenda/database generate
pnpm --filter @lenda/database build

# Run migrations
cd packages/database && pnpm migrate:deploy && cd ../..

# Build frontend
pnpm --filter web build

# Copy frontend build to nginx serving directory
sudo cp -r apps/web/dist/* /var/www/lenda/

# Restart services
pm2 restart lenda-auth lenda-booking || pm2 start ecosystem.config.js

echo "=== Deploy complete ==="
