export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  COBBLESTONE: 4,
  DEEPSLATE: 5,
  BEDROCK: 6,
  SAND: 7,
  SANDSTONE: 8,
  SNOW: 9,
  ICE: 10,
  WATER: 11,
  OAK_LOG: 12,
  OAK_LEAVES: 13,
  PLANKS: 14,
  BRICKS: 15,
  STONE_BRICKS: 16,
  GLASS: 17,
  COAL_ORE: 18,
  IRON_ORE: 19,
  GOLD_ORE: 20,
  DIAMOND_ORE: 21,
  GLOWSTONE: 22,
  TNT: 23,
  CACTUS: 24,
  CRAFTING_TABLE: 25,
  TORCH: 26,
} as const;

export type BlockNum = (typeof BLOCK)[keyof typeof BLOCK];

export type GameModeId = "survival" | "creative";

export type ItemId =
  | "block_grass"
  | "block_dirt"
  | "block_stone"
  | "block_cobble"
  | "block_deepslate"
  | "block_sand"
  | "block_sandstone"
  | "block_snow"
  | "block_ice"
  | "block_log"
  | "block_leaves"
  | "block_planks"
  | "block_bricks"
  | "block_stone_bricks"
  | "block_glass"
  | "block_coal_ore"
  | "block_iron_ore"
  | "block_gold_ore"
  | "block_diamond_ore"
  | "block_glowstone"
  | "block_tnt"
  | "block_cactus"
  | "block_crafting_table"
  | "block_torch"
  | "coal"
  | "iron_ingot"
  | "gold_ingot"
  | "diamond"
  | "stick"
  | "wood_pick"
  | "stone_pick"
  | "iron_pick"
  | "diamond_pick"
  | "wood_axe"
  | "stone_axe"
  | "wood_shovel";

export type ToolKind = "pickaxe" | "axe" | "shovel";

export interface BlockDef {
  id: BlockNum;
  name: string;
  /** base break time in seconds by hand */
  hardness: number;
  preferredTool?: ToolKind;
  drop?: ItemId;
  shards: string[];
  solid: boolean;
  transparent: boolean;
  liquid?: boolean;
  unbreakable?: boolean;
  emitsLight?: boolean;
  lightColor?: number;
  isTorch?: boolean;
  sound: "grass" | "stone" | "wood" | "sand" | "glass" | "water";
  colors: { top: string; left: string; right: string };
}

export const BLOCK_DEFS: Record<BlockNum, BlockDef> = {
  [BLOCK.AIR]: {
    id: BLOCK.AIR,
    name: "Air",
    hardness: 0,
    shards: [],
    solid: false,
    transparent: true,
    sound: "grass",
    colors: { top: "#000", left: "#000", right: "#000" },
  },
  [BLOCK.GRASS]: {
    id: BLOCK.GRASS,
    name: "Grass Block",
    hardness: 0.55,
    preferredTool: "shovel",
    drop: "block_dirt",
    shards: ["#6bbd45", "#579c38", "#8a5a3a"],
    solid: true,
    transparent: false,
    sound: "grass",
    colors: { top: "#78c850", left: "#8a5a3a", right: "#6e462c" },
  },
  [BLOCK.DIRT]: {
    id: BLOCK.DIRT,
    name: "Dirt",
    hardness: 0.5,
    preferredTool: "shovel",
    drop: "block_dirt",
    shards: ["#8a5a3a", "#734a30", "#9c6a47"],
    solid: true,
    transparent: false,
    sound: "grass",
    colors: { top: "#9c6a47", left: "#8a5a3a", right: "#6e462c" },
  },
  [BLOCK.STONE]: {
    id: BLOCK.STONE,
    name: "Stone",
    hardness: 1.4,
    preferredTool: "pickaxe",
    drop: "block_cobble",
    shards: ["#8b9099", "#70757e", "#a2a7ae"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#9aa0a8", left: "#828890", right: "#6b7078" },
  },
  [BLOCK.COBBLESTONE]: {
    id: BLOCK.COBBLESTONE,
    name: "Cobblestone",
    hardness: 1.5,
    preferredTool: "pickaxe",
    drop: "block_cobble",
    shards: ["#7a8088", "#61666e", "#989ea6"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#8d939b", left: "#727880", right: "#5b6068" },
  },
  [BLOCK.DEEPSLATE]: {
    id: BLOCK.DEEPSLATE,
    name: "Deepslate",
    hardness: 2.1,
    preferredTool: "pickaxe",
    drop: "block_deepslate",
    shards: ["#4a525e", "#383f49", "#606a78"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#5c6573", left: "#474f5c", right: "#353b45" },
  },
  [BLOCK.BEDROCK]: {
    id: BLOCK.BEDROCK,
    name: "Bedrock",
    hardness: 9999,
    shards: ["#2c3037", "#42474f"],
    solid: true,
    transparent: false,
    unbreakable: true,
    sound: "stone",
    colors: { top: "#42474f", left: "#2c3037", right: "#1d2026" },
  },
  [BLOCK.SAND]: {
    id: BLOCK.SAND,
    name: "Sand",
    hardness: 0.45,
    preferredTool: "shovel",
    drop: "block_sand",
    shards: ["#e3d29b", "#cdb880", "#f0e2b4"],
    solid: true,
    transparent: false,
    sound: "sand",
    colors: { top: "#efe0b2", left: "#e0cf98", right: "#c7b47c" },
  },
  [BLOCK.SANDSTONE]: {
    id: BLOCK.SANDSTONE,
    name: "Sandstone",
    hardness: 1.0,
    preferredTool: "pickaxe",
    drop: "block_sandstone",
    shards: ["#dcc78e", "#c9b377", "#ead9a6"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#ead9a6", left: "#d8c289", right: "#bda66d" },
  },
  [BLOCK.SNOW]: {
    id: BLOCK.SNOW,
    name: "Snow Block",
    hardness: 0.45,
    preferredTool: "shovel",
    drop: "block_snow",
    shards: ["#f2f8ff", "#d8e9f5", "#ffffff"],
    solid: true,
    transparent: false,
    sound: "sand",
    colors: { top: "#ffffff", left: "#e4f0f8", right: "#c7dae8" },
  },
  [BLOCK.ICE]: {
    id: BLOCK.ICE,
    name: "Ice",
    hardness: 0.5,
    preferredTool: "pickaxe",
    drop: "block_ice",
    shards: ["#a8e4ff", "#7dcaf5", "#d9f4ff"],
    solid: true,
    transparent: false,
    sound: "glass",
    colors: { top: "#c4ecff", left: "#8ed3fa", right: "#69b7e8" },
  },
  [BLOCK.WATER]: {
    id: BLOCK.WATER,
    name: "Water",
    hardness: 9999,
    shards: ["#4da6ff", "#80c4ff"],
    solid: false,
    transparent: true,
    liquid: true,
    unbreakable: true,
    sound: "water",
    colors: { top: "#4da6ff", left: "#3385e6", right: "#246bc2" },
  },
  [BLOCK.OAK_LOG]: {
    id: BLOCK.OAK_LOG,
    name: "Oak Log",
    hardness: 1.2,
    preferredTool: "axe",
    drop: "block_log",
    shards: ["#7a4f2c", "#936036", "#5f3d21"],
    solid: true,
    transparent: false,
    sound: "wood",
    colors: { top: "#c49a63", left: "#7a4f2c", right: "#5f3d21" },
  },
  [BLOCK.OAK_LEAVES]: {
    id: BLOCK.OAK_LEAVES,
    name: "Oak Leaves",
    hardness: 0.25,
    drop: "block_leaves",
    shards: ["#3f7d3a", "#549a45", "#2e5f2c"],
    solid: true,
    transparent: true,
    sound: "grass",
    colors: { top: "#549a45", left: "#3f7d3a", right: "#2d5e2b" },
  },
  [BLOCK.PLANKS]: {
    id: BLOCK.PLANKS,
    name: "Oak Planks",
    hardness: 1.0,
    preferredTool: "axe",
    drop: "block_planks",
    shards: ["#c69b5e", "#b0864d", "#d8b074"],
    solid: true,
    transparent: false,
    sound: "wood",
    colors: { top: "#d6ad72", left: "#be9256", right: "#9c7542" },
  },
  [BLOCK.BRICKS]: {
    id: BLOCK.BRICKS,
    name: "Bricks",
    hardness: 1.6,
    preferredTool: "pickaxe",
    drop: "block_bricks",
    shards: ["#b05442", "#8f3f30", "#c9c4bc"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#bf5d4a", left: "#a14938", right: "#82382a" },
  },
  [BLOCK.STONE_BRICKS]: {
    id: BLOCK.STONE_BRICKS,
    name: "Stone Bricks",
    hardness: 1.6,
    preferredTool: "pickaxe",
    drop: "block_stone_bricks",
    shards: ["#8a9099", "#6e747d", "#a6acb5"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#9aa0a8", left: "#7f858e", right: "#636870" },
  },
  [BLOCK.GLASS]: {
    id: BLOCK.GLASS,
    name: "Glass",
    hardness: 0.35,
    drop: "block_glass",
    shards: ["#d8f6ff", "#ffffff", "#a3d8eb"],
    solid: true,
    transparent: true,
    sound: "glass",
    colors: { top: "#e4f9ff", left: "#b7e8f7", right: "#92d2e8" },
  },
  [BLOCK.COAL_ORE]: {
    id: BLOCK.COAL_ORE,
    name: "Coal Ore",
    hardness: 1.7,
    preferredTool: "pickaxe",
    drop: "coal",
    shards: ["#2a2d33", "#43474f", "#8b9099"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#6b7078", left: "#3b3f47", right: "#24272c" },
  },
  [BLOCK.IRON_ORE]: {
    id: BLOCK.IRON_ORE,
    name: "Iron Ore",
    hardness: 2.0,
    preferredTool: "pickaxe",
    drop: "iron_ingot",
    shards: ["#d9c2a1", "#b99c77", "#8b9099"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#e3ceb0", left: "#c4aa87", right: "#9c8364" },
  },
  [BLOCK.GOLD_ORE]: {
    id: BLOCK.GOLD_ORE,
    name: "Gold Ore",
    hardness: 2.2,
    preferredTool: "pickaxe",
    drop: "gold_ingot",
    shards: ["#ffd45e", "#f0ac2b", "#8b9099"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#ffe89a", left: "#ffcf5c", right: "#c9962a" },
  },
  [BLOCK.DIAMOND_ORE]: {
    id: BLOCK.DIAMOND_ORE,
    name: "Diamond Ore",
    hardness: 2.8,
    preferredTool: "pickaxe",
    drop: "diamond",
    shards: ["#5ce8ff", "#2ec5e6", "#b8fbff", "#4a525e"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#a8f7ff", left: "#49d8ff", right: "#22a0c7" },
  },
  [BLOCK.GLOWSTONE]: {
    id: BLOCK.GLOWSTONE,
    name: "Glowstone",
    hardness: 0.45,
    drop: "block_glowstone",
    shards: ["#ffe680", "#f5be49", "#fff7cc"],
    solid: true,
    transparent: false,
    emitsLight: true,
    lightColor: 0xffd98a,
    sound: "glass",
    colors: { top: "#fff2a8", left: "#ffd45c", right: "#d99e2b" },
  },
  [BLOCK.TNT]: {
    id: BLOCK.TNT,
    name: "TNT",
    hardness: 0.25,
    drop: "block_tnt",
    shards: ["#ff5b45", "#ff9e44", "#ffe17d", "#30343c"],
    solid: true,
    transparent: false,
    sound: "grass",
    colors: { top: "#ff8c52", left: "#e04832", right: "#a82d1e" },
  },
  [BLOCK.CACTUS]: {
    id: BLOCK.CACTUS,
    name: "Cactus",
    hardness: 0.4,
    drop: "block_cactus",
    shards: ["#428a3d", "#2d6b2b", "#59a84f"],
    solid: true,
    transparent: false,
    sound: "grass",
    colors: { top: "#5ca852", left: "#3e8238", right: "#2c6129" },
  },
  [BLOCK.CRAFTING_TABLE]: {
    id: BLOCK.CRAFTING_TABLE,
    name: "Crafting Table",
    hardness: 1.0,
    preferredTool: "axe",
    drop: "block_crafting_table",
    shards: ["#b8834b", "#8a5a34", "#d4a66a"],
    solid: true,
    transparent: false,
    sound: "wood",
    colors: { top: "#d69c5c", left: "#a8703b", right: "#825329" },
  },
  [BLOCK.TORCH]: {
    id: BLOCK.TORCH,
    name: "Torch",
    hardness: 0.1,
    drop: "block_torch",
    shards: ["#ffcf5c", "#ff8833", "#8a5a34"],
    solid: false,
    transparent: true,
    emitsLight: true,
    lightColor: 0xffb85c,
    isTorch: true,
    sound: "wood",
    colors: { top: "#ffe880", left: "#ff9e3d", right: "#8a5a34" },
  },
};

export interface ItemDef {
  id: ItemId;
  name: string;
  short: string;
  blockId?: BlockNum;
  tool?: { kind: ToolKind; speed: number; headColor: number; tipColor: number; uiColor: string };
  color: string;
  category: "block" | "material" | "tool";
}

export const ITEMS: Record<ItemId, ItemDef> = {
  block_grass: { id: "block_grass", name: "Grass Block", short: "GRASS", blockId: BLOCK.GRASS, color: "#78c850", category: "block" },
  block_dirt: { id: "block_dirt", name: "Dirt", short: "DIRT", blockId: BLOCK.DIRT, color: "#8a5a3a", category: "block" },
  block_stone: { id: "block_stone", name: "Stone", short: "STONE", blockId: BLOCK.STONE, color: "#8b9099", category: "block" },
  block_cobble: { id: "block_cobble", name: "Cobblestone", short: "COBBLE", blockId: BLOCK.COBBLESTONE, color: "#7a8088", category: "block" },
  block_deepslate: { id: "block_deepslate", name: "Deepslate", short: "DEEP", blockId: BLOCK.DEEPSLATE, color: "#4a525e", category: "block" },
  block_sand: { id: "block_sand", name: "Sand", short: "SAND", blockId: BLOCK.SAND, color: "#e3d29b", category: "block" },
  block_sandstone: { id: "block_sandstone", name: "Sandstone", short: "S.STN", blockId: BLOCK.SANDSTONE, color: "#d8c289", category: "block" },
  block_snow: { id: "block_snow", name: "Snow Block", short: "SNOW", blockId: BLOCK.SNOW, color: "#eaf4fc", category: "block" },
  block_ice: { id: "block_ice", name: "Ice", short: "ICE", blockId: BLOCK.ICE, color: "#8ed3fa", category: "block" },
  block_log: { id: "block_log", name: "Oak Log", short: "LOG", blockId: BLOCK.OAK_LOG, color: "#7a4f2c", category: "block" },
  block_leaves: { id: "block_leaves", name: "Oak Leaves", short: "LEAF", blockId: BLOCK.OAK_LEAVES, color: "#4a8b42", category: "block" },
  block_planks: { id: "block_planks", name: "Oak Planks", short: "PLANK", blockId: BLOCK.PLANKS, color: "#c69b5e", category: "block" },
  block_bricks: { id: "block_bricks", name: "Bricks", short: "BRICK", blockId: BLOCK.BRICKS, color: "#b05442", category: "block" },
  block_stone_bricks: { id: "block_stone_bricks", name: "Stone Bricks", short: "S.BRK", blockId: BLOCK.STONE_BRICKS, color: "#8d939b", category: "block" },
  block_glass: { id: "block_glass", name: "Glass", short: "GLASS", blockId: BLOCK.GLASS, color: "#b7e8f7", category: "block" },
  block_coal_ore: { id: "block_coal_ore", name: "Coal Ore", short: "COAL", blockId: BLOCK.COAL_ORE, color: "#4b5058", category: "block" },
  block_iron_ore: { id: "block_iron_ore", name: "Iron Ore", short: "IRON", blockId: BLOCK.IRON_ORE, color: "#d9c2a1", category: "block" },
  block_gold_ore: { id: "block_gold_ore", name: "Gold Ore", short: "GOLD", blockId: BLOCK.GOLD_ORE, color: "#ffcf5c", category: "block" },
  block_diamond_ore: { id: "block_diamond_ore", name: "Diamond Ore", short: "DIAM", blockId: BLOCK.DIAMOND_ORE, color: "#49d8ff", category: "block" },
  block_glowstone: { id: "block_glowstone", name: "Glowstone", short: "GLOW", blockId: BLOCK.GLOWSTONE, color: "#ffd45c", category: "block" },
  block_tnt: { id: "block_tnt", name: "TNT", short: "TNT", blockId: BLOCK.TNT, color: "#e04832", category: "block" },
  block_cactus: { id: "block_cactus", name: "Cactus", short: "CACT", blockId: BLOCK.CACTUS, color: "#428a3d", category: "block" },
  block_crafting_table: { id: "block_crafting_table", name: "Crafting Table", short: "CRAFT", blockId: BLOCK.CRAFTING_TABLE, color: "#b8834b", category: "block" },
  block_torch: { id: "block_torch", name: "Torch", short: "TORCH", blockId: BLOCK.TORCH, color: "#ffb84d", category: "block" },
  coal: { id: "coal", name: "Coal", short: "COAL", color: "#3b3f47", category: "material" },
  iron_ingot: { id: "iron_ingot", name: "Iron Ingot", short: "IRON", color: "#e6d8c3", category: "material" },
  gold_ingot: { id: "gold_ingot", name: "Gold Ingot", short: "GOLD", color: "#ffcf5c", category: "material" },
  diamond: { id: "diamond", name: "Diamond", short: "DIAM", color: "#5ce8ff", category: "material" },
  stick: { id: "stick", name: "Stick", short: "STICK", color: "#9e6b3b", category: "material" },
  wood_pick: {
    id: "wood_pick",
    name: "Wooden Pickaxe",
    short: "W.PICK",
    color: "#c69b5e",
    category: "tool",
    tool: { kind: "pickaxe", speed: 2.6, headColor: 0xc69b5e, tipColor: 0x99723d, uiColor: "#d6ad72" },
  },
  stone_pick: {
    id: "stone_pick",
    name: "Stone Pickaxe",
    short: "S.PICK",
    color: "#9aa0a8",
    category: "tool",
    tool: { kind: "pickaxe", speed: 4.2, headColor: 0x9aa0a8, tipColor: 0x6c727a, uiColor: "#b8bec7" },
  },
  iron_pick: {
    id: "iron_pick",
    name: "Iron Pickaxe",
    short: "I.PICK",
    color: "#e6d8c3",
    category: "tool",
    tool: { kind: "pickaxe", speed: 6.2, headColor: 0xebd9be, tipColor: 0xbda482, uiColor: "#f0e2cc" },
  },
  diamond_pick: {
    id: "diamond_pick",
    name: "Diamond Pickaxe",
    short: "D.PICK",
    color: "#5ce8ff",
    category: "tool",
    tool: { kind: "pickaxe", speed: 9.5, headColor: 0x5ce8ff, tipColor: 0x22a0c7, uiColor: "#6beeff" },
  },
  wood_axe: {
    id: "wood_axe",
    name: "Wooden Axe",
    short: "W.AXE",
    color: "#c69b5e",
    category: "tool",
    tool: { kind: "axe", speed: 3.4, headColor: 0xc69b5e, tipColor: 0x99723d, uiColor: "#d6ad72" },
  },
  stone_axe: {
    id: "stone_axe",
    name: "Stone Axe",
    short: "S.AXE",
    color: "#9aa0a8",
    category: "tool",
    tool: { kind: "axe", speed: 5.5, headColor: 0x9aa0a8, tipColor: 0x6c727a, uiColor: "#b8bec7" },
  },
  wood_shovel: {
    id: "wood_shovel",
    name: "Wooden Shovel",
    short: "SHOVEL",
    color: "#c69b5e",
    category: "tool",
    tool: { kind: "shovel", speed: 3.5, headColor: 0xc69b5e, tipColor: 0x99723d, uiColor: "#d6ad72" },
  },
};

export interface Recipe {
  id: string;
  out: ItemId;
  count: number;
  inputs: Array<{ item: ItemId; count: number }>;
  note: string;
}

export const RECIPES: Recipe[] = [
  { id: "planks", out: "block_planks", count: 4, inputs: [{ item: "block_log", count: 1 }], note: "Building wood" },
  { id: "sticks", out: "stick", count: 4, inputs: [{ item: "block_planks", count: 2 }], note: "Tool handles" },
  { id: "craft_table", out: "block_crafting_table", count: 1, inputs: [{ item: "block_planks", count: 4 }], note: "Workstation" },
  { id: "torches", out: "block_torch", count: 4, inputs: [{ item: "coal", count: 1 }, { item: "stick", count: 1 }], note: "Cave light" },
  { id: "wood_pick", out: "wood_pick", count: 1, inputs: [{ item: "block_planks", count: 3 }, { item: "stick", count: 2 }], note: "2.6x mine stone" },
  { id: "wood_axe", out: "wood_axe", count: 1, inputs: [{ item: "block_planks", count: 3 }, { item: "stick", count: 2 }], note: "3.4x chop wood" },
  { id: "wood_shovel", out: "wood_shovel", count: 1, inputs: [{ item: "block_planks", count: 1 }, { item: "stick", count: 2 }], note: "3.5x dig soil" },
  { id: "stone_pick", out: "stone_pick", count: 1, inputs: [{ item: "block_cobble", count: 3 }, { item: "stick", count: 2 }], note: "4.2x mine stone" },
  { id: "stone_axe", out: "stone_axe", count: 1, inputs: [{ item: "block_cobble", count: 3 }, { item: "stick", count: 2 }], note: "5.5x chop wood" },
  { id: "iron_pick", out: "iron_pick", count: 1, inputs: [{ item: "iron_ingot", count: 3 }, { item: "stick", count: 2 }], note: "6.2x mine fast" },
  { id: "diamond_pick", out: "diamond_pick", count: 1, inputs: [{ item: "diamond", count: 3 }, { item: "stick", count: 2 }], note: "9.5x turbo mine" },
  { id: "stone_bricks", out: "block_stone_bricks", count: 4, inputs: [{ item: "block_cobble", count: 4 }], note: "Castle stone" },
  { id: "bricks", out: "block_bricks", count: 4, inputs: [{ item: "block_dirt", count: 2 }, { item: "coal", count: 1 }], note: "Baked brick" },
  { id: "glass", out: "block_glass", count: 4, inputs: [{ item: "block_sand", count: 2 }, { item: "coal", count: 1 }], note: "Clear window" },
  { id: "glowstone", out: "block_glowstone", count: 2, inputs: [{ item: "gold_ingot", count: 1 }, { item: "block_glass", count: 1 }], note: "Bright lamp" },
  { id: "tnt", out: "block_tnt", count: 2, inputs: [{ item: "block_sand", count: 2 }, { item: "coal", count: 2 }], note: "Explosive blast" },
];

export const CREATIVE_CATALOG: ItemId[] = [
  "block_grass",
  "block_dirt",
  "block_stone",
  "block_cobble",
  "block_stone_bricks",
  "block_deepslate",
  "block_planks",
  "block_log",
  "block_leaves",
  "block_bricks",
  "block_glass",
  "block_sand",
  "block_sandstone",
  "block_snow",
  "block_ice",
  "block_torch",
  "block_glowstone",
  "block_tnt",
  "block_crafting_table",
  "block_cactus",
  "block_coal_ore",
  "block_iron_ore",
  "block_gold_ore",
  "block_diamond_ore",
  "diamond_pick",
];

export const DEFAULT_CREATIVE_HOTBAR: ItemId[] = [
  "block_grass",
  "block_planks",
  "block_stone_bricks",
  "block_bricks",
  "block_glass",
  "block_log",
  "block_torch",
  "block_glowstone",
  "block_tnt",
];

export const DEFAULT_SURVIVAL_HOTBAR: Array<ItemId | null> = [
  "wood_pick",
  "block_torch",
  "block_planks",
  "block_cobble",
  "block_dirt",
  null,
  null,
  null,
  null,
];
