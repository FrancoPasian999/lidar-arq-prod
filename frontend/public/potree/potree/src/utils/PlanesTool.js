
import * as THREE from "../../libs/three.js/build/three.module.js";
import {Volume, BoxVolume} from "./Volume.js";
import {Utils} from "../utils.js";
import { EventDispatcher } from "../EventDispatcher.js";

export class PlanesTool extends EventDispatcher{
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_plane', e => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.scene = new THREE.Scene();
		this.scene.name = 'scene_planes';

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = e => {
			this.scene.remove(e.plane || e.volume);
		};

		this.onAdd = e => {
			this.scene.add(e.plane || e.volume);
		};

		this.viewer.inputHandler.addEventListener('delete', e => {
			let planes = e.selection.filter(e => (e.isPlaneToolInstance));
			planes.forEach(e => {
                this.viewer.scene.removeVolume(e);
                if(this.viewer.planesWindow) this.viewer.planesWindow.removePlane(e);
            });
		});

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.scene", e => this.render(e));
		
		viewer.scene.addEventListener('volume_added', (e) => {
            if(e.volume.isPlaneToolInstance) this.onAdd(e);
        });
		viewer.scene.addEventListener('volume_removed', (e) => {
            if(e.volume.isPlaneToolInstance) this.onRemove(e);
        });
	}

	startInsertion (args = {}) {
		let plane = new BoxVolume();
        plane.isPlaneToolInstance = true;
		
		plane.clip = true;
		plane.name = args.name || 'Plane';
        
        if (args.lastPlane) {
            // Successive plane logic
            plane.scale.copy(args.lastPlane.scale);
            plane.quaternion.copy(args.lastPlane.quaternion);
            
            // Perpendicular position calculation (along local Z axis of previous plane)
            const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(args.lastPlane.quaternion);
            const offset = normal.multiplyScalar(args.distance * args.direction);
            plane.position.copy(args.lastPlane.position).add(offset);
            
            // Skip dragging for successive planes as they are auto-positioned
            this.viewer.scene.addVolume(plane);
            this.scene.add(plane);
            if(this.viewer.planesWindow) {
                this.viewer.planesWindow.addPlaneToList(plane);
            }
            return plane;
        }

        // Default initial size for the first plane
        plane.scale.set(10, 10, 0.05);

		this.dispatchEvent({
			type: 'start_inserting_plane',
			plane: plane
		});

		this.viewer.scene.addVolume(plane);
		this.scene.add(plane);

		let cancel = {
			callback: null
		};

		let drag = e => {
			let camera = this.viewer.scene.getActiveCamera();
			
			let I = Utils.getMousePointCloudIntersection(
				e.drag.end, 
				this.viewer.scene.getActiveCamera(), 
				this.viewer, 
				this.viewer.scene.pointclouds, 
				{pickClipped: false});

			if (I) {
				plane.position.copy(I.location);
			}
		};

		let drop = e => {
			plane.removeEventListener('drag', drag);
			plane.removeEventListener('drop', drop);

			cancel.callback();
            
            if(this.viewer.planesWindow) {
                this.viewer.planesWindow.addPlaneToList(plane);
            }
		};

		cancel.callback = e => {
			plane.removeEventListener('drag', drag);
			plane.removeEventListener('drop', drop);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
		};

		plane.addEventListener('drag', drag);
		plane.addEventListener('drop', drop);
		this.viewer.addEventListener('cancel_insertions', cancel.callback);

		this.viewer.inputHandler.startDragging(plane);

		return plane;
	}

	update(){
		// Potree update loop for labels if needed
	}

	render(params){
		const renderer = this.viewer.renderer;
		const oldTarget = renderer.getRenderTarget();
		if(params.renderTarget){
			renderer.setRenderTarget(params.renderTarget);
		}
		renderer.render(this.scene, this.viewer.scene.getActiveCamera());
		renderer.setRenderTarget(oldTarget);
	}
}
