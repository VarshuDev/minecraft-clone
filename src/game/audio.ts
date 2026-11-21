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

  eatChomp() {
    this.noise(0.08, 0.16, 750 + Math.random() * 200, 1.2);
    this.tone(320 + Math.random() * 80, 0.06, { type: "triangle", vol: 0.08, slide: 180 });
  }

  bowShoot() {
    this.tone(380, 0.14, { type: "triangle", vol: 0.12, slide: 640 });
    this.noise(0.09, 0.08, 900, 1.1);
  }

  bowHit() {
    this.noise(0.07, 0.15, 480, 1.4);
    this.tone(220, 0.08, { type: "square", vol: 0.08, slide: 120 });
  }

  zombieGroan() {
    this.tone(110, 0.65, { type: "sawtooth", vol: 0.09, slide: 75 });
    this.noise(0.45, 0.05, 340, 1.6);
  }

  skeletonRattle() {
    for (let i = 0; i < 3; i++) {
      this.noise(0.04, 0.09, 1400 + i * 200, 1.8, i * 0.045);
      this.tone(700 + i * 120, 0.03, { type: "triangle", vol: 0.05, delay: i * 0.045 });
    }
  }

  creeperHiss() {
    this.noise(1.4, 0.18, 2200, 0.85);
  }

  animalOink() {
    this.tone(340, 0.15, { type: "triangle", vol: 0.08, slide: 240 });
    this.tone(290, 0.12, { type: "sawtooth", vol: 0.05, delay: 0.07, slide: 180 });
  }

  animalMoo() {
    this.tone(145, 0.55, { type: "triangle", vol: 0.1, slide: 110 });
    this.tone(220, 0.45, { type: "sine", vol: 0.06, delay: 0.04, slide: 165 });
  }

  doorToggle(open: boolean) {
    if (open) {
      this.tone(280, 0.12, { type: "sawtooth", vol: 0.08, slide: 380 });
      this.noise(0.08, 0.1, 450, 1.2);
    } else {
      this.noise(0.1, 0.14, 380, 1.3);
      this.tone(180, 0.1, { type: "square", vol: 0.07, slide: 120 });
    }
  }

  chestToggle(open: boolean) {
    if (open) {
      this.tone(340, 0.22, { type: "sawtooth", vol: 0.09, slide: 520 });
      this.noise(0.12, 0.06, 600, 1.5);
    } else {
      this.tone(480, 0.18, { type: "sawtooth", vol: 0.08, slide: 240 });
      this.noise(0.12, 0.09, 450, 1.4);
    }
  }

  sleepChime() {
    const notes = [392, 440, 523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      this.tone(freq, 0.6, { type: "sine", vol: 0.08, delay: idx * 0.16 });
    });
  }

  // --------------------------------------------------------------------------
  // PROCEDURAL C418-STYLE AMBIENT SOUNDTRACK
  // --------------------------------------------------------------------------
  private ambientTimer = 12;
  private ambientPhraseStep = 0;
  private activeProgression: number[][] | null = null;

  updateAmbient(dt: number) {
    if (!this.ctx || !this.master || this.muted) return;
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.playNextAmbientChord();
    }
  }

  private playNextAmbientChord() {
    const chordProgressions = [
      // Sweden style: Dm7 -> G -> Cmaj7 -> F
      [
        [293.66, 349.23, 440.0, 523.25],
        [246.94, 293.66, 392.0, 493.88],
        [261.63, 329.63, 392.0, 493.88],
        [220.0, 261.63, 349.23, 440.0],
      ],
      // Wet Hands style: A -> Bm -> Dmaj7 -> F#m
      [
        [220.0, 277.18, 329.63, 440.0],
        [246.94, 293.66, 369.99, 440.0],
        [293.66, 369.99, 440.0, 554.37],
        [185.0, 220.0, 277.18, 369.99],
      ],
      // Subwoofer Lullaby style: G -> Em7 -> Cadd9 -> D
      [
        [196.0, 246.94, 293.66, 392.0],
        [164.81, 246.94, 329.63, 392.0],
        [261.63, 329.63, 392.0, 587.33],
        [293.66, 369.99, 440.0, 587.33],
      ],
    ];

    if (!this.activeProgression || this.ambientPhraseStep >= this.activeProgression.length) {
      this.activeProgression = chordProgressions[Math.floor(Math.random() * chordProgressions.length)];
      this.ambientPhraseStep = 0;
    }

    if (this.activeProgression && this.ambientPhraseStep < this.activeProgression.length) {
      const notes = this.activeProgression[this.ambientPhraseStep];
      this.playPianoChord(notes);
      this.ambientPhraseStep++;
      if (this.ambientPhraseStep < this.activeProgression.length) {
        this.ambientTimer = 4.2;
      } else {
        this.ambientTimer = 45 + Math.random() * 30;
      }
    }
  }

  private playPianoChord(frequencies: number[]) {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    frequencies.forEach((freq, idx) => {
      const noteTime = t0 + idx * 0.035;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(freq, noteTime);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(freq * 2, noteTime);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1400, noteTime);
      filter.frequency.exponentialRampToValueAtTime(320, noteTime + 3.0);

      const noteVol = 0.038 / Math.sqrt(frequencies.length);
      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.exponentialRampToValueAtTime(noteVol, noteTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 3.8);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc1.start(noteTime);
      osc2.start(noteTime);
      osc1.stop(noteTime + 3.9);
      osc2.stop(noteTime + 3.9);
    });
  }
}
