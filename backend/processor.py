import sys
import time
import argparse
import os
import subprocess

def main():
    parser = argparse.ArgumentParser(description="LidarArch LiDAR Pre-processor")
    parser.add_argument("--project", required=True, help="Project ID")
    parser.add_argument("--file", required=True, help="Input filename")
    
    args = parser.parse_args()
    
    project_id = args.project
    filename = args.file
    
    # Directorios de trabajo
    input_path = os.path.join("projects", project_id, "raw", filename)
    output_dir = os.path.join("projects", project_id, "processed")
    output_path = os.path.join(output_dir, filename)
    
    print(f"[PROCESSOR] Iniciando orquestación de pre-procesamiento para el proyecto: {project_id}")
    print(f"[PROCESSOR] Archivo de entrada: {input_path}")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. ORQUESTADOR CENTRAL
    print("[PROCESSOR] Llamando a LidarArch Preprocessing Orchestrator (scripts/preprocessing/main.py)...")
    
    # Apuntamos al nuevo main.py
    script_path = os.path.join("scripts", "preprocessing", "main.py")
    
    cmd = [
        "python3",
        script_path,
        "--input", input_path,
        "--output", output_path
    ]
    
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        
        # Canalización de logs del orquestador y los sub-scripts
        for line in process.stdout:
            print(f"[PRE-PROCESS] {line.strip()}")
            
        process.wait()
        
        if process.returncode != 0:
            print(f"[ERROR] El orquestador de pre-procesamiento falló con código {process.returncode}")
            sys.exit(1)
            
    except Exception as e:
        print(f"[ERROR] Excepción durante la ejecución: {str(e)}")
        sys.exit(1)
    
    print(f"[PROCESSOR] Pre-procesamiento completado. Resultado en: {output_path}")

if __name__ == "__main__":
    main()
