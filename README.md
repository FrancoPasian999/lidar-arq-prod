# LidarArch - LiDAR & Photogrammetry Management System

LidarArch es una plataforma integral diseñada para la gestión, visualización y procesamiento avanzado de nubes de puntos LiDAR. Permite desde la ingesta de archivos `.las` hasta la generación de planos técnicos 2D y análisis de secciones transversales.

## 🚀 Inicio Rápido (Desde la carpeta lidar-arq-prod)

Para desplegar la aplicación completa, entra en esta carpeta y utiliza los siguientes comandos (recomendado):

```bash
# 1. Limpieza total de imágenes y contenedores previos (Opcional)
docker system prune -a -f

# 2. Detener servicios existentes
docker-compose down

# 3. Construir y levantar todo el sistema
# Nota: La compilación de Potree Viewer se realiza automáticamente dentro del container
docker-compose up --build
```

La aplicación estará disponible en:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Redis Insights**: `http://localhost:8001`

---

## 🏗️ Arquitectura del Sistema

Esta es la estructura oficial del repositorio. Todos los servicios y datos residen dentro de esta carpeta para facilitar el control de versiones y el despliegue.

1.  **Frontend (Next.js)**: Interfaz que integra un visor Potree 1.8 especializado.
2.  **Backend (FastAPI)**: API para gestión de proyectos y persistencia de planos.
3.  **Worker (Celery + PDAL/Laspy)**: Procesador en segundo plano para tareas de LiDAR.
4.  **Redis Stack**: Broker de mensajes para Celery.

---

## 🛠️ Herramientas Destacadas

### 1. Herramienta de Planos (Viewer)
Dentro del visor 3D, puedes definir planos de corte con inserción secuencial y gizmos de traducción especializados que mantienen el grosor del corte.

### 2. Generación de Secciones (CAD)
Genera cortes ortográficos 2D directamente del archivo `.las` original, visualizando puntos técnicos (negro sobre blanco) con grosor ajustable.

---

## 📁 Estructura del Repositorio

```text
repository/lidar-arq-prod/ (Root de Git)
├── projects/          # Directorio de DATOS (Ignorado en Git)
├── backend/           # FastAPI + Python scripts
├── frontend/          # Next.js App
├── docker-compose.yml
├── .gitignore         # Configuración de ignorado de Git
└── README.md
```

> [!IMPORTANT]
> El directorio `projects/` está incluido en el `.gitignore`. Aunque esté dentro de la carpeta del repositorio, sus contenidos (nubes de puntos de varios GB) no serán rastreados por Git. Esto permite una clonación rápida del código sin descargar los datos pesados vinculados.

---

## 📄 Licencia

Este proyecto utiliza una versión adaptada de [Potree](http://potree.org), licenciada bajo BSD-2-Clause.
