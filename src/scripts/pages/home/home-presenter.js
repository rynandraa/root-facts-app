import { APP_CONFIG } from "../../config.js";
import { getCameraErrorMessage } from "../../utils/index.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class HomePresenter {
  #view;
  #cameraService;
  #detectionService;
  #rootFactsService;

  #detectionInterval = null;
  #sessionId = null;
  #tone = "normal";

  constructor({ view, cameraService, detectionService, rootFactsService }) {
    this.#view = view;
    this.#cameraService = cameraService;
    this.#detectionService = detectionService;
    this.#rootFactsService = rootFactsService;
  }

  async initialize() {
    await this.initialApp();
  }

  async initialApp() {
    try {
      this.#showStatus("Memuat model AI...");
      this.#view.showCameraLoading();

      await this.#cameraService.loadCameras(this.#view.getCameraSelectElement());
      await this.#detectionService.loadModel({
        onProgress: (progress) => this.#showStatus(`Menunggu model deteksi... ${progress}%`),
      });
      const rootFactsInfo = await this.#rootFactsService.loadModel();
      console.log("Backend:", rootFactsInfo.backend);
      this.#showStatus(`Siap`, "active");
      this.#view.hideCameraLoading();
      this.#view.enableToggleButton();
      this.#view.showToneSelector();
    } catch (error) {
      this.#showStatus("Gagal memuat", "error");
      this.#view.hideCameraLoading();
      this.#view.showError(error.message);
    }
  }

  async startCamera() {
    try {
      this.#view.showCameraLoading();
      await this.#cameraService.startCamera("media-video", "media-canvas", this.#view.getCameraSelectElement());
      this.#view.showCameraActive();
      this.#view.hideCameraLoading();
      this.#view.enableToggleButton();
      this.#view.showLoadingState();
      this.#startDetectionLoop();
    } catch (error) {
      this.#view.hideCameraLoading();
      this.#view.showError(getCameraErrorMessage(error));
    }
  }

  stopCamera() {
    this.#stopDetectionLoop();
    this.#cameraService.stopCamera();
    this.#view.showCameraInactive();
    this.#view.showIdleState();
  }

  toggleCamera() {
    if (this.#cameraService.isActive()) {
      this.stopCamera();
      return;
    }

    this.startCamera();
  }

  async changeCamera() {
    if (!this.#cameraService.isActive()) {
      return;
    }

    await this.startCamera();
  }

  setFPS(fps) {
    try {
      this.#cameraService.setFPS(fps);
      if (this.#cameraService.isActive()) {
        this.#startDetectionLoop();
      }
    } catch (error) {
      this.#view.showError(error.message);
    }
  }

  setTone(tone) {
    this.#tone = tone;
    this.#rootFactsService.setTone(tone);
  }

  getAvailableTones() {
    return this.#rootFactsService.getAvailableTones();
  }

  async copyFact() {
    const fact = this.#view.getCurrentFact();
    if (
      !fact
      || fact === "Memuat fakta menarik..."
      || fact === "Tidak dapat menghasilkan fakta menarik saat ini."
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(fact);
      this.#view.showCopySuccess();
    } catch {
      this.#view.showError("Gagal menyalin fakta");
    }
  }

  #showStatus(message, state = "loading") {
    this.#view.setStatus(message, state);
  }

  #startDetectionLoop() {
    this.#stopDetectionLoop();

    const fps = Math.max(15, Math.min(60, this.#view.getFPSValue()));
    const intervalMs = Math.round(1000 / fps);
    const sessionId = Date.now();

    this.#sessionId = sessionId;
    this.#runDetection(sessionId);
    this.#detectionInterval = setInterval(() => this.#runDetection(sessionId), intervalMs);
  }

  #stopDetectionLoop() {
    if (this.#detectionInterval) {
      clearInterval(this.#detectionInterval);
      this.#detectionInterval = null;
    }

    this.#sessionId = null;
  }

  async #runDetection(sessionId) {
    if (!this.#cameraService.isActive() || this.#sessionId !== sessionId) {
      return;
    }

    const frame = this.#cameraService.captureFrame();
    if (!frame) return;

    try {
      const prediction = await this.#detectionService.predict(frame);

      if (!prediction.isValid) {
        return;
      }

      this.#stopDetectionLoop();
      this.#view.showLoadingState();
      await wait(APP_CONFIG.analyzingDelay);

      this.stopCamera();
      this.#view.showResultState(prediction.className, prediction.confidence);
      await this.#handleDetectedResult(prediction.className, prediction.confidence);
    } catch (error) {
      console.error("detectionLoop: error:", error);
    }
  }

  async #handleDetectedResult(className, confidence) {
    this.#view.showResultsWithNullFacts(className, confidence);
    this.#cameraService.stopCamera();
    this.#view.showCameraInactive();
    this.#view.enableToggleButton();

    if (!this.#rootFactsService.isReady()) {
      this.#view.showFactsError();
      return;
    }

    await wait(APP_CONFIG.factsGenerationDelay);
    this.#view.showFactsLoading();

    try {
      const result = await this.#rootFactsService.generateFacts(className, this.#tone);
      this.#view.showFactsSuccess(result.funFact);
    } catch (error) {
      console.error("generateFacts: error:", error);
      this.#view.showFactsError();
    }
  }
}

export default HomePresenter;
