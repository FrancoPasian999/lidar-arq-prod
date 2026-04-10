import laspy
import numpy as np
import os

def extract_sections(las_path, planes, thickness_override=None):
    """
    Extracts 2D cross-sections from a LAS file based on multiple oriented planes.
    """
    if not os.path.exists(las_path):
        raise FileNotFoundError(f"LAS file not found at {las_path}")

    print(f"[CLIPPER] Reading LAS: {las_path}")
    with laspy.open(las_path) as fh:
        las = fh.read()
        
    points = np.vstack((las.x, las.y, las.z)).T
    # Sample if too many points for speed (can be adjusted)
    MAX_POINTS = 5000000
    if len(points) > MAX_POINTS:
        print(f"[CLIPPER] Sampling {len(points)} to {MAX_POINTS} for performance")
        indices = np.random.choice(len(points), MAX_POINTS, replace=False)
        points = points[indices]

    results = []

    for plane in planes:
        name = plane.get("name", "Unnamed")
        thickness = thickness_override if thickness_override is not None else plane.get("thickness", 0.05)
        scale = plane.get("scale", [10, 10, thickness])
        
        # Potree/Three.js matrixWorld is 16 floats (column-major)
        mw = np.array(plane.get("matrixWorld")).reshape((4, 4), order='F')
        
        # We need the inverse to bring points into the plane's local space
        mw_inv = np.linalg.inv(mw)
        
        # Add 1 to points for matrix multiplication [x, y, z, 1]
        ones = np.ones((points.shape[0], 1))
        points_h = np.hstack((points, ones))
        
        # Transform points to local space
        local_points = (mw_inv @ points_h.T).T
        
        # Clip by local bounds (assuming unit box [-0.5, 0.5] in Three.js BoxGeometry)
        # Note: scale is already included in matrixWorld if using Potree's matrix
        # However, BoxVolume in Potree uses a 1x1x1 geometry and matrix handles the scale.
        
        mask = (
            (local_points[:, 0] > -0.5) & (local_points[:, 0] < 0.5) &
            (local_points[:, 1] > -0.5) & (local_points[:, 1] < 0.5) &
            (local_points[:, 2] > -0.5) & (local_points[:, 2] < 0.5)
        )
        
        if thickness_override is not None:
             # If override is active, we might need to ignore the Z-scale from matrixWorld
             # but matrixWorld already has thickness baked in. 
             # To override, we scale the local Z.
             # Current local Z is in range [-0.5, 0.5]. 
             # Original thickness was plane.scale.z.
             original_thickness = plane.get("scale")[2]
             ratio = thickness / original_thickness
             mask = (
                (local_points[:, 0] > -0.5) & (local_points[:, 0] < 0.5) &
                (local_points[:, 1] > -0.5) & (local_points[:, 1] < 0.5) &
                (local_points[:, 2] > -0.5 * ratio) & (local_points[:, 2] < 0.5 * ratio)
             )

        clipped = local_points[mask]
        
        # Project to 2D (using X and Y of the local space)
        # We also need to re-scale back to real meters for the drawing
        # since local_points are in normalized [-0.5, 0.5] space.
        
        real_x = clipped[:, 0] * scale[0]
        real_y = clipped[:, 1] * scale[1]
        
        results.append({
            "name": name,
            "points": np.column_stack((real_x, real_y)).tolist()
        })
        
    return results
