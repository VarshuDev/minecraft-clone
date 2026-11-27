/** Procedural WebAudio sound engine — zero external assets. */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private rainSrc: AudioBufferSourceNode | null = null;
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
    if (this.rainSrc) {
      try {
        this.rainSrc.stop();
      } catch {
        /* ignore */
      }
      this.rainSrc = null;
    }
    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
      this.master = null;
      this.rainGain = null;
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

  xpChime(step = 0) {
    const base = 1046.5 * Math.pow(1.059463, (step % 14));
    this.tone(base, 0.12, { type: "sine", vol: 0.11, slide: base * 1.04 });
    this.tone(base * 1.498, 0.09, { type: "triangle", vol: 0.07, delay: 0.02 });
  }

  levelUp() {
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    fanfare.forEach((freq, i) => {
      this.tone(freq, 0.28, { type: "triangle", vol: 0.14, delay: i * 0.08 });
      this.tone(freq * 1.5, 0.22, { type: "sine", vol: 0.08, delay: i * 0.08 + 0.02 });
    });
  }

  armorEquip() {
    this.noise(0.07, 0.16, 1600, 1.2);
    this.tone(680, 0.08, { type: "triangle", vol: 0.12, slide: 320 });
    this.noise(0.04, 0.1, 900, 1.4, 0.04);
  }

  cameraSwitch() {
    this.tone(520, 0.05, { type: "sine", vol: 0.14, slide: 780 });
  }

  leverToggle(on: boolean) {
    const f1 = on ? 420 : 340;
    const f2 = on ? 680 : 260;
    this.noise(0.04, 0.22, 1800, 1.4);
    this.tone(f1, 0.04, { type: "square", vol: 0.16, slide: f2 });
  }

  boneMealSparkle() {
    [780, 980, 1170, 1560].forEach((freq, idx) => {
      this.tone(freq, 0.09, { type: "sine", vol: 0.1, delay: idx * 0.04 });
    });
    this.noise(0.12, 0.08, 3200, 1.8);
  }

  chatPop() {
    this.tone(440, 0.05, { type: "triangle", vol: 0.15, slide: 660 });
  }

  flintAndSteel() {
    this.noise(0.04, 0.22, 2800, 2.0);
    this.tone(1200, 0.05, { type: "sawtooth", vol: 0.1, slide: 300 });
    this.noise(0.12, 0.1, 1600, 1.2, 0.04);
  }

  portalTravel() {
    const notes = [130.81, 196.0, 261.63, 392.0];
    notes.forEach((freq, idx) => {
      this.tone(freq, 1.6, { type: "sawtooth", vol: 0.08, delay: idx * 0.12, slide: freq * 1.5 });
      this.tone(freq * 0.5, 1.8, { type: "sine", vol: 0.12, delay: idx * 0.12 });
    });
    this.noise(1.8, 0.14, 800, 1.4);
  }

  steamHiss() {
    this.noise(0.8, 0.22, 3400, 0.8);
    this.tone(240, 0.2, { type: "sine", vol: 0.06, slide: 80 });
  }

  lavaPop() {
    this.tone(180, 0.08, { type: "triangle", vol: 0.12, slide: 90 });
    this.noise(0.06, 0.08, 1200, 1.5);
  }

  furnaceCrackle() {
    this.noise(0.035, 0.07, 2400 + Math.random() * 800, 2.2);
    this.tone(180 + Math.random() * 80, 0.04, { type: "sine", vol: 0.04 });
  }

  startRain(intensity = 0.5) {
    if (!this.ctx || !this.master) return;
    if (!this.rainGain) {
      const ctx = this.ctx;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1100;
      this.rainGain = ctx.createGain();
      this.rainGain.gain.value = 0.001;
      src.connect(filter).connect(this.rainGain).connect(this.master);
      src.start();
      this.rainSrc = src;
    }
    const target = this.muted ? 0 : Math.min(0.22, intensity * 0.2);
    this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.5);
  }

  stopRain() {
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
    }
  }

  thunderRumble() {
    // Sharp crack followed by deep lowpass rumble
    this.noise(0.18, 0.35, 1200, 0.8);
    this.tone(90, 0.4, { type: "sawtooth", vol: 0.28, slide: 35 });
    for (let i = 0; i < 4; i++) {
      this.noise(0.55 + i * 0.2, 0.24 / (i + 1), 110 - i * 15, 0.5, 0.08 + i * 0.18);
    }
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

  spellBookOpen() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    const len = 0.22;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.35));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, t0);
    filter.Q.setValueAtTime(1.8, t0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + len);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start(t0);

    const bell = ctx.createOscillator();
    const bGain = ctx.createGain();
    bell.type = "sine";
    bell.frequency.setValueAtTime(880, t0);
    bGain.gain.setValueAtTime(0.035, t0);
    bGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    bell.connect(bGain);
    bGain.connect(master);
    bell.start(t0);
    bell.stop(t0 + 0.5);
  }

  enchant() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
    freqs.forEach((f, i) => {
      const t = t0 + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.015, t + 0.5);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(f * 1.2, t);
      filter.Q.setValueAtTime(3.0, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(t);
      osc.stop(t + 1.25);
    });

    const shimmer = ctx.createOscillator();
    const sGain = ctx.createGain();
    shimmer.type = "triangle";
    shimmer.frequency.setValueAtTime(1046.5, t0);
    shimmer.frequency.exponentialRampToValueAtTime(2093.0, t0 + 0.6);
    sGain.gain.setValueAtTime(0.04, t0);
    sGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
    shimmer.connect(sGain);
    sGain.connect(master);
    shimmer.start(t0);
    shimmer.stop(t0 + 0.9);
  }

  villagerHrmm(pitch = 1.0) {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    const startFreq = 165 * pitch;
    const endFreq = 125 * pitch;
    osc.frequency.setValueAtTime(startFreq, t0);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + 0.38);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(720 * pitch, t0);
    filter.Q.setValueAtTime(4.2, t0);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(t0);
    osc.stop(t0 + 0.45);
  }

  villagerYes() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, t0);
    osc.frequency.exponentialRampToValueAtTime(230, t0 + 0.24);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(840, t0);
    filter.Q.setValueAtTime(3.8, t0);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.28);
  }

  villagerNo() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;
    [0, 0.14].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(idx === 0 ? 140 : 120, t0 + delay);
      osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 125 : 105, t0 + delay + 0.11);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(620, t0 + delay);
      filter.Q.setValueAtTime(3.5, t0 + delay);

      gain.gain.setValueAtTime(0.0001, t0 + delay);
      gain.gain.exponentialRampToValueAtTime(0.15, t0 + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start(t0 + delay);
      osc.stop(t0 + delay + 0.14);
    });
  }

  villagerTrade() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;
    const notes = [783.99, 987.77, 1174.66, 1567.98];
    notes.forEach((f, idx) => {
      const t = t0 + idx * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.42);
    });

    const sparkle = ctx.createOscillator();
    const sGain = ctx.createGain();
    sparkle.type = "triangle";
    sparkle.frequency.setValueAtTime(2349.32, t0 + 0.2);
    sGain.gain.setValueAtTime(0.0001, t0 + 0.2);
    sGain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.22);
    sGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65);
    sparkle.connect(sGain);
    sGain.connect(master);
    sparkle.start(t0 + 0.2);
    sparkle.stop(t0 + 0.68);
  }

  endermanStare() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    // Distorted static drone
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(95, t0);
    osc.frequency.linearRampToValueAtTime(140, t0 + 0.3);
    osc.frequency.exponentialRampToValueAtTime(70, t0 + 0.9);

    lfo.type = "square";
    lfo.frequency.setValueAtTime(28, t0);
    lfoGain.gain.setValueAtTime(45, t0);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(680, t0);
    filter.Q.setValueAtTime(4.2, t0);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.95);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    lfo.start(t0);
    osc.start(t0);
    lfo.stop(t0 + 0.96);
    osc.stop(t0 + 0.96);
  }

  endermanTeleport() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    // Dimensional warp swoosh
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1100, t0);
    osc.frequency.exponentialRampToValueAtTime(180, t0 + 0.28);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, t0);
    filter.frequency.exponentialRampToValueAtTime(300, t0 + 0.28);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(t0);
    osc.stop(t0 + 0.32);
  }

  ironGolemHit() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    // Heavy anvil / metal impact punch
    const oscPunch = ctx.createOscillator();
    const gainPunch = ctx.createGain();
    oscPunch.type = "triangle";
    oscPunch.frequency.setValueAtTime(140, t0);
    oscPunch.frequency.exponentialRampToValueAtTime(45, t0 + 0.22);

    gainPunch.gain.setValueAtTime(0.28, t0);
    gainPunch.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);

    oscPunch.connect(gainPunch);
    gainPunch.connect(master);
    oscPunch.start(t0);
    oscPunch.stop(t0 + 0.26);

    // High metal clang ring
    const oscRing = ctx.createOscillator();
    const gainRing = ctx.createGain();
    oscRing.type = "sine";
    oscRing.frequency.setValueAtTime(880, t0);
    oscRing.frequency.exponentialRampToValueAtTime(840, t0 + 0.35);

    gainRing.gain.setValueAtTime(0.14, t0);
    gainRing.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);

    oscRing.connect(gainRing);
    gainRing.connect(master);
    oscRing.start(t0);
    oscRing.stop(t0 + 0.4);
  }

  spiderHiss() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    // Filtered noise with stutter modulation
    const len = Math.floor(ctx.sampleRate * 0.35);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const stutter = (Math.sin(i * 0.05) > 0 ? 1 : 0.4) * (1 - i / len);
      data[i] = (Math.random() * 2 - 1) * stutter;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2400, t0);
    filter.frequency.exponentialRampToValueAtTime(1400, t0 + 0.35);
    filter.Q.value = 3.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  dragonRoar() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    // Deep sub bass roar
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc2.type = "triangle";
    osc1.frequency.setValueAtTime(75, t0);
    osc1.frequency.exponentialRampToValueAtTime(32, t0 + 1.2);
    osc2.frequency.setValueAtTime(78, t0);
    osc2.frequency.exponentialRampToValueAtTime(34, t0 + 1.2);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, t0);
    filter.frequency.exponentialRampToValueAtTime(120, t0 + 1.2);
    filter.Q.value = 4.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.25);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + 1.3);
    osc2.stop(t0 + 1.3);

    // Cavernous noise rasp
    this.noise(0.9, 0.22, 600, 1.5, 0.05);
  }

  dragonFlap() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(85, t0);
    osc.frequency.exponentialRampToValueAtTime(28, t0 + 0.26);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.3);

    this.noise(0.24, 0.16, 320, 0.7, 0.02);
  }

  crystalExplode() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    // High crystalline bell ring
    [1100, 1650, 2200].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0 + idx * 0.02);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, t0 + 0.6);
      gain.gain.setValueAtTime(0.12, t0 + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0 + idx * 0.02);
      osc.stop(t0 + 0.65);
    });

    // Heavy concussive burst
    this.noise(0.65, 0.35, 280, 0.9, 0.01);
  }

  shieldBlock() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    // Heavy wood impact clack
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(260, t0);
    osc.frequency.exponentialRampToValueAtTime(60, t0 + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.15);

    // Metal deflection ping
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = "sine";
    ping.frequency.setValueAtTime(1400, t0);
    ping.frequency.exponentialRampToValueAtTime(1200, t0 + 0.2);
    pingGain.gain.setValueAtTime(0.18, t0);
    pingGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    ping.connect(pingGain);
    pingGain.connect(master);
    ping.start(t0);
    ping.stop(t0 + 0.25);
  }

  endPortalActivate() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    // Resonant celestial hum & portal open chord
    [220, 330, 440, 550, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const startT = t0 + i * 0.08;
      osc.frequency.setValueAtTime(freq, startT);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startT + 1.2);
      gain.gain.setValueAtTime(0.001, startT);
      gain.gain.exponentialRampToValueAtTime(0.12, startT + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, startT + 1.4);
      osc.connect(gain);
      gain.connect(master);
      osc.start(startT);
      osc.stop(startT + 1.5);
    });
  }

  victoryFanfare() {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const master = this.master;
    const t0 = ctx.currentTime;

    // Triumphant fanfare arpeggio: C4, E4, G4, C5, E5, G5, C6
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const noteTime = t0 + idx * 0.14;
      const isLast = idx === notes.length - 1;
      const dur = isLast ? 1.6 : 0.3;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isLast ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.24, noteTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + dur);

      osc.connect(gain);
      gain.connect(master);
      osc.start(noteTime);
      osc.stop(noteTime + dur + 0.05);
    });
  }
}
