/** Fast deterministic seeded 2D/3D gradient/value noise + fBm for infinite voxel terrain & caves. */
export class SeededNoise {
  private perm: Uint8Array;

  constructor(seed: number) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = (seed >>> 0) || 1337;
    for (let i = 255; i > 0; i--) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const j = s % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private static fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private static lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }

  private static grad2(hash: number, x: number, y: number) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) !== 0 ? -u : u) + ((h & 2) !== 0 ? -2.0 * v : 2.0 * v);
  }

  private static grad3(hash: number, x: number, y: number, z: number) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  /** Returns roughly [-1, 1] */
  noise2(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = SeededNoise.fade(xf);
    const v = SeededNoise.fade(yf);

    const p = this.perm;
    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];

    const x1 = SeededNoise.lerp(SeededNoise.grad2(aa, xf, yf), SeededNoise.grad2(ba, xf - 1, yf), u);
    const x2 = SeededNoise.lerp(SeededNoise.grad2(ab, xf, yf - 1), SeededNoise.grad2(bb, xf - 1, yf - 1), u);
    return SeededNoise.lerp(x1, x2, v) * 0.45;
  }

  /** Returns roughly [-1, 1] */
  noise3(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);
    const u = SeededNoise.fade(xf);
    const v = SeededNoise.fade(yf);
    const w = SeededNoise.fade(zf);

    const p = this.perm;
    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;

    return SeededNoise.lerp(
      SeededNoise.lerp(
        SeededNoise.lerp(SeededNoise.grad3(p[AA], xf, yf, zf), SeededNoise.grad3(p[BA], xf - 1, yf, zf), u),
        SeededNoise.lerp(SeededNoise.grad3(p[AB], xf, yf - 1, zf), SeededNoise.grad3(p[BB], xf - 1, yf - 1, zf), u),
        v,
      ),
      SeededNoise.lerp(
        SeededNoise.lerp(
          SeededNoise.grad3(p[AA + 1], xf, yf, zf - 1),
          SeededNoise.grad3(p[BA + 1], xf - 1, yf, zf - 1),
          u,
        ),
        SeededNoise.lerp(
          SeededNoise.grad3(p[AB + 1], xf, yf - 1, zf - 1),
          SeededNoise.grad3(p[BB + 1], xf - 1, yf - 1, zf - 1),
          u,
        ),
        v,
      ),
      w,
    );
  }

  fbm2(x: number, y: number, octaves = 4, persistence = 0.5, lacunarity = 2): number {
    let total = 0;
    let amp = 1;
    let freq = 1;
    let max = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise2(x * freq, y * freq) * amp;
      max += amp;
      amp *= persistence;
      freq *= lacunarity;
    }
    return total / max;
  }
}

export function hashCoords(x: number, y: number, z: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647) + Math.imul(seed, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
