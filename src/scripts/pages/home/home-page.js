import {
  generateCameraSection,
  generateInfoPanel,
  generateFooter,
} from "../../templates.js";
import CameraService from "../../services/camera.service.js";
import DetectionService from "../../services/detection.service.js";
import RootFactsService from "../../services/rootfacts.service.js";
import HomePresenter from "./home-presenter.js";

class HomePage {
  #presenter = null;

  #elements = {};

  async render() {
    return `
      <main class="main-content">
        ${generateCameraSection()}
        ${generateInfoPanel()}
      </main>
      ${generateFooter()}
    `;
  }

  async afterRender() {
    this.#cacheElements();

    this.#presenter = new HomePresenter({
      view: this,
      cameraService: new CameraService(),
      detectionService: new DetectionService(),
      rootFactsService: new RootFactsService((progressInfo) => {
        this.setStatus(progressInfo.message || "Memuat model AI...", "loading");
      }),
    });

    await this.#presenter.initialize();

    this.bindToggleScan(() => this.#presenter.toggleCamera());
    this.bindCameraChange(async () => this.#presenter.changeCamera());
    this.bindFPSChange((fps) => this.#presenter.setFPS(fps));
    this.bindToneChange((tone) => this.#presenter.setTone(tone));
    this.bindCopy(() => this.#presenter.copyFact());

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  #cacheElements() {
    this.#elements = {
      statusDot: document.getElementById("status-dot"),
      statusText: document.getElementById("status-text"),
      cameraOverlay: document.getElementById("camera-overlay"),
      cameraPlaceholder: document.getElementById("camera-placeholder"),
      toggleButton: document.getElementById("btn-toggle"),
      cameraSelect: document.getElementById("camera-select"),
      fpsSlider: document.getElementById("fps-slider"),
      fpsLabel: document.getElementById("fps-label"),
      toneSelect: document.getElementById("tone-select"),
      idleCard: document.getElementById("state-idle"),
      loadingCard: document.getElementById("state-loading"),
      resultCard: document.getElementById("state-result"),
      detectedName: document.getElementById("detected-name"),
      detectedConfidence: document.getElementById("detected-confidence"),
      confidenceFill: document.getElementById("confidence-fill"),
      funFactLoading: document.getElementById("fun-fact-loading"),
      funFactContent: document.getElementById("fun-fact-content"),
      funFactText: document.getElementById("fun-fact-text"),
      copyButton: document.getElementById("btn-copy"),
    };
  }

  bindToggleScan(handler) {
    this.#elements.toggleButton?.addEventListener("click", handler);
  }

  bindCameraChange(handler) {
    this.#elements.cameraSelect?.addEventListener("change", handler);
  }

  bindFPSChange(handler) {
    this.#elements.fpsSlider?.addEventListener("input", (event) => {
      const fps = Number(event.target.value);
      this.updateFPSLabel(fps);
      handler(fps);
    });
  }

  bindToneChange(handler) {
    this.#elements.toneSelect?.addEventListener("change", (event) => {
      handler(event.target.value);
    });
  }

  bindCopy(handler) {
    this.#elements.copyButton?.addEventListener("click", handler);
  }

  getCameraSelectElement() {
    return this.#elements.cameraSelect;
  }

  getFPSValue() {
    return Number(this.#elements.fpsSlider?.value || 30);
  }

  getSelectedTone() {
    return this.#elements.toneSelect?.value || "normal";
  }

  getCurrentFact() {
    return this.#elements.funFactText?.textContent || "";
  }

  updateFPSLabel(fps) {
    if (this.#elements.fpsLabel) {
      this.#elements.fpsLabel.textContent = `${fps} FPS`;
    }
  }

  setStatus(message, state = "idle") {
    if (this.#elements.statusText) {
      this.#elements.statusText.textContent = message;
    }

    if (this.#elements.statusDot) {
      this.#elements.statusDot.classList.remove("active", "loading", "error");
      if (state === "active") this.#elements.statusDot.classList.add("active");
      if (state === "loading") this.#elements.statusDot.classList.add("loading");
      if (state === "error") this.#elements.statusDot.classList.add("error");
    }
  }

  showCameraLoading() {
    if (this.#elements.toggleButton) {
      this.#elements.toggleButton.disabled = true;
    }
  }

  hideCameraLoading() {
    if (this.#elements.toggleButton?.disabled) {
      this.#elements.toggleButton.disabled = false;
    }
  }

  enableToggleButton() {
    if (this.#elements.toggleButton) {
      this.#elements.toggleButton.disabled = false;
    }
  }

  showToneSelector() {
    if (this.#elements.toneSelect) {
      this.#elements.toneSelect.disabled = false;
    }
  }

  showCameraActive() {
    this.#elements.toggleButton?.classList.add("scanning");
    this.#elements.cameraOverlay?.classList.add("active");
    this.#elements.cameraPlaceholder?.classList.add("hidden");
  }

  showCameraInactive() {
    this.#elements.toggleButton?.classList.remove("scanning");
    this.#elements.cameraOverlay?.classList.remove("active");
    this.#elements.cameraPlaceholder?.classList.remove("hidden");
  }

  showIdleState() {
    this.#elements.idleCard?.classList.remove("hidden");
    this.#elements.loadingCard?.classList.add("hidden");
    this.#elements.resultCard?.classList.add("hidden");
  }

  showLoadingState() {
    this.#elements.idleCard?.classList.add("hidden");
    this.#elements.loadingCard?.classList.remove("hidden");
    this.#elements.resultCard?.classList.add("hidden");
  }

  showResultState(className, confidence) {
    this.#elements.idleCard?.classList.add("hidden");
    this.#elements.loadingCard?.classList.add("hidden");
    this.#elements.resultCard?.classList.remove("hidden");

    if (this.#elements.detectedName) {
      this.#elements.detectedName.textContent = className;
    }

    if (this.#elements.detectedConfidence) {
      this.#elements.detectedConfidence.textContent = `${Math.round(confidence)}%`;
    }

    if (this.#elements.confidenceFill) {
      this.#elements.confidenceFill.style.width = `${Math.min(100, Math.max(0, confidence))}%`;
    }
  }

  showResultsWithNullFacts(className, confidence) {
    this.showResultState(className, confidence);
    this.showFactsLoading();
  }

  showFactsLoading() {
    this.#elements.funFactLoading?.classList.remove("hidden");
    this.#elements.funFactContent?.classList.add("hidden");

    if (this.#elements.funFactText) {
      this.#elements.funFactText.textContent = "Memuat fakta menarik...";
    }
  }

  showFactsSuccess(text) {
    this.#elements.funFactLoading?.classList.add("hidden");
    this.#elements.funFactContent?.classList.remove("hidden");

    if (this.#elements.funFactText) {
      this.#elements.funFactText.textContent = text;
    }
  }

  showFactsError() {
    this.showFactsSuccess("Tidak dapat menghasilkan fakta menarik saat ini.");
  }

  showCopySuccess() {
    if (!this.#elements.copyButton) return;

    this.#elements.copyButton.classList.add("copied");
    this.#elements.copyButton.title = "Berhasil disalin";

    setTimeout(() => {
      this.#elements.copyButton?.classList.remove("copied");
      if (this.#elements.copyButton) {
        this.#elements.copyButton.title = "Salin fakta";
      }
    }, 1200);
  }

  showError(message) {
    this.setStatus(message, "error");
  }
}

export default HomePage;
