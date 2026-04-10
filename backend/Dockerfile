# Backend Setup using Ubuntu for better spatial support
FROM ubuntu:22.04

# Avoid interaction during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies for spatial processing and Python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    pdal \
    libpdal-dev \
    cmake \
    ninja-build \
    git \
    g++ \
    libgl1 \
    libgomp1 \
    cython3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# We need to install numpy<2.0, cython and scikit-build first because older PDAL versions 
# are incompatible with NumPy 2.0 and trigger build errors if isolation is enabled.
RUN python3 -m pip install --no-cache-dir "numpy<2.0" cython scikit-build

# Install PDAL without build isolation to force it to use the pinned NumPy 1.x
RUN python3 -m pip install --default-timeout=1000 --no-cache-dir --no-build-isolation "pdal==2.4.2"

# Install Open3D separately because it is very large (450MB) and prone to timeouts
RUN python3 -m pip install --default-timeout=1000 --no-cache-dir open3d

# Install the rest of the requirements
COPY requirements.txt ./
# Remove open3d from requirements.txt if present to avoid redundancy, or just let pip skip it
RUN python3 -m pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

COPY . .

# Default command for FastAPI
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
