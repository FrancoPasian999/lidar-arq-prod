import os
import json
import numpy as np
import laspy
import glob
import argparse
from datetime import datetime

class PotreeToLasConverter:
    def __init__(self, session_id, search_dir="."):
        self.session_id = session_id
        self.search_dir = search_dir
        self.recipes = []

    def find_recipes(self):
        if os.path.exists(self.session_id):
            self.recipes = [self.session_id]
            return self.recipes
        direct_path = os.path.join(self.search_dir, self.session_id)
        if os.path.exists(direct_path):
            self.recipes = [direct_path]
            return self.recipes
        clean_id = self.session_id.replace("recipe_", "").replace(".json", "")
        pattern = os.path.join(self.search_dir, f"recipe_*{clean_id}*.json")
        self.recipes = glob.glob(pattern)
        return self.recipes

    def process_recipe(self, recipe_path):
        with open(recipe_path, 'r') as f:
            recipe = json.load(f)
        for pc_config in recipe['pointclouds']:
            self.convert_from_source(pc_config, recipe['clipVolumes'], recipe['segmentation'])

    def convert_from_source(self, pc_config, clip_volumes, segmentation):
        source_rel_path = pc_config.get('source_las')
        root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        pc_name = pc_config.get('name') or "default"
        
        source_las_path = None
        if source_rel_path:
            p = os.path.join(root_path, "public", "pointcloud", source_rel_path)
            if os.path.exists(p): source_las_path = p
            elif os.path.exists(source_rel_path): source_las_path = source_rel_path

        if not source_las_path or not os.path.exists(source_las_path):
            print(f"Error: Could not find source LAS.")
            return

        m_offset = np.array(pc_config.get('offset', [0, 0, 0]))
        
        with laspy.open(source_las_path) as fh:
            las = fh.read()

        points = np.vstack((las.x, las.y, las.z)).T
        num_points = len(points)

        # ---------------------------------------------------------
        # 1. APPLY BASE FILTERS (Non-Coordinate)
        # ---------------------------------------------------------
        print("Applying base attribute filters...")
        base_mask = np.ones(num_points, dtype=bool)

        # A. Segmentation IDs
        if segmentation.get('count', 0) > 0:
            filter_ids = set(segmentation['filterIds'])
            id_mask = np.zeros(num_points, dtype=bool)
            try: id_mask |= np.isin(las.intensity, list(filter_ids))
            except: pass
            try: id_mask |= np.isin(las.pt_src_id, list(filter_ids))
            except: pass
            base_mask &= id_mask
            print(f" - Filtered by {len(filter_ids)} segmentation IDs. {np.sum(base_mask)} points remaining.")

        # B. Classification Visibility
        class_vis = pc_config.get('classification', {})
        if class_vis:
            valid_classes = [int(k) for k, v in class_vis.items() if v and str(k).isdigit()]
            if len(valid_classes) < 32:
                class_mask = np.isin(las.classification, valid_classes)
                base_mask &= class_mask
                print(f" - Filtered by classifications: {valid_classes}. {np.sum(base_mask)} points remaining.")

        if np.sum(base_mask) == 0:
            print("No points passed the segmentation/classification filters. Skipping.")
            return

        # ---------------------------------------------------------
        # 2. STRATEGY: Try different coordinate alignments
        # ---------------------------------------------------------
        pc_matrix_orig = np.array(pc_config['matrixWorld']).reshape((4, 4), order='F')
        
        def test_alignment(pts, b_mask):
            mask = b_mask.copy()
            for vol in clip_volumes:
                if vol['type'] == "Box":
                    vol_matrix = np.array(vol['matrixWorld']).reshape((4, 4), order='F')
                    inv_vol_matrix = np.linalg.inv(vol_matrix)
                    world_h = np.hstack([pts, np.ones((len(pts), 1))])
                    local_vol_coords = (world_h @ inv_vol_matrix.T)[:, :3]
                    in_vol = np.all((local_vol_coords >= -0.5) & (local_vol_coords <= 0.5), axis=1)
                    if vol.get('clipTask', 2) == 2: mask &= in_vol
                    elif vol.get('clipTask', 2) == 3: mask &= (~in_vol)
            return mask

        ones = np.ones((num_points, 1))

        print("Testing Mode 1: LAS Points + MatrixWorld (Geographic/World)...")
        world_points_1 = (np.hstack([points, ones]) @ pc_matrix_orig.T)[:, :3]
        mask1 = test_alignment(world_points_1, base_mask)
        if np.any(mask1):
            print(f"Success in Mode 1! Found {np.sum(mask1)} points.")
            self.save_result(las, mask1, pc_name)
            return

        print("Testing Mode 2: LAS Points - Offset (Viewer Space)...")
        world_points_2 = points - m_offset
        mask2 = test_alignment(world_points_2, base_mask)
        if np.any(mask2):
            print(f"Success in Mode 2! Found {np.sum(mask2)} points.")
            self.save_result(las, mask2, pc_name)
            return

        print("Testing Mode 3: LAS Points directly (Local Space)...")
        mask3 = test_alignment(points, base_mask)
        if np.any(mask3):
            print(f"Success in Mode 3! Found {np.sum(mask3)} points.")
            self.save_result(las, mask3, pc_name)
            return

        print("Testing Mode 4: LAS Points + (MatrixWorld - Offset)...")
        pc_matrix_rel = pc_matrix_orig.copy()
        pc_matrix_rel[:3, 3] -= m_offset
        world_points_4 = (np.hstack([points - m_offset, ones]) @ pc_matrix_rel.T)[:, :3]
        mask4 = test_alignment(world_points_4, base_mask)
        if np.any(mask4):
            print(f"Success in Mode 4! Found {np.sum(mask4)} points.")
            self.save_result(las, mask4, pc_name)
            return

        print("Critical Error: No alignment strategy worked.")

    def save_result(self, las, mask, pc_name):
        filtered_indices = np.where(mask)[0]
        new_las = laspy.LasData(las.header)
        new_las.points = las.points[filtered_indices]
        output_filename = f"export_{pc_name}_{datetime.now().strftime('%H%M%S')}.las"
        output_path = os.path.join(os.getcwd(), output_filename)
        new_las.write(output_path)
        print(f"Successfully exported: {output_path} ({len(filtered_indices)} points)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("session_id")
    parser.add_argument("--dir", default=".")
    args = parser.parse_args()
    converter = PotreeToLasConverter(args.session_id, args.dir)
    recipes = converter.find_recipes()
    for r in recipes:
        converter.process_recipe(r)
