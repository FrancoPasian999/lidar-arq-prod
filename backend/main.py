from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import os
import shutil
from typing import List, Optional
from pydantic import BaseModel
from celery.result import AsyncResult

# Spatial libraries are optional for local development
try:
    import laspy
    HAS_LASPY = True
except ImportError:
    HAS_LASPY = False
    print("[WARNING] laspy not found. LiDAR parsing will be mocked.")

try:
    import pdal
    HAS_PDAL = True
except ImportError:
    HAS_PDAL = False
    print("[WARNING] pdal not found. Spatial pipelines will be mocked.")

try:
    import open3d
    HAS_OPEN3D = True
except ImportError:
    HAS_OPEN3D = False
    print("[WARNING] open3d not found. 3D features will be mocked.")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECTS_DIR = "projects"
DB_FILE = os.path.join(PROJECTS_DIR, "projects.json")
os.makedirs(PROJECTS_DIR, exist_ok=True)

def load_db():
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, "r") as f:
            return json.load(f)
    except:
        return []

def save_db(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=4)

# Mount projects as static files to serve metadata.json and point clouds
app.mount("/projects_static", StaticFiles(directory=PROJECTS_DIR), name="projects_static")

class Project(BaseModel):
    id: str
    name: str
    client: str
    type: str
    address: Optional[str] = None
    levels: int = 1

@app.get("/projects", response_model=List[Project])
async def get_projects():
    return load_db()
@app.post("/projects", response_model=Project)
async def create_project(project: Project):
    db = load_db()
    # Check if exists
    if any(p["id"] == project.id for p in db):
        return project
    
    db.append(project.dict())
    save_db(db)
    
    # Create directory structure
    project_dir = os.path.join(PROJECTS_DIR, project.id)
    os.makedirs(os.path.join(project_dir, "raw"), exist_ok=True)
    os.makedirs(os.path.join(project_dir, "processed"), exist_ok=True)
    os.makedirs(os.path.join(project_dir, "potree"), exist_ok=True)
    
    return project

@app.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, data: dict):
    db = load_db()
    for p in db:
        if p["id"] == project_id:
            p.update(data)
            save_db(db)
            return p
    raise HTTPException(status_code=404, detail="Project not found")

@app.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    db = load_db()
    new_db = [p for p in db if p["id"] != project_id]
    if len(new_db) == len(db):
        raise HTTPException(status_code=404, detail="Project not found")
    save_db(new_db)
    return {"status": "deleted"}

@app.post("/projects/{project_id}/upload")
async def upload_file(project_id: str, file: UploadFile = File(...)):
    raw_dir = os.path.join(PROJECTS_DIR, project_id, "raw")
    os.makedirs(raw_dir, exist_ok=True)
    file_path = os.path.join(raw_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # In a real app, we would save metadata to a DB here
    return {"filename": file.filename, "status": "ready", "size": os.path.getsize(file_path)}

@app.get("/projects/{project_id}/files")
async def list_files(project_id: str):
    raw_dir = os.path.join(PROJECTS_DIR, project_id, "raw")
    processed_dir = os.path.join(PROJECTS_DIR, project_id, "processed")
    
    if not os.path.exists(raw_dir):
        return []
    
    files_list = []
    for f in os.listdir(raw_dir):
        path = os.path.join(raw_dir, f)
        if os.path.isfile(path):
            # Check if processed version exists
            status = "ready"
            if os.path.exists(os.path.join(processed_dir, f)):
                status = "processed"
                
            files_list.append({
                "name": f,
                "size": f"{os.path.getsize(path) / (1024*1024):.1f} MB",
                "date": "2024-03-23", # Mock date
                "status": status
            })
    return files_list

class ProcessRequest(BaseModel):
    filename: str

@app.post("/projects/{project_id}/process")
async def process_file(project_id: str, request: ProcessRequest):
    from tasks import process_lidar
    # Dispatch to Celery
    task = process_lidar.delay(project_id, request.filename)
    return {"task_id": task.id, "status": "queued"}

@app.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """
    Check the status of a Celery task.
    """
    from tasks import celery_app
    result = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None
    }

@app.get("/projects/{project_id}/ensure-potree/{filename}")
async def ensure_potree(project_id: str, filename: str):
    """
    Check if Potree Octree exists for this file. If not, trigger conversion.
    Returns the URL to metadata.json once it's (eventually) ready.
    """
    potree_dir = os.path.join(PROJECTS_DIR, project_id, "potree", filename)
    metadata_path = os.path.join(potree_dir, "metadata.json")
    
    # Path prioritization: same logic as in tasks.py
    raw_path = os.path.join(PROJECTS_DIR, project_id, "raw", filename)
    processed_path = os.path.join(PROJECTS_DIR, project_id, "processed", filename)
    source_path = processed_path if os.path.exists(processed_path) else raw_path

    if os.path.exists(metadata_path):
        # Use simple timestamp check to detect if raw/processed was updated
        source_mtime = os.path.getmtime(source_path)
        potree_mtime = os.path.getmtime(metadata_path)
        
        if source_mtime < potree_mtime:
            return {
                "status": "ready", 
                "url": f"http://localhost:8000/projects_static/{project_id}/potree/{filename}/metadata.json"
            }
        else:
            print(f"[API] Potree cache for {filename} is STALE. Re-triggering conversion.")
    
    # Trigger conversion via Celery only if not already ready OR if stale
    # In a real app we'd check if a task is already active in Redis
    # Simplified here: we'll check metadata_path which we already did
    from tasks import generate_potree
    task = generate_potree.delay(project_id, filename)
    
    return {
        "status": "processing", 
        "task_id": task.id,
        "message": "Conversión iniciada. Por favor espere."
    }

@app.post("/projects/{project_id}/config/{filename}")
async def save_config(project_id: str, filename: str, config: dict):
    """
    Save Potree configuration for a specific file.
    """
    potree_dir = os.path.join(PROJECTS_DIR, project_id, "potree", filename)
    os.makedirs(potree_dir, exist_ok=True)
    
    config_path = os.path.join(potree_dir, "potree_config.json")
    with open(config_path, "w") as f:
        json.dump(config, f, indent=4)
    return {"status": "saved", "path": config_path}

@app.get("/projects/{project_id}/config/{filename}")
async def get_config(project_id: str, filename: str):
    """
    Load Potree configuration for a specific file.
    """
    config_path = os.path.join(PROJECTS_DIR, project_id, "potree", filename, "potree_config.json")
    if not os.path.exists(config_path):
        return {"status": "none"}
    
    with open(config_path, "r") as f:
        return json.load(f)

@app.delete("/projects/{project_id}/files/{filename}")
async def delete_file(project_id: str, filename: str):
    """
    Delete a file and all its associated assets (raw, processed, potree).
    """
    raw_path = os.path.join(PROJECTS_DIR, project_id, "raw", filename)
    processed_path = os.path.join(PROJECTS_DIR, project_id, "processed", filename)
    potree_dir = os.path.join(PROJECTS_DIR, project_id, "potree", filename)

    # 1. Delete RAW
    if os.path.exists(raw_path):
        os.remove(raw_path)
    
    # 2. Delete PROCESSED
    if os.path.exists(processed_path):
        os.remove(processed_path)
        
    # 3. Delete POTREE (directory)
    if os.path.exists(potree_dir):
        import shutil
        if os.path.isdir(potree_dir):
            shutil.rmtree(potree_dir, ignore_errors=True)
        else:
            os.remove(potree_dir)
            
    return {"status": "deleted", "filename": filename}
    
@app.post("/projects/{project_id}/planes/{filename}")
async def save_planes_config(project_id: str, filename: str, planes: list = Body(...)):
    """
    Save the planes JSON configuration for a specific LAS file.
    """
    planes_dir = os.path.join(PROJECTS_DIR, project_id, "planes")
    os.makedirs(planes_dir, exist_ok=True)
    
    config_path = os.path.join(planes_dir, f"{filename}.json")
    with open(config_path, "w") as f:
        json.dump(planes, f, indent=4)
    return {"status": "saved", "count": len(planes)}

@app.get("/projects/{project_id}/planes/{filename}")
async def get_planes_config(project_id: str, filename: str):
    """
    Load the planes JSON configuration for a specific LAS file.
    """
    config_path = os.path.join(PROJECTS_DIR, project_id, "planes", f"{filename}.json")
    if not os.path.exists(config_path):
        return []
    
    with open(config_path, "r") as f:
        return json.load(f)

@app.post("/projects/{project_id}/generate-sections")
async def generate_sections(project_id: str, request: dict = Body(...)):
    """
    Generate 2D cross-sections from original LAS file based on planes.
    """
    filename = request.get("filename")
    planes = request.get("planes", [])
    thickness_override = request.get("thickness_override")
    
    if not filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    
    # Prioritize path resolution: processed > raw
    raw_path = os.path.join(PROJECTS_DIR, project_id, "raw", filename)
    processed_path = os.path.join(PROJECTS_DIR, project_id, "processed", filename)
    source_path = processed_path if os.path.exists(processed_path) else raw_path
    
    if not os.path.exists(source_path):
        raise HTTPException(status_code=404, detail=f"LAS file not found: {source_path}")

    # For now, we'll implement the clipper in a separate module or inline if small.
    # We return the projected 2D points for each plane.
    
    from scripts.section_clipper import extract_sections
    try:
        results = extract_sections(source_path, planes, thickness_override)
        return {"status": "success", "sections": results}
    except Exception as e:
        print(f"[ERROR] Section generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")

@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await websocket.accept()
    try:
        # Initial status
        await websocket.send_text(json.dumps({"type": "status", "message": "Backend connected", "worker": "active"}))
        
        while True:
            data = await websocket.receive_text()
            request = json.loads(data)
            
            if request.get("command") == "run_pipeline":
                logs = [
                    "[SYSTEM] Initializing spatial environment...",
                    "[PDAL] Parsing project_config.json",
                    "[LASPY] Reading point cloud metadata...",
                    "[LASPY] Point count: 12,458,920",
                    "[CSF] Applying Cloth Simulation Filter...",
                    "[CSF] Progress: 25%...",
                    "[CSF] Progress: 75%...",
                    "[CSF] Extracted 4.5M ground points.",
                    "[SOR] Removing noise (StdDev=2.0)...",
                    "[SOR] Removed 64,231 outlier points.",
                    "[IO] Writing processed files to Disk...",
                    "[SUCCESS] Pipeline execution complete."
                ]
                
                for log in logs:
                    await asyncio.sleep(0.5)
                    await websocket.send_text(json.dumps({"type": "log", "message": log}))
            
    except WebSocketDisconnect:
        print("WebSocket disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
