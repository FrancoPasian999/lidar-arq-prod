#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import numpy as np
import laspy
import open3d as o3d
from scipy.spatial import cKDTree
import os
import sys

def run_floor_segmentation(input_path, output_path, voxel_size=0.08, tol=5.0):
    """
    Función principal para segmentación de suelo y clustering.
    Diseñada para ser llamada desde un orquestador (main.py).
    """
    print(f"  [STEP: FLOOR] Procesando: {os.path.basename(input_path)}")
    
    # 1. CARGAR DATOS
    las_mem = laspy.read(input_path)
    pts_orig = np.vstack((las_mem.x, las_mem.y, las_mem.z)).T
    num_pts = len(pts_orig)

    # 2. SEGMENTACIÓN
    pcd_full = o3d.geometry.PointCloud(o3d.utility.Vector3dVector(pts_orig))
    pcd_small = pcd_full.voxel_down_sample(voxel_size)
    del pcd_full 

    pcd_small.estimate_normals(o3d.geometry.KDTreeSearchParamHybrid(radius=voxel_size*3, max_nn=30))
    pts_small = np.asarray(pcd_small.points)
    normals_small = np.asarray(pcd_small.normals)
    
    # REGION GROWING
    kdtree_small = o3d.geometry.KDTreeFlann(pcd_small)
    labels_small = np.full(len(pts_small), -1, dtype=int)
    cluster_id = 1
    cos_thresh = np.cos(np.deg2rad(tol))

    for i in range(len(pts_small)):
        if labels_small[i] != -1: continue
        labels_small[i] = cluster_id
        queue = [i]
        while queue:
            curr = queue.pop(0)
            [_, idxs, _] = kdtree_small.search_radius_vector_3d(pts_small[curr], voxel_size*1.5)
            for n_idx in idxs:
                if labels_small[n_idx] == -1:
                    if abs(np.dot(normals_small[curr], normals_small[n_idx])) > cos_thresh:
                        labels_small[n_idx] = cluster_id
                        queue.append(n_idx)
        cluster_id += 1

    # Aleatorizar IDs
    unique_ids = np.unique(labels_small)
    random_ids = np.arange(len(unique_ids), dtype=np.uint32)
    np.random.shuffle(random_ids)
    labels_small = (random_ids[np.searchsorted(unique_ids, labels_small)] % 65535).astype(np.uint16)
    
    tree = cKDTree(pts_small)

    # 3. ESCRITURA
    chunk_size = 1000000
    with laspy.open(output_path, mode="w", header=las_mem.header) as writer:
        for start_idx in range(0, num_pts, chunk_size):
            end_idx = min(start_idx + chunk_size, num_pts)
            points_chunk = las_mem.points[start_idx:end_idx]
            chunk_coords = pts_orig[start_idx:end_idx]
            
            _, indices = tree.query(chunk_coords, k=1)
            chunk_labels = labels_small[indices]
            chunk_normals = normals_small[indices]
            
            points_chunk.intensity = chunk_labels
            is_floor = np.abs(chunk_normals[:, 2]) > 0.85
            points_chunk.classification = np.where(is_floor, 2, 1).astype(np.uint8)
            
            writer.write_points(points_chunk)
            
    print(f"  [STEP: FLOOR] OK -> {os.path.basename(output_path)}")
    return True

if __name__ == "__main__":
    # Soporte para ejecución directa si fuera necesario
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    run_floor_segmentation(args.input, args.output)
