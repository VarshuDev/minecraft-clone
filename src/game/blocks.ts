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
  FURNACE: 27,
  CHEST: 28,
  BED: 29,
  WOOD_DOOR: 30,
  LADDER: 31,
  FARMLAND: 32,
  POPPY: 33,
  DANDELION: 34,
  FARMLAND_MOIST: 35,
  WHEAT_0: 36,
  WHEAT_1: 37,
  WHEAT_2: 38,
  WHEAT_3: 39,
  REDSTONE_ORE: 40,
  REDSTONE_WIRE: 41,
  REDSTONE_TORCH: 42,
  LEVER: 43,
  REDSTONE_LAMP: 44,
  REDSTONE_LAMP_LIT: 45,
  LAVA: 46,
  OBSIDIAN: 47,
  NETHERRACK: 48,
  NETHER_QUARTZ_ORE: 49,
  SOUL_SAND: 50,
  NETHER_PORTAL: 51,
  GRAVEL: 52,
  QUARTZ_BLOCK: 53,
  ENCHANTING_TABLE: 54,
  BOOKSHELF: 55,
  LAPIS_ORE: 56,
  EMERALD_ORE: 57,
  END_STONE: 58,
  END_PORTAL_FRAME: 59,
  END_PORTAL_FRAME_EYE: 60,
  END_PORTAL: 61,
  DRAGON_EGG: 62,
  PURPUR_BLOCK: 63,
  END_ROD: 64,
  BREWING_STAND: 65,
  NETHER_WART: 66,
  END_STONE_BRICK: 67,
  PURPUR_PILLAR: 68,
} as const;

export type BlockNum = (typeof BLOCK)[keyof typeof BLOCK];

export type GameModeId = "survival" | "creative";

export type EnchantmentId =
  | "sharpness"
  | "fire_aspect"
  | "knockback"
  | "efficiency"
  | "fortune"
  | "protection"
  | "unbreaking";

export interface EnchantmentOffer {
  id: EnchantmentId;
  name: string;
  level: number;
  costXp: number; // XP levels consumed (1, 2, or 3)
  minPlayerLevel: number; // Min required player level to unlock
  lapisCost: number; // 1, 2, or 3 Lapis Lazuli
  runeName: string; // Cryptic standard galactic rune phrase
  description: string;
}

export type VillagerProfession = "farmer" | "weaponsmith" | "librarian" | "cleric";

export interface VillagerTrade {
  id: string;
  in1: { item: ItemId; count: number };
  in2?: { item: ItemId; count: number };
  out: { item: ItemId; count: number; enchantments?: Record<string, number> };
  maxUses: number;
  uses: number;
  xpReward: number;
}

export function getVillagerTrades(profession: VillagerProfession): VillagerTrade[] {
  switch (profession) {
    case "farmer":
      return [
        { id: "f_1", in1: { item: "wheat", count: 18 }, out: { item: "item_emerald", count: 1 }, maxUses: 16, uses: 0, xpReward: 2 },
        { id: "f_2", in1: { item: "seeds", count: 16 }, out: { item: "item_emerald", count: 1 }, maxUses: 12, uses: 0, xpReward: 2 },
        { id: "f_3", in1: { item: "item_emerald", count: 1 }, out: { item: "bread", count: 6 }, maxUses: 16, uses: 0, xpReward: 3 },
        { id: "f_4", in1: { item: "item_emerald", count: 1 }, out: { item: "apple", count: 4 }, maxUses: 12, uses: 0, xpReward: 3 },
      ];
    case "weaponsmith":
      return [
        { id: "w_1", in1: { item: "coal", count: 15 }, out: { item: "item_emerald", count: 1 }, maxUses: 16, uses: 0, xpReward: 2 },
        { id: "w_2", in1: { item: "iron_ingot", count: 4 }, out: { item: "item_emerald", count: 1 }, maxUses: 12, uses: 0, xpReward: 2 },
        { id: "w_3", in1: { item: "item_emerald", count: 3 }, out: { item: "iron_sword", count: 1 }, maxUses: 8, uses: 0, xpReward: 4 },
        { id: "w_4", in1: { item: "item_emerald", count: 2 }, out: { item: "bow", count: 1 }, maxUses: 6, uses: 0, xpReward: 4 },
        { id: "w_5", in1: { item: "item_emerald", count: 8 }, out: { item: "diamond_sword", count: 1, enchantments: { sharpness: 2 } }, maxUses: 4, uses: 0, xpReward: 6 },
      ];
    case "librarian":
      return [
        { id: "l_1", in1: { item: "item_book", count: 4 }, out: { item: "item_emerald", count: 1 }, maxUses: 12, uses: 0, xpReward: 2 },
        { id: "l_2", in1: { item: "item_emerald", count: 1 }, out: { item: "block_bookshelf", count: 1 }, maxUses: 12, uses: 0, xpReward: 3 },
        { id: "l_3", in1: { item: "item_emerald", count: 5 }, in2: { item: "item_book", count: 1 }, out: { item: "item_book", count: 1, enchantments: { unbreaking: 2 } }, maxUses: 4, uses: 0, xpReward: 5 },
        { id: "l_4", in1: { item: "item_emerald", count: 6 }, in2: { item: "item_book", count: 1 }, out: { item: "item_book", count: 1, enchantments: { efficiency: 2 } }, maxUses: 4, uses: 0, xpReward: 5 },
      ];
    case "cleric":
      return [
        { id: "c_1", in1: { item: "rotten_flesh", count: 32 }, out: { item: "item_emerald", count: 1 }, maxUses: 16, uses: 0, xpReward: 2 },
        { id: "c_2", in1: { item: "gold_ingot", count: 3 }, out: { item: "item_emerald", count: 1 }, maxUses: 12, uses: 0, xpReward: 3 },
        { id: "c_3", in1: { item: "item_emerald", count: 1 }, out: { item: "item_lapis", count: 3 }, maxUses: 16, uses: 0, xpReward: 3 },
        { id: "c_4", in1: { item: "item_emerald", count: 2 }, out: { item: "redstone_dust", count: 4 }, maxUses: 12, uses: 0, xpReward: 4 },
        { id: "c_5", in1: { item: "item_emerald", count: 4 }, out: { item: "block_glowstone", count: 2 }, maxUses: 8, uses: 0, xpReward: 5 },
      ];
  }
}

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
  | "block_furnace"
  | "block_chest"
  | "block_bed"
  | "block_door"
  | "block_ladder"
  | "block_farmland"
  | "block_poppy"
  | "block_dandelion"
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
  | "wood_shovel"
  | "wood_sword"
  | "stone_sword"
  | "iron_sword"
  | "diamond_sword"
  | "bow"
  | "arrow"
  | "wood_hoe"
  | "apple"
  | "bread"
  | "raw_beef"
  | "cooked_beef"
  | "raw_porkchop"
  | "cooked_porkchop"
  | "wheat"
  | "seeds"
  | "rotten_flesh"
  | "bone"
  | "gunpowder"
  | "string"
  | "feather"
  | "leather"
  | "wool"
  | "iron_helmet"
  | "iron_chestplate"
  | "iron_leggings"
  | "iron_boots"
  | "diamond_helmet"
  | "diamond_chestplate"
  | "diamond_leggings"
  | "diamond_boots"
  | "leather_chestplate"
  | "leather_boots"
  | "bone_meal"
  | "redstone_dust"
  | "lever"
  | "redstone_torch"
  | "redstone_lamp"
  | "block_redstone_ore"
  | "flint"
  | "flint_and_steel"
  | "quartz"
  | "golden_sword"
  | "block_obsidian"
  | "block_netherrack"
  | "block_quartz_ore"
  | "block_soul_sand"
  | "block_gravel"
  | "block_quartz"
  | "block_lava"
  | "block_enchanting_table"
  | "block_bookshelf"
  | "block_lapis_ore"
  | "item_lapis"
  | "item_book"
  | "block_emerald_ore"
  | "item_emerald"
  | "ender_pearl"
  | "block_end_stone"
  | "block_end_portal_frame"
  | "block_purpur"
  | "block_end_rod"
  | "dragon_egg"
  | "spider_eye"
  | "blaze_rod"
  | "blaze_powder"
  | "eye_of_ender"
  | "shield"
  | "block_brewing_stand"
  | "block_nether_wart"
  | "block_end_stone_brick"
  | "block_purpur_pillar"
  | "glass_bottle"
  | "potion_water"
  | "potion_awkward"
  | "potion_speed"
  | "potion_strength"
  | "potion_healing"
  | "potion_poison"
  | "potion_night_vision"
  | "potion_fire_resistance"
  | "potion_slow_falling"
  | "nether_wart"
  | "sugar"
  | "paper"
  | "firework_rocket"
  | "elytra";

export type ToolKind = "pickaxe" | "axe" | "shovel" | "sword" | "hoe" | "bow";
export type ArmorSlot = "head" | "chest" | "legs" | "feet";

export interface ArmorDef {
  slot: ArmorSlot;
  defense: number; // In half-shields (e.g. 2 = 1 full shield)
  material: "leather" | "iron" | "diamond" | "elytra";
}

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
  isFlower?: boolean;
  isLadder?: boolean;
  isCrop?: boolean;
  cropStage?: number;
  isWire?: boolean;
  isLever?: boolean;
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
  [BLOCK.FURNACE]: {
    id: BLOCK.FURNACE,
    name: "Furnace",
    hardness: 1.6,
    preferredTool: "pickaxe",
    drop: "block_furnace",
    shards: ["#63676e", "#474b52", "#82878f"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#787d86", left: "#60646c", right: "#4b4f57" },
  },
  [BLOCK.CHEST]: {
    id: BLOCK.CHEST,
    name: "Chest",
    hardness: 1.2,
    preferredTool: "axe",
    drop: "block_chest",
    shards: ["#946433", "#73481f", "#b88347"],
    solid: true,
    transparent: false,
    sound: "wood",
    colors: { top: "#b88347", left: "#946433", right: "#73481f" },
  },
  [BLOCK.BED]: {
    id: BLOCK.BED,
    name: "Bed",
    hardness: 0.5,
    preferredTool: "axe",
    drop: "block_bed",
    shards: ["#d93838", "#ffffff", "#8f5727"],
    solid: true,
    transparent: false,
    sound: "wood",
    colors: { top: "#d93838", left: "#ba2727", right: "#8f5727" },
  },
  [BLOCK.WOOD_DOOR]: {
    id: BLOCK.WOOD_DOOR,
    name: "Wooden Door",
    hardness: 1.0,
    preferredTool: "axe",
    drop: "block_door",
    shards: ["#a8703b", "#825329", "#c69b5e"],
    solid: true,
    transparent: true,
    sound: "wood",
    colors: { top: "#a8703b", left: "#825329", right: "#c69b5e" },
  },
  [BLOCK.LADDER]: {
    id: BLOCK.LADDER,
    name: "Ladder",
    hardness: 0.4,
    preferredTool: "axe",
    drop: "block_ladder",
    shards: ["#a8703b", "#825329"],
    solid: false,
    transparent: true,
    isLadder: true,
    sound: "wood",
    colors: { top: "#a8703b", left: "#825329", right: "#825329" },
  },
  [BLOCK.FARMLAND]: {
    id: BLOCK.FARMLAND,
    name: "Farmland",
    hardness: 0.6,
    preferredTool: "shovel",
    drop: "block_dirt",
    shards: ["#5e3a20", "#472b17"],
    solid: true,
    transparent: false,
    sound: "grass",
    colors: { top: "#4d2e19", left: "#5e3a20", right: "#472b17" },
  },
  [BLOCK.POPPY]: {
    id: BLOCK.POPPY,
    name: "Poppy",
    hardness: 0.05,
    drop: "block_poppy",
    shards: ["#e03131", "#2f9e44"],
    solid: false,
    transparent: true,
    isFlower: true,
    sound: "grass",
    colors: { top: "#e03131", left: "#2f9e44", right: "#2f9e44" },
  },
  [BLOCK.DANDELION]: {
    id: BLOCK.DANDELION,
    name: "Dandelion",
    hardness: 0.05,
    drop: "block_dandelion",
    shards: ["#ffd43b", "#2f9e44"],
    solid: false,
    transparent: true,
    isFlower: true,
    sound: "grass",
    colors: { top: "#ffd43b", left: "#2f9e44", right: "#2f9e44" },
  },
  [BLOCK.FARMLAND_MOIST]: {
    id: BLOCK.FARMLAND_MOIST,
    name: "Moist Farmland",
    hardness: 0.6,
    preferredTool: "shovel",
    drop: "block_dirt",
    shards: ["#3d2716", "#291a0e"],
    solid: true,
    transparent: false,
    sound: "grass",
    colors: { top: "#291a0e", left: "#3d2716", right: "#24170c" },
  },
  [BLOCK.WHEAT_0]: {
    id: BLOCK.WHEAT_0,
    name: "Wheat (Stage 1)",
    hardness: 0.05,
    drop: "seeds",
    shards: ["#6bbd45"],
    solid: false,
    transparent: true,
    isCrop: true,
    cropStage: 0,
    sound: "grass",
    colors: { top: "#55a822", left: "#55a822", right: "#55a822" },
  },
  [BLOCK.WHEAT_1]: {
    id: BLOCK.WHEAT_1,
    name: "Wheat (Stage 2)",
    hardness: 0.05,
    drop: "seeds",
    shards: ["#76c835"],
    solid: false,
    transparent: true,
    isCrop: true,
    cropStage: 1,
    sound: "grass",
    colors: { top: "#6bbd45", left: "#6bbd45", right: "#6bbd45" },
  },
  [BLOCK.WHEAT_2]: {
    id: BLOCK.WHEAT_2,
    name: "Wheat (Stage 3)",
    hardness: 0.05,
    drop: "seeds",
    shards: ["#a0cc30"],
    solid: false,
    transparent: true,
    isCrop: true,
    cropStage: 2,
    sound: "grass",
    colors: { top: "#a0cc30", left: "#a0cc30", right: "#a0cc30" },
  },
  [BLOCK.WHEAT_3]: {
    id: BLOCK.WHEAT_3,
    name: "Mature Wheat",
    hardness: 0.05,
    drop: "wheat",
    shards: ["#fab005", "#ffd43b"],
    solid: false,
    transparent: true,
    isCrop: true,
    cropStage: 3,
    sound: "grass",
    colors: { top: "#fab005", left: "#ffd43b", right: "#d89c47" },
  },
  [BLOCK.REDSTONE_ORE]: {
    id: BLOCK.REDSTONE_ORE,
    name: "Redstone Ore",
    hardness: 2.2,
    preferredTool: "pickaxe",
    drop: "redstone_dust",
    shards: ["#8b9099", "#ff2200"],
    solid: true,
    transparent: false,
    emitsLight: true,
    lightColor: 0xff2200,
    sound: "stone",
    colors: { top: "#ff2200", left: "#8b9099", right: "#6b7078" },
  },
  [BLOCK.REDSTONE_WIRE]: {
    id: BLOCK.REDSTONE_WIRE,
    name: "Redstone Wire",
    hardness: 0.05,
    drop: "redstone_dust",
    shards: ["#ff2200"],
    solid: false,
    transparent: true,
    isWire: true,
    sound: "sand",
    colors: { top: "#ff2200", left: "#ff2200", right: "#ff2200" },
  },
  [BLOCK.REDSTONE_TORCH]: {
    id: BLOCK.REDSTONE_TORCH,
    name: "Redstone Torch",
    hardness: 0.05,
    drop: "redstone_torch",
    shards: ["#ff2200", "#825329"],
    solid: false,
    transparent: true,
    isTorch: true,
    emitsLight: true,
    lightColor: 0xff3311,
    sound: "wood",
    colors: { top: "#ff3311", left: "#825329", right: "#ff3311" },
  },
  [BLOCK.LEVER]: {
    id: BLOCK.LEVER,
    name: "Lever",
    hardness: 0.4,
    preferredTool: "pickaxe",
    drop: "lever",
    shards: ["#825329", "#8b9099"],
    solid: false,
    transparent: true,
    isLever: true,
    sound: "stone",
    colors: { top: "#825329", left: "#8b9099", right: "#825329" },
  },
  [BLOCK.REDSTONE_LAMP]: {
    id: BLOCK.REDSTONE_LAMP,
    name: "Redstone Lamp",
    hardness: 0.8,
    preferredTool: "pickaxe",
    drop: "redstone_lamp",
    shards: ["#4a301c", "#8b6530"],
    solid: true,
    transparent: false,
    sound: "glass",
    colors: { top: "#4a301c", left: "#382314", right: "#2e1c0f" },
  },
  [BLOCK.REDSTONE_LAMP_LIT]: {
    id: BLOCK.REDSTONE_LAMP_LIT,
    name: "Lit Redstone Lamp",
    hardness: 0.8,
    preferredTool: "pickaxe",
    drop: "redstone_lamp",
    shards: ["#ffc83b", "#ff9e1b"],
    solid: true,
    transparent: false,
    emitsLight: true,
    lightColor: 0xffaa33,
    sound: "glass",
    colors: { top: "#ffc83b", left: "#ffa710", right: "#ff8800" },
  },
  [BLOCK.LAVA]: {
    id: BLOCK.LAVA,
    name: "Lava",
    hardness: 100,
    drop: "block_lava",
    shards: ["#ff4500", "#ff8c00", "#ffa500"],
    solid: false,
    transparent: false,
    liquid: true,
    emitsLight: true,
    lightColor: 0xff6600,
    sound: "water",
    colors: { top: "#ff5722", left: "#e64a19", right: "#bf360c" },
  },
  [BLOCK.OBSIDIAN]: {
    id: BLOCK.OBSIDIAN,
    name: "Obsidian",
    hardness: 8.0,
    preferredTool: "pickaxe",
    drop: "block_obsidian",
    shards: ["#1e1429", "#2e1b40", "#45285e"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#241830", left: "#191024", right: "#120a1c" },
  },
  [BLOCK.NETHERRACK]: {
    id: BLOCK.NETHERRACK,
    name: "Netherrack",
    hardness: 0.4,
    preferredTool: "pickaxe",
    drop: "block_netherrack",
    shards: ["#701b1b", "#541414", "#8c2626"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#7a2020", left: "#611717", right: "#450e0e" },
  },
  [BLOCK.NETHER_QUARTZ_ORE]: {
    id: BLOCK.NETHER_QUARTZ_ORE,
    name: "Nether Quartz Ore",
    hardness: 1.5,
    preferredTool: "pickaxe",
    drop: "quartz",
    shards: ["#701b1b", "#f0e6df", "#ffffff"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#eee4dc", left: "#7a2020", right: "#611717" },
  },
  [BLOCK.SOUL_SAND]: {
    id: BLOCK.SOUL_SAND,
    name: "Soul Sand",
    hardness: 0.5,
    preferredTool: "shovel",
    drop: "block_soul_sand",
    shards: ["#594235", "#473328", "#38271e"],
    solid: true,
    transparent: false,
    sound: "sand",
    colors: { top: "#543e32", left: "#422f25", right: "#30221a" },
  },
  [BLOCK.NETHER_PORTAL]: {
    id: BLOCK.NETHER_PORTAL,
    name: "Nether Portal",
    hardness: 9999,
    shards: ["#b53df5", "#7c1ec2"],
    solid: false,
    transparent: true,
    emitsLight: true,
    lightColor: 0xaa33ff,
    sound: "glass",
    colors: { top: "#a832f0", left: "#851ec7", right: "#630ea1" },
  },
  [BLOCK.GRAVEL]: {
    id: BLOCK.GRAVEL,
    name: "Gravel",
    hardness: 0.6,
    preferredTool: "shovel",
    drop: "block_gravel",
    shards: ["#7a7977", "#8f8d8a", "#636260"],
    solid: true,
    transparent: false,
    sound: "sand",
    colors: { top: "#8c8a87", left: "#787673", right: "#63615e" },
  },
  [BLOCK.QUARTZ_BLOCK]: {
    id: BLOCK.QUARTZ_BLOCK,
    name: "Block of Quartz",
    hardness: 1.2,
    preferredTool: "pickaxe",
    drop: "block_quartz",
    shards: ["#edebe6", "#dedbd5", "#f7f6f2"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#f2f0ec", left: "#e3e0d8", right: "#d1cec4" },
  },
  [BLOCK.ENCHANTING_TABLE]: {
    id: BLOCK.ENCHANTING_TABLE,
    name: "Enchanting Table",
    hardness: 5.0,
    preferredTool: "pickaxe",
    drop: "block_enchanting_table",
    shards: ["#16111f", "#8a1a2e", "#29b6f6", "#ffd700"],
    solid: true,
    transparent: true,
    emitsLight: true,
    lightColor: 0xaa44ff,
    sound: "stone",
    colors: { top: "#8a1a2e", left: "#16111f", right: "#110b1a" },
  },
  [BLOCK.BOOKSHELF]: {
    id: BLOCK.BOOKSHELF,
    name: "Bookshelf",
    hardness: 1.5,
    preferredTool: "axe",
    drop: "item_book",
    shards: ["#c69b5e", "#8b1e22", "#2e6930", "#1e4bb5"],
    solid: true,
    transparent: false,
    sound: "wood",
    colors: { top: "#c69b5e", left: "#9e5c30", right: "#7d4826" },
  },
  [BLOCK.LAPIS_ORE]: {
    id: BLOCK.LAPIS_ORE,
    name: "Lapis Lazuli Ore",
    hardness: 3.0,
    preferredTool: "pickaxe",
    drop: "item_lapis",
    shards: ["#7a8088", "#1e4ec8", "#3f6fe0", "#ffd700"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#1e4ec8", left: "#727880", right: "#5b6068" },
  },
  [BLOCK.EMERALD_ORE]: {
    id: BLOCK.EMERALD_ORE,
    name: "Emerald Ore",
    hardness: 3.0,
    preferredTool: "pickaxe",
    drop: "item_emerald",
    shards: ["#7a8088", "#065f46", "#10b981", "#34d399"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#10b981", left: "#727880", right: "#5b6068" },
  },
  [BLOCK.END_STONE]: {
    id: BLOCK.END_STONE,
    name: "End Stone",
    hardness: 3.0,
    preferredTool: "pickaxe",
    drop: "block_end_stone",
    shards: ["#dfdf9f", "#e6e6b8", "#c8c880", "#dedea0"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#dfdf9f", left: "#c8c880", right: "#b8b870" },
  },
  [BLOCK.END_PORTAL_FRAME]: {
    id: BLOCK.END_PORTAL_FRAME,
    name: "End Portal Frame",
    hardness: -1,
    drop: "block_end_portal_frame",
    shards: ["#1e3d36", "#5a8f76", "#2c5b4d"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#5a8f76", left: "#2c5b4d", right: "#1e3d36" },
  },
  [BLOCK.END_PORTAL_FRAME_EYE]: {
    id: BLOCK.END_PORTAL_FRAME_EYE,
    name: "End Portal Frame (Active)",
    hardness: -1,
    drop: "block_end_portal_frame",
    shards: ["#1e3d36", "#5a8f76", "#0f766e", "#10b981"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#0f766e", left: "#2c5b4d", right: "#1e3d36" },
  },
  [BLOCK.END_PORTAL]: {
    id: BLOCK.END_PORTAL,
    name: "End Portal",
    hardness: -1,
    solid: false,
    transparent: true,
    shards: ["#020617", "#38bdf8", "#818cf8"],
    sound: "portal",
    colors: { top: "#020617", left: "#020617", right: "#020617" },
  },
  [BLOCK.DRAGON_EGG]: {
    id: BLOCK.DRAGON_EGG,
    name: "Dragon Egg",
    hardness: 3.0,
    drop: "dragon_egg",
    shards: ["#0f0f15", "#4c1d95", "#8b5cf6"],
    solid: true,
    transparent: true,
    sound: "stone",
    colors: { top: "#1e1b4b", left: "#0f0f15", right: "#09090b" },
  },
  [BLOCK.PURPUR_BLOCK]: {
    id: BLOCK.PURPUR_BLOCK,
    name: "Purpur Block",
    hardness: 1.5,
    preferredTool: "pickaxe",
    drop: "block_purpur",
    shards: ["#a878a8", "#8b578b", "#c293c2"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#a878a8", left: "#8b578b", right: "#704270" },
  },
  [BLOCK.END_ROD]: {
    id: BLOCK.END_ROD,
    name: "End Rod",
    hardness: 0.5,
    drop: "block_end_rod",
    shards: ["#ffffff", "#e0e7ff", "#fef08a"],
    solid: false,
    transparent: true,
    sound: "glass",
    colors: { top: "#ffffff", left: "#e0e7ff", right: "#cbd5e1" },
  },
  [BLOCK.BREWING_STAND]: {
    id: BLOCK.BREWING_STAND,
    name: "Brewing Stand",
    hardness: 0.8,
    preferredTool: "pickaxe",
    drop: "block_brewing_stand",
    shards: ["#78716c", "#f59e0b", "#d97706"],
    solid: true,
    transparent: true,
    sound: "stone",
    colors: { top: "#78716c", left: "#57534e", right: "#44403c" },
  },
  [BLOCK.NETHER_WART]: {
    id: BLOCK.NETHER_WART,
    name: "Nether Wart",
    hardness: 0.2,
    drop: "nether_wart",
    shards: ["#881337", "#9f1239", "#4c0519"],
    solid: false,
    transparent: true,
    isFlower: true,
    sound: "grass",
    colors: { top: "#881337", left: "#9f1239", right: "#4c0519" },
  },
  [BLOCK.END_STONE_BRICK]: {
    id: BLOCK.END_STONE_BRICK,
    name: "End Stone Bricks",
    hardness: 3.0,
    preferredTool: "pickaxe",
    drop: "block_end_stone_brick",
    shards: ["#dfdf9f", "#e6e6b8", "#c8c880"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#dfdf9f", left: "#c8c880", right: "#b8b870" },
  },
  [BLOCK.PURPUR_PILLAR]: {
    id: BLOCK.PURPUR_PILLAR,
    name: "Purpur Pillar",
    hardness: 1.5,
    preferredTool: "pickaxe",
    drop: "block_purpur_pillar",
    shards: ["#a878a8", "#8b578b", "#c293c2"],
    solid: true,
    transparent: false,
    sound: "stone",
    colors: { top: "#b285b2", left: "#966196", right: "#704270" },
  },
};

export interface FoodDef {
  nutrition: number; // 0..20
  saturation: number;
  alwaysEdible?: boolean;
}

export interface ItemDef {
  id: ItemId;
  name: string;
  short: string;
  blockId?: BlockNum;
  attackDamage?: number;
  armor?: ArmorDef;
  tool?: {
    kind: ToolKind;
    speed: number;
    attackDamage?: number;
    headColor: number;
    tipColor: number;
    uiColor: string;
  };
  food?: FoodDef;
  color: string;
  category: "block" | "material" | "tool" | "food" | "weapon" | "armor";
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
  block_furnace: { id: "block_furnace", name: "Furnace", short: "FURN", blockId: BLOCK.FURNACE, color: "#60646c", category: "block" },
  block_chest: { id: "block_chest", name: "Chest", short: "CHEST", blockId: BLOCK.CHEST, color: "#946433", category: "block" },
  block_bed: { id: "block_bed", name: "Bed", short: "BED", blockId: BLOCK.BED, color: "#d93838", category: "block" },
  block_door: { id: "block_door", name: "Wooden Door", short: "DOOR", blockId: BLOCK.WOOD_DOOR, color: "#a8703b", category: "block" },
  block_ladder: { id: "block_ladder", name: "Ladder", short: "LADR", blockId: BLOCK.LADDER, color: "#c69b5e", category: "block" },
  block_farmland: { id: "block_farmland", name: "Farmland", short: "FARM", blockId: BLOCK.FARMLAND, color: "#4d2e19", category: "block" },
  block_poppy: { id: "block_poppy", name: "Poppy", short: "POPPY", blockId: BLOCK.POPPY, color: "#e03131", category: "block" },
  block_dandelion: { id: "block_dandelion", name: "Dandelion", short: "DAND", blockId: BLOCK.DANDELION, color: "#ffd43b", category: "block" },
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
    tool: { kind: "pickaxe", speed: 2.6, attackDamage: 2, headColor: 0xc69b5e, tipColor: 0x99723d, uiColor: "#d6ad72" },
  },
  stone_pick: {
    id: "stone_pick",
    name: "Stone Pickaxe",
    short: "S.PICK",
    color: "#9aa0a8",
    category: "tool",
    tool: { kind: "pickaxe", speed: 4.2, attackDamage: 3, headColor: 0x9aa0a8, tipColor: 0x6c727a, uiColor: "#b8bec7" },
  },
  iron_pick: {
    id: "iron_pick",
    name: "Iron Pickaxe",
    short: "I.PICK",
    color: "#e6d8c3",
    category: "tool",
    tool: { kind: "pickaxe", speed: 6.2, attackDamage: 4, headColor: 0xebd9be, tipColor: 0xbda482, uiColor: "#f0e2cc" },
  },
  diamond_pick: {
    id: "diamond_pick",
    name: "Diamond Pickaxe",
    short: "D.PICK",
    color: "#5ce8ff",
    category: "tool",
    tool: { kind: "pickaxe", speed: 9.5, attackDamage: 5, headColor: 0x5ce8ff, tipColor: 0x22a0c7, uiColor: "#6beeff" },
  },
  wood_axe: {
    id: "wood_axe",
    name: "Wooden Axe",
    short: "W.AXE",
    color: "#c69b5e",
    category: "tool",
    tool: { kind: "axe", speed: 3.4, attackDamage: 3, headColor: 0xc69b5e, tipColor: 0x99723d, uiColor: "#d6ad72" },
  },
  stone_axe: {
    id: "stone_axe",
    name: "Stone Axe",
    short: "S.AXE",
    color: "#9aa0a8",
    category: "tool",
    tool: { kind: "axe", speed: 5.5, attackDamage: 4, headColor: 0x9aa0a8, tipColor: 0x6c727a, uiColor: "#b8bec7" },
  },
  wood_shovel: {
    id: "wood_shovel",
    name: "Wooden Shovel",
    short: "SHOVEL",
    color: "#c69b5e",
    category: "tool",
    tool: { kind: "shovel", speed: 3.5, attackDamage: 1, headColor: 0xc69b5e, tipColor: 0x99723d, uiColor: "#d6ad72" },
  },
  wood_sword: {
    id: "wood_sword",
    name: "Wooden Sword",
    short: "W.SWD",
    color: "#c69b5e",
    category: "weapon",
    tool: { kind: "sword", speed: 1.5, attackDamage: 4, headColor: 0xc69b5e, tipColor: 0x99723d, uiColor: "#d6ad72" },
  },
  stone_sword: {
    id: "stone_sword",
    name: "Stone Sword",
    short: "S.SWD",
    color: "#9aa0a8",
    category: "weapon",
    tool: { kind: "sword", speed: 1.5, attackDamage: 5, headColor: 0x9aa0a8, tipColor: 0x6c727a, uiColor: "#b8bec7" },
  },
  iron_sword: {
    id: "iron_sword",
    name: "Iron Sword",
    short: "I.SWD",
    color: "#e6d8c3",
    category: "weapon",
    tool: { kind: "sword", speed: 1.5, attackDamage: 6, headColor: 0xebd9be, tipColor: 0xbda482, uiColor: "#f0e2cc" },
  },
  diamond_sword: {
    id: "diamond_sword",
    name: "Diamond Sword",
    short: "D.SWD",
    color: "#5ce8ff",
    category: "weapon",
    tool: { kind: "sword", speed: 1.5, attackDamage: 7, headColor: 0x5ce8ff, tipColor: 0x22a0c7, uiColor: "#6beeff" },
  },
  bow: {
    id: "bow",
    name: "Bow",
    short: "BOW",
    color: "#8a5323",
    category: "weapon",
    tool: { kind: "bow", speed: 1.0, attackDamage: 6, headColor: 0x8a5323, tipColor: 0xeeeeee, uiColor: "#e6b07c" },
  },
  arrow: { id: "arrow", name: "Arrow", short: "ARROW", color: "#d9d7ce", category: "material" },
  wood_hoe: {
    id: "wood_hoe",
    name: "Wooden Hoe",
    short: "W.HOE",
    color: "#c69b5e",
    category: "tool",
    tool: { kind: "hoe", speed: 2.0, attackDamage: 1, headColor: 0xc69b5e, tipColor: 0x99723d, uiColor: "#d6ad72" },
  },
  apple: { id: "apple", name: "Apple", short: "APPLE", color: "#e03131", category: "food", food: { nutrition: 4, saturation: 2.4 } },
  bread: { id: "bread", name: "Bread", short: "BREAD", color: "#d89c47", category: "food", food: { nutrition: 5, saturation: 6.0 } },
  raw_porkchop: { id: "raw_porkchop", name: "Raw Porkchop", short: "PORK", color: "#f783ac", category: "food", food: { nutrition: 3, saturation: 1.8 } },
  cooked_porkchop: { id: "cooked_porkchop", name: "Cooked Porkchop", short: "C.PORK", color: "#b36336", category: "food", food: { nutrition: 8, saturation: 12.8 } },
  raw_beef: { id: "raw_beef", name: "Raw Beef", short: "BEEF", color: "#c92a2a", category: "food", food: { nutrition: 3, saturation: 1.8 } },
  cooked_beef: { id: "cooked_beef", name: "Steak", short: "STEAK", color: "#7a371e", category: "food", food: { nutrition: 8, saturation: 12.8 } },
  wheat: { id: "wheat", name: "Wheat", short: "WHEAT", color: "#fab005", category: "material" },
  seeds: { id: "seeds", name: "Wheat Seeds", short: "SEED", color: "#82c91e", category: "material" },
  rotten_flesh: { id: "rotten_flesh", name: "Rotten Flesh", short: "FLESH", color: "#804c2b", category: "food", food: { nutrition: 2, saturation: 0.8 } },
  bone: { id: "bone", name: "Bone", short: "BONE", color: "#e9ecef", category: "material" },
  gunpowder: { id: "gunpowder", name: "Gunpowder", short: "POWDER", color: "#495057", category: "material" },
  string: { id: "string", name: "String", short: "STRING", color: "#f8f9fa", category: "material" },
  feather: { id: "feather", name: "Feather", short: "FEATHR", color: "#ffffff", category: "material" },
  leather: { id: "leather", name: "Leather", short: "LTHR", color: "#874f28", category: "material" },
  wool: { id: "wool", name: "Wool", short: "WOOL", color: "#f1f3f5", category: "material" },
  iron_helmet: {
    id: "iron_helmet",
    name: "Iron Helmet",
    short: "I.HELM",
    color: "#e6d8c3",
    category: "armor",
    armor: { slot: "head", defense: 2, material: "iron" },
  },
  iron_chestplate: {
    id: "iron_chestplate",
    name: "Iron Chestplate",
    short: "I.CHEST",
    color: "#e6d8c3",
    category: "armor",
    armor: { slot: "chest", defense: 6, material: "iron" },
  },
  iron_leggings: {
    id: "iron_leggings",
    name: "Iron Leggings",
    short: "I.LEGS",
    color: "#e6d8c3",
    category: "armor",
    armor: { slot: "legs", defense: 5, material: "iron" },
  },
  iron_boots: {
    id: "iron_boots",
    name: "Iron Boots",
    short: "I.BOOTS",
    color: "#e6d8c3",
    category: "armor",
    armor: { slot: "feet", defense: 2, material: "iron" },
  },
  diamond_helmet: {
    id: "diamond_helmet",
    name: "Diamond Helmet",
    short: "D.HELM",
    color: "#5ce8ff",
    category: "armor",
    armor: { slot: "head", defense: 3, material: "diamond" },
  },
  diamond_chestplate: {
    id: "diamond_chestplate",
    name: "Diamond Chestplate",
    short: "D.CHEST",
    color: "#5ce8ff",
    category: "armor",
    armor: { slot: "chest", defense: 8, material: "diamond" },
  },
  diamond_leggings: {
    id: "diamond_leggings",
    name: "Diamond Leggings",
    short: "D.LEGS",
    color: "#5ce8ff",
    category: "armor",
    armor: { slot: "legs", defense: 6, material: "diamond" },
  },
  diamond_boots: {
    id: "diamond_boots",
    name: "Diamond Boots",
    short: "D.BOOTS",
    color: "#5ce8ff",
    category: "armor",
    armor: { slot: "feet", defense: 3, material: "diamond" },
  },
  leather_chestplate: {
    id: "leather_chestplate",
    name: "Leather Tunic",
    short: "L.CHEST",
    color: "#874f28",
    category: "armor",
    armor: { slot: "chest", defense: 3, material: "leather" },
  },
  leather_boots: {
    id: "leather_boots",
    name: "Leather Boots",
    short: "L.BOOTS",
    color: "#874f28",
    category: "armor",
    armor: { slot: "feet", defense: 1, material: "leather" },
  },
  bone_meal: {
    id: "bone_meal",
    name: "Bone Meal",
    short: "MEAL",
    color: "#f8f9fa",
    category: "material",
  },
  redstone_dust: {
    id: "redstone_dust",
    name: "Redstone Dust",
    short: "REDSTN",
    blockId: BLOCK.REDSTONE_WIRE,
    color: "#ff2200",
    category: "material",
  },
  lever: {
    id: "lever",
    name: "Lever",
    short: "LEVER",
    blockId: BLOCK.LEVER,
    color: "#825329",
    category: "block",
  },
  redstone_torch: {
    id: "redstone_torch",
    name: "Redstone Torch",
    short: "R.TORCH",
    blockId: BLOCK.REDSTONE_TORCH,
    color: "#ff3311",
    category: "block",
  },
  redstone_lamp: {
    id: "redstone_lamp",
    name: "Redstone Lamp",
    short: "LAMP",
    blockId: BLOCK.REDSTONE_LAMP,
    color: "#4a301c",
    category: "block",
  },
  block_redstone_ore: {
    id: "block_redstone_ore",
    name: "Redstone Ore",
    short: "R.ORE",
    blockId: BLOCK.REDSTONE_ORE,
    color: "#ff2200",
    category: "block",
  },
  flint: {
    id: "flint",
    name: "Flint",
    short: "FLINT",
    color: "#383838",
    category: "material",
  },
  flint_and_steel: {
    id: "flint_and_steel",
    name: "Flint and Steel",
    short: "STEEL",
    color: "#d9d7ce",
    category: "tool",
    tool: { kind: "pickaxe", speed: 1.0, attackDamage: 1, headColor: 0x888888, tipColor: 0xffaa00, uiColor: "#e6e6e6" },
  },
  quartz: {
    id: "quartz",
    name: "Nether Quartz",
    short: "QUARTZ",
    color: "#edebe6",
    category: "material",
  },
  golden_sword: {
    id: "golden_sword",
    name: "Golden Sword",
    short: "G.SWD",
    color: "#ffd43b",
    category: "weapon",
    tool: { kind: "sword", speed: 1.5, attackDamage: 5, headColor: 0xffd700, tipColor: 0xcca000, uiColor: "#ffe066" },
  },
  block_obsidian: {
    id: "block_obsidian",
    name: "Obsidian",
    short: "OBSID",
    blockId: BLOCK.OBSIDIAN,
    color: "#241830",
    category: "block",
  },
  block_netherrack: {
    id: "block_netherrack",
    name: "Netherrack",
    short: "NRACK",
    blockId: BLOCK.NETHERRACK,
    color: "#7a2020",
    category: "block",
  },
  block_quartz_ore: {
    id: "block_quartz_ore",
    name: "Nether Quartz Ore",
    short: "Q.ORE",
    blockId: BLOCK.NETHER_QUARTZ_ORE,
    color: "#eee4dc",
    category: "block",
  },
  block_soul_sand: {
    id: "block_soul_sand",
    name: "Soul Sand",
    short: "SSAND",
    blockId: BLOCK.SOUL_SAND,
    color: "#543e32",
    category: "block",
  },
  block_gravel: {
    id: "block_gravel",
    name: "Gravel",
    short: "GRAVL",
    blockId: BLOCK.GRAVEL,
    color: "#8c8a87",
    category: "block",
  },
  block_quartz: {
    id: "block_quartz",
    name: "Block of Quartz",
    short: "QUARTZ",
    blockId: BLOCK.QUARTZ_BLOCK,
    color: "#f2f0ec",
    category: "block",
  },
  block_lava: {
    id: "block_lava",
    name: "Lava",
    short: "LAVA",
    blockId: BLOCK.LAVA,
    color: "#ff5722",
    category: "block",
  },
  block_enchanting_table: {
    id: "block_enchanting_table",
    name: "Enchanting Table",
    short: "ENCH",
    blockId: BLOCK.ENCHANTING_TABLE,
    color: "#8a1a2e",
    category: "block",
  },
  block_bookshelf: {
    id: "block_bookshelf",
    name: "Bookshelf",
    short: "SHELF",
    blockId: BLOCK.BOOKSHELF,
    color: "#a07844",
    category: "block",
  },
  block_lapis_ore: {
    id: "block_lapis_ore",
    name: "Lapis Lazuli Ore",
    short: "L.ORE",
    blockId: BLOCK.LAPIS_ORE,
    color: "#1e4ec8",
    category: "block",
  },
  item_lapis: {
    id: "item_lapis",
    name: "Lapis Lazuli",
    short: "LAPIS",
    color: "#1f4fc9",
    category: "material",
  },
  item_book: {
    id: "item_book",
    name: "Book",
    short: "BOOK",
    color: "#8b4226",
    category: "material",
  },
  block_emerald_ore: {
    id: "block_emerald_ore",
    name: "Emerald Ore",
    short: "E.ORE",
    blockId: BLOCK.EMERALD_ORE,
    color: "#10b981",
    category: "block",
  },
  item_emerald: {
    id: "item_emerald",
    name: "Emerald",
    short: "EMRLD",
    color: "#10b981",
    category: "material",
  },
  ender_pearl: {
    id: "ender_pearl",
    name: "Ender Pearl",
    short: "PEARL",
    color: "#0f766e",
    category: "material",
  },
  block_end_stone: {
    id: "block_end_stone",
    name: "End Stone",
    short: "E.STONE",
    blockId: BLOCK.END_STONE,
    color: "#dfdf9f",
    category: "block",
  },
  block_end_portal_frame: {
    id: "block_end_portal_frame",
    name: "End Portal Frame",
    short: "FRAME",
    blockId: BLOCK.END_PORTAL_FRAME,
    color: "#5a8f76",
    category: "block",
  },
  block_purpur: {
    id: "block_purpur",
    name: "Purpur Block",
    short: "PURPUR",
    blockId: BLOCK.PURPUR_BLOCK,
    color: "#a878a8",
    category: "block",
  },
  block_end_rod: {
    id: "block_end_rod",
    name: "End Rod",
    short: "E.ROD",
    blockId: BLOCK.END_ROD,
    color: "#fef08a",
    category: "block",
  },
  dragon_egg: {
    id: "dragon_egg",
    name: "Dragon Egg",
    short: "EGG",
    blockId: BLOCK.DRAGON_EGG,
    color: "#581c87",
    category: "block",
  },
  spider_eye: {
    id: "spider_eye",
    name: "Spider Eye",
    short: "S.EYE",
    color: "#881337",
    category: "material",
  },
  blaze_rod: {
    id: "blaze_rod",
    name: "Blaze Rod",
    short: "ROD",
    color: "#f59e0b",
    category: "material",
  },
  blaze_powder: {
    id: "blaze_powder",
    name: "Blaze Powder",
    short: "POWDER",
    color: "#fbbf24",
    category: "material",
  },
  eye_of_ender: {
    id: "eye_of_ender",
    name: "Eye of Ender",
    short: "EYE",
    color: "#059669",
    category: "material",
  },
  shield: {
    id: "shield",
    name: "Shield",
    short: "SHIELD",
    color: "#9ca3af",
    category: "tool",
    defense: 4,
  },
  block_brewing_stand: {
    id: "block_brewing_stand",
    name: "Brewing Stand",
    short: "BREW",
    blockId: BLOCK.BREWING_STAND,
    color: "#f59e0b",
    category: "block",
  },
  block_nether_wart: {
    id: "block_nether_wart",
    name: "Nether Wart",
    short: "WART",
    blockId: BLOCK.NETHER_WART,
    color: "#881337",
    category: "block",
  },
  block_end_stone_brick: {
    id: "block_end_stone_brick",
    name: "End Stone Bricks",
    short: "E.BRICK",
    blockId: BLOCK.END_STONE_BRICK,
    color: "#dedea0",
    category: "block",
  },
  block_purpur_pillar: {
    id: "block_purpur_pillar",
    name: "Purpur Pillar",
    short: "P.PILLAR",
    blockId: BLOCK.PURPUR_PILLAR,
    color: "#966196",
    category: "block",
  },
  nether_wart: {
    id: "nether_wart",
    name: "Nether Wart",
    short: "WART",
    color: "#881337",
    category: "material",
  },
  glass_bottle: {
    id: "glass_bottle",
    name: "Glass Bottle",
    short: "BOTTLE",
    color: "#cbd5e1",
    category: "material",
  },
  potion_water: {
    id: "potion_water",
    name: "Water Bottle",
    short: "H2O",
    color: "#38bdf8",
    category: "tool",
  },
  potion_awkward: {
    id: "potion_awkward",
    name: "Awkward Potion",
    short: "AWKWARD",
    color: "#818cf8",
    category: "tool",
  },
  potion_speed: {
    id: "potion_speed",
    name: "Potion of Swiftness",
    short: "SPEED",
    color: "#67e8f9",
    category: "tool",
  },
  potion_strength: {
    id: "potion_strength",
    name: "Potion of Strength",
    short: "STR",
    color: "#f43f5e",
    category: "tool",
  },
  potion_healing: {
    id: "potion_healing",
    name: "Potion of Healing",
    short: "HEAL",
    color: "#fb7185",
    category: "tool",
  },
  potion_poison: {
    id: "potion_poison",
    name: "Potion of Poison",
    short: "POISON",
    color: "#4ade80",
    category: "tool",
  },
  potion_night_vision: {
    id: "potion_night_vision",
    name: "Potion of Night Vision",
    short: "VISION",
    color: "#3b82f6",
    category: "tool",
  },
  potion_fire_resistance: {
    id: "potion_fire_resistance",
    name: "Potion of Fire Resistance",
    short: "FIRE.R",
    color: "#f97316",
    category: "tool",
  },
  potion_slow_falling: {
    id: "potion_slow_falling",
    name: "Potion of Slow Falling",
    short: "SLOW.F",
    color: "#fbcfe8",
    category: "tool",
  },
  sugar: {
    id: "sugar",
    name: "Sugar",
    short: "SUGAR",
    color: "#f8fafc",
    category: "material",
  },
  paper: {
    id: "paper",
    name: "Paper",
    short: "PAPER",
    color: "#f1f5f9",
    category: "material",
  },
  firework_rocket: {
    id: "firework_rocket",
    name: "Firework Rocket",
    short: "ROCKET",
    color: "#ef4444",
    category: "tool",
  },
  elytra: {
    id: "elytra",
    name: "Elytra",
    short: "ELYTRA",
    color: "#64748b",
    category: "armor",
    armor: {
      slot: "chest",
      defense: 0,
      material: "elytra",
    },
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
  { id: "furnace", out: "block_furnace", count: 1, inputs: [{ item: "block_cobble", count: 8 }], note: "Smelting & cooking" },
  { id: "chest", out: "block_chest", count: 1, inputs: [{ item: "block_planks", count: 8 }], note: "Item storage" },
  { id: "bed", out: "block_bed", count: 1, inputs: [{ item: "wool", count: 3 }, { item: "block_planks", count: 3 }], note: "Sleep through night" },
  { id: "door", out: "block_door", count: 1, inputs: [{ item: "block_planks", count: 6 }], note: "Hinged wooden door" },
  { id: "ladder", out: "block_ladder", count: 3, inputs: [{ item: "stick", count: 7 }], note: "Climbable ladders" },
  { id: "torches", out: "block_torch", count: 4, inputs: [{ item: "coal", count: 1 }, { item: "stick", count: 1 }], note: "Cave light" },
  { id: "wood_sword", out: "wood_sword", count: 1, inputs: [{ item: "block_planks", count: 2 }, { item: "stick", count: 1 }], note: "+4 Attack Damage" },
  { id: "stone_sword", out: "stone_sword", count: 1, inputs: [{ item: "block_cobble", count: 2 }, { item: "stick", count: 1 }], note: "+5 Attack Damage" },
  { id: "iron_sword", out: "iron_sword", count: 1, inputs: [{ item: "iron_ingot", count: 2 }, { item: "stick", count: 1 }], note: "+6 Attack Damage" },
  { id: "diamond_sword", out: "diamond_sword", count: 1, inputs: [{ item: "diamond", count: 2 }, { item: "stick", count: 1 }], note: "+7 Attack Damage" },
  { id: "bow", out: "bow", count: 1, inputs: [{ item: "stick", count: 3 }, { item: "string", count: 3 }], note: "Ranged arrow launcher" },
  { id: "arrows", out: "arrow", count: 4, inputs: [{ item: "feather", count: 1 }, { item: "stick", count: 1 }, { item: "coal", count: 1 }], note: "Ammunition" },
  { id: "wood_hoe", out: "wood_hoe", count: 1, inputs: [{ item: "block_planks", count: 2 }, { item: "stick", count: 2 }], note: "Till soil for farming" },
  { id: "bread", out: "bread", count: 1, inputs: [{ item: "wheat", count: 3 }], note: "Restores 5 hunger" },
  { id: "cooked_pork", out: "cooked_porkchop", count: 1, inputs: [{ item: "raw_porkchop", count: 1 }, { item: "coal", count: 1 }], note: "Restores 8 hunger" },
  { id: "cooked_beef", out: "cooked_beef", count: 1, inputs: [{ item: "raw_beef", count: 1 }, { item: "coal", count: 1 }], note: "Restores 8 hunger" },
  { id: "wood_pick", out: "wood_pick", count: 1, inputs: [{ item: "block_planks", count: 3 }, { item: "stick", count: 2 }], note: "2.6x mine stone" },
  { id: "wood_axe", out: "wood_axe", count: 1, inputs: [{ item: "block_planks", count: 3 }, { item: "stick", count: 2 }], note: "3.4x chop wood" },
  { id: "wood_shovel", out: "wood_shovel", count: 1, inputs: [{ item: "block_planks", count: 1 }, { item: "stick", count: 2 }], note: "3.5x dig soil" },
  { id: "stone_pick", out: "stone_pick", count: 1, inputs: [{ item: "block_cobble", count: 3 }, { item: "stick", count: 2 }], note: "4.2x mine stone" },
  { id: "stone_axe", out: "stone_axe", count: 1, inputs: [{ item: "block_cobble", count: 3 }, { item: "stick", count: 2 }], note: "5.5x chop wood" },
  { id: "iron_pick", out: "iron_pick", count: 1, inputs: [{ item: "iron_ingot", count: 3 }, { item: "stick", count: 2 }], note: "6.2x mine fast" },
  { id: "diamond_pick", out: "diamond_pick", count: 1, inputs: [{ item: "diamond", count: 3 }, { item: "stick", count: 2 }], note: "9.5x turbo mine" },
  { id: "iron_helm", out: "iron_helmet", count: 1, inputs: [{ item: "iron_ingot", count: 5 }], note: "+2 Armor defense" },
  { id: "iron_chest", out: "iron_chestplate", count: 1, inputs: [{ item: "iron_ingot", count: 8 }], note: "+6 Armor defense" },
  { id: "iron_legs", out: "iron_leggings", count: 1, inputs: [{ item: "iron_ingot", count: 7 }], note: "+5 Armor defense" },
  { id: "iron_boots", out: "iron_boots", count: 1, inputs: [{ item: "iron_ingot", count: 4 }], note: "+2 Armor defense" },
  { id: "diamond_helm", out: "diamond_helmet", count: 1, inputs: [{ item: "diamond", count: 5 }], note: "+3 Armor defense" },
  { id: "diamond_chest", out: "diamond_chestplate", count: 1, inputs: [{ item: "diamond", count: 8 }], note: "+8 Armor defense" },
  { id: "diamond_legs", out: "diamond_leggings", count: 1, inputs: [{ item: "diamond", count: 7 }], note: "+6 Armor defense" },
  { id: "diamond_boots", out: "diamond_boots", count: 1, inputs: [{ item: "diamond", count: 4 }], note: "+3 Armor defense" },
  { id: "leather_chest", out: "leather_chestplate", count: 1, inputs: [{ item: "leather", count: 8 }], note: "+3 Armor defense" },
  { id: "leather_boots", out: "leather_boots", count: 1, inputs: [{ item: "leather", count: 4 }], note: "+1 Armor defense" },
  { id: "stone_bricks", out: "block_stone_bricks", count: 4, inputs: [{ item: "block_cobble", count: 4 }], note: "Castle stone" },
  { id: "bricks", out: "block_bricks", count: 4, inputs: [{ item: "block_dirt", count: 2 }, { item: "coal", count: 1 }], note: "Baked brick" },
  { id: "glass", out: "block_glass", count: 4, inputs: [{ item: "block_sand", count: 2 }, { item: "coal", count: 1 }], note: "Clear window" },
  { id: "glowstone", out: "block_glowstone", count: 2, inputs: [{ item: "gold_ingot", count: 1 }, { item: "block_glass", count: 1 }], note: "Bright lamp" },
  { id: "tnt", out: "block_tnt", count: 2, inputs: [{ item: "block_sand", count: 2 }, { item: "gunpowder", count: 2 }], note: "Explosive blast" },
  { id: "bone_meal", out: "bone_meal", count: 3, inputs: [{ item: "bone", count: 1 }], note: "Fertilizer for crops" },
  { id: "lever", out: "lever", count: 1, inputs: [{ item: "stick", count: 1 }, { item: "block_cobble", count: 1 }], note: "Redstone power switch" },
  { id: "redstone_torch", out: "redstone_torch", count: 1, inputs: [{ item: "stick", count: 1 }, { item: "redstone_dust", count: 1 }], note: "Continuous redstone power" },
  { id: "redstone_lamp", out: "redstone_lamp", count: 1, inputs: [{ item: "block_glowstone", count: 1 }, { item: "redstone_dust", count: 4 }], note: "Redstone activated lamp" },
  { id: "flint_and_steel", out: "flint_and_steel", count: 1, inputs: [{ item: "iron_ingot", count: 1 }, { item: "flint", count: 1 }], note: "Ignite Nether Portals & fire" },
  { id: "quartz_block", out: "block_quartz", count: 1, inputs: [{ item: "quartz", count: 4 }], note: "Pristine white building block" },
  { id: "golden_sword", out: "golden_sword", count: 1, inputs: [{ item: "gold_ingot", count: 2 }, { item: "stick", count: 1 }], note: "+5 Attack Damage" },
  { id: "book", out: "item_book", count: 1, inputs: [{ item: "wheat", count: 3 }, { item: "leather", count: 1 }], note: "Spell & enchanting book" },
  { id: "bookshelf", out: "block_bookshelf", count: 1, inputs: [{ item: "block_planks", count: 6 }, { item: "item_book", count: 3 }], note: "Boosts enchanting table power" },
  { id: "enchant_table", out: "block_enchanting_table", count: 1, inputs: [{ item: "block_obsidian", count: 4 }, { item: "diamond", count: 2 }, { item: "item_book", count: 1 }], note: "Enchant tools & armor" },
  { id: "blaze_powder", out: "blaze_powder", count: 2, inputs: [{ item: "blaze_rod", count: 1 }], note: "Crafting ingredient" },
  { id: "eye_of_ender", out: "eye_of_ender", count: 1, inputs: [{ item: "ender_pearl", count: 1 }, { item: "blaze_powder", count: 1 }], note: "Locates & activates End Portals" },
  { id: "shield", out: "shield", count: 1, inputs: [{ item: "block_planks", count: 6 }, { item: "iron_ingot", count: 1 }], note: "Right-click to block damage" },
  { id: "purpur_block", out: "block_purpur", count: 4, inputs: [{ item: "block_end_stone", count: 4 }], note: "End city architecture" },
  { id: "end_rod", out: "block_end_rod", count: 4, inputs: [{ item: "blaze_rod", count: 1 }, { item: "quartz", count: 1 }], note: "Glowing End rod light" },
  { id: "brewing_stand", out: "block_brewing_stand", count: 1, inputs: [{ item: "blaze_rod", count: 1 }, { item: "block_cobble", count: 3 }], note: "Alchemical potion brewing" },
  { id: "glass_bottle", out: "glass_bottle", count: 3, inputs: [{ item: "block_glass", count: 3 }], note: "Holds liquid potions" },
  { id: "sugar", out: "sugar", count: 1, inputs: [{ item: "seeds", count: 2 }], note: "Potion ingredient & sweetener" },
  { id: "paper", out: "paper", count: 3, inputs: [{ item: "wheat", count: 3 }], note: "Crafting material" },
  { id: "firework_rocket", out: "firework_rocket", count: 3, inputs: [{ item: "gunpowder", count: 1 }, { item: "paper", count: 1 }], note: "Elytra aerial flight boost" },
  { id: "end_stone_bricks", out: "block_end_stone_brick", count: 4, inputs: [{ item: "block_end_stone", count: 4 }], note: "End castle stonework" },
  { id: "purpur_pillar", out: "block_purpur_pillar", count: 2, inputs: [{ item: "block_purpur", count: 2 }], note: "Carved End city pillar" },
];

export interface SmeltingRecipe {
  input: ItemId;
  output: ItemId;
  xp: number;
}

export const SMELTING_RECIPES: SmeltingRecipe[] = [
  { input: "block_iron_ore", output: "iron_ingot", xp: 1.0 },
  { input: "block_gold_ore", output: "gold_ingot", xp: 1.5 },
  { input: "block_redstone_ore", output: "redstone_dust", xp: 0.7 },
  { input: "block_quartz_ore", output: "quartz", xp: 1.0 },
  { input: "block_lapis_ore", output: "item_lapis", xp: 1.0 },
  { input: "block_emerald_ore", output: "item_emerald", xp: 1.0 },
  { input: "block_sand", output: "block_glass", xp: 0.2 },
  { input: "block_cobble", output: "block_stone", xp: 0.2 },
  { input: "raw_beef", output: "cooked_beef", xp: 0.5 },
  { input: "raw_porkchop", output: "cooked_porkchop", xp: 0.5 },
  { input: "block_dirt", output: "block_bricks", xp: 0.3 },
];

export function getFuelBurnTime(item: ItemId): number {
  if (item === "coal") return 80; // 8 smelts (80s)
  if (item === "block_log") return 15; // 1.5 smelts
  if (item === "block_planks") return 15;
  if (item === "stick") return 5;
  return 0;
}

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
  "block_furnace",
  "block_chest",
  "block_bed",
  "block_door",
  "block_ladder",
  "block_glowstone",
  "block_tnt",
  "block_crafting_table",
  "block_cactus",
  "block_poppy",
  "block_dandelion",
  "block_coal_ore",
  "block_iron_ore",
  "block_gold_ore",
  "block_diamond_ore",
  "block_redstone_ore",
  "redstone_dust",
  "redstone_torch",
  "lever",
  "redstone_lamp",
  "bone_meal",
  "wheat",
  "seeds",
  "diamond_sword",
  "diamond_pick",
  "iron_helmet",
  "iron_chestplate",
  "iron_leggings",
  "iron_boots",
  "diamond_helmet",
  "diamond_chestplate",
  "diamond_leggings",
  "diamond_boots",
  "bow",
  "arrow",
  "apple",
  "cooked_beef",
  "bread",
  "block_obsidian",
  "block_netherrack",
  "block_quartz_ore",
  "block_soul_sand",
  "block_gravel",
  "block_quartz",
  "block_lava",
  "flint_and_steel",
  "golden_sword",
  "quartz",
  "flint",
  "block_enchanting_table",
  "block_bookshelf",
  "block_lapis_ore",
  "item_lapis",
  "item_book",
  "block_emerald_ore",
  "item_emerald",
  "ender_pearl",
  "block_end_stone",
  "block_end_portal_frame",
  "block_purpur",
  "block_end_rod",
  "dragon_egg",
  "spider_eye",
  "blaze_rod",
  "blaze_powder",
  "eye_of_ender",
  "shield",
  "block_brewing_stand",
  "block_nether_wart",
  "block_end_stone_brick",
  "block_purpur_pillar",
  "glass_bottle",
  "potion_water",
  "potion_awkward",
  "potion_speed",
  "potion_strength",
  "potion_healing",
  "potion_poison",
  "potion_night_vision",
  "potion_fire_resistance",
  "potion_slow_falling",
  "nether_wart",
  "sugar",
  "paper",
  "firework_rocket",
  "elytra",
];

export const DEFAULT_CREATIVE_HOTBAR: ItemId[] = [
  "diamond_sword",
  "diamond_pick",
  "block_planks",
  "block_stone_bricks",
  "block_glass",
  "block_torch",
  "block_chest",
  "block_tnt",
  "bow",
];

export const DEFAULT_SURVIVAL_HOTBAR: Array<ItemId | null> = [
  "wood_sword",
  "wood_pick",
  "block_torch",
  "block_planks",
  "block_cobble",
  "apple",
  null,
  null,
  null,
];
