import { BLOCK, BLOCK_DEFS, type BlockNum } from "./blocks";
import { hashCoords, SeededNoise } from "./noise";

export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 64;
export const SEA_LEVEL = 22;

export type BiomeName = "Plains" | "Oak Forest" | "Desert" | "Snowy Peaks" | "Ocean";
export type Dimension = "overworld" | "nether";

export const chunkCoord = (v: number) => Math.floor(v / CHUNK_SIZE);
export const chunkKey = (cx: number, cz: number) => `${cx}|${cz}`;
export const blockKey = (x: number, y: number, z: number) => `${x}|${y}|${z}`;

const localIdx = (lx: number, y: number, lz: number) => (y << 8) | (lz << 4) | lx;

export class InfiniteWorld {
  readonly seed: number;
  readonly dimension: Dimension;
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

  constructor(seed: number, initialEdits?: Record<string, number>, dimension: Dimension = "overworld") {
    this.seed = seed;
    this.dimension = dimension;
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

    if (this.dimension === "nether") {
      return this.generateNetherChunk(cx, cz);
    }

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
            if (info.name === "Snowy Peaks" && y >= 30 && oreH < 0.038) b = BLOCK.EMERALD_ORE;
            else if (y <= 11 && oreH < 0.014) b = BLOCK.DIAMOND_ORE;
            else if (y <= 16 && oreH < 0.032) b = BLOCK.GOLD_ORE;
            else if (y >= 6 && y <= 24 && oreH < 0.046) b = BLOCK.LAPIS_ORE;
            else if (y <= 18 && oreH < 0.062) b = BLOCK.REDSTONE_ORE;
            else if (y <= 26 && oreH < 0.076) b = BLOCK.IRON_ORE;
            else if (y <= 34 && oreH < 0.118) b = BLOCK.COAL_ORE;
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

    // 2.5) Village Structures (Plains biome villages)
    if (this.isVillageChunk(cx, cz)) {
      this.buildVillageChunk(data, cx, cz, baseX, baseZ, heights);
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

  private generateNetherChunk(cx: number, cz: number): Uint8Array {
    const key = chunkKey(cx, cz);
    const data = new Uint8Array(CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE);
    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;
    const LAVA_LEVEL = 13;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = baseX + lx;
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wz = baseZ + lz;

        // Soul sand shore noise
        const soulSandPatch = this.biomeNoise.fbm2(wx * 0.05 + 13.5, wz * 0.05 - 28.1, 2) > 0.12;

        for (let y = 0; y < WORLD_HEIGHT; y++) {
          let b: BlockNum = BLOCK.NETHERRACK;

          // Bedrock Floor & Ceiling
          if (y === 0 || y === WORLD_HEIGHT - 1) {
            b = BLOCK.BEDROCK;
          } else if (y <= 2 && hashCoords(wx, y, wz, this.seed + 101) < 0.65) {
            b = BLOCK.BEDROCK;
          } else if (y >= WORLD_HEIGHT - 3 && hashCoords(wx, y, wz, this.seed + 202) < 0.65) {
            b = BLOCK.BEDROCK;
          } else {
            // 3D Caverns
            const c1 = this.caveNoise.noise3(wx * 0.048, y * 0.062, wz * 0.048);
            const c2 = this.detailNoise.noise3(wx * 0.082 + 25, y * 0.082 - 31, wz * 0.082 + 63) * 0.45;
            const density = c1 + c2;

            if (density > -0.05) {
              // Open cavern: lava below LAVA_LEVEL, air above
              b = y <= LAVA_LEVEL ? BLOCK.LAVA : BLOCK.AIR;
            } else {
              // Solid nether terrain
              if (soulSandPatch && y >= 11 && y <= 16) {
                b = BLOCK.SOUL_SAND;
              } else if (hashCoords(wx, y, wz, this.seed + 313) < 0.035 && y <= 25) {
                b = BLOCK.GRAVEL;
              } else if (y >= 10 && y <= 58 && hashCoords(wx, y, wz, this.seed + 414) < 0.038) {
                b = BLOCK.NETHER_QUARTZ_ORE;
              }
            }
          }

          data[localIdx(lx, y, lz)] = b;
        }
      }
    }

    // Glowstone stalactites hanging from ceiling caverns
    for (let lx = 1; lx < CHUNK_SIZE - 1; lx++) {
      const wx = baseX + lx;
      for (let lz = 1; lz < CHUNK_SIZE - 1; lz++) {
        const wz = baseZ + lz;
        if (hashCoords(wx, 50, wz, this.seed + 777) < 0.028) {
          // Find cavern ceiling
          for (let y = WORLD_HEIGHT - 6; y >= 25; y--) {
            const above = data[localIdx(lx, y + 1, lz)];
            const curr = data[localIdx(lx, y, lz)];
            if ((above === BLOCK.NETHERRACK || above === BLOCK.BEDROCK) && curr === BLOCK.AIR) {
              const clusterLen = 2 + Math.floor(hashCoords(wx, y, wz, this.seed) * 3);
              for (let dy = 0; dy < clusterLen; dy++) {
                if (y - dy > 15 && data[localIdx(lx, y - dy, lz)] === BLOCK.AIR) {
                  data[localIdx(lx, y - dy, lz)] = BLOCK.GLOWSTONE;
                  if (dy === 0 && hashCoords(wx + 1, y, wz, this.seed) > 0.4 && lx < CHUNK_SIZE - 1) {
                    data[localIdx(lx + 1, y, lz)] = BLOCK.GLOWSTONE;
                  }
                  if (dy === 0 && hashCoords(wx, y, wz + 1, this.seed) > 0.4 && lz < CHUNK_SIZE - 1) {
                    data[localIdx(lx, y, lz + 1)] = BLOCK.GLOWSTONE;
                  }
                }
              }
              break;
            }
          }
        }
      }
    }

    // Re-apply any saved player edits in this chunk
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

  isVillageChunk(cx: number, cz: number): boolean {
    if (this.dimension !== "overworld") return false;
    const modX = ((cx % 8) + 8) % 8;
    const modZ = ((cz % 8) + 8) % 8;
    if (modX !== 2 || modZ !== 2) return false;

    const centerBiome = this.getBiomeAt(cx * CHUNK_SIZE + 8, cz * CHUNK_SIZE + 8);
    return centerBiome.name === "Plains" && centerBiome.height >= 22 && centerBiome.height <= 34;
  }

  getVillageVillagerSpawns(cx: number, cz: number): Array<{ x: number; y: number; z: number; profession: "farmer" | "weaponsmith" | "librarian" | "cleric" }> {
    if (!this.isVillageChunk(cx, cz)) return [];
    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;
    const centerBiome = this.getBiomeAt(baseX + 8, baseZ + 8);
    const avgH = centerBiome.height;
    return [
      { x: baseX + 10.5, y: avgH + 1.1, z: baseZ + 4.5, profession: "farmer" },
      { x: baseX + 4.5, y: avgH + 1.1, z: baseZ + 4.5, profession: "weaponsmith" },
      { x: baseX + 11.5, y: avgH + 1.1, z: baseZ + 11.5, profession: "cleric" },
    ];
  }

  private buildVillageChunk(
    data: Uint8Array,
    _cx: number,
    _cz: number,
    baseX: number,
    baseZ: number,
    heights: Int16Array,
  ) {
    const avgH = heights[(8 << 4) | 8];
    if (avgH < 22 || avgH > 40) return;

    const setB = (lx: number, y: number, lz: number, b: BlockNum) => {
      if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && y >= 0 && y < WORLD_HEIGHT) {
        data[localIdx(lx, y, lz)] = b;
        if (b === BLOCK.TORCH) {
          const wx = baseX + lx;
          const wz = baseZ + lz;
          this.lightBlocks.set(blockKey(wx, y, wz), { x: wx + 0.5, y: y + 0.6, z: wz + 0.5, color: 0xffc970 });
        }
      }
    };

    // 1) Gravel Paths
    for (let lz = 6; lz <= 8; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const h = heights[(lz << 4) | lx];
        setB(lx, h, lz, BLOCK.GRAVEL);
      }
    }
    for (let lx = 7; lx <= 8; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const h = heights[(lz << 4) | lx];
        setB(lx, h, lz, BLOCK.GRAVEL);
      }
    }

    // 2) Village House (lx: 1..6, lz: 1..6)
    for (let x = 1; x <= 6; x++) {
      for (let z = 1; z <= 6; z++) {
        setB(x, avgH, z, BLOCK.COBBLESTONE);
        for (let y = avgH + 1; y <= avgH + 4; y++) {
          setB(x, y, z, BLOCK.AIR);
        }
      }
    }

    // Corner Log Pillars
    for (const [px, pz] of [[1, 1], [6, 1], [1, 6], [6, 6]]) {
      for (let dy = 1; dy <= 4; dy++) setB(px, avgH + dy, pz, BLOCK.OAK_LOG);
    }

    // Walls
    for (let dy = 1; dy <= 3; dy++) {
      for (let x = 2; x <= 5; x++) {
        setB(x, avgH + dy, 1, BLOCK.PLANKS);
        setB(x, avgH + dy, 6, BLOCK.PLANKS);
      }
      for (let z = 2; z <= 5; z++) {
        setB(1, avgH + dy, z, BLOCK.PLANKS);
        setB(6, avgH + dy, z, BLOCK.PLANKS);
      }
    }

    // Windows
    setB(1, avgH + 2, 3, BLOCK.GLASS);
    setB(1, avgH + 2, 4, BLOCK.GLASS);
    setB(6, avgH + 2, 3, BLOCK.GLASS);
    setB(6, avgH + 2, 4, BLOCK.GLASS);
    setB(3, avgH + 2, 1, BLOCK.GLASS);
    setB(4, avgH + 2, 1, BLOCK.GLASS);

    // Doorway
    setB(3, avgH + 1, 6, BLOCK.WOOD_DOOR);
    setB(3, avgH + 2, 6, BLOCK.AIR);

    // Roof
    for (let x = 1; x <= 6; x++) {
      for (let z = 1; z <= 6; z++) {
        setB(x, avgH + 4, z, BLOCK.PLANKS);
      }
    }

    // Interior Furniture
    setB(2, avgH + 1, 2, BLOCK.BED);
    setB(5, avgH + 1, 2, BLOCK.CRAFTING_TABLE);
    setB(5, avgH + 1, 5, BLOCK.CHEST);
    setB(2, avgH + 1, 5, BLOCK.BOOKSHELF);
    setB(3, avgH + 3, 2, BLOCK.TORCH);

    // 3) Village Farm Plot (lx: 9..14, lz: 1..7)
    for (let x = 9; x <= 14; x++) {
      for (let z = 1; z <= 7; z++) {
        for (let y = avgH + 1; y <= avgH + 2; y++) setB(x, y, z, BLOCK.AIR);
      }
    }

    for (let x = 9; x <= 14; x++) {
      setB(x, avgH, 1, BLOCK.OAK_LOG);
      setB(x, avgH, 7, BLOCK.OAK_LOG);
    }
    for (let z = 1; z <= 7; z++) {
      setB(9, avgH, z, BLOCK.OAK_LOG);
      setB(14, avgH, z, BLOCK.OAK_LOG);
    }

    // Central Water Trench
    for (let z = 2; z <= 6; z++) {
      setB(11, avgH, z, BLOCK.WATER);
      setB(12, avgH, z, BLOCK.WATER);
    }

    // Farmland & Crops
    for (let z = 2; z <= 6; z++) {
      setB(10, avgH, z, BLOCK.FARMLAND_MOIST);
      setB(10, avgH + 1, z, z % 2 === 0 ? BLOCK.WHEAT_3 : BLOCK.WHEAT_2);

      setB(13, avgH, z, BLOCK.FARMLAND_MOIST);
      setB(13, avgH + 1, z, z % 2 === 0 ? BLOCK.WHEAT_2 : BLOCK.WHEAT_3);
    }

    // 4) Village Well (lx: 10..13, lz: 10..13)
    for (let x = 10; x <= 13; x++) {
      for (let z = 10; z <= 13; z++) {
        for (let y = avgH + 1; y <= avgH + 5; y++) setB(x, y, z, BLOCK.AIR);
        setB(x, avgH - 1, z, BLOCK.COBBLESTONE);
      }
    }

    // Cobblestone Rim
    for (let x = 10; x <= 13; x++) {
      setB(x, avgH, 10, BLOCK.COBBLESTONE);
      setB(x, avgH, 13, BLOCK.COBBLESTONE);
      setB(x, avgH + 1, 10, BLOCK.COBBLESTONE);
      setB(x, avgH + 1, 13, BLOCK.COBBLESTONE);
    }
    for (let z = 10; z <= 13; z++) {
      setB(10, avgH, z, BLOCK.COBBLESTONE);
      setB(13, avgH, z, BLOCK.COBBLESTONE);
      setB(10, avgH + 1, z, BLOCK.COBBLESTONE);
      setB(13, avgH + 1, z, BLOCK.COBBLESTONE);
    }

    // Water pool
    setB(11, avgH, 11, BLOCK.WATER);
    setB(12, avgH, 11, BLOCK.WATER);
    setB(11, avgH, 12, BLOCK.WATER);
    setB(12, avgH, 12, BLOCK.WATER);

    // Well Roof Posts
    for (const [wx, wz] of [[10, 10], [13, 10], [10, 13], [13, 13]]) {
      for (let dy = 2; dy <= 4; dy++) setB(wx, avgH + dy, wz, BLOCK.OAK_LOG);
      setB(wx, avgH + 3, wz, BLOCK.TORCH);
    }
    for (let x = 10; x <= 13; x++) {
      for (let z = 10; z <= 13; z++) {
        setB(x, avgH + 5, z, BLOCK.PLANKS);
      }
    }
  }

  findSpawn(): { x: number; y: number; z: number } {
    if (this.dimension === "nether") {
      // Find a safe solid block above lava with 2 air blocks above it
      for (let r = 0; r <= 32; r += 2) {
        for (let a = 0; a < 8; a++) {
          const wx = Math.round(Math.cos((a / 8) * Math.PI * 2) * r);
          const wz = Math.round(Math.sin((a / 8) * Math.PI * 2) * r);
          this.ensureChunk(chunkCoord(wx), chunkCoord(wz));
          for (let y = 16; y <= 45; y++) {
            const b = this.getBlock(wx, y, wz);
            const above1 = this.getBlock(wx, y + 1, wz);
            const above2 = this.getBlock(wx, y + 2, wz);
            if (
              (b === BLOCK.NETHERRACK || b === BLOCK.SOUL_SAND || b === BLOCK.GRAVEL) &&
              above1 === BLOCK.AIR &&
              above2 === BLOCK.AIR
            ) {
              return { x: wx + 0.5, y: y + 1.05, z: wz + 0.5 };
            }
          }
        }
      }
      this.ensureChunk(0, 0);
      return { x: 0.5, y: 22, z: 0.5 };
    }

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
