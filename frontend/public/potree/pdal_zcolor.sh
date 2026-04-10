#!/usr/bin/env bash
set -e

if [ $# -lt 4 ]; then
  echo "Uso: $0 input.las output_colored_pf3.las ZMIN ZMAX"
  echo "Ej:  $0 escaneo_final.las escaneo_zcolor_pf3.las 0 30"
  exit 1
fi

IN="$1"
OUT="$2"
ZMIN="$3"
ZMAX="$4"

source "$HOME/miniforge3/etc/profile.d/conda.sh"
conda activate pdalfull

PYDIR="$(mktemp -d /tmp/pdal_py_XXXXXX)"
PYMOD="zcolor"
PYFILE="$PYDIR/$PYMOD.py"

cat > "$PYFILE" <<PY
import numpy as np

ZMIN = float("$ZMIN")
ZMAX = float("$ZMAX")
DEN = (ZMAX - ZMIN) if (ZMAX - ZMIN) != 0 else 1.0

def z_to_rgb(ins, outs):
    z = ins["Z"].astype(np.float64)
    z01 = (z - ZMIN) / DEN
    z01 = np.clip(z01, 0.0, 1.0)

    outs["Red"]   = (z01 * 65535.0).astype(np.uint16)
    outs["Green"] = np.zeros_like(outs["Red"], dtype=np.uint16)
    outs["Blue"]  = ((1.0 - z01) * 65535.0).astype(np.uint16)
    return True
PY

export PYTHONPATH="$PYDIR:${PYTHONPATH:-}"

# Estrategia:
# 1) Correr filters.python SIN add_dimension (para que no cree dims float64)
# 2) writers.las fuerza extra_dims a uint16 (declara tipos correctos)
pdal pipeline --stdin <<EOF
{
  "pipeline":[
    "$IN",
    {
      "type": "filters.python",
      "module": "$PYMOD",
      "script": "$PYFILE",
      "function": "z_to_rgb"
    },
    {
      "type": "writers.las",
      "filename": "$OUT",
      "format": 3,
      "extra_dims": "Red=uint16,Green=uint16,Blue=uint16"
    }
  ]
}
EOF

rm -rf "$PYDIR"

echo "OK -> $OUT"
echo "Check (primer punto):"
pdal info "$OUT" -p 0 | head -n 80
