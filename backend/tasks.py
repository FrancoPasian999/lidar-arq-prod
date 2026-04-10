from celery import Celery
import time
import os
import subprocess

import os

# Configure Celery
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
celery_app = Celery(
    "tasks",
    broker=redis_url,
    backend=redis_url,
    broker_connection_retry_on_startup=True
)

@celery_app.task(name="process_lidar")
def process_lidar(project_id: str, file_name: str):
    print(f"Starting LiDAR processing for {file_name} in project {project_id}...")
    
    try:
        # Execute the unified processor script
        # In production, we'd use the absolute path or a module call
        cmd = [
            "python3", 
            "processor.py", 
            "--project", project_id, 
            "--file", file_name
        ]
        
        process = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.STDOUT,
            text=True
        )
        
        # Log output to the worker console
        for line in process.stdout:
            print(f"[WORKER LOG] {line.strip()}")
            
        process.wait()
        
        if process.returncode == 0:
            # Automatic trigger of Potree conversion after successful preprocessing
            generate_potree.delay(project_id, file_name)
            return {"status": "success", "project_id": project_id, "file_name": file_name}
        else:
            return {"status": "error", "error": "Processor failed", "code": process.returncode}
            
    except Exception as e:
        print(f"Task failed: {str(e)}")
        return {"status": "error", "message": str(e)}

@celery_app.task(name="generate_cad")
def generate_cad(project_id: str, z_offset: float):
    print(f"Slicing point cloud at Z={z_offset}m for project {project_id}...")
    time.sleep(10)
    print("DXF export complete.")
    return {"status": "success", "project_id": project_id, "output": f"slice_{z_offset}.dxf"}

@celery_app.task(name="generate_potree")
def generate_potree(project_id: str, file_name: str):
    """
    Run PotreeConverter on a .las/.laz file.
    It prioritizes the 'processed' directory if a pre-processed file exists.
    """
    raw_path = f"projects/{project_id}/raw/{file_name}"
    processed_path = f"projects/{project_id}/processed/{file_name}"
    
    # Path prioritization: use processed if available
    source_path = processed_path if os.path.exists(processed_path) else raw_path
    
    print(f"Source for PotreeConverter: {source_path}")
    
    out_dir = f"projects/{project_id}/potree/{file_name}"
    
    os.makedirs(os.path.dirname(out_dir), exist_ok=True)
    
    # Check if already exists and is UP TO DATE
    metadata_path = os.path.join(out_dir, "metadata.json")
    if os.path.exists(metadata_path):
        source_mtime = os.path.getmtime(source_path)
        potree_mtime = os.path.getmtime(metadata_path)
        
        if source_mtime < potree_mtime:
            print(f"Potree cache for {file_name} is up to date.")
            return {"status": "exists", "path": out_dir, "mtime": potree_mtime}
        else:
            print(f"Potree cache for {file_name} is STALE. Re-converting from {source_path}...")
            # Clear old data to avoid binary corruption or mixing nodes
            import shutil
            shutil.rmtree(out_dir, ignore_errors=True)
            # Re-create directory for conversion
            os.makedirs(out_dir, exist_ok=True)

    print(f"Converting {file_name} to Potree format...")
    
    # Path to binary inside container
    converter_bin = "/app/bin/PotreeConverter"
    
    if not os.path.exists(converter_bin):
        print(f"ERROR: PotreeConverter not found at {converter_bin}")
        return {"status": "error", "message": "PotreeConverter binary missing"}

    cmd = [
        converter_bin,
        source_path,
        "-o", out_dir
    ]
    
    try:
        process = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.STDOUT,
            text=True
        )
        
        for line in process.stdout:
            print(f"[POTREE-CONV] {line.strip()}")
            
        process.wait()
        
        if process.returncode == 0:
            return {"status": "success", "out_dir": out_dir}
        else:
            return {"status": "error", "code": process.returncode}
    except Exception as e:
        return {"status": "error", "message": str(e)}
