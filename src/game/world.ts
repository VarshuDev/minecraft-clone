import { BLOCK, BLOCK_DEFS, type BlockNum } from "./blocks";
import { hashCoords, SeededNoise } from "./noise";

export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 64;
export const SEA_LEVEL = 22;

export type BiomeName = "Plains" | "Oak Forest" | "Desert" | "Snowy Peaks" | "Ocean";

export const chunkCoord = (v: number) => Math.floor(v / CHUNK_SIZE);
export const chunkKey = (cx: number, cz: number) => `${cx}|${cz}`;
export const blockKey = (x: number, y: number, z: number) => `${x}|${y}|${z}`;

const localIdx = (lx: number, y: number, lz: number) => (y << 8) | (lz << 4) | lx;

export class InfiniteWorld {
  readonly seed: number;
  private terrainNoise: SeededNoise;
  private biomeNoise: SeededNoise;
  private caveNoise: SeededNoise;
  private detailNoise: SeededNoise;

  chunks = new Map<string, Uint8Array>();
  /** Persistent player block modifications (world coords -> BlockNum) */
  edits = new Map<string, BlockNum>();
  /** Edits grouped by chunkKey for fast re-application on chunk load */
  private editsByChunk = new Map<string, Array<[number, number, number, BlockNum]>>();
  /** Emissive light-casting blocks (torches / glowstone) */
  lightBlocks = new Map<string, { x: number; y: number; z: number; color: number }>();

  constructor(seed: number, initialEdits?: Record<string, number>) {
    this.seed = seed;
    this.terrainNoise = new SeededNoise(seed);
    this.biomeNoise = new SeededNoise(seed ^ 0x51a7e3);
    this.caveNoise = new SeededNoise(seed ^ 0x9e3779b9);
    this.detailNoise = new SeededNoise(seed ^ 0x2c1b3c6d);

    if (initialEdits) {
      for (const [key, val] of Object.entries(initialEdits)) {
        const [x, y, z] = key.split("|").map(Number);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
        const b = val as BlockNum;
        this.recordEdit(x, y, z, b);
      }
    }
  }

  private recordEdit(x: number, y: number, z: number, block: BlockNum) {
    const key = blockKey(x, y, z);
    this.edits.set(key, block);
    const ck = chunkKey(chunkCoord(x), chunkCoord(z));
    let arr = this.editsByChunk.get(ck);
    if (!arr) {
      arr = [];
      this.editsByChunk.set(ck, arr);
    }
    const existingIdx = arr.findIndex((e) => e[0] === x && e[1] === y && e[2] === z);
    if (existingIdx >= 0) arr[existingIdx][3] = block;
    else arr.push([x, y, z, block]);

    const def = BLOCK_DEFS[block];
    if (def?.emitsLight) {
      this.lightBlocks.set(key, { x: x + 0.5, y: y + 0.6, z: z + 0.5, color: def.lightColor ?? 0xffc970 });
    } else {
      this.lightBlocks.delete(key);
    }
  }

  exportEdits(): Record<string, number> {
    const out: Record<string, number> = {};
    this.edits.forEach((val, key) => {
      out[key] = val;
    });
    return out;
  }

  getBiomeAt(wx: number, wz: number): { name: BiomeName; height: number; temp: number; humid: number; mountain: number } {
    const temp = this.biomeNoise.fbm2(wx * 0.0045 + 17.3, wz * 0.0045 - 9.1, 3);
    const humid = this.biomeNoise.fbm2(wx * 0.0052 - 41.7, wz * 0.0052 + 23.4, 3);
    const mountainRaw = this.terrainNoise.fbm2(wx * 0.0075 + 101.2, wz * 0.0075 + 55.8, 4);
    const mountain = Math.max(0, mountainRaw);

    const base = this.terrainNoise.fbm2(wx * 0.014, wz * 0.014, 4);
    const hills = this.detailNoise.fbm2(wx * 0.042, wz * 0.042, 2) * 2.8;

    let h = 25 + base * 11 + hills;
    let name: BiomeName = "Plains";

    if (mountain > 0.22) {
      const ridge = (mountain - 0.22) * 46;
      h += ridge;
      name = h > 34 ? "Snowy Peaks" : "Plains";
    } else if (temp > 0.16) {
      h = 24.5 + base * 6.5 + hills * 0.55;
      name = "Desert";
    } else if (humid > 0.04) {
      name = "Oak Forest";
    }

    const height = Math.max(6, Math.min(WORLD_HEIGHT - 10, Math.round(h)));
    if (height < SEA_LEVEL - 1) name = "Ocean";
    return { name, height, temp, humid, mountain };
  }

  ensureChunk(cx: number, cz: number): Uint8Array {
    const key = chunkKey(cx, cz);
    const existing = this.chunks.get(key);
    if (existing) return existing;

    const data = new Uint8Array(CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE);
    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;
    const heights = new Int16Array(CHUNK_SIZE * CHUNK_SIZE);
    const biomes: BiomeName[] = new Array(CHUNK_SIZE * CHUNK_SIZE);

    // 1) Column terrain + water + stratified stone/deepslate + caves + ores
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = baseX + lx;
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wz = baseZ + lz;
        const info = this.getBiomeAt(wx, wz);
        const h = info.height;
        heights[(lz << 4) | lx] = h;
        biomes[(lz << 4) | lx] = info.name;
        const nearWater = h <= SEA_LEVEL + 1;

        for (let y = 0; y <= Math.max(h, SEA_LEVEL); y++) {
          let b: BlockNum = BLOCK.AIR;

          if (y === 0) {
            b = BLOCK.BEDROCK;
          } else if (y > h) {
            b = y <= SEA_LEVEL ? BLOCK.WATER : BLOCK.AIR;
          } else if (y === h) {
            if (info.name === "Desert") b = BLOCK.SAND;
            else if (info.name === "Snowy Peaks" && y >= 35) b = BLOCK.SNOW;
            else if (info.name === "Snowy Peaks" && y >= 31) b = BLOCK.STONE;
            else if (nearWater) b = BLOCK.SAND;
            else b = BLOCK.GRASS;
          } else if (y >= h - 3) {
            if (info.name === "Desert") b = y >= h - 1 ? BLOCK.SAND : BLOCK.SANDSTONE;
            else if (info.name === "Snowy Peaks" && y >= 30) b = BLOCK.STONE;
            else if (nearWater) b = BLOCK.SAND;
            else b = BLOCK.DIRT;
          } else if (y <= 9) {
            b = BLOCK.DEEPSLATE;
          } else {
            b = BLOCK.STONE;
          }

          // 3D Caves (stay clear of water basins and bedrock)
          if (
            y >= 2 &&
            y < h - 2 &&
            !nearWater &&
            (b === BLOCK.STONE || b === BLOCK.DEEPSLATE || b === BLOCK.DIRT || b === BLOCK.SANDSTONE)
          ) {
            const c1 = this.caveNoise.noise3(wx * 0.068, y * 0.095, wz * 0.068);
            const c2 = this.detailNoise.noise3(wx * 0.068 + 43, y * 0.095 - 19, wz * 0.068 + 71);
            if (Math.abs(c1) < 0.055 && Math.abs(c2) < 0.085) {
              b = BLOCK.AIR;
            } else if (c1 > 0.34 && y <= 18) {
              b = BLOCK.AIR;
            }
          }

          // Ores inside stone / deepslate
          if (b === BLOCK.STONE || b === BLOCK.DEEPSLATE) {
            const oreH = hashCoords(wx, y, wz, this.seed + 701);
            if (y <= 11 && oreH < 0.014) b = BLOCK.DIAMOND_ORE;
            else if (y <= 16 && oreH < 0.032) b = BLOCK.GOLD_ORE;
            else if (y <= 26 && oreH < 0.072) b = BLOCK.IRON_ORE;
            else if (y <= 34 && oreH < 0.115) b = BLOCK.COAL_ORE;
          }

          data[localIdx(lx, y, lz)] = b;
        }
      }
    }

    // 2) Trees & Cacti placed strictly inside [2..13] so canopies never clip chunk boundaries
    for (let lx = 2; lx <= CHUNK_SIZE - 3; lx++) {
      const wx = baseX + lx;
      for (let lz = 2; lz <= CHUNK_SIZE - 3; lz++) {
        const wz = baseZ + lz;
        const h = heights[(lz << 4) | lx];
        const biome = biomes[(lz << 4) | lx];
        if (h <= SEA_LEVEL + 1 || h >= WORLD_HEIGHT - 9) continue;

        const r = hashCoords(wx, 0, wz, this.seed + 999);
        const surf = data[localIdx(lx, h, lz)];

        if (biome === "Desert" && surf === BLOCK.SAND && r < 0.012) {
          const ch = 2 + Math.floor(hashCoords(wx, 1, wz, this.seed) * 3);
          for (let dy = 1; dy <= ch; dy++) data[localIdx(lx, h + dy, lz)] = BLOCK.CACTUS;
        } else if (surf === BLOCK.GRASS) {
          const chance = biome === "Oak Forest" ? 0.032 : biome === "Plains" ? 0.006 : 0;
          if (r < chance) {
            // Avoid crowding adjacent trees
            if (
              data[localIdx(lx - 1, h + 2, lz)] === BLOCK.OAK_LOG ||
              data[localIdx(lx, h + 2, lz - 1)] === BLOCK.OAK_LOG
            ) {
              continue;
            }
            const trunk = 4 + Math.floor(hashCoords(wx, 3, wz, this.seed) * 2);
            for (let dy = 1; dy <= trunk; dy++) data[localIdx(lx, h + dy, lz)] = BLOCK.OAK_LOG;
            for (let dy = trunk - 1; dy <= trunk + 1; dy++) {
              const rad = dy === trunk + 1 ? 1 : 2;
              for (let dx = -rad; dx <= rad; dx++) {
                for (let dz = -rad; dz <= rad; dz++) {
                  if (dx === 0 && dz === 0 && dy <= trunk) continue;
                  if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && hashCoords(wx + dx, dy, wz + dz, this.seed) > 0.4) {
                    continue;
                  }
                  const tx = lx + dx;
                  const tz = lz + dz;
                  const ty = h + dy;
                  if (tx >= 0 && tx < CHUNK_SIZE && tz >= 0 && tz < CHUNK_SIZE && ty < WORLD_HEIGHT) {
                    if (data[localIdx(tx, ty, tz)] === BLOCK.AIR) {
                      data[localIdx(tx, ty, tz)] = BLOCK.OAK_LEAVES;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // 3) Re-apply any saved player edits in this chunk
    const edits = this.editsByChunk.get(key);
    if (edits) {
      for (const [wx, y, wz, b] of edits) {
        if (y >= 0 && y < WORLD_HEIGHT) {
          data[localIdx(wx - baseX, y, wz - baseZ)] = b;
        }
      }
    }

    this.chunks.set(key, data);
    return data;
  }

  unloadChunk(cx: number, cz: number) {
    this.chunks.delete(chunkKey(cx, cz));
  }

  getBlock(wx: number, y: number, wz: number): BlockNum {
    if (y < 0 || y >= WORLD_HEIGHT) return BLOCK.AIR;
    const cx = chunkCoord(wx);
    const cz = chunkCoord(wz);
    const data = this.chunks.get(chunkKey(cx, cz));
    if (!data) return BLOCK.AIR;
    const lx = wx - cx * CHUNK_SIZE;
    const lz = wz - cz * CHUNK_SIZE;
    return data[localIdx(lx, y, lz)] as BlockNum;
  }

  setBlock(wx: number, y: number, wz: number, block: BlockNum) {
    if (y < 0 || y >= WORLD_HEIGHT) return;
    const cx = chunkCoord(wx);
    const cz = chunkCoord(wz);
    const data = this.ensureChunk(cx, cz);
    const lx = wx - cx * CHUNK_SIZE;
    const lz = wz - cz * CHUNK_SIZE;
    data[localIdx(lx, y, lz)] = block;
    this.recordEdit(wx, y, wz, block);
  }

  findSpawn(): { x: number; y: number; z: number } {
    // Search outward from (0,0) for dry land above sea level
    for (let r = 0; r <= 48; r += 2) {
      for (let a = 0; a < 8; a++) {
        const wx = Math.round(Math.cos((a / 8) * Math.PI * 2) * r);
        const wz = Math.round(Math.sin((a / 8) * Math.PI * 2) * r);
        const info = this.getBiomeAt(wx, wz);
        if (info.height >= SEA_LEVEL + 1 && info.height <= 36) {
          this.ensureChunk(chunkCoord(wx), chunkCoord(wz));
          let topY = WORLD_HEIGHT - 2;
          while (topY > 1 && this.getBlock(wx, topY, wz) === BLOCK.AIR) topY--;
          return { x: wx + 0.5, y: topY + 1.05, z: wz + 0.5 };
        }
      }
    }
    this.ensureChunk(0, 0);
    return { x: 0.5, y: 34, z: 0.5 };
  }
}
