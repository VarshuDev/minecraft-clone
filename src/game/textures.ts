import * as THREE from "three";
import { BLOCK, type BlockNum } from "./blocks";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ctx = CanvasRenderingContext2D;

function makeCanvas(w = 16, h = 16) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function toTexture(c: HTMLCanvasElement, mipmaps = true) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = mipmaps ? THREE.NearestMipmapLinearFilter : THREE.NearestFilter;
  t.generateMipmaps = mipmaps;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function px(ctx: Ctx, x: number, y: number, color: string, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function noiseFill(ctx: Ctx, palette: string[], seed: number, size = 16) {
  const r = rng(seed);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      px(ctx, x, y, palette[Math.floor(r() * palette.length)]);
    }
  }
}

function blobs(ctx: Ctx, color: string, seed: number, count: number, size = 16) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = 2 + Math.floor(r() * (size - 5));
    const y = 2 + Math.floor(r() * (size - 5));
    px(ctx, x, y, color, 2 + Math.floor(r() * 2), 1 + Math.floor(r() * 2));
    px(ctx, x, y + 1, "rgba(0,0,0,0.2)");
  }
}

function shadeEdge(ctx: Ctx, size = 16) {
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(0, 0, size, 1);
  ctx.fillRect(0, size - 1, size, 1);
  ctx.fillRect(0, 0, 1, size);
  ctx.fillRect(size - 1, 0, 1, size);
}

interface TilePair {
  albedo: HTMLCanvasElement;
  emissive?: HTMLCanvasElement;
}

const dirtPalette = ["#8a5a3a", "#7f5233", "#956341", "#744a2e", "#9c6a47"];
const stonePalette = ["#8b9099", "#82878f", "#959aa1", "#787d86", "#8f949c"];
const deepPalette = ["#474f5c", "#3e4652", "#515a68", "#353c47", "#434b57"];
const sandPalette = ["#e6d6a2", "#dccb95", "#efe0b2", "#d3c088"];
const grassPalette = ["#6bbd45", "#74c74d", "#5fae3c", "#7ed159", "#68b643"];
const leafPalette = ["#3f7d3a", "#4a8b42", "#356b33", "#549a45", "#2e5f2c"];

function grassTopTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, grassPalette, 11);
  const r = rng(12);
  for (let i = 0; i < 14; i++) px(ctx, Math.floor(r() * 16), Math.floor(r() * 16), "#8bdc62");
  shadeEdge(ctx);
  return { albedo: c };
}

function grassSideTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, dirtPalette, 21);
  const r = rng(22);
  for (let x = 0; x < 16; x++) {
    const depth = 3 + Math.floor(r() * 3);
    for (let y = 0; y < depth; y++) px(ctx, x, y, grassPalette[Math.floor(r() * grassPalette.length)]);
    px(ctx, x, depth, "#579c38");
  }
  shadeEdge(ctx);
  return { albedo: c };
}

function dirtTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, dirtPalette, 31);
  blobs(ctx, "#6b4429", 32, 4);
  blobs(ctx, "#a8764e", 33, 3);
  shadeEdge(ctx);
  return { albedo: c };
}

function stoneTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, stonePalette, 41);
  const r = rng(42);
  for (let i = 0; i < 4; i++) {
    const y = Math.floor(r() * 14) + 1;
    px(ctx, 1 + Math.floor(r() * 4), y, "#6d727a", 5 + Math.floor(r() * 5), 1);
  }
  for (let i = 0; i < 10; i++) px(ctx, Math.floor(r() * 16), Math.floor(r() * 16), "#a6abb2");
  shadeEdge(ctx);
  return { albedo: c };
}

function cobbleTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#6c717a", "#7c818a", "#5d626b", "#8a8f98"], 45);
  const stones = [
    [1, 1, 6, 4],
    [8, 1, 7, 5],
    [1, 6, 4, 5],
    [6, 7, 6, 4],
    [13, 7, 2, 5],
    [1, 12, 7, 3],
    [9, 12, 6, 3],
  ];
  for (const [x, y, w, h] of stones) {
    px(ctx, x, y, "#949aa3", w, h);
    px(ctx, x, y, "#adb3bc", w, 1);
    px(ctx, x, y + h - 1, "#555a63", w, 1);
    px(ctx, x + w - 1, y, "#555a63", 1, h);
  }
  shadeEdge(ctx);
  return { albedo: c };
}

function deepslateTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, deepPalette, 141);
  const r = rng(142);
  for (let y = 2; y < 15; y += 3) {
    px(ctx, 1, y, "#2d333d", 14, 1);
    px(ctx, 2 + Math.floor(r() * 5), y - 1, "#626d7e", 4 + Math.floor(r() * 4), 1);
  }
  shadeEdge(ctx);
  return { albedo: c };
}

function bedrockTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#2c3037", "#383d45", "#22262c", "#444a53"], 81);
  const r = rng(82);
  for (let i = 0; i < 10; i++) px(ctx, Math.floor(r() * 13), Math.floor(r() * 13), "#15181c", 3, 3);
  shadeEdge(ctx);
  return { albedo: c };
}

function sandTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, sandPalette, 51);
  const r = rng(52);
  for (let i = 0; i < 16; i++) px(ctx, Math.floor(r() * 16), Math.floor(r() * 16), "#c9b47a");
  shadeEdge(ctx);
  return { albedo: c };
}

function sandstoneTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#dcc78e", "#d2bc83", "#e5d39f", "#cbb377"], 54);
  px(ctx, 0, 4, "#bda56b", 16, 1);
  px(ctx, 0, 10, "#bda56b", 16, 1);
  px(ctx, 0, 5, "#efe0b4", 16, 1);
  shadeEdge(ctx);
  return { albedo: c };
}

function snowTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#f4faff", "#eaf4fc", "#ffffff", "#e0eef8"], 56);
  shadeEdge(ctx);
  return { albedo: c };
}

function iceTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#90d5fa", "#7cc9f5", "#a3e0ff", "#83cef7"], 58);
  px(ctx, 2, 3, "#dff6ff", 4, 1);
  px(ctx, 5, 4, "#dff6ff", 2, 1);
  px(ctx, 9, 10, "#dff6ff", 5, 1);
  px(ctx, 11, 11, "#dff6ff", 2, 1);
  shadeEdge(ctx);
  return { albedo: c };
}

function waterTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#2f88e0", "#3892eb", "#287dd4", "#439cf2"], 59);
  px(ctx, 2, 4, "#7cc4ff", 5, 1);
  px(ctx, 9, 10, "#7cc4ff", 5, 1);
  px(ctx, 4, 13, "#62b5fa", 4, 1);
  return { albedo: c };
}

function logSideTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#7a4f2c", "#83552f", "#6b4526", "#8e5d34"], 91);
  const r = rng(92);
  for (let i = 0; i < 5; i++) px(ctx, 1 + Math.floor(r() * 12), 0, "#5f3d21", 1, 16);
  for (let i = 0; i < 4; i++) px(ctx, 2 + Math.floor(r() * 11), Math.floor(r() * 13), "#9c6a3d", 1, 2);
  shadeEdge(ctx);
  return { albedo: c };
}

function logTopTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#c49a63", "#b78c57", "#cda56c"], 93);
  ctx.strokeStyle = "#8a6238";
  ctx.lineWidth = 1;
  for (let i = 3; i <= 6; i += 3) ctx.strokeRect(i, i, 16 - i * 2, 16 - i * 2);
  px(ctx, 7, 7, "#7a4f2c", 2, 2);
  shadeEdge(ctx);
  return { albedo: c };
}

function leavesTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, leafPalette, 101);
  const r = rng(102);
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(r() * 16);
    const y = Math.floor(r() * 16);
    if (i < 10) ctx.clearRect(x, y, 1, 1); // authentic Minecraft leafy cutout pixels!
    else px(ctx, x, y, "#6cb35a");
  }
  return { albedo: c };
}

function planksTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#c79c5e", "#bc9154", "#cfa466", "#b2874b"], 108);
  for (let y = 0; y < 16; y += 4) {
    px(ctx, 0, y, "#8a6434", 16, 1);
    px(ctx, 0, y + 1, "#dcb479", 16, 1);
  }
  px(ctx, 6, 0, "#8a6434", 1, 4);
  px(ctx, 12, 4, "#8a6434", 1, 4);
  px(ctx, 4, 8, "#8a6434", 1, 4);
  px(ctx, 10, 12, "#8a6434", 1, 4);
  shadeEdge(ctx);
  return { albedo: c };
}

function bricksTile(): TilePair {
  const { c, ctx } = makeCanvas();
  px(ctx, 0, 0, "#c8c2b8", 16, 16);
  const rows = [0, 4, 8, 12];
  rows.forEach((y, ri) => {
    const off = (ri % 2) * 4;
    for (let x = -4; x < 16; x += 8) {
      px(ctx, x + off + 1, y + 1, "#ab4f3d", 7, 3);
      px(ctx, x + off + 1, y + 1, "#c45f4b", 7, 1);
      px(ctx, x + off + 1, y + 3, "#8a3a2b", 7, 1);
    }
  });
  return { albedo: c };
}

function stoneBricksTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#8c929b", "#828891", "#969ca5"], 114);
  px(ctx, 0, 0, "#5c616a", 16, 1);
  px(ctx, 0, 8, "#5c616a", 16, 1);
  px(ctx, 7, 0, "#5c616a", 1, 8);
  px(ctx, 15, 8, "#5c616a", 1, 8);
  px(ctx, 0, 1, "#aab0b9", 16, 1);
  px(ctx, 0, 9, "#aab0b9", 16, 1);
  shadeEdge(ctx);
  return { albedo: c };
}

function glassTile(): TilePair {
  const { c, ctx } = makeCanvas();
  ctx.clearRect(0, 0, 16, 16);
  // Crisp pixel glass frame + diagonal glints with transparent interior
  px(ctx, 0, 0, "#d0f2ff", 16, 1);
  px(ctx, 0, 15, "#a3d8ed", 16, 1);
  px(ctx, 0, 0, "#d0f2ff", 1, 16);
  px(ctx, 15, 0, "#a3d8ed", 1, 16);
  px(ctx, 3, 3, "#ffffff", 2, 1);
  px(ctx, 4, 4, "#dff8ff", 2, 1);
  px(ctx, 10, 11, "#ffffff", 2, 1);
  px(ctx, 11, 10, "#dff8ff", 1, 1);
  return { albedo: c };
}

function oreTile(kind: "coal" | "iron" | "gold" | "diamond"): TilePair {
  const { c, ctx } = makeCanvas();
  let emissive: HTMLCanvasElement | undefined;
  let ectx: Ctx | undefined;
  if (kind === "gold" || kind === "diamond") {
    const e = makeCanvas();
    emissive = e.c;
    ectx = e.ctx;
    ectx.fillStyle = "#000000";
    ectx.fillRect(0, 0, 16, 16);
  }
  noiseFill(ctx, kind === "diamond" ? deepPalette : stonePalette, 61);
  const r = rng(62 + kind.length);
  if (kind === "coal") {
    blobs(ctx, "#24272c", 71, 7);
    blobs(ctx, "#3b3f47", 72, 4);
  } else if (kind === "iron") {
    blobs(ctx, "#d9c2a1", 73, 6);
    blobs(ctx, "#b08f68", 74, 4);
    for (let i = 0; i < 6; i++) px(ctx, 2 + Math.floor(r() * 12), 2 + Math.floor(r() * 12), "#f0e0c7");
  } else if (kind === "gold") {
    const rg = rng(75);
    for (let i = 0; i < 6; i++) {
      const x = 2 + Math.floor(rg() * 11);
      const y = 2 + Math.floor(rg() * 11);
      const w = 2 + Math.floor(rg() * 2);
      const h = 1 + Math.floor(rg() * 2);
      px(ctx, x, y, "#f6c447", w, h);
      if (ectx) px(ectx, x, y, "#8a6212", w, h);
    }
    for (let i = 0; i < 6; i++) {
      const sx = 2 + Math.floor(r() * 12);
      const sy = 2 + Math.floor(r() * 12);
      px(ctx, sx, sy, "#fff0b0");
      if (ectx) px(ectx, sx, sy, "#ffd66b");
    }
  } else {
    const shards = [
      [3, 10, 4, 3],
      [9, 4, 3, 4],
      [8, 10, 4, 3],
      [2, 3, 3, 3],
    ];
    for (const [x, y, w, h] of shards) {
      px(ctx, x, y, "#34d9f5", w, h);
      px(ctx, x, y, "#c2fbff", Math.max(1, w - 1), 1);
      px(ctx, x + w - 1, y + 1, "#168eb0", 1, h - 1);
      if (ectx) {
        px(ectx, x, y, "#2cd0f2", w, h);
        px(ectx, x, y, "#b8fbff", Math.max(1, w - 1), 1);
      }
    }
  }
  shadeEdge(ctx);
  return { albedo: c, emissive };
}

function glowstoneTile(): TilePair {
  const { c, ctx } = makeCanvas();
  const e = makeCanvas();
  noiseFill(ctx, ["#f2be49", "#ffd86b", "#d99d2b", "#ffea99"], 151);
  blobs(ctx, "#fff7cc", 152, 6);
  blobs(ctx, "#b57c1c", 153, 4);
  e.ctx.drawImage(c, 0, 0);
  shadeEdge(ctx);
  return { albedo: c, emissive: e.c };
}

function tntSideTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#c93927", "#d9432f", "#b62f1f", "#e04e38"], 171);
  for (let x = 0; x < 16; x += 4) px(ctx, x, 0, "rgba(0,0,0,0.22)", 1, 16);
  px(ctx, 0, 5, "#f5ead6", 16, 6);
  px(ctx, 2, 6, "#1f1d24", 3, 1);
  px(ctx, 3, 7, "#1f1d24", 1, 3);
  px(ctx, 6, 6, "#1f1d24", 1, 4);
  px(ctx, 7, 7, "#1f1d24", 1, 1);
  px(ctx, 8, 8, "#1f1d24", 1, 1);
  px(ctx, 9, 6, "#1f1d24", 1, 4);
  px(ctx, 11, 6, "#1f1d24", 3, 1);
  px(ctx, 12, 7, "#1f1d24", 1, 3);
  shadeEdge(ctx);
  return { albedo: c };
}

function tntTopTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#9b2d20", "#b83626", "#7a2319"], 172);
  px(ctx, 2, 2, "#32353d", 12, 12);
  px(ctx, 6, 6, "#ffb347", 4, 4);
  shadeEdge(ctx);
  return { albedo: c };
}

function cactusSideTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#3f8238", "#488f40", "#35702f"], 182);
  for (let x = 2; x < 16; x += 4) px(ctx, x, 0, "#295924", 1, 16);
  const r = rng(183);
  for (let i = 0; i < 10; i++) px(ctx, Math.floor(r() * 16), Math.floor(r() * 16), "#1c3b19");
  shadeEdge(ctx);
  return { albedo: c };
}

function cactusTopTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#529e49", "#448a3c", "#62b058"], 184);
  px(ctx, 4, 4, "#356e2f", 8, 8);
  px(ctx, 6, 6, "#6cc260", 4, 4);
  shadeEdge(ctx);
  return { albedo: c };
}

function craftTopTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#b8834b", "#c48e54", "#a8753f"], 190);
  // 3x3 crafting grid lines
  px(ctx, 1, 1, "#6b4322", 14, 1);
  px(ctx, 1, 14, "#6b4322", 14, 1);
  px(ctx, 1, 1, "#6b4322", 1, 14);
  px(ctx, 14, 1, "#6b4322", 1, 14);
  px(ctx, 5, 1, "#6b4322", 1, 14);
  px(ctx, 10, 1, "#6b4322", 1, 14);
  px(ctx, 1, 5, "#6b4322", 14, 1);
  px(ctx, 1, 10, "#6b4322", 14, 1);
  return { albedo: c };
}

function craftSideTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#b07a43", "#c28c53", "#9c6a37"], 191);
  px(ctx, 0, 0, "#6b4322", 16, 2);
  px(ctx, 3, 4, "#525861", 3, 8); // saw/tool silhouette
  px(ctx, 10, 5, "#42474f", 3, 6);
  px(ctx, 11, 3, "#d4a46a", 1, 3);
  shadeEdge(ctx);
  return { albedo: c };
}

function torchTile(): TilePair {
  const { c, ctx } = makeCanvas();
  const e = makeCanvas();
  e.ctx.fillStyle = "#000000";
  e.ctx.fillRect(0, 0, 16, 16);
  // wooden shaft at bottom, glowing fiery head at top
  px(ctx, 0, 5, "#8a5a34", 16, 11);
  px(ctx, 3, 6, "#6b4322", 4, 10);
  px(ctx, 0, 0, "#ff9929", 16, 5);
  px(ctx, 2, 0, "#ffe46b", 12, 4);
  px(ctx, 5, 1, "#ffffff", 6, 2);

  px(e.ctx, 0, 0, "#ff881a", 16, 5);
  px(e.ctx, 2, 0, "#ffe159", 12, 4);
  px(e.ctx, 5, 1, "#ffffff", 6, 2);
  return { albedo: c, emissive: e.c };
}

function furnaceFrontTile(): TilePair {
  const { c, ctx } = makeCanvas();
  const e = makeCanvas();
  e.ctx.fillStyle = "#000000";
  e.ctx.fillRect(0, 0, 16, 16);
  noiseFill(ctx, ["#6c717a", "#7c818a", "#5d626b", "#8a8f98"], 210);
  shadeEdge(ctx);
  // Furnace dark opening
  px(ctx, 3, 4, "#242528", 10, 9);
  px(ctx, 4, 3, "#242528", 8, 1);
  // Iron grate bars
  px(ctx, 4, 6, "#404247", 8, 1);
  px(ctx, 4, 9, "#404247", 8, 1);
  // Warm ember glow
  px(ctx, 5, 11, "#d6531e", 6, 2);
  px(ctx, 6, 12, "#ff9a3c", 4, 1);
  px(e.ctx, 5, 11, "#d6531e", 6, 2);
  px(e.ctx, 6, 12, "#ff9a3c", 4, 1);
  return { albedo: c, emissive: e.c };
}

function furnaceTopTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#6c717a", "#7c818a", "#5d626b", "#8a8f98"], 211);
  px(ctx, 5, 5, "#47494f", 6, 6);
  px(ctx, 6, 6, "#313337", 4, 4);
  shadeEdge(ctx);
  return { albedo: c };
}

function chestTopTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#a4723c", "#b8834b", "#966532"], 220);
  px(ctx, 0, 0, "#603c1b", 16, 1);
  px(ctx, 0, 15, "#603c1b", 16, 1);
  px(ctx, 0, 0, "#603c1b", 1, 16);
  px(ctx, 15, 0, "#603c1b", 1, 16);
  px(ctx, 7, 14, "#c5c9cf", 2, 2);
  return { albedo: c };
}

function chestSideTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#a4723c", "#b8834b", "#966532"], 221);
  px(ctx, 0, 0, "#603c1b", 16, 1);
  px(ctx, 0, 15, "#603c1b", 16, 1);
  px(ctx, 0, 0, "#603c1b", 1, 16);
  px(ctx, 15, 0, "#603c1b", 1, 16);
  px(ctx, 0, 5, "#422810", 16, 1);
  return { albedo: c };
}

function chestFrontTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#a4723c", "#b8834b", "#966532"], 222);
  px(ctx, 0, 0, "#603c1b", 16, 1);
  px(ctx, 0, 15, "#603c1b", 16, 1);
  px(ctx, 0, 0, "#603c1b", 1, 16);
  px(ctx, 15, 0, "#603c1b", 1, 16);
  px(ctx, 0, 5, "#422810", 16, 1);
  px(ctx, 7, 4, "#3a3c42", 2, 4);
  px(ctx, 7, 5, "#e0e3e8", 2, 3);
  px(ctx, 7, 6, "#9aa0aa", 2, 1);
  return { albedo: c };
}

function bedTopTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#a82222", "#be2828", "#941b1b"], 230);
  px(ctx, 1, 1, "#e6e6e6", 14, 5);
  px(ctx, 2, 2, "#ffffff", 12, 3);
  px(ctx, 1, 5, "#b5b5b5", 14, 1);
  px(ctx, 0, 6, "#781414", 16, 1);
  shadeEdge(ctx);
  return { albedo: c };
}

function bedSideTile(): TilePair {
  const { c, ctx } = makeCanvas();
  px(ctx, 0, 0, "#be2828", 16, 9);
  px(ctx, 0, 8, "#941b1b", 16, 1);
  px(ctx, 0, 0, "#e6e6e6", 5, 4);
  px(ctx, 0, 9, "#a8753f", 16, 7);
  px(ctx, 0, 12, "#6b4322", 3, 4);
  px(ctx, 13, 12, "#6b4322", 3, 4);
  shadeEdge(ctx);
  return { albedo: c };
}

function doorTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#a4723c", "#b8834b", "#966532"], 240);
  px(ctx, 0, 0, "#603c1b", 16, 1);
  px(ctx, 0, 15, "#603c1b", 16, 1);
  px(ctx, 0, 0, "#603c1b", 1, 16);
  px(ctx, 15, 0, "#603c1b", 1, 16);
  px(ctx, 3, 2, "rgba(0,0,0,0)", 4, 5);
  px(ctx, 9, 2, "rgba(0,0,0,0)", 4, 5);
  px(ctx, 12, 8, "#333333", 2, 3);
  px(ctx, 12, 9, "#bbbbbb", 1, 1);
  px(ctx, 2, 9, "#7a4e25", 5, 5);
  px(ctx, 9, 9, "#7a4e25", 5, 5);
  return { albedo: c };
}

function ladderTile(): TilePair {
  const { c, ctx } = makeCanvas();
  ctx.clearRect(0, 0, 16, 16);
  px(ctx, 2, 0, "#8a582b", 2, 16);
  px(ctx, 2, 0, "#a8753f", 1, 16);
  px(ctx, 12, 0, "#8a582b", 2, 16);
  px(ctx, 12, 0, "#a8753f", 1, 16);
  for (const y of [2, 6, 10, 14]) {
    px(ctx, 4, y, "#6b4322", 8, 1);
    px(ctx, 4, y + 1, "#a8753f", 8, 1);
  }
  return { albedo: c };
}

function farmlandTopTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#4a301c", "#563821", "#3d2716"], 250);
  for (let y = 1; y < 16; y += 3) {
    px(ctx, 0, y, "#29190c", 16, 1);
    px(ctx, 0, y + 1, "#664328", 16, 1);
  }
  shadeEdge(ctx);
  return { albedo: c };
}

function farmlandSideTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, dirtPalette, 31);
  px(ctx, 0, 0, "#4a301c", 16, 3);
  px(ctx, 0, 3, "#3d2716", 16, 1);
  shadeEdge(ctx);
  return { albedo: c };
}

function poppyTile(): TilePair {
  const { c, ctx } = makeCanvas();
  ctx.clearRect(0, 0, 16, 16);
  px(ctx, 7, 7, "#356e2f", 2, 9);
  px(ctx, 5, 11, "#448a3c", 2, 2);
  px(ctx, 9, 13, "#448a3c", 2, 2);
  px(ctx, 5, 2, "#dd2222", 6, 5);
  px(ctx, 4, 3, "#dd2222", 8, 3);
  px(ctx, 6, 1, "#ff4444", 4, 1);
  px(ctx, 6, 4, "#ff4444", 4, 2);
  px(ctx, 7, 3, "#331111", 2, 2);
  px(ctx, 7, 4, "#110000", 2, 1);
  return { albedo: c };
}

function dandelionTile(): TilePair {
  const { c, ctx } = makeCanvas();
  ctx.clearRect(0, 0, 16, 16);
  px(ctx, 7, 7, "#356e2f", 2, 9);
  px(ctx, 5, 10, "#448a3c", 2, 3);
  px(ctx, 9, 12, "#448a3c", 2, 3);
  px(ctx, 5, 3, "#ffcc00", 6, 5);
  px(ctx, 4, 4, "#e6b800", 8, 3);
  px(ctx, 6, 2, "#fff266", 4, 1);
  px(ctx, 7, 4, "#cc9900", 2, 2);
  return { albedo: c };
}

function farmlandWetTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#291a0e", "#332112", "#24170c", "#201309"], 499);
  for (let y = 1; y < 16; y += 2) {
    for (let x = 0; x < 16; x++) {
      if ((x + y) % 3 === 0) px(ctx, x, y, "#1a0f07");
    }
  }
  return { albedo: c };
}

function wheatTile(stage: 0 | 1 | 2 | 3): TilePair {
  const { c, ctx } = makeCanvas();
  ctx.clearRect(0, 0, 16, 16);
  if (stage === 0) {
    for (let x = 2; x <= 13; x += 3) {
      px(ctx, x, 14, "#40851e", 1, 2);
      px(ctx, x + 1, 13, "#5ca62e", 1, 3);
      px(ctx, x, 13, "#70c238", 1, 1);
    }
  } else if (stage === 1) {
    for (let x = 1; x <= 14; x += 2) {
      px(ctx, x, 10, "#489422", 1, 6);
      px(ctx, x + (x % 4 === 1 ? 1 : 0), 8, "#65b832", 1, 4);
      px(ctx, x, 8, "#7dd440", 1, 2);
    }
  } else if (stage === 2) {
    for (let x = 1; x <= 14; x += 2) {
      px(ctx, x, 7, "#6fa825", 1, 9);
      px(ctx, x + (x % 3 === 0 ? 1 : -1), 4, "#92c734", 1, 6);
      px(ctx, x, 4, "#b4e048", 1, 3);
      px(ctx, x + 1, 5, "#d6ea65", 1, 2);
    }
  } else {
    for (let x = 1; x <= 14; x += 2) {
      px(ctx, x, 6, "#ad8218", 1, 10);
      px(ctx, x, 2, "#d6a827", 1, 7);
      px(ctx, x + (x % 2 === 0 ? 1 : -1), 1, "#f2cb44", 2, 4);
      px(ctx, x, 0, "#ffe066", 1, 3);
      px(ctx, x, 3, "#855812", 1, 2);
    }
  }
  return { albedo: c };
}

function redstoneOreTile(): TilePair {
  const { c, ctx } = makeCanvas();
  const em = makeCanvas();
  noiseFill(ctx, stonePalette, 712);
  shadeEdge(ctx);
  em.ctx.fillStyle = "#000000";
  em.ctx.fillRect(0, 0, 16, 16);

  const r = rng(8821);
  for (let i = 0; i < 9; i++) {
    const rx = 2 + Math.floor(r() * 12);
    const ry = 2 + Math.floor(r() * 12);
    px(ctx, rx, ry, "#ff1100", 2, 1);
    px(ctx, rx, ry + 1, "#cc0000", 1, 1);
    px(ctx, rx + 1, ry, "#ff4422", 1, 1);

    px(em.ctx, rx, ry, "#ff2200", 2, 1);
    px(em.ctx, rx + 1, ry, "#ff4422", 1, 1);
  }
  return { albedo: c, emissive: em.c };
}

function redstoneWireTile(): TilePair {
  const { c, ctx } = makeCanvas();
  const em = makeCanvas();
  ctx.clearRect(0, 0, 16, 16);
  em.ctx.fillStyle = "#000000";
  em.ctx.fillRect(0, 0, 16, 16);

  px(ctx, 6, 0, "#e61400", 4, 16);
  px(ctx, 0, 6, "#e61400", 16, 4);
  px(ctx, 7, 1, "#ff3b1f", 2, 14);
  px(ctx, 1, 7, "#ff3b1f", 14, 2);
  px(ctx, 7, 7, "#ff7052", 2, 2);

  px(em.ctx, 6, 0, "#cc1000", 4, 16);
  px(em.ctx, 0, 6, "#cc1000", 16, 4);
  px(em.ctx, 7, 7, "#ff3311", 2, 2);
  return { albedo: c, emissive: em.c };
}

function redstoneTorchTile(): TilePair {
  const { c, ctx } = makeCanvas();
  const em = makeCanvas();
  ctx.clearRect(0, 0, 16, 16);
  em.ctx.fillStyle = "#000000";
  em.ctx.fillRect(0, 0, 16, 16);

  px(ctx, 7, 6, "#744b26", 2, 10);
  px(ctx, 7, 9, "#593617", 1, 7);
  px(ctx, 6, 3, "#cc0c00", 4, 4);
  px(ctx, 7, 2, "#ff2614", 2, 4);
  px(ctx, 7, 3, "#ff6b57", 2, 2);

  px(em.ctx, 6, 2, "#ff1a00", 4, 5);
  px(em.ctx, 7, 3, "#ff5533", 2, 2);
  return { albedo: c, emissive: em.c };
}

function leverTile(): TilePair {
  const { c, ctx } = makeCanvas();
  ctx.clearRect(0, 0, 16, 16);
  px(ctx, 4, 12, "#737880", 8, 4);
  px(ctx, 5, 12, "#8e949e", 6, 1);
  px(ctx, 4, 15, "#4e5259", 8, 1);
  px(ctx, 7, 10, "#825329", 2, 2);
  px(ctx, 8, 8, "#825329", 2, 2);
  px(ctx, 9, 6, "#825329", 2, 2);
  px(ctx, 10, 4, "#825329", 2, 2);
  px(ctx, 10, 3, "#b0b0b0", 3, 3);
  return { albedo: c };
}

function lampOffTile(): TilePair {
  const { c, ctx } = makeCanvas();
  noiseFill(ctx, ["#3d2817", "#47301c", "#332012"], 601);
  px(ctx, 0, 0, "#26170c", 16, 2);
  px(ctx, 0, 14, "#26170c", 16, 2);
  px(ctx, 0, 0, "#26170c", 2, 16);
  px(ctx, 14, 0, "#26170c", 2, 16);
  px(ctx, 7, 0, "#54371f", 2, 16);
  px(ctx, 0, 7, "#54371f", 16, 2);
  return { albedo: c };
}

function lampOnTile(): TilePair {
  const { c, ctx } = makeCanvas();
  const em = makeCanvas();
  noiseFill(ctx, ["#e0982b", "#f0ae3a", "#c77f1e"], 602);
  px(ctx, 0, 0, "#54371f", 16, 2);
  px(ctx, 0, 14, "#54371f", 16, 2);
  px(ctx, 0, 0, "#54371f", 2, 16);
  px(ctx, 14, 0, "#54371f", 2, 16);
  px(ctx, 7, 0, "#734e2e", 2, 16);
  px(ctx, 0, 7, "#734e2e", 16, 2);

  px(ctx, 3, 3, "#ffe27a", 3, 3);
  px(ctx, 10, 3, "#ffe27a", 3, 3);
  px(ctx, 3, 10, "#ffe27a", 3, 3);
  px(ctx, 10, 10, "#ffe27a", 3, 3);

  em.ctx.fillStyle = "#ffaa20";
  em.ctx.fillRect(0, 0, 16, 16);
  return { albedo: c, emissive: em.c };
}

function crackTex(stage: number) {
  const { c, ctx } = makeCanvas(16, 16);
  ctx.clearRect(0, 0, 16, 16);
  const r = rng(301 + stage * 17);
  const branches = 3 + stage * 3;
  for (let b = 0; b < branches; b++) {
    let x = 7 + Math.floor(r() * 2);
    let y = 7 + Math.floor(r() * 2);
    const steps = 4 + stage * 3;
    const dxBias = (r() - 0.5) * 1.4;
    const dyBias = (r() - 0.5) * 1.4;
    for (let s = 0; s < steps; s++) {
      px(
        ctx,
        Math.max(0, Math.min(15, Math.round(x))),
        Math.max(0, Math.min(15, Math.round(y))),
        "rgba(8,10,14,0.85)",
      );
      if (stage >= 2 && s % 2 === 0) {
        px(
          ctx,
          Math.max(0, Math.min(15, Math.round(x + 1))),
          Math.max(0, Math.min(15, Math.round(y))),
          "rgba(8,10,14,0.65)",
        );
      }
      x += dxBias + (r() - 0.5) * 1.2;
      y += dyBias + (r() - 0.5) * 1.2;
    }
  }
  return toTexture(c, false);
}

function stampPaddedTile(dstCtx: Ctx, src: HTMLCanvasElement, ox: number, oy: number) {
  dstCtx.drawImage(src, 0, 0, 16, 16, ox + 1, oy + 1, 16, 16);
  dstCtx.drawImage(src, 0, 0, 16, 1, ox + 1, oy, 16, 1);
  dstCtx.drawImage(src, 0, 15, 16, 1, ox + 1, oy + 17, 16, 1);
  dstCtx.drawImage(src, 0, 0, 1, 16, ox, oy + 1, 1, 16);
  dstCtx.drawImage(src, 15, 0, 1, 16, ox + 17, oy + 1, 1, 16);
  dstCtx.drawImage(src, 0, 0, 1, 1, ox, oy, 1, 1);
  dstCtx.drawImage(src, 15, 0, 1, 1, ox + 17, oy, 1, 1);
  dstCtx.drawImage(src, 0, 15, 1, 1, ox, oy + 17, 1, 1);
  dstCtx.drawImage(src, 15, 15, 1, 1, ox + 17, oy + 17, 1, 1);
}

export interface TileUv {
  u0: number;
  u1: number;
  vBot: number;
  vTop: number;
}

export interface BlockTileMap {
  top: TileUv;
  bottom: TileUv;
  side: TileUv;
}

export interface BlockAtlas {
  opaqueMaterial: THREE.MeshLambertMaterial;
  waterMaterial: THREE.MeshLambertMaterial;
  tiles: Record<BlockNum, BlockTileMap>;
  crackMaterials: THREE.MeshBasicMaterial[];
  dispose: () => void;
}

type TileKey =
  | "grassTop"
  | "grassSide"
  | "dirt"
  | "stone"
  | "cobble"
  | "deepslate"
  | "bedrock"
  | "sand"
  | "sandstone"
  | "snow"
  | "ice"
  | "water"
  | "logSide"
  | "logTop"
  | "leaves"
  | "planks"
  | "bricks"
  | "stoneBricks"
  | "glass"
  | "coal"
  | "iron"
  | "gold"
  | "diamond"
  | "glowstone"
  | "tntSide"
  | "tntTop"
  | "cactusSide"
  | "cactusTop"
  | "craftTop"
  | "craftSide"
  | "torch"
  | "furnaceFront"
  | "furnaceTop"
  | "chestTop"
  | "chestSide"
  | "chestFront"
  | "bedTop"
  | "bedSide"
  | "door"
  | "ladder"
  | "farmlandTop"
  | "farmlandSide"
  | "poppy"
  | "dandelion"
  | "farmlandWet"
  | "wheat_0"
  | "wheat_1"
  | "wheat_2"
  | "wheat_3"
  | "redstoneOre"
  | "redstoneWire"
  | "redstoneTorch"
  | "lever"
  | "lampOff"
  | "lampOn";

const ATLAS_COLS = 8;
const ATLAS_ROWS = 8;
const CELL = 18;

export function createBlockAtlas(): BlockAtlas {
  const raw: Record<TileKey, TilePair> = {
    grassTop: grassTopTile(),
    grassSide: grassSideTile(),
    dirt: dirtTile(),
    stone: stoneTile(),
    cobble: cobbleTile(),
    deepslate: deepslateTile(),
    bedrock: bedrockTile(),
    sand: sandTile(),
    sandstone: sandstoneTile(),
    snow: snowTile(),
    ice: iceTile(),
    water: waterTile(),
    logSide: logSideTile(),
    logTop: logTopTile(),
    leaves: leavesTile(),
    planks: planksTile(),
    bricks: bricksTile(),
    stoneBricks: stoneBricksTile(),
    glass: glassTile(),
    coal: oreTile("coal"),
    iron: oreTile("iron"),
    gold: oreTile("gold"),
    diamond: oreTile("diamond"),
    glowstone: glowstoneTile(),
    tntSide: tntSideTile(),
    tntTop: tntTopTile(),
    cactusSide: cactusSideTile(),
    cactusTop: cactusTopTile(),
    craftTop: craftTopTile(),
    craftSide: craftSideTile(),
    torch: torchTile(),
    furnaceFront: furnaceFrontTile(),
    furnaceTop: furnaceTopTile(),
    chestTop: chestTopTile(),
    chestSide: chestSideTile(),
    chestFront: chestFrontTile(),
    bedTop: bedTopTile(),
    bedSide: bedSideTile(),
    door: doorTile(),
    ladder: ladderTile(),
    farmlandTop: farmlandTopTile(),
    farmlandSide: farmlandSideTile(),
    poppy: poppyTile(),
    dandelion: dandelionTile(),
    farmlandWet: farmlandWetTile(),
    wheat_0: wheatTile(0),
    wheat_1: wheatTile(1),
    wheat_2: wheatTile(2),
    wheat_3: wheatTile(3),
    redstoneOre: redstoneOreTile(),
    redstoneWire: redstoneWireTile(),
    redstoneTorch: redstoneTorchTile(),
    lever: leverTile(),
    lampOff: lampOffTile(),
    lampOn: lampOnTile(),
  };

  const W = ATLAS_COLS * CELL;
  const H = ATLAS_ROWS * CELL;
  const colorCanvas = makeCanvas(W, H);
  const emissiveCanvas = makeCanvas(W, H);
  emissiveCanvas.ctx.fillStyle = "#000000";
  emissiveCanvas.ctx.fillRect(0, 0, W, H);

  const uvByKey = {} as Record<TileKey, TileUv>;
  (Object.keys(raw) as TileKey[]).forEach((key, index) => {
    const col = index % ATLAS_COLS;
    const row = Math.floor(index / ATLAS_COLS);
    const ox = col * CELL;
    const oy = row * CELL;
    const pair = raw[key];

    stampPaddedTile(colorCanvas.ctx, pair.albedo, ox, oy);
    if (pair.emissive) stampPaddedTile(emissiveCanvas.ctx, pair.emissive, ox, oy);

    const eps = 0.08;
    const u0 = (ox + 1 + eps) / W;
    const u1 = (ox + 17 - eps) / W;
    const vTop = 1 - (oy + 1 + eps) / H;
    const vBot = 1 - (oy + 17 - eps) / H;
    uvByKey[key] = { u0, u1, vBot, vTop };
  });

  const colorTex = toTexture(colorCanvas.c, true);
  const emissiveTex = toTexture(emissiveCanvas.c, true);

  const opaqueMaterial = new THREE.MeshLambertMaterial({
    map: colorTex,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: emissiveTex,
    emissiveIntensity: 1.2,
    vertexColors: true,
    alphaTest: 0.35,
  });

  const waterMaterial = new THREE.MeshLambertMaterial({
    map: colorTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const u = (k: TileKey): BlockTileMap => ({ top: uvByKey[k], bottom: uvByKey[k], side: uvByKey[k] });

  const tiles: Record<BlockNum, BlockTileMap> = {
    [BLOCK.AIR]: u("dirt"),
    [BLOCK.GRASS]: { top: uvByKey.grassTop, bottom: uvByKey.dirt, side: uvByKey.grassSide },
    [BLOCK.DIRT]: u("dirt"),
    [BLOCK.STONE]: u("stone"),
    [BLOCK.COBBLESTONE]: u("cobble"),
    [BLOCK.DEEPSLATE]: u("deepslate"),
    [BLOCK.BEDROCK]: u("bedrock"),
    [BLOCK.SAND]: u("sand"),
    [BLOCK.SANDSTONE]: u("sandstone"),
    [BLOCK.SNOW]: u("snow"),
    [BLOCK.ICE]: u("ice"),
    [BLOCK.WATER]: u("water"),
    [BLOCK.OAK_LOG]: { top: uvByKey.logTop, bottom: uvByKey.logTop, side: uvByKey.logSide },
    [BLOCK.OAK_LEAVES]: u("leaves"),
    [BLOCK.PLANKS]: u("planks"),
    [BLOCK.BRICKS]: u("bricks"),
    [BLOCK.STONE_BRICKS]: u("stoneBricks"),
    [BLOCK.GLASS]: u("glass"),
    [BLOCK.COAL_ORE]: u("coal"),
    [BLOCK.IRON_ORE]: u("iron"),
    [BLOCK.GOLD_ORE]: u("gold"),
    [BLOCK.DIAMOND_ORE]: u("diamond"),
    [BLOCK.GLOWSTONE]: u("glowstone"),
    [BLOCK.TNT]: { top: uvByKey.tntTop, bottom: uvByKey.tntTop, side: uvByKey.tntSide },
    [BLOCK.CACTUS]: { top: uvByKey.cactusTop, bottom: uvByKey.cactusTop, side: uvByKey.cactusSide },
    [BLOCK.CRAFTING_TABLE]: { top: uvByKey.craftTop, bottom: uvByKey.planks, side: uvByKey.craftSide },
    [BLOCK.TORCH]: u("torch"),
    [BLOCK.FURNACE]: { top: uvByKey.furnaceTop, bottom: uvByKey.stone, side: uvByKey.furnaceFront },
    [BLOCK.CHEST]: { top: uvByKey.chestTop, bottom: uvByKey.planks, side: uvByKey.chestFront },
    [BLOCK.BED]: { top: uvByKey.bedTop, bottom: uvByKey.planks, side: uvByKey.bedSide },
    [BLOCK.WOOD_DOOR]: u("door"),
    [BLOCK.LADDER]: u("ladder"),
    [BLOCK.FARMLAND]: { top: uvByKey.farmlandTop, bottom: uvByKey.dirt, side: uvByKey.farmlandSide },
    [BLOCK.POPPY]: u("poppy"),
    [BLOCK.DANDELION]: u("dandelion"),
    [BLOCK.FARMLAND_MOIST]: { top: uvByKey.farmlandWet, bottom: uvByKey.dirt, side: uvByKey.farmlandSide },
    [BLOCK.WHEAT_0]: u("wheat_0"),
    [BLOCK.WHEAT_1]: u("wheat_1"),
    [BLOCK.WHEAT_2]: u("wheat_2"),
    [BLOCK.WHEAT_3]: u("wheat_3"),
    [BLOCK.REDSTONE_ORE]: u("redstoneOre"),
    [BLOCK.REDSTONE_WIRE]: u("redstoneWire"),
    [BLOCK.REDSTONE_TORCH]: u("redstoneTorch"),
    [BLOCK.LEVER]: u("lever"),
    [BLOCK.REDSTONE_LAMP]: u("lampOff"),
    [BLOCK.REDSTONE_LAMP_LIT]: u("lampOn"),
  };

  const crackTextures = [crackTex(0), crackTex(1), crackTex(2)];
  const crackMaterials = crackTextures.map(
    (map) =>
      new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
  );

  return {
    opaqueMaterial,
    waterMaterial,
    tiles,
    crackMaterials,
    dispose: () => {
      colorTex.dispose();
      emissiveTex.dispose();
      opaqueMaterial.dispose();
      waterMaterial.dispose();
      crackTextures.forEach((tex) => tex.dispose());
      crackMaterials.forEach((m) => m.dispose());
    },
  };
}
