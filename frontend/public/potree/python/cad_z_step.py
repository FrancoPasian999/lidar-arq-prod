import laspy
import numpy as np
import pyvista as pv
import matplotlib.pyplot as plt
import argparse
import os

def process_slices(input_path, slices_count, thickness, resolution):
    if not os.path.exists(input_path):
        print(f"❌ Error: El archivo {input_path} no existe.")
        return

    print(f"📖 Leyendo archivo LAS: {input_path}")
    las = laspy.read(input_path)
    points = np.vstack((las.x, las.y, las.z)).T

    # Limites globales
    z_min, z_max = points[:, 2].min(), points[:, 2].max()
    x_min, x_max = points[:, 0].min(), points[:, 0].max()
    y_min, y_max = points[:, 1].min(), points[:, 1].max()
    
    print(f"📊 Nube cargada: {len(points)} puntos.")
    print(f"📐 Limites globales -> Z: [{z_min:.2f}, {z_max:.2f}] m")
    
    # Calcular pasos (espacios equidistantes)
    # Se divide el espacio total y se centran los cortes en el medio de cada fracción
    z_step = (z_max - z_min) / slices_count
    z_centers = [z_min + z_step * (i + 0.5) for i in range(slices_count)]
    
    # Calcular dimensiones de la imagen ortogonal asegurando que todas compartan el mismo Canvas
    width = int(np.ceil((x_max - x_min) / resolution))
    height = int(np.ceil((y_max - y_min) / resolution))

    for i, z in enumerate(z_centers):
        print(f"\n--- 🔪 Procesando Corte {i+1}/{slices_count} a Z = {z:.2f}m ---")
        
        # Filtrar puntos que caen dentro del grosor
        z_lower = z - (thickness / 2.0)
        z_upper = z + (thickness / 2.0)
        mask = (points[:, 2] >= z_lower) & (points[:, 2] <= z_upper)
        slice_points = points[mask]
        
        print(f"  Puntos en el corte: {len(slice_points)}")

        # 1. Plot 3D con PyVista
        print("  Mostrando 3D interactivo... (Cierra la ventana para continuar con la imagen 2D)")
        plotter = pv.Plotter(title=f"Corte {i+1} en Z={z:.2f}m", window_size=[1024, 768])
        plotter.set_background('black')
        
        # Nube principal en gris fantasmal (submuestreada visualmente para que PyVista no colapse la RAM)
        step_vis = max(1, len(points) // 500000) 
        bg_cloud = pv.PolyData(points[::step_vis])
        plotter.add_mesh(bg_cloud, color='lightgray', point_size=1.0, opacity=0.1)
        
        # Puntos del corte resaltados en rojo
        if len(slice_points) > 0:
            slice_cloud = pv.PolyData(slice_points)
            plotter.add_mesh(slice_cloud, color='red', point_size=4.0, render_points_as_spheres=True)
            
        plotter.show()

        # 2. Plot Imagen 2D Ortogonal (CAD)
        print("  Mostrando imagen ortogonal 2D... (Cierra matplotlib para continuar al siguiente corte)")
        
        if len(slice_points) > 0:
            x_pts = slice_points[:, 0]
            y_pts = slice_points[:, 1]
            
            # Matriz de densidades (Imagen Raster)
            img, _, _ = np.histogram2d(x_pts, y_pts, 
                                       bins=[width, height], 
                                       range=[[x_min, x_max], [y_min, y_max]])
            
            # Transponer para que el eje Y apunte correctamente hacia arriba
            img = img.T

            # Binarizar (0 vacío, 1 con punto)
            binary_img = img > 0
            
            # Mostrar usando matplotlib con escala bloqueada
            plt.figure(figsize=(10, 10))
            plt.imshow(binary_img, origin='lower', extent=[x_min, x_max, y_min, y_max], cmap='binary')
            plt.title(f"Planta CAD - Corte {i+1}/{slices_count} a Z = {z:.2f}m\n(Grosor: {thickness}m, Escala_pixel: {resolution}m)")
            plt.xlabel("X (metros)")
            plt.ylabel("Y (metros)")
            plt.axis('equal') # CRÍTICO: Esto garantiza que 1 metro en X se dibuje igual a 1 metro en Y
            plt.grid(True, linestyle=':', alpha=0.5)
            plt.tight_layout()
            plt.show()
        else:
            print("  [!] No hay puntos suficientes en este corte para generar el plano 2D.")

    print("\n✅ Todos los cortes finalizados.")

if __name__ == "__main__":
    # Requiere instalar matplotlib si no se tiene: pip install matplotlib
    parser = argparse.ArgumentParser(description="Generador interactivo de cortes ortogonales para CAD (Slicing en Z).")
    parser.add_argument("--input", required=True, help="Ruta al archivo .las generado")
    parser.add_argument("--slices", type=int, default=5, help="Número de cortes equidistantes desde z_min hasta z_max")
    parser.add_argument("--thickness", type=float, default=0.1, help="Grosor del corte, en metros, para atrapar puntos (P. ej: 0.1)")
    parser.add_argument("--res", type=float, default=0.05, help="Metros por píxel para la imagen ortogonal (P. ej: 0.05 = 5cm por pixel)")

    args = parser.parse_args()
    
    try:
        process_slices(args.input, args.slices, args.thickness, args.res)
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nTIP: Asegúrate de tener instalado matplotlib: pip install matplotlib")
