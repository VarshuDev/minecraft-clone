/** Procedural WebAudio sound engine — zero external assets. */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  constructor(muted = false) {
    this.muted = muted;
  }

  unlock() {
    if (!this.ctx) {
      const Ctor: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.48;
      this.master.connect(this.ctx.destination);
      this.startWind();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.48, this.ctx.currentTime, 0.05);
    }
  }

  dispose() {
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
      this.master = null;
    }
  }

  private startWind() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 340;
    const gain = ctx.createGain();
    gain.gain.value = 0.032;
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
  }

  private tone(
    freq: number,
    duration: number,
    opts: { type?: OscillatorType; vol?: number; slide?: number; delay?: number } = {},
  ) {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, opts.slide), t0 + duration);
    const vol = opts.vol ?? 0.12;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noise(duration: number, vol = 0.14, freq = 900, q = 0.8, delay = 0) {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(this.master);
    src.start(ctx.currentTime + delay);
  }

  hit(sound: string) {
    const freq = sound === "stone" ? 560 : sound === "wood" ? 380 : sound === "glass" ? 1600 : 480;
    this.noise(0.055, 0.08, freq, 1.4);
    this.tone(freq * 0.42, 0.045, { type: "triangle", vol: 0.055, slide: freq * 0.28 });
  }

  hitBlock(sound: string) {
    this.hit(sound);
  }

  breakBlock(sound: string) {
    if (sound === "glass") {
      this.noise(0.16, 0.14, 2400, 1.5);
      this.tone(1400, 0.09, { type: "sine", vol: 0.08, slide: 680 });
      this.tone(1950, 0.07, { type: "triangle", vol: 0.06, delay: 0.025, slide: 900 });
      return;
    }
    const base = sound === "stone" ? 165 : sound === "wood" ? 210 : sound === "sand" ? 340 : 250;
    this.noise(0.11, 0.13, base * 2.5, 1.1);
    this.tone(base, 0.09, { type: "square", vol: 0.06, slide: base * 0.55 });
  }

  place(sound: string) {
    const base = sound === "stone" ? 220 : sound === "wood" ? 270 : 190;
    this.noise(0.07, 0.1, base * 2.1, 1.3);
    this.tone(base, 0.07, { type: "triangle", vol: 0.1, slide: base * 1.35 });
  }

  splash() {
    this.noise(0.28, 0.16, 720, 0.6);
    this.tone(240, 0.14, { type: "sine", vol: 0.08, slide: 110 });
  }

  hurt() {
    this.noise(0.12, 0.18, 420, 0.9);
    this.tone(180, 0.18, { type: "sawtooth", vol: 0.14, slide: 85 });
  }

  explode() {
    this.noise(0.6, 0.34, 170, 0.45);
    this.noise(0.32, 0.22, 620, 0.7, 0.03);
    this.tone(130, 0.42, { type: "sawtooth", vol: 0.2, slide: 32 });
  }

  craft() {
    this.tone(523, 0.08, { type: "triangle", vol: 0.1 });
    this.tone(784, 0.12, { type: "triangle", vol: 0.11, delay: 0.055 });
  }

  step(inWater = false) {
    if (inWater) {
      this.noise(0.11, 0.065, 650 + Math.random() * 250, 0.8);
    } else {
      this.noise(0.055, 0.035, 300 + Math.random() * 200, 1.4);
    }
  }

  jump() {
    this.tone(290, 0.09, { type: "sine", vol: 0.06, slide: 460 });
  }

  land() {
    this.noise(0.09, 0.08, 220, 0.9);
    this.tone(115, 0.09, { type: "sine", vol: 0.06, slide: 68 });
  }

  ui() {
    this.tone(660, 0.05, { type: "square", vol: 0.045 });
  }
}
