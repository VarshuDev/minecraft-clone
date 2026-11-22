import * as THREE from "three";
import { BLOCK, BLOCK_DEFS, type BlockNum } from "./blocks";
import type { BlockTileMap } from "./textures";
import { CHUNK_SIZE, WORLD_HEIGHT, type InfiniteWorld } from "./world";

interface FaceSpec {
  dir: [number, number, number];
  corners: Array<[number, number, number]>;
  uvKind: "top" | "bottom" | "side";
  shade: number;
}

const FACES: FaceSpec[] = [
  {
    dir: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    uvKind: "top",
    shade: 1.0,
  },
  {
    dir: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    uvKind: "bottom",
    shade: 0.62,
  },
  {
    dir: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    uvKind: "side",
    shade: 0.88,
  },
  {
    dir: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    uvKind: "side",
    shade: 0.84,
  },
  {
    dir: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    uvKind: "side",
    shade: 0.92,
  },
  {
    dir: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    uvKind: "side",
    shade: 0.80,
  },
];

const AO_CURVE = [0.46, 0.66, 0.84, 1.0];

function isOpaqueForAO(world: InfiniteWorld, x: number, y: number, z: number): number {
  const b = world.getBlock(x, y, z);
  if (b === BLOCK.AIR) return 0;
  return BLOCK_DEFS[b].transparent ? 0 : 1;
}

function vertexAO(
  world: InfiniteWorld,
  bx: number,
  by: number,
  bz: number,
  nx: number,
  ny: number,
  nz: number,
  vx: number,
  vy: number,
  vz: number,
): number {
  const ox = bx + nx;
  const oy = by + ny;
  const oz = bz + nz;
  let side1 = 0;
  let side2 = 0;
  let corner = 0;

  if (nx !== 0) {
    const dy = vy === 1 ? 1 : -1;
    const dz = vz === 1 ? 1 : -1;
    side1 = isOpaqueForAO(world, ox, oy + dy, oz);
    side2 = isOpaqueForAO(world, ox, oy, oz + dz);
    corner = side1 && side2 ? 1 : isOpaqueForAO(world, ox, oy + dy, oz + dz);
  } else if (ny !== 0) {
    const dx = vx === 1 ? 1 : -1;
    const dz = vz === 1 ? 1 : -1;
    side1 = isOpaqueForAO(world, ox + dx, oy, oz);
    side2 = isOpaqueForAO(world, ox, oy, oz + dz);
    corner = side1 && side2 ? 1 : isOpaqueForAO(world, ox + dx, oy, oz + dz);
  } else {
    const dx = vx === 1 ? 1 : -1;
    const dy = vy === 1 ? 1 : -1;
    side1 = isOpaqueForAO(world, ox + dx, oy, oz);
    side2 = isOpaqueForAO(world, ox, oy + dy, oz);
    corner = side1 && side2 ? 1 : isOpaqueForAO(world, ox + dx, oy + dy, oz);
  }
  return side1 && side2 ? 0 : 3 - (side1 + side2 + corner);
}

interface MeshBuf {
  pos: number[];
  norm: number[];
  uv: number[];
  col: number[];
  idx: number[];
  vCount: number;
}

function createBuf(): MeshBuf {
  return { pos: [], norm: [], uv: [], col: [], idx: [], vCount: 0 };
}

function toGeometry(buf: MeshBuf): THREE.BufferGeometry | null {
  if (buf.vCount === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(buf.pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(buf.norm, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(buf.uv, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(buf.col, 3));
  geo.setIndex(buf.idx);
  geo.computeBoundingSphere();
  return geo;
}

function emitTorch(buf: MeshBuf, x: number, y: number, z: number, tileSet: BlockTileMap) {
  const minX = x + 0.41;
  const maxX = x + 0.59;
  const minY = y;
  const maxY = y + 0.68;
  const minZ = z + 0.41;
  const maxZ = z + 0.59;
  const uv = tileSet.side;

  for (let f = 0; f < 6; f++) {
    const face = FACES[f];
    const [nx, ny, nz] = face.dir;
    const vc = buf.vCount;
    for (let c = 0; c < 4; c++) {
      const [vx, vy, vz] = face.corners[c];
      buf.pos.push(vx ? maxX : minX, vy ? maxY : minY, vz ? maxZ : minZ);
      buf.norm.push(nx, ny, nz);
      buf.col.push(1, 1, 1);
    }
    buf.uv.push(uv.u0, uv.vBot, uv.u1, uv.vBot, uv.u1, uv.vTop, uv.u0, uv.vTop);
    buf.idx.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
    buf.vCount += 4;
  }
}

function emitCross(buf: MeshBuf, x: number, y: number, z: number, tileSet: BlockTileMap, height = 0.95) {
  const uv = tileSet.side;
  for (let flip = 0; flip < 2; flip++) {
    const vc = buf.vCount;
    buf.pos.push(
      x + 0.15, y, z + 0.15,
      x + 0.85, y, z + 0.85,
      x + 0.85, y + height, z + 0.85,
      x + 0.15, y + height, z + 0.15,
    );
    buf.norm.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    buf.col.push(0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95);
    buf.uv.push(uv.u0, uv.vBot, uv.u1, uv.vBot, uv.u1, uv.vTop, uv.u0, uv.vTop);
    if (flip === 0) {
      buf.idx.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
    } else {
      buf.idx.push(vc + 2, vc + 1, vc, vc + 3, vc + 2, vc);
    }
    buf.vCount += 4;
  }

  for (let flip = 0; flip < 2; flip++) {
    const vc = buf.vCount;
    buf.pos.push(
      x + 0.15, y, z + 0.85,
      x + 0.85, y, z + 0.15,
      x + 0.85, y + height, z + 0.15,
      x + 0.15, y + height, z + 0.85,
    );
    buf.norm.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    buf.col.push(0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95);
    buf.uv.push(uv.u0, uv.vBot, uv.u1, uv.vBot, uv.u1, uv.vTop, uv.u0, uv.vTop);
    if (flip === 0) {
      buf.idx.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
    } else {
      buf.idx.push(vc + 2, vc + 1, vc, vc + 3, vc + 2, vc);
    }
    buf.vCount += 4;
  }
}

function emitWire(buf: MeshBuf, x: number, y: number, z: number, tileSet: BlockTileMap) {
  const uv = tileSet.top;
  const vc = buf.vCount;
  const yH = y + 0.02;
  buf.pos.push(
    x, yH, z + 1,
    x + 1, yH, z + 1,
    x + 1, yH, z,
    x, yH, z,
  );
  buf.norm.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
  buf.col.push(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);
  buf.uv.push(uv.u0, uv.vBot, uv.u1, uv.vBot, uv.u1, uv.vTop, uv.u0, uv.vTop);
  buf.idx.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
  buf.vCount += 4;
}

export interface ChunkGeometries {
  opaque: THREE.BufferGeometry | null;
  water: THREE.BufferGeometry | null;
}

export function buildChunkGeometries(
  world: InfiniteWorld,
  tiles: Record<BlockNum, BlockTileMap>,
  cx: number,
  cz: number,
): ChunkGeometries {
  const data = world.ensureChunk(cx, cz);
  const opaqueBuf = createBuf();
  const waterBuf = createBuf();
  const baseX = cx * CHUNK_SIZE;
  const baseZ = cz * CHUNK_SIZE;

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    const yOff = y << 8;
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const zOff = yOff | (lz << 4);
      const wz = baseZ + lz;
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const b = data[zOff | lx] as BlockNum;
        if (b === BLOCK.AIR) continue;
        const wx = baseX + lx;
        const def = BLOCK_DEFS[b];
        const tileSet = tiles[b];

        if (def.isTorch || def.isLever) {
          emitTorch(opaqueBuf, wx, y, wz, tileSet);
          continue;
        }

        if (def.isFlower) {
          emitCross(opaqueBuf, wx, y, wz, tileSet);
          continue;
        }

        if (def.isCrop) {
          const cropH = 0.4 + (def.cropStage ?? 0) * 0.18;
          emitCross(opaqueBuf, wx, y, wz, tileSet, cropH);
          continue;
        }

        if (def.isWire) {
          emitWire(opaqueBuf, wx, y, wz, tileSet);
          continue;
        }

        if (b === BLOCK.WATER) {
          // Only render water faces next to AIR (lower top surface slightly like real Minecraft!)
          for (let f = 0; f < 6; f++) {
            const face = FACES[f];
            const [nx, ny, nz] = face.dir;
            const neighbor = world.getBlock(wx + nx, y + ny, wz + nz);
            if (neighbor === BLOCK.WATER || (!BLOCK_DEFS[neighbor].transparent && neighbor !== BLOCK.AIR)) continue;
            const uv = tileSet[face.uvKind];
            const vc = waterBuf.vCount;
            const topDrop = ny === 1 ? -0.12 : 0;
            for (let c = 0; c < 4; c++) {
              const [vx, vy, vz] = face.corners[c];
              const yPos = vy === 1 && world.getBlock(wx, y + 1, wz) !== BLOCK.WATER ? y + 0.88 : y + vy + topDrop;
              waterBuf.pos.push(wx + vx, yPos, wz + vz);
              waterBuf.norm.push(nx, ny, nz);
              waterBuf.col.push(face.shade, face.shade, face.shade);
            }
            waterBuf.uv.push(uv.u0, uv.vBot, uv.u1, uv.vBot, uv.u1, uv.vTop, uv.u0, uv.vTop);
            waterBuf.idx.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
            waterBuf.vCount += 4;
          }
          continue;
        }

        // Standard solid/cutout block
        for (let f = 0; f < 6; f++) {
          const face = FACES[f];
          const [nx, ny, nz] = face.dir;
          const neighbor = world.getBlock(wx + nx, y + ny, wz + nz);
          if (neighbor !== BLOCK.AIR) {
            const nDef = BLOCK_DEFS[neighbor];
            // Cull face if neighbor is opaque, OR if both are glass
            if (!nDef.transparent) continue;
            if (b === BLOCK.GLASS && neighbor === BLOCK.GLASS) continue;
          }

          const uv = tileSet[face.uvKind];
          const aoLevels: [number, number, number, number] = [3, 3, 3, 3];
          const vc = opaqueBuf.vCount;
          const height = b === BLOCK.BED ? 0.56 : (b === BLOCK.FARMLAND || b === BLOCK.FARMLAND_MOIST) ? 0.9375 : 1.0;

          for (let c = 0; c < 4; c++) {
            const [vx, vy, vz] = face.corners[c];
            const actualY = vy === 1 ? y + height : y + vy;
            opaqueBuf.pos.push(wx + vx, actualY, wz + vz);
            opaqueBuf.norm.push(nx, ny, nz);
            const ao = vertexAO(world, wx, y, wz, nx, ny, nz, vx, vy, vz);
            aoLevels[c] = ao;
            const light = AO_CURVE[ao] * face.shade;
            opaqueBuf.col.push(light, light, light);
          }

          opaqueBuf.uv.push(uv.u0, uv.vBot, uv.u1, uv.vBot, uv.u1, uv.vTop, uv.u0, uv.vTop);

          if (aoLevels[0] + aoLevels[2] > aoLevels[1] + aoLevels[3]) {
            opaqueBuf.idx.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
          } else {
            opaqueBuf.idx.push(vc + 1, vc + 2, vc + 3, vc + 1, vc + 3, vc);
          }
          opaqueBuf.vCount += 4;
        }
      }
    }
  }

  return {
    opaque: toGeometry(opaqueBuf),
    water: toGeometry(waterBuf),
  };
}
