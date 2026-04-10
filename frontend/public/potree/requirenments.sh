#!/usr/bin/env bash
set -e

echo "=============================="
echo " Instalando requisitos sistema"
echo "=============================="

sudo apt update
sudo apt install -y \
  curl \
  build-essential \
  liblaszip8 \
  liblaszip-dev \
  pdal \
  git

echo "=============================="
echo " Instalando NVM + Node 20"
echo "=============================="

# Instalar nvm si no existe
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"

nvm install 20
nvm use 20
nvm alias default 20

echo "Node version:"
node -v
npm -v

echo "=============================="
echo " Instalando dependencias npm"
echo "=============================="

rm -rf node_modules package-lock.json
npm install

echo "=============================="
echo " Todo instalado correctamente"
echo "=============================="
echo
echo "Siguientes pasos:"
echo "  Terminal 1: ./run_backend.sh"
echo "  Terminal 2: ./run_frontend.sh"
