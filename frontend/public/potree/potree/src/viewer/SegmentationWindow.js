
import { EventDispatcher } from "../EventDispatcher.js";
import { Utils } from "../utils.js";

export class SegmentationWindow extends EventDispatcher {
	constructor(viewer) {
		super();
		this.viewer = viewer;
		this.ids = new Set();
		this.isSegmenting = false;

		this.init();
	}

	init() {
		this.elRoot = $(`
			<div id="segmentation_window" class="potree_menu_container" 
				style="position: absolute; left: calc(50% - 150px); top: 20px; width: 300px; z-index: 10000; display: none; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
				<div id="segmentation_window_header" style="cursor: move; padding-bottom: 5px; border-bottom: 1px solid #777; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
					<span style="font-weight: bold;">Segmentation Control</span>
					<span id="closeSegmentationWindow" style="cursor: pointer; font-size: 20px;">&times;</span>
				</div>
				<div style="margin-bottom: 10px;">
					<p style="font-size: 0.9em; color: #ccc;">Shift + Click on points to capture IDs.</p>
					<div id="segmentation_id_list" style="max-height: 200px; overflow-y: auto; background: #222; padding: 5px; border-radius: 3px; font-family: monospace;">
						<div style="color: #666; font-style: italic;">No IDs captured</div>
					</div>
				</div>
				<div style="display: flex; gap: 5px;">
					<button id="btnSegmentToggle" class="potree_button" style="flex: 1;">Segment</button>
					<button id="btnSegmentationClear" class="potree_button" style="flex: 1;">Clear List</button>
				</div>
			</div>
		`);

		$(this.viewer.renderArea).append(this.elRoot);

		// Make it draggable using jQuery UI
		if (this.elRoot.draggable) {
			this.elRoot.draggable({ handle: "#segmentation_window_header" });
		}

		this.elRoot.find("#closeSegmentationWindow").click(() => this.hide());
		this.elRoot.find("#btnSegmentationClear").click(() => this.clearList());
		this.elRoot.find("#btnSegmentToggle").click(() => this.toggleSegmentation());
	}

	show() {
		this.elRoot.fadeIn();
		this.viewer.segmentationToolActive = true;
	}

	hide() {
		this.elRoot.fadeOut();
		this.viewer.segmentationToolActive = false;
		if (this.isSegmenting) {
			this.toggleSegmentation(); // Deactivate segmentation when closing
		}
	}

	addId(id) {
		const newId = Math.floor(Number(id));
		if (isNaN(newId)) return;

		if (!this.ids.has(newId)) {
			this.ids.add(newId);
			this.updateList();

			if (this.isSegmenting) {
				this.applyToMaterials();
			}
		}
	}

	updateList() {
		const listContainer = this.elRoot.find("#segmentation_id_list");
		listContainer.empty();

		if (this.ids.size === 0) {
			listContainer.append('<div style="color: #666; font-style: italic;">No IDs captured</div>');
			return;
		}

		const sortedIds = Array.from(this.ids).sort((a, b) => a - b);
		sortedIds.forEach(id => {
			listContainer.append(`<div style="padding: 2px 0;">ID: ${id}</div>`);
		});
	}

	clearList() {
		this.ids.clear();
		this.updateList();
		if (this.isSegmenting) {
			this.applyToMaterials();
		}
	}

	toggleSegmentation() {
		this.isSegmenting = !this.isSegmenting;
		const btn = this.elRoot.find("#btnSegmentToggle");
		
		if (this.isSegmenting) {
			btn.addClass("active").text("Show All");
			btn.css("background-color", "#4CAF50");
		} else {
			btn.removeClass("active").text("Segment");
			btn.css("background-color", "");
		}

		this.applyToMaterials();
	}

	applyToMaterials() {
		const idArray = Array.from(this.ids).map(Number).filter(id => !isNaN(id));
		const count = this.isSegmenting ? Math.min(idArray.length, 32) : 0;
		const floatArray = new Float32Array(32);
		for (let i = 0; i < idArray.length && i < 32; i++) {
			floatArray[i] = Math.floor(idArray[i]);
		}

		console.log(`Applying segmentation: count=${count}, ids=[${idArray.join(', ')}]`);

		if (window.Potree && window.Potree.segmentation) {
			window.Potree.segmentation.filterIds.set(floatArray);
			window.Potree.segmentation.filterIdsCount = count;
			window.Potree.segmentation.active = this.isSegmenting;
		}

		for (let pc of this.viewer.scene.pointclouds) {
			if (pc.material.uniforms.uFilterIds) {
				pc.material.uniforms.uFilterIds.value = floatArray;
			}
			if (pc.material.uniforms.uFilterIdsCount) {
				pc.material.uniforms.uFilterIdsCount.value = count;
			}
			pc.material.needsUpdate = true;
		}
	}


}
