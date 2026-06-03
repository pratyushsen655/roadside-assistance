#!/usr/bin/env bash

# Exit on any error
set -e

# Root directory (this script's location)
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Installing dependencies for all projects ==="

# Install backend dependencies
echo "Installing backend dependencies..."
npm install --prefix "$ROOT_DIR/backend"

# Install customer-app dependencies
echo "Installing customer-app dependencies..."
npm install --prefix "$ROOT_DIR/customer-app"

# Install mechanic-app dependencies
echo "Installing mechanic-app dependencies..."
npm install --prefix "$ROOT_DIR/mechanic-app"

# Ensure concurrently is available (use npx)
echo "=== Starting all services concurrently ==="

npx concurrently \
  "npm run dev --prefix $ROOT_DIR/backend" \
  "npm start --prefix $ROOT_DIR/customer-app" \
  "npm start --prefix $ROOT_DIR/mechanic-app"
