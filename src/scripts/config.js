const APP_CONFIG = {
  detectionConfidenceThreshold: 90,
  analyzingDelay: 2000,
  factsGenerationDelay: 2000,
  detectionRetryInterval: 100,
};

const CAMERA_CONFIG = {
  defaultFPS: 30,
  fpsRange: {
    min: 15,
    max: 60,
  },
  desktopResolution: {
    width: 640,
    height: 480,
  },
  mobileResolution: {
    width: 480,
    height: 640,
  },
  desktopFacingMode: "user",
  mobileFacingMode: "environment",
};

const DETECTION_CONFIG = {
  modelUrl: "/model/model.json",
  metadataUrl: "/model/metadata.json",
  inputSize: 224,
  normalizationFactor: 255,
  confidenceThreshold: 0.9,
};

const ROOTFACTS_CONFIG = {
  modelId: "Xenova/LaMini-Flan-T5-77M",
  maxInputLength: 40,
  maxTokens: 80,
  temperature: 0.1,
  topP: 0.8,
  generationDelay: 500,
};

const TONE_CONFIG = {
  availableTones: [
    { value: "normal", label: "Normal" },
    { value: "funny", label: "Lucu" },
    { value: "professional", label: "Profesional" },
    { value: "casual", label: "Santai" },
  ],
};

const UI_CONFIG = {
  animationDuration: 300,
  fadeAnimation: "fadeIn 0.5s ease-out forwards",
  confidenceThresholds: {
    excellent: 90,
    good: 80,
  },
  factsCardOpacity: {
    loading: 0.6,
    normal: 1.0,
  },
};

export {
  APP_CONFIG,
  CAMERA_CONFIG,
  DETECTION_CONFIG,
  ROOTFACTS_CONFIG,
  TONE_CONFIG,
  UI_CONFIG,
};
