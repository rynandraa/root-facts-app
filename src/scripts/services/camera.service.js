import { CAMERA_CONFIG } from "../config.js";

const isMobileDevice = () =>
  navigator.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = CAMERA_CONFIG;
    this.currentFPS = CAMERA_CONFIG.defaultFPS;
  }

  initializeElements(videoId, canvasId) {
    this.video = document.getElementById(videoId);
    this.canvas = document.getElementById(canvasId);

    return Boolean(this.video && this.canvas);
  }

  async loadCameras(cameraSelect) {
    if (!cameraSelect || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");

      permissionStream.getTracks().forEach((track) => track.stop());

      cameraSelect.innerHTML = "";

      const defaultOption = document.createElement("option");
      defaultOption.value = "default";
      defaultOption.textContent = "Belakang";
      cameraSelect.appendChild(defaultOption);

      const frontOption = document.createElement("option");
      frontOption.value = "front";
      frontOption.textContent = "Depan";
      cameraSelect.appendChild(frontOption);

      cameras.forEach((device, index) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.textContent = device.label || `Kamera ${index + 1}`;
        cameraSelect.appendChild(option);
      });

      return cameras;
    } catch (error) {
      throw new Error(`Akses kamera gagal: ${error.message}`);
    }
  }

  #getCameraProfile() {
    const mobile = isMobileDevice();

    return {
      resolution: mobile ? this.config.mobileResolution : this.config.desktopResolution,
      facingMode: mobile ? this.config.mobileFacingMode : this.config.desktopFacingMode,
    };
  }

  #buildConstraints(selectedCameraValue) {
    const profile = this.#getCameraProfile();

    if (selectedCameraValue && selectedCameraValue !== "default" && selectedCameraValue !== "front") {
      return {
        video: {
          deviceId: { exact: selectedCameraValue },
          width: { ideal: profile.resolution.width },
          height: { ideal: profile.resolution.height },
          frameRate: { ideal: this.currentFPS },
        },
      };
    }

    if (selectedCameraValue === "front") {
      return {
        video: {
          facingMode: "user",
          width: { ideal: profile.resolution.width },
          height: { ideal: profile.resolution.height },
          frameRate: { ideal: this.currentFPS },
        },
      };
    }

    return {
      video: {
        facingMode: profile.facingMode,
        width: { ideal: profile.resolution.width },
        height: { ideal: profile.resolution.height },
        frameRate: { ideal: this.currentFPS },
      },
    };
  }

  async startCamera(videoId, canvasId, cameraSelect) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Browser ini tidak mendukung akses kamera.");
    }

    const initialized = this.initializeElements(videoId, canvasId);

    if (!initialized) {
      throw new Error("Elemen video/canvas tidak ditemukan.");
    }

    this.stopCamera();

    const selectedValue = cameraSelect ? cameraSelect.value : "default";
    const constraints = this.#buildConstraints(selectedValue);

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await this.video.play();
      return true;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.video) {
      this.video.srcObject = null;
    }
  }

  setFPS(fps) {
    const { min, max } = this.config.fpsRange;

    if (fps < min || fps > max) {
      throw new Error(`FPS harus antara ${min} dan ${max}`);
    }

    this.currentFPS = fps;
    return this.currentFPS;
  }

  getFPS() {
    return this.currentFPS;
  }

  isActive() {
    return Boolean(this.stream && this.stream.active);
  }

  captureFrame() {
    if (!this.video || !this.canvas) {
      return null;
    }

    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.canvas.getContext("2d").drawImage(this.video, 0, 0);
    return this.canvas;
  }
}

export default CameraService;
