
import { EventDispatcher } from "../EventDispatcher.js";
import { Utils } from "../utils.js";
import * as THREE from "../../libs/three.js/build/three.module.js";

export class PlanesWindow extends EventDispatcher {
	constructor(viewer) {
		super();
		this.viewer = viewer;
		this.planes = [];
        this.selectedPlane = null;
        this.previewVisible = false;

        this.successiveDistance = 2.0;
        this.successiveDirection = 1;

		this.init();
	}

	init() {
		this.elRoot = $(`
			<div id="planes_window" class="potree_menu_container" 
				style="position: absolute; left: 20px; top: 100px; width: 320px; z-index: 10000; display: none; background: rgba(0,0,0,0.85); color: white; padding: 15px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); font-family: 'Inter', sans-serif;">
				<div id="planes_window_header" style="cursor: move; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
					<span style="font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em; color: #3b82f6;">Herramienta Planos</span>
					<span id="closePlanesWindow" style="cursor: pointer; font-size: 20px; color: #666; transition: color 0.2s;">&times;</span>
				</div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-[10px]; font-weight: 900; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em;">Vista Previa (Intersección)</label>
                    <div id="planes_preview_container" style="width: 100%; height: 160px; background: #000; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; position: relative;">
                        <div id="no_plane_msg" style="position: absolute; inset: 0; display: flex; items-center; justify-content: center; font-size: 10px; color: #444; font-weight: bold; text-align: center; padding: 20px;">
                            Selecciona o crea un plano para ver la sección
                        </div>
                    </div>
                </div>

				<div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <label style="font-[10px]; font-weight: 900; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em;">Espesor (Z)</label>
                        <span id="thickness_val" style="font-size: 11px; font-weight: bold; color: #3b82f6;">0.05m</span>
                    </div>
					<input type="range" id="plane_thickness_slider" min="0.01" max="5.0" step="0.01" value="0.05" style="width: 100%; cursor: pointer;">
				</div>

                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <label style="font-[10px]; font-weight: 900; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em;">Ancho (X)</label>
                        <span id="width_val" style="font-size: 11px; font-weight: bold; color: #3b82f6;">10.00m</span>
                    </div>
					<input type="range" id="plane_width_slider" min="1" max="100" step="1" value="10" style="width: 100%; cursor: pointer;">
				</div>

                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <label style="font-[10px]; font-weight: 900; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em;">Largo (Y)</label>
                        <span id="length_val" style="font-size: 11px; font-weight: bold; color: #3b82f6;">10.00m</span>
                    </div>
					<input type="range" id="plane_length_slider" min="1" max="100" step="1" value="10" style="width: 100%; cursor: pointer;">
				</div>

                <div style="margin-bottom: 20px; padding: 12px; background: rgba(59,130,246,0.1); border-radius: 8px; border: 1px solid rgba(59,130,246,0.2);">
                    <label style="display: block; font-[10px]; font-weight: 900; color: #3b82f6; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.1em;">Inserción Sucesiva</label>
                    
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <span style="font-size: 10px; color: rgba(255,255,255,0.6);">Distancia (m)</span>
                            <span id="dist_val" style="font-size: 10px; font-weight: bold; color: #3b82f6;">2.0m</span>
                        </div>
                        <input type="range" id="successive_dist_slider" min="0.1" max="10.0" step="0.1" value="2.0" style="width: 100%;">
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-size: 10px; color: rgba(255,255,255,0.6);">Sentido</span>
                        <button id="btnToggleDirection" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 4px; font-size: 10px; cursor: pointer;">NORMAL (+)</button>
                    </div>
                </div>

				<div style="margin-bottom: 20px;">
                    <label style="display: block; font-[10px]; font-weight: 900; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.05em;">Lista de Planos</label>
					<div id="planes_list" style="max-height: 120px; overflow-y: auto; background: rgba(255,255,255,0.03); padding: 5px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
						<div style="color: #444; font-style: italic; font-size: 11px; text-align: center; padding: 10px;">No hay planos creados</div>
					</div>
				</div>

				<div style="display: flex; flex-direction: column; gap: 8px;">
					<button id="btnAddPlane" style="width: 100%; background: #3b82f6; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer; transition: all 0.2s;">+ ADD PLANE</button>
					<button id="btnExportPlanes" style="width: 100%; background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); padding: 10px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer; transition: all 0.2s;">EXPORT JSON</button>
				</div>
			</div>
		`);

		$(this.viewer.renderArea).append(this.elRoot);

		if (this.elRoot.draggable) {
			this.elRoot.draggable({ handle: "#planes_window_header" });
		}

		this.elRoot.find("#closePlanesWindow").click(() => this.hide());
		this.elRoot.find("#btnAddPlane").click(() => this.addNewPlane());
		this.elRoot.find("#btnExportPlanes").click(() => this.exportToJson());
		
        const thicknessSlider = this.elRoot.find("#plane_thickness_slider");
        thicknessSlider.on("input", (e) => {
            const val = parseFloat(e.target.value);
            this.elRoot.find("#thickness_val").text(val.toFixed(2) + "m");
            if(this.selectedPlane) {
                this.selectedPlane.scale.z = val;
            }
        });

        const widthSlider = this.elRoot.find("#plane_width_slider");
        widthSlider.on("input", (e) => {
            const val = parseFloat(e.target.value);
            this.elRoot.find("#width_val").text(val.toFixed(2) + "m");
            if(this.selectedPlane) {
                this.selectedPlane.scale.x = val;
            }
        });

        const lengthSlider = this.elRoot.find("#plane_length_slider");
        lengthSlider.on("input", (e) => {
            const val = parseFloat(e.target.value);
            this.elRoot.find("#length_val").text(val.toFixed(2) + "m");
            if(this.selectedPlane) {
                this.selectedPlane.scale.y = val;
            }
        });

        const distSlider = this.elRoot.find("#successive_dist_slider");
        distSlider.on("input", (e) => {
            this.successiveDistance = parseFloat(e.target.value);
            this.elRoot.find("#dist_val").text(this.successiveDistance.toFixed(1) + "m");
        });

        const btnDir = this.elRoot.find("#btnToggleDirection");
        btnDir.click(() => {
            this.successiveDirection *= -1;
            btnDir.text(this.successiveDirection === 1 ? "NORMAL (+)" : "INVERSO (-)");
            btnDir.css("color", this.successiveDirection === 1 ? "#fff" : "#ef4444");
        });

        this.initPreviewRenderer();
	}

    initPreviewRenderer() {
        const container = this.elRoot.find("#planes_preview_container")[0];
        if (!container) {
            console.warn("[POTREE] Planes preview container not found, skipping renderer init.");
            return;
        }
        this.previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.previewRenderer.setSize(container.clientWidth || 320, container.clientHeight || 160);
        this.previewRenderer.setClearColor(0x000000, 1);
        container.appendChild(this.previewRenderer.domElement);

        this.previewCamera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
        this.previewScene = new THREE.Scene();
        
        // Loop to update preview
        const renderPreview = () => {
            if(this.previewVisible && this.selectedPlane) {
                this.updatePreview();
            }
            requestAnimationFrame(renderPreview);
        };
        renderPreview();
    }

    updatePreview() {
        if(!this.selectedPlane) return;

        // Position camera above the plane, looking down its local Z
        const matrix = this.selectedPlane.matrixWorld;
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        matrix.decompose(position, quaternion, scale);

        this.previewCamera.position.copy(position);
        this.previewCamera.quaternion.copy(quaternion);
        
        // Move camera "up" along its local Z (15 units)
        const cameraDist = 15;
        const up = new THREE.Vector3(0, 0, cameraDist).applyQuaternion(quaternion);
        this.previewCamera.position.add(up);
        this.previewCamera.lookAt(position);

        // CLIPPING: Use Near and Far planes to create a thin slice based on thickness (scale.z)
        const thickness = scale.z;
        this.previewCamera.near = cameraDist - (thickness / 2);
        this.previewCamera.far = cameraDist + (thickness / 2);
        
        // VIEWPORT: Match orthogonal bounds to plane dimensions (scale.x, scale.y)
        const displayWidth = scale.x;
        const displayHeight = scale.y;
        const containerAspect = 320 / 160; // preview container aspect ratio
        const planeAspect = displayWidth / displayHeight;

        if (planeAspect > containerAspect) {
            // Plane is wider than container: fit to width
            const zoom = displayWidth / 2;
            this.previewCamera.left = -zoom;
            this.previewCamera.right = zoom;
            this.previewCamera.top = zoom / containerAspect;
            this.previewCamera.bottom = -zoom / containerAspect;
        } else {
            // Plane is taller than container: fit to height
            const zoom = displayHeight / 2;
            this.previewCamera.top = zoom;
            this.previewCamera.bottom = -zoom;
            this.previewCamera.left = -zoom * containerAspect;
            this.previewCamera.right = zoom * containerAspect;
        }
        
        this.previewCamera.updateProjectionMatrix();

        // Render pointcloud with updated clipping and viewport
        this.previewRenderer.render(this.viewer.scene.scenePointCloud, this.previewCamera);
    }

	show() {
		this.elRoot.fadeIn();
        this.previewVisible = true;
	}

	hide() {
		this.elRoot.fadeOut();
        this.previewVisible = false;
	}

    addNewPlane() {
        const params = {
            name: `Plane_${this.planes.length + 1}`
        };

        if (this.planes.length > 0) {
            params.lastPlane = this.planes[this.planes.length - 1];
            params.distance = this.successiveDistance;
            params.direction = this.successiveDirection;
        }

        this.viewer.planesTool.startInsertion(params);
    }

    addPlaneToList(plane) {
        if(!this.planes.includes(plane)) {
            this.planes.push(plane);
        }
        this.selectedPlane = plane;
        this.updateListUI();
        this.elRoot.find("#no_plane_msg").hide();
    }

    removePlane(plane) {
        this.planes = this.planes.filter(p => p !== plane);
        if(this.selectedPlane === plane) this.selectedPlane = null;
        this.updateListUI();
    }

    updateListUI() {
        const listContainer = this.elRoot.find("#planes_list");
        listContainer.empty();

        if (this.planes.length === 0) {
            listContainer.append('<div style="color: #444; font-style: italic; font-size: 11px; text-align: center; padding: 10px;">No hay planos creados</div>');
            this.elRoot.find("#no_plane_msg").show();
            return;
        }

        this.planes.forEach((plane, i) => {
            const isSelected = this.selectedPlane === plane;
            const item = $(`
                <div style="padding: 8px 12px; margin-bottom: 4px; background: ${isSelected ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)'}; 
                    border-radius: 6px; font-size: 11px; display: flex; justify-content: space-between; align-items: center; 
                    cursor: pointer; border: 1px solid ${isSelected ? '#3b82f6' : 'transparent'}; transition: all 0.2s;">
                    <span style="font-weight: 600; color: ${isSelected ? '#fff' : '#aaa'};">${plane.name}</span>
                    <span style="color: #555; font-size: 9px;">${plane.scale.z.toFixed(2)}m</span>
                </div>
            `);
            item.click(() => {
                this.selectedPlane = plane;
                this.elRoot.find("#plane_thickness_slider").val(plane.scale.z);
                this.elRoot.find("#thickness_val").text(plane.scale.z.toFixed(2) + "m");
                this.updateListUI();
            });
            listContainer.append(item);
        });
    }

    exportToJson() {
        const data = this.planes.map(p => ({
            name: p.name,
            position: p.position.toArray(),
            rotation: p.rotation.toArray(),
            scale: p.scale.toArray(),
            thickness: p.scale.z,
            matrixWorld: p.matrixWorld.toArray()
        }));

        const jsonString = JSON.stringify(data, null, 2);
        
        // Notify React parent to save the file
        window.parent.postMessage({ 
            type: "SAVE_PLANES", 
            value: data 
        }, "*");
        
        // Also keep local download as fallback
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `planos_lidarch_${new Date().getTime()}.json`;
        // link.click(); // Optional: uncomment if you want both
        
        this.viewer.postMessage("Datos de planos preparados para guardado.", { duration: 3000 });
    }
}
