
import { EventDispatcher } from "../EventDispatcher.js";
import { Utils } from "../utils.js";

export class ScreenshotWindow extends EventDispatcher {
	constructor(viewer) {
		super();
		this.viewer = viewer;
		this.init();
	}

	init() {
		this.elRoot = $(`
			<div id="screenshot_window" class="potree_menu_container" 
				style="position: absolute; left: calc(50% - 150px); top: 20px; width: 300px; z-index: 10000; display: none; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
				<div id="screenshot_window_header" style="cursor: move; padding-bottom: 5px; border-bottom: 1px solid #777; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
					<span style="font-weight: bold;">Screenshots & Data Export</span>
					<span id="closeScreenshotWindow" style="cursor: pointer; font-size: 20px;">&times;</span>
				</div>
				<div style="margin-bottom: 15px;">
					<p style="font-size: 0.9em; color: #ccc;">Capture the current view as PNG and raw XYZ coordinate data.</p>
				</div>
				<div style="display: flex; flex-direction: column; gap: 10px;">
					<button id="btnCaptureScreenshots" class="potree_button" style="background-color: #4CAF50; color: white; font-weight: bold; padding: 10px;">Capture Screenshots</button>
					<button id="btnAPISegment" class="potree_button" style="background-color: #2196F3; color: white; font-weight: bold; padding: 10px;">APISegment</button>
                    <div id="screenshot_status" style="font-size: 0.8em; color: #aaa; text-align: center; display: none;">Processing...</div>
				</div>
			</div>
		`);

		$(this.viewer.renderArea).append(this.elRoot);

		if (this.elRoot.draggable) {
			this.elRoot.draggable({ handle: "#screenshot_window_header" });
		}

		this.elRoot.find("#closeScreenshotWindow").click(() => this.hide());
		this.elRoot.find("#btnCaptureScreenshots").click(() => this.capture());
		this.elRoot.find("#btnAPISegment").click(() => this.apiSegment());
	}

	show() {
		this.elRoot.fadeIn();
	}

	hide() {
		this.elRoot.fadeOut();
	}

	apiSegment() {
		alert("APISegment clicked. Waiting for Python function definition...");
	}

	async capture() {
        const btn = this.elRoot.find("#btnCaptureScreenshots");
        const status = this.elRoot.find("#screenshot_status");
        
        btn.prop("disabled", true).css("opacity", 0.5);
        status.show().text("Capturing color...");

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

            // 1. Capture Color PNG
            await this.captureColor(timestamp);

            status.text("Capturing XYZ data (precisión píxel)...");
            // 2. Capture XYZ coordinates
            await this.captureXYZ(timestamp);

            status.text("Success! Files ready for screenshots/ folder.");
            setTimeout(() => status.fadeOut(), 5000);
        } catch (e) {
            console.error(e);
            status.text("Error during capture.");
        } finally {
            btn.prop("disabled", false).css("opacity", 1);
        }
	}

    apiSegment() {
        alert("APISegment clicked. Feature pending implementation.");
    }

    async captureColor(timestamp) {
        const viewer = this.viewer;
        const renderer = viewer.renderer;
        const canvas = renderer.domElement;

        viewer.render();

        // 1. Capture PNG
        const pngUrl = canvas.toDataURL("image/png");
        this.download(pngUrl, `screenshot_${timestamp}.png`);

        // 2. Capture Raw Binary
        const width = canvas.width;
        const height = canvas.height;
        const gl = renderer.getContext();
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const rawBlob = new Blob([pixels], {type: "application/octet-stream"});
        this.download(URL.createObjectURL(rawBlob), `screenshot_raw_${timestamp}.bin`);
    }

    async captureXYZ(timestamp) {
        const viewer = this.viewer;
        if (viewer.capturePositionData) {
            const pixels = await viewer.capturePositionData();
            const blob = new Blob([pixels.buffer], {type: "application/octet-stream"});
            this.download(URL.createObjectURL(blob), `screenshot_xyz_${timestamp}.bin`);
        } else {
            console.error("capturePositionData not found on viewer");
        }
    }

    download(url, filename) {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
    }
}
