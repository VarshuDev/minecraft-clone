import type { GameModeId, ItemId } from "./blocks";
import { DEFAULT_CREATIVE_HOTBAR, DEFAULT_SURVIVAL_HOTBAR } from "./blocks";

export interface GameSettings {
  muted: boolean;
  shadows: boolean;
  renderDistance: number;
  fov: number;
}

export interface PlayerSave {
  pos: [number, number, number];
  yaw: number;
  pitch: number;
  health: number; // 0 - 20
  hunger?: number; // 0 - 20
  oxygen: number; // 0 - 20
  hotbar: Array<{ item: ItemId; count: number } | null>;
  inventory: Record<string, number>;
  armor?: {
    head: ItemId | null;
    chest: ItemId | null;
    legs: ItemId | null;
    feet: ItemId | null;
  };
  xp?: number;
  level?: number;
  selectedSlot: number;
  flying: boolean;
  spawnPos?: [number, number, number];
}

export interface FurnaceData {
  input: { item: ItemId; count: number } | null;
  fuel: { item: ItemId; count: number } | null;
  output: { item: ItemId; count: number } | null;
  burnTime: number;
  maxBurnTime: number;
  cookProgress: number;
}

export interface WorldSave {
  id: string;
  name: string;
  seed: number;
  gameMode: GameModeId;
  dayTime: number; // 0..24000 (Minecraft day ticks)
  weather?: "clear" | "rain" | "thunder";
  player: PlayerSave;
  edits: Record<string, number>;
  chests?: Record<string, Array<{ item: ItemId; count: number } | null>>;
  furnaces?: Record<string, FurnaceData>;
  createdAt: number;
  updatedAt: number;
}

const SETTINGS_KEY = "minecraft_web_settings_v1";
const ACTIVE_WORLD_KEY = "minecraft_web_active_world_v1";
const WORLDS_INDEX_KEY = "minecraft_web_worlds_v1";
const WORLD_PREFIX = "minecraft_web_world_";

const DEFAULT_SETTINGS: GameSettings = {
  muted: false,
  shadows: true,
  renderDistance: 3,
  fov: 75,
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULT_SETTINGS.muted,
      shadows: typeof parsed.shadows === "boolean" ? parsed.shadows : DEFAULT_SETTINGS.shadows,
      renderDistance: typeof parsed.renderDistance === "number" ? Math.max(2, Math.min(5, parsed.renderDistance)) : 3,
      fov: typeof parsed.fov === "number" ? Math.max(60, Math.min(100, parsed.fov)) : 75,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Partial<GameSettings>): GameSettings {
  const current = loadSettings();
  const next = { ...current, ...settings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* storage quota or disabled */
  }
  return next;
}

export function loadMuted(): boolean {
  return loadSettings().muted;
}

export function saveMuted(muted: boolean) {
  saveSettings({ muted });
}

export function loadShadows(): boolean {
  return loadSettings().shadows;
}

export function saveShadows(shadows: boolean) {
  saveSettings({ shadows });
}

export function loadRenderDistance(): number {
  return loadSettings().renderDistance;
}

export function saveRenderDistance(renderDistance: number) {
  saveSettings({ renderDistance });
}

export function createDefaultWorldSave(
  name = "New World",
  gameMode: GameModeId = "survival",
  seed?: number,
): WorldSave {
  const chosenSeed = typeof seed === "number" && Number.isFinite(seed) ? seed : Math.floor(Math.random() * 1000000) + 1;
  const id = `world_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const hotbar: Array<{ item: ItemId; count: number } | null> =
    gameMode === "creative"
      ? DEFAULT_CREATIVE_HOTBAR.map((item) => ({ item, count: 64 }))
      : DEFAULT_SURVIVAL_HOTBAR.map((item) => (item ? { item, count: item === "wood_pick" ? 1 : 16 } : null));

  return {
    id,
    name,
    seed: chosenSeed,
    gameMode,
    dayTime: 6000, // noon
    player: {
      pos: [0.5, 34, 0.5],
      yaw: 0,
      pitch: 0,
      health: 20,
      hunger: 20,
      oxygen: 20,
      hotbar,
      inventory:
        gameMode === "creative"
          ? {}
          : {
              block_log: 8,
              block_dirt: 16,
            },
      armor: {
        head: null,
        chest: null,
        legs: null,
        feet: null,
      },
      xp: 0,
      level: 0,
      selectedSlot: 0,
      flying: false,
    },
    weather: "clear",
    edits: {},
    chests: {},
    furnaces: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export interface WorldSummary {
  id: string;
  name: string;
  seed: number;
  gameMode: GameModeId;
  updatedAt: number;
}

export function listWorldSaves(): WorldSummary[] {
  try {
    const raw = localStorage.getItem(WORLDS_INDEX_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as WorldSummary[];
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function loadWorldSave(id?: string): WorldSave | null {
  try {
    let targetId = id;
    if (!targetId) {
      targetId = localStorage.getItem(ACTIVE_WORLD_KEY) || undefined;
    }
    if (!targetId) {
      const list = listWorldSaves();
      if (list.length > 0) targetId = list[0].id;
    }
    if (!targetId) return null;

    const raw = localStorage.getItem(WORLD_PREFIX + targetId);
    if (!raw) return null;
    return JSON.parse(raw) as WorldSave;
  } catch {
    return null;
  }
}

export function saveWorldSave(save: WorldSave) {
  try {
    save.updatedAt = Date.now();
    localStorage.setItem(WORLD_PREFIX + save.id, JSON.stringify(save));
    localStorage.setItem(ACTIVE_WORLD_KEY, save.id);

    const summaries = listWorldSaves().filter((w) => w.id !== save.id);
    summaries.unshift({
      id: save.id,
      name: save.name,
      seed: save.seed,
      gameMode: save.gameMode,
      updatedAt: save.updatedAt,
    });
    localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(summaries.slice(0, 10)));
  } catch {
    /* storage full */
  }
}

export function deleteWorldSave(id: string) {
  try {
    localStorage.removeItem(WORLD_PREFIX + id);
    const active = localStorage.getItem(ACTIVE_WORLD_KEY);
    if (active === id) localStorage.removeItem(ACTIVE_WORLD_KEY);
    const summaries = listWorldSaves().filter((w) => w.id !== id);
    localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(summaries));
  } catch {
    /* ignore */
  }
}

export function getOrCreateActiveWorld(): WorldSave {
  const existing = loadWorldSave();
  if (existing) return existing;
  const initial = createDefaultWorldSave("Survival World", "survival", 1337);
  saveWorldSave(initial);
  return initial;
}

// Formatting helpers
export function formatScore(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

export function formatTime(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

// Legacy compat
export interface HighScore {
  id: string;
  name: string;
  score: number;
  blocks: number;
  combo: number;
  crystals: number;
  date: number;
  mode?: string;
}
export function loadScores(): HighScore[] {
  return [];
}
