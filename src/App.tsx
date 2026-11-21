import { useCallback, useEffect, useRef, useState } from "react";
import {
  GameEngine,
  type MinecraftHudState,
} from "@/game/engine";
import {
  createDefaultWorldSave,
  loadSettings,
  loadWorldSave,
  saveSettings,
  saveWorldSave,
  type GameSettings,
  type WorldSave,
} from "@/game/storage";
import { type GameModeId, type ItemId } from "@/game/blocks";
import { StartScreen } from "@/components/StartScreen";
import { Hud } from "@/components/Hud";
import { CraftingModal } from "@/components/CraftingModal";
import { DeathScreen, PauseScreen } from "@/components/Overlays";
import { TouchControls } from "@/components/TouchControls";

type Screen = "menu" | "playing" | "paused" | "dead";

const INITIAL_HUD: MinecraftHudState = {
  health: 20,
  maxHealth: 20,
  hunger: 20,
  maxHunger: 20,
  oxygen: 20,
  maxOxygen: 20,
  inWater: false,
  gameMode: "survival",
  hotbar: Array(9).fill(null),
  selectedSlot: 0,
  heldItem: null,
  heldDef: null,
  heldName: "",
  inventory: {},
  debug: {
    fps: 60,
    x: 0,
    y: 34,
    z: 0,
    chunkX: 0,
    chunkZ: 0,
    biome: "Plains",
    facing: "South (+Z)",
    loadedChunks: 0,
    dayTimeTicks: 6000,
    lightLevel: 15,
    seed: 1337,
  },
  isF3Open: false,
  targetBlock: null,
  crosshairActive: false,
  hurtFlash: false,
};

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameEngine | null>(null);

  const [screen, setScreen] = useState<Screen>("menu");
  const [hud, setHud] = useState<MinecraftHudState>(INITIAL_HUD);
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [toast, setToast] = useState<string | null>(null);

  // Crafting Modal state
  const [isCraftingOpen, setIsCraftingOpen] = useState(false);
  const [isWorkstation, setIsWorkstation] = useState(false);

  const [isTouch] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    const next = saveSettings(partial);
    setSettings(next);

    if (gameRef.current) {
      if (typeof partial.muted === "boolean") gameRef.current.setMuted(partial.muted);
      if (typeof partial.shadows === "boolean") gameRef.current.setShadows(partial.shadows);
      if (typeof partial.renderDistance === "number") gameRef.current.setRenderDistance(partial.renderDistance);
    }
  }, []);

  // Launch or resume world
  const startGame = useCallback(
    (options: { name: string; mode: GameModeId; seed: number; loadSaveId?: string }) => {
      let save: WorldSave;
      if (options.loadSaveId) {
        save = loadWorldSave(options.loadSaveId) || createDefaultWorldSave(options.name, options.mode, options.seed);
      } else {
        save = createDefaultWorldSave(options.name, options.mode, options.seed);
        saveWorldSave(save);
      }

      setScreen("playing");
      setIsCraftingOpen(false);

      // Clean up previous engine
      if (gameRef.current) {
        gameRef.current.dispose();
        gameRef.current = null;
      }

      // Initialize GameEngine in DOM container
      setTimeout(() => {
        if (!hostRef.current) return;
        const engine = new GameEngine(hostRef.current, save, {
          onHud: (nextHud) => setHud(nextHud),
          onOpenCrafting: (workstation) => {
            setIsWorkstation(workstation);
            setIsCraftingOpen(true);
          },
          onOpenChest: () => {
            setIsWorkstation(true);
            setIsCraftingOpen(true);
          },
          onOpenFurnace: () => {
            setIsWorkstation(true);
            setIsCraftingOpen(true);
          },
          onNotification: (msg) => {
            setToast(msg);
            setTimeout(() => setToast(null), 3600);
          },
          onDeath: () => {
            setScreen("dead");
          },
          onPauseRequest: () => {
            setScreen((prev) => (prev === "playing" ? "paused" : prev));
          },
        });
        gameRef.current = engine;
      }, 50);
    },
    [],
  );

  // Handle Pause
  const handlePause = useCallback(() => {
    if (screen === "playing") {
      gameRef.current?.setPaused(true);
      setScreen("paused");
    }
  }, [screen]);

  // Handle Resume
  const handleResume = useCallback(() => {
    if (screen === "paused") {
      gameRef.current?.setPaused(false);
      setScreen("playing");
      try {
        const p = hostRef.current?.requestPointerLock() as unknown as Promise<void> | undefined;
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {
        /* ignore */
      }
    }
  }, [screen]);

  // Save and Quit to Title
  const handleSaveAndQuit = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.saveCurrentWorld();
      gameRef.current.dispose();
      gameRef.current = null;
    }
    setIsCraftingOpen(false);
    setScreen("menu");
  }, []);

  // Respawn after death
  const handleRespawn = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.respawn();
      setScreen("playing");
    }
  }, []);

  // Crafting handlers
  const handleCraft = useCallback((recipeId: string) => {
    gameRef.current?.craftRecipe(recipeId);
  }, []);

  const handleAddCreativeItem = useCallback((itemId: ItemId) => {
    gameRef.current?.addItem(itemId, 64);
  }, []);

  const handleCloseCrafting = useCallback(() => {
    setIsCraftingOpen(false);
    if (screen === "playing") {
      try {
        const p = hostRef.current?.requestPointerLock() as unknown as Promise<void> | undefined;
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {
        /* ignore */
      }
    }
  }, [screen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameRef.current) {
        gameRef.current.dispose();
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="pointer-events-none fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="rounded border-2 border-black/80 bg-black/85 px-4 py-2 font-pixel text-[12px] tracking-wider text-amber-300 shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
            {toast}
          </div>
        </div>
      )}

      {/* 3D WebGL Canvas Host Container */}
      <div
        ref={hostRef}
        className="absolute inset-0 z-0 cursor-crosshair focus:outline-none"
        tabIndex={0}
      />

      {/* Title / Start Screen */}
      {screen === "menu" && (
        <StartScreen
          onPlay={startGame}
          settings={settings}
          onUpdateSettings={updateSettings}
        />
      )}

      {/* In-Game HUD */}
      {screen === "playing" && (
        <>
          <Hud
            hud={hud}
            muted={settings.muted}
            isTouch={isTouch}
            onPause={handlePause}
            onToggleMute={() => updateSettings({ muted: !settings.muted })}
            onSelectSlot={(slot) => gameRef.current?.selectSlot(slot)}
            onOpenCrafting={() => {
              setIsWorkstation(false);
              setIsCraftingOpen(true);
            }}
            onToggleF3={() => {
              if (gameRef.current) {
                gameRef.current.isF3Open = !gameRef.current.isF3Open;
              }
            }}
          />

          {/* Touch Controls (Mobile / Tablet) */}
          {isTouch && (
            <TouchControls
              onMove={(x, forward) => {
                if (!gameRef.current) return;
                gameRef.current.keys["KeyA"] = x < -0.3;
                gameRef.current.keys["KeyD"] = x > 0.3;
                gameRef.current.keys["KeyW"] = forward > 0.3;
                gameRef.current.keys["KeyS"] = forward < -0.3;
              }}
              onMine={(active) => {
                if (gameRef.current) gameRef.current.isMining = active;
              }}
              onPlace={() => {
                // Trigger right click
                if (gameRef.current) (gameRef.current as any).handleRightClick();
              }}
              onJump={() => {
                if (gameRef.current) {
                  gameRef.current.keys["Space"] = true;
                  setTimeout(() => {
                    if (gameRef.current) gameRef.current.keys["Space"] = false;
                  }, 200);
                }
              }}
              minePulse={0}
            />
          )}
        </>
      )}

      {/* Crafting & Inventory Modal */}
      <CraftingModal
        isOpen={isCraftingOpen}
        isWorkstation={isWorkstation}
        gameMode={hud.gameMode}
        inventory={hud.inventory}
        hotbar={hud.hotbar}
        onClose={handleCloseCrafting}
        onCraft={handleCraft}
        onAddCreativeItem={handleAddCreativeItem}
      />

      {/* Pause Screen */}
      {screen === "paused" && (
        <PauseScreen
          settings={settings}
          onUpdateSettings={updateSettings}
          onResume={handleResume}
          onSaveAndQuit={handleSaveAndQuit}
        />
      )}

      {/* Death Screen */}
      {screen === "dead" && (
        <DeathScreen
          onRespawn={handleRespawn}
          onTitle={handleSaveAndQuit}
        />
      )}
    </div>
  );
}
