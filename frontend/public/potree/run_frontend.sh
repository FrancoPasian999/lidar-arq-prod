#!/usr/bin/env bash
set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

nvm use 20

echo "=============================="
echo " Iniciando FRONTEND (Vite)"
echo "=============================="

npm run dev
