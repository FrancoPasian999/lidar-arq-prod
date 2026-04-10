import laspy
import numpy as np
import open3d as o3d
import pyvista as pv
import argparse
import random
import os

def extract_planes(input_path, max_planes=10, distance_threshold=0.1, voxel_size=0.0):
    if not os.path.exists(input_path):
        print(f"❌ Error: El archivo {input_path} no existe.")
        return

    print(f"📖 Leyendo archivo LAS: {input_path}")
    las = laspy.read(input_path)
    points = np.vstack((las.x, las.y, las.z)).T

    # Crear objeto PointCloud de Open3D para el cálculo RANSAC
    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(points)

    total_points = len(pcd.points)
    print(f"📊 Puntos totales: {total_points}")

    # Submuestreo para agilizar si es necesario
    if voxel_size > 0:
        print(f"⚙️ Submuestreando nube (voxel size={voxel_size})...")
        pcd = pcd.voxel_down_sample(voxel_size)
    
    rest_pcd = pcd
    plane_data_list = []
    
    print(f"🚀 Iniciando detección RANSAC + DBSCAN (máximo {max_planes} planos)...")
    
    for i in range(max_planes):
        if len(rest_pcd.points) < 100:  # Detener si quedan muy pocos puntos
            break
            
        try:
            plane_model, inliers = rest_pcd.segment_plane(
                distance_threshold=distance_threshold,
                ransac_n=3,
                num_iterations=1000
            )
        except Exception as e:
            break
            
        plane_pcd = rest_pcd.select_by_index(inliers)
        
        # 2. DBSCAN: Encontrar trozos continuos (evita juntar paredes separadas)
        eps = distance_threshold * 4.0 
        labels = np.array(plane_pcd.cluster_dbscan(eps=eps, min_points=10, print_progress=False))
        
        if len(labels) == 0 or labels.max() < 0:
            rest_pcd = rest_pcd.select_by_index(inliers, invert=True)
            continue
            
        # 3. Quedarnos únicamente con el grupo contiguo más grande
        largest_cluster_id = np.argmax(np.bincount(labels[labels >= 0]))
        cluster_indices = np.where(labels == largest_cluster_id)[0]
        
        # 4. Mapear de vuelta a los índices originales para eliminarlos
        cluster_inliers = np.array(inliers)[cluster_indices]
        cluster_pcd = rest_pcd.select_by_index(cluster_inliers)
        
        [a, b, c, d] = plane_model
        print(f" [+] Plano contiguo {i+1} detectado | Puntos: {len(cluster_indices)}")
        
        # 5. Representación sólida en PyVista (Convex Hull para evitar colapsos de RAM/Delaunay)
        color = [random.random(), random.random(), random.random()]
        
        try:
            # Encontrar el contorno envolvente 3D (mucho más rápido y estable que Delaunay)
            hull, _ = cluster_pcd.compute_convex_hull()
            
            # Convertir malla de Open3D a PyVista
            vertices = np.asarray(hull.vertices)
            triangles = np.asarray(hull.triangles)
            
            # PyVista requiere que las caras indiquen cuántos vértices tienen [3, v1, v2, v3]
            faces = np.hstack([[3, t[0], t[1], t[2]] for t in triangles])
            
            surf = pv.PolyData(vertices, faces)
            plane_data_list.append({'mesh': surf, 'color': color})
        except:
            # Fallback en caso de que el plano sea muy irregular
            cloud_pv = pv.PolyData(np.asarray(cluster_pcd.points))
            plane_data_list.append({'mesh': cloud_pv, 'color': color})
            
        # Eliminar el cluster de la nube principal
        rest_pcd = rest_pcd.select_by_index(cluster_inliers, invert=True)

    print(f"✅ Detección finalizada. Renderizando {len(plane_data_list)} planos con PyVista...")
    
    # --- VISUALIZACIÓN CON PYVISTA ---
    plotter = pv.Plotter(title="Planos RANSAC + DBSCAN", window_size=[1280, 720])
    plotter.set_background('black')

    # Añadir los planos como mallas sólidas
    for data in plane_data_list:
        plotter.add_mesh(data['mesh'], color=data['color'], show_edges=False, opacity=0.8)

    # Puntos sobrantes sin pintar (blanco semitransparente)
    if len(rest_pcd.points) > 0:
        rest_points = np.asarray(rest_pcd.points)
        rest_cloud = pv.PolyData(rest_points)
        plotter.add_mesh(rest_cloud, color='white', point_size=1.0, opacity=0.1)

    plotter.show()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extraer planos de un archivo LAS usando RANSAC y visualizarlos con PyVista.")
    parser.add_argument("--input", required=True, help="Ruta al archivo .las generado")
    parser.add_argument("--planes", type=int, default=10, help="Número máximo de planos a detectar")
    parser.add_argument("--dist", type=float, default=0.1, help="Umbral de distancia RANSAC (típicamente 0.05 a 0.2)")
    parser.add_argument("--voxel", type=float, default=0.0, help="Tamaño de voxel para submuestreo")

    args = parser.parse_args()
    
    try:
        extract_planes(args.input, args.planes, args.dist, args.voxel)
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nTIP: Asegúrate de tener instalado pyvista: pip install pyvista open3d")
