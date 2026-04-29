import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgpu";
import { DETECTION_CONFIG } from "../config.js";
import { validateModelMetadata } from "../utils/index.js";

class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.config = DETECTION_CONFIG;
    this.currentBackend = null;
    this.performanceStats = {
      operations: 0,
      totalTime: 0,
      averageTime: 0,
    };
  }

  async #setAdaptiveBackend() {
    const backends = [];

    if (typeof navigator !== "undefined" && "gpu" in navigator) {
      backends.push("webgpu");
    }

    backends.push("webgl", "cpu");

    for (const backend of backends) {
      try {
        const isReady = await tf.setBackend(backend);

        if (isReady) {
          await tf.ready();
          this.currentBackend = tf.getBackend();
          return this.currentBackend;
        }
      } catch (error) {
        console.warn(`Backend ${backend} failed, trying fallback...`, error);
      }
    }

    throw new Error("Tidak dapat menginisialisasi backend TensorFlow.js.");
  }

  async loadModel({ onProgress } = {}) {
    if (this.model) {
      return {
        labels: this.labels,
        backend: this.currentBackend,
      };
    }

    await this.#setAdaptiveBackend();
    onProgress?.(5);

    const [model, metadata] = await Promise.all([
      tf.loadLayersModel(this.config.modelUrl, {
        onProgress: (fraction) => {
          const progress = Math.round((fraction || 0) * 100);
          onProgress?.(Math.min(95, 10 + Math.round(progress * 0.85)));
        },
      }),
      fetch(this.config.metadataUrl).then(async (response) => {
        if (!response.ok) {
          throw new Error("Metadata model tidak dapat dimuat.");
        }

        return response.json();
      }),
    ]);

    if (!validateModelMetadata(metadata)) {
      throw new Error("Metadata model tidak valid.");
    }

    this.model = model;
    this.labels = metadata.labels;
    onProgress?.(100);

    return {
      labels: this.labels,
      backend: this.currentBackend,
    };
  }

  async predict(imageElement) {
    if (!this.model) {
      throw new Error("Model deteksi belum dimuat.");
    }

    if (!imageElement) {
      return {
        isValid: false,
        label: "Unknown",
        confidence: 0,
      };
    }

    const startedAt = performance.now();

    const result = tf.tidy(() => {
      const resizeTarget = Array.isArray(this.config.inputSize)
        ? this.config.inputSize
        : [this.config.inputSize, this.config.inputSize];

      const tensor = tf.browser
        .fromPixels(imageElement)
        .resizeBilinear(resizeTarget)
        .toFloat()
        .div(this.config.normalizationFactor)
        .expandDims(0);

      const rawOutput = this.model.predict(tensor);
      const outputTensor = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;
      const scores = outputTensor.dataSync();

      let maxIndex = 0;
      let maxScore = scores[0] || 0;

      for (let index = 1; index < scores.length; index += 1) {
        if (scores[index] > maxScore) {
          maxScore = scores[index];
          maxIndex = index;
        }
      }

      return {
        maxIndex,
        confidence: maxScore * 100,
      };
    });

    const predictionTime = performance.now() - startedAt;

    this.performanceStats.operations += 1;
    this.performanceStats.totalTime += predictionTime;
    this.performanceStats.averageTime = this.performanceStats.totalTime / this.performanceStats.operations;

    return {
      isValid: Number.isFinite(result.confidence)
        && result.confidence >= this.config.confidenceThreshold * 100,
      className: this.labels[result.maxIndex] || "Unknown",
      label: this.labels[result.maxIndex] || "Unknown",
      confidence: Math.round(result.confidence),
      backend: this.currentBackend,
      predictionTime: Number(predictionTime.toFixed(2)),
    };
  }
}

export default DetectionService;
