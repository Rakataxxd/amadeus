export class AudioSampler {
  private static _instance: AudioSampler | null = null;

  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private _amplitude = 0;
  private _smoothed = 0;
  private _active = false;

  private constructor() {}

  static getInstance(): AudioSampler {
    if (!AudioSampler._instance) {
      AudioSampler._instance = new AudioSampler();
    }
    return AudioSampler._instance;
  }

  // Call once to begin sampling. Safe to call multiple times — no-ops after first.
  async start(): Promise<void> {
    if (this._active || this.context) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.context = new AudioContext();
      const source = this.context.createMediaStreamSource(stream);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      source.connect(this.analyser);
      this._active = true;
    } catch {
      // Permission denied or no microphone — u_audio will always be 0.0
      this._active = false;
    }
  }

  // Returns smoothed RMS amplitude in 0.0–1.0 range.
  // Call this once per animation frame.
  getAmplitude(): number {
    if (!this._active || !this.analyser) return 0;

    this.analyser.getByteTimeDomainData(this.dataArray);

    let sumSq = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = (this.dataArray[i] - 128) / 128;
      sumSq += normalized * normalized;
    }
    const rms = Math.sqrt(sumSq / this.dataArray.length);
    this._amplitude = Math.min(1, rms * 4); // scale up for more responsive feel

    // Low-pass smooth: 80% previous, 20% new sample
    this._smoothed = this._smoothed * 0.8 + this._amplitude * 0.2;
    return this._smoothed;
  }
}
