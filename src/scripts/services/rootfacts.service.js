import { pipeline } from "@huggingface/transformers";
import { ROOTFACTS_CONFIG, TONE_CONFIG } from "../config.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class RootFactsService {
  constructor(onProgress = null) {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.config = ROOTFACTS_CONFIG;
    this.currentBackend = null;
    this.currentTone = "normal";
    this.onProgress = onProgress;
    this.progressByFile = {};
    this.lastProgressMessageAt = 0;
  }

  #wordCount(text) {
    return String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  #normalizeProgress(rawProgress) {
    if (typeof rawProgress !== "number" || Number.isNaN(rawProgress)) {
      return 0;
    }

    const progress = rawProgress <= 1 ? rawProgress * 100 : rawProgress;
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  #averageProgress(entries) {
    if (entries.length === 0) {
      return 0;
    }

    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    return Math.round(total / entries.length);
  }

  #emitDownloadProgress(progressInfo = {}) {
    if (typeof this.onProgress !== "function") {
      return;
    }

    if (progressInfo.status !== "progress" || !progressInfo.file) {
      return;
    }

    const fileName = String(progressInfo.file);
    const normalizedProgress = this.#normalizeProgress(progressInfo.progress);
    this.progressByFile[fileName] = normalizedProgress;

    const entries = Object.entries(this.progressByFile);
    const encoderEntries = entries.filter(([file]) => file.toLowerCase().includes("encoder"));
    const decoderEntries = entries.filter(([file]) => file.toLowerCase().includes("decoder"));

    if (encoderEntries.length === 0 && decoderEntries.length === 0) {
      return;
    }

    const encoderProgress = this.#averageProgress(encoderEntries);
    const decoderProgress = this.#averageProgress(decoderEntries);
    const now = Date.now();

    if (now - this.lastProgressMessageAt < 120) {
      return;
    }

    this.lastProgressMessageAt = now;
    this.onProgress({
      status: "downloading",
      encoder: encoderProgress,
      decoder: decoderProgress,
      message: `Mengunduh model AI... Encoder: ${encoderProgress}% | Decoder: ${decoderProgress}%`,
    });
  }

  #cleanGeneratedText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .replace(/^(fun fact:|fact:)\s*/i, "")
      .trim();
  }

  async loadModel() {
    try {
      const preferredDevice = typeof navigator !== "undefined" && "gpu" in navigator ? "webgpu" : "wasm";
      this.progressByFile = {};
      this.lastProgressMessageAt = 0;

      if (typeof this.onProgress === "function") {
        this.onProgress({
          status: "downloading",
          encoder: 0,
          decoder: 0,
          message: "Mengunduh model AI... Encoder: 0% | Decoder: 0%",
        });
      }

      this.generator = await pipeline("text2text-generation", this.config.modelId, {
        dtype: "q4",
        device: preferredDevice,
        progress_callback: this.#emitDownloadProgress.bind(this),
      });

      this.isModelLoaded = true;
      this.currentBackend = preferredDevice;

      return {
        success: true,
        model: this.config.modelId,
        backend: this.currentBackend,
      };
    } catch (error) {
      throw new Error(`Failed to load RootFacts model: ${error.message}`);
    }
  }

  setTone(tone) {
    const availableValues = TONE_CONFIG.availableTones.map((item) => item.value);
    if (availableValues.includes(tone)) {
      this.currentTone = tone;
    }
  }

  getAvailableTones() {
    return TONE_CONFIG.availableTones;
  }

  async #generateText(prompt) {
    const output = await this.generator(prompt, {
      max_new_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      do_sample: true,
      top_p: this.config.topP,
    });

    const generatedText = Array.isArray(output)
      ? output[0]?.generated_text
      : output?.generated_text;

    if (!generatedText) {
      throw new Error("Model tidak menghasilkan teks.");
    }

    return this.#cleanGeneratedText(generatedText);
  }

  async generateFacts(vegetable, tone = "normal") {
    if (!this.isModelLoaded || this.isGenerating) {
      throw new Error("Model belum siap atau sedang menghasilkan fakta");
    }

    if (!vegetable || typeof vegetable !== "string") {
      throw new Error("Nama sayuran yang valid diperlukan");
    }

    this.isGenerating = true;

    try {
      await wait(this.config.generationDelay);

      const prompt = [
        `Write a long, engaging, and shareable fun fact about this vegetable: ${vegetable}.`,
        `Use a ${tone} tone.`,
        "Write around 90-130 words in 4-6 sentences.",
        "Include nutrition, interesting origin/history, and a practical cooking tip.",
      ].join(" ");

      let funFact = await this.#generateText(prompt);

      if (this.#wordCount(funFact) < 55) {
        const expandPrompt = [
          `Expand this fun fact into a longer version (90-130 words): ${funFact}.`,
          `Keep ${tone} tone and make it easy to share.`,
        ].join(" ");

        funFact = await this.#generateText(expandPrompt);
      }

      return {
        funFact: funFact.trim(),
        rawResponse: funFact.trim(),
        generated: true,
        source: "Generated AI",
      };
    } catch (error) {
      throw new Error(`Gagal menghasilkan fakta menarik: ${error.message}`);
    } finally {
      this.isGenerating = false;
    }
  }

  isReady() {
    return this.isModelLoaded && !this.isGenerating;
  }
}

export default RootFactsService;
