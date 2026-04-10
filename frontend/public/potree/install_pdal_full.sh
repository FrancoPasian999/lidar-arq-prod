#!/usr/bin/env bash
set -e

echo "== System deps =="
sudo apt update
sudo apt install -y curl bzip2 ca-certificates

echo "== Install Miniforge (conda-forge) if missing =="
if [ ! -d "$HOME/miniforge3" ]; then
  ARCH="$(uname -m)"
  if [ "$ARCH" = "x86_64" ]; then
    MINIFORGE="Miniforge3-Linux-x86_64.sh"
  elif [ "$ARCH" = "aarch64" ]; then
    MINIFORGE="Miniforge3-Linux-aarch64.sh"
  else
    echo "Unsupported arch: $ARCH"
    exit 1
  fi

  curl -L -o /tmp/$MINIFORGE "https://github.com/conda-forge/miniforge/releases/latest/download/$MINIFORGE"
  bash /tmp/$MINIFORGE -b -p "$HOME/miniforge3"
fi

# shell hook
source "$HOME/miniforge3/etc/profile.d/conda.sh"

echo "== Create env pdalfull (or update) =="
if conda env list | awk '{print $1}' | grep -qx "pdalfull"; then
  echo "Env 'pdalfull' already exists. Updating..."
  conda activate pdalfull
  conda install -y -c conda-forge pdal python
else
  conda create -y -n pdalfull -c conda-forge pdal python
  conda activate pdalfull
fi

echo "== PDAL in env =="
pdal --version
pdal --drivers | grep -E "filters.expression|filters.colorinterp|filters.assign|writers.las|readers.las" || true

echo
echo "OK. Next:"
echo "  source ~/miniforge3/etc/profile.d/conda.sh"
echo "  conda activate pdalfull"
