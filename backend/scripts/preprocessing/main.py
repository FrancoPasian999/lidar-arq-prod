import os
import sys
import argparse
import time
import json
import subprocess
import tempfile

# Importamos los pasos de procesamiento
from floor_segmentation import run_floor_segmentation

def run_pdal_downsample(input_path, output_path, radius=0.01):
    """
    Realiza un downsampling inicial usando PDAL filters.sample.
    """
    print(f"  [STEP: PDAL] Realizando downsampling (Radius: {radius}m)")
    
    pipeline = [
        input_path,
        {
            "type": "filters.sample",
            "radius": radius
        },
        output_path
    ]
    
    pipeline_json = json.dumps(pipeline)
    
    try:
        # Usamos stdin para pasar el pipeline a pdal para evitar archivos temporales extra si es posible,
        # pero pdal pipeline suele preferir un archivo o leer de stdin con un truco.
        # Lo más robusto es un archivo temporal para el JSON del pipeline.
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tf:
            tf.write(pipeline_json)
            pipeline_file = tf.name
            
        cmd = ["pdal", "pipeline", pipeline_file]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        os.unlink(pipeline_file)
        
        if result.returncode != 0:
            print(f"  [STEP: PDAL] [ERROR] PDAL falló: {result.stderr}")
            return False
            
        return True
    except Exception as e:
        print(f"  [STEP: PDAL] [EXCEPTION] {e}")
        return False

def run_pipeline(input_path, output_path):
    """
    Orquestador principal del pre-procesamiento LiDAR.
    Aquí se pueden añadir o quitar pasos de forma sencilla.
    """
    print(f"\n[PIPELINE] >>> Iniciando cadena de procesamiento para: {os.path.basename(input_path)}")
    start_time = time.time()
    
    # 1. DEFINICIÓN DE PASOS
    
    # Ruta temporal para el archivo downsampleado
    temp_downsampled = output_path + ".downsampled.las"
    
    # PASO 1: PDAL Downsampling (Radius: 0.01)
    print("[PIPELINE] Paso 1: PDAL Downsampling (Radius: 0.01)")
    if not run_pdal_downsample(input_path, temp_downsampled, radius=0.01):
        print("[PIPELINE] Error en el Paso 1. Abortando.")
        return False

    # PASO 2: Segmentación de Suelo y Clustering
    print("[PIPELINE] Paso 2: Segmentación de Suelo y Clustering (Voxel: 0.08)")
    try:
        # Usamos el archivo de PDAL como entrada para la segmentación
        success = run_floor_segmentation(temp_downsampled, output_path, voxel_size=0.08, tol=5.0)
        
        # Opcional: Eliminar el temporal
        if os.path.exists(temp_downsampled):
            os.remove(temp_downsampled)
            
        if not success:
            print("[PIPELINE] Error en el Paso 2. Abortando.")
            return False
    except Exception as e:
        print(f"[PIPELINE] Excepción en Paso 2: {e}")
        if os.path.exists(temp_downsampled):
            os.remove(temp_downsampled)
        return False

    # PASO 2: (Ejemplo: Filtrado de Ruido - Descomentar cuando exista)
    # print("[PIPELINE] Paso 2: Filtrado de Ruido Outliers")
    # run_noise_filter(output_path, output_path) # Sobreescribimos el procesado

    end_time = time.time()
    print(f"[PIPELINE] <<< Cadena completada con éxito en {end_time - start_time:.2f}s")
    print(f"[PIPELINE] Resultado final en: {output_path}\n")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LidarArch Preprocessing Orchestrator")
    parser.add_argument("--input", required=True, help="Archivo .las de entrada")
    parser.add_argument("--output", required=True, help="Archivo .las de salida")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"[PIPELINE] [ERROR] El archivo de entrada no existe: {args.input}")
        sys.exit(1)
        
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    
    success = run_pipeline(args.input, args.output)
    if not success:
        sys.exit(1)
