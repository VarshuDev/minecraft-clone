import { useState } from "react";
import { type GameModeId } from "@/game/blocks";
import {
  listWorldSaves,
  type GameSettings,
  type WorldSummary,
} from "@/game/storage";

interface StartScreenProps {
  onPlay: (options: { name: string; mode: GameModeId; seed: number; loadSaveId?: string }) => void;
  settings: GameSettings;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
}

export function StartScreen({ onPlay, settings, onUpdateSettings }: StartScreenProps) {
  const [mode, setMode] = useState<GameModeId>("survival");
  const [worldName, setWorldName] = useState("New World");
  const [seedInput, setSeedInput] = useState<string>(() => String(Math.floor(Math.random() * 900000) + 100000));
  const [savedWorlds] = useState<WorldSummary[]>(() => listWorldSaves());
  const [activeTab, setActiveTab] = useState<"new" | "load">("new");

  const handleRandomSeed = () => {
    setSeedInput(String(Math.floor(Math.random() * 900000) + 100000));
  };

  const handleStartNewWorld = () => {
    const parsedSeed = parseInt(seedInput, 10);
    const finalSeed = Number.isFinite(parsedSeed) ? parsedSeed : 1337;
    onPlay({
      name: worldName.trim() || "New World",
      mode,
      seed: finalSeed,
    });
  };

  const handleResumeWorld = (summary: WorldSummary) => {
    onPlay({
      name: summary.name,
      mode: summary.gameMode,
      seed: summary.seed,
      loadSaveId: summary.id,
    });
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-gradient-to-b from-[#18233c] via-[#0e1626] to-[#070b14] p-4 font-pixel text-white">
      {/* Background dirt / stone mosaic vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.7)_100%)]" />

      <div className="relative mx-auto flex w-full max-w-xl flex-col items-center text-center">
        {/* Minecraft Logo / Title */}
        <div className="mb-6">
          <div className="text-[32px] sm:text-[44px] font-bold tracking-[0.14em] text-[#f2f2f2] drop-shadow-[0_4px_0_#373737]">
            MINECRAFT
          </div>
          <div className="inline-block rounded-xs bg-[#c68936] px-3 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-white shadow-md">
            BROWSER 3D EDITION
          </div>
        </div>

        {/* Tab Switcher: Create New World / Load Saved World */}
        <div className="mb-4 flex w-full max-w-md border-b-2 border-[#383838]">
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`flex-1 py-2 text-[11px] font-bold tracking-wider transition-colors ${
              activeTab === "new"
                ? "border-b-2 border-emerald-400 text-emerald-300"
                : "text-white/60 hover:text-white"
            }`}
          >
            CREATE WORLD
          </button>
          {savedWorlds.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("load")}
              className={`flex-1 py-2 text-[11px] font-bold tracking-wider transition-colors ${
                activeTab === "load"
                  ? "border-b-2 border-emerald-400 text-emerald-300"
                  : "text-white/60 hover:text-white"
              }`}
            >
              SAVED WORLDS ({savedWorlds.length})
            </button>
          )}
        </div>

        {activeTab === "new" ? (
          /* Create New World Form */
          <div className="w-full max-w-md space-y-4 rounded-sm border-2 border-[#2b2b2b] bg-[#1a1a1a]/85 p-5 text-left shadow-2xl backdrop-blur-sm">
            {/* World Name */}
            <div>
              <label className="mb-1 block text-[9px] tracking-wider text-white/70">
                WORLD NAME:
              </label>
              <input
                type="text"
                value={worldName}
                maxLength={24}
                onChange={(e) => setWorldName(e.target.value)}
                className="w-full rounded-xs border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] text-white focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {/* Game Mode */}
            <div>
              <label className="mb-1 block text-[9px] tracking-wider text-white/70">
                GAME MODE:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("survival")}
                  className={`flex flex-col items-start rounded-xs border p-2.5 transition-all ${
                    mode === "survival"
                      ? "border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-sm"
                      : "border-white/10 bg-black/40 text-white/60 hover:bg-black/60"
                  }`}
                >
                  <span className="text-[10px] font-bold">SURVIVAL</span>
                  <span className="text-[8px] text-white/60 mt-0.5 leading-snug">
                    Health, tools, crafting, underwater drowning & caves
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("creative")}
                  className={`flex flex-col items-start rounded-xs border p-2.5 transition-all ${
                    mode === "creative"
                      ? "border-amber-500 bg-amber-950/40 text-amber-300 shadow-sm"
                      : "border-white/10 bg-black/40 text-white/60 hover:bg-black/60"
                  }`}
                >
                  <span className="text-[10px] font-bold">CREATIVE</span>
                  <span className="text-[8px] text-white/60 mt-0.5 leading-snug">
                    Flight, instant mining, infinite catalog & invincible
                  </span>
                </button>
              </div>
            </div>

            {/* World Seed */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[9px] tracking-wider text-white/70">
                  SEED FOR WORLD GENERATOR:
                </label>
                <button
                  type="button"
                  onClick={handleRandomSeed}
                  className="text-[8px] text-emerald-400 hover:underline"
                >
                  Random Seed
                </button>
              </div>
              <input
                type="text"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Leave blank for random"
                className="w-full rounded-xs border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] text-white focus:border-emerald-400 focus:outline-none"
              />
            </div>

            {/* Settings Quick Bar (Render Distance, Shadows, Sound) */}
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[9px] text-white/80">
              <div className="flex items-center gap-1.5">
                <span>CHUNKS:</span>
                {[2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onUpdateSettings({ renderDistance: d })}
                    className={`rounded-xs px-1.5 py-0.5 ${
                      settings.renderDistance === d ? "bg-emerald-600 text-white" : "bg-black/40 text-white/60"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.shadows}
                    onChange={(e) => onUpdateSettings({ shadows: e.target.checked })}
                    className="accent-emerald-500"
                  />
                  <span>SHADOWS</span>
                </label>

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!settings.muted}
                    onChange={(e) => onUpdateSettings({ muted: !e.target.checked })}
                    className="accent-emerald-500"
                  />
                  <span>AUDIO</span>
                </label>
              </div>
            </div>

            {/* Big Launch Button */}
            <button
              type="button"
              onClick={handleStartNewWorld}
              className="w-full rounded-xs border-2 border-emerald-400 bg-emerald-600 py-3 text-[13px] font-bold tracking-[0.16em] text-white shadow-[0_4px_0_#1b5e20] hover:bg-emerald-500 active:translate-y-0.5 active:shadow-[0_2px_0_#1b5e20]"
            >
              PLAY WORLD
            </button>
          </div>
        ) : (
          /* Saved Worlds Tab */
          <div className="w-full max-w-md space-y-2 rounded-sm border-2 border-[#2b2b2b] bg-[#1a1a1a]/85 p-5 text-left shadow-2xl backdrop-blur-sm">
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {savedWorlds.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-xs border border-white/10 bg-black/40 p-3 hover:border-emerald-500/50"
                >
                  <div>
                    <div className="text-[11px] font-bold text-white">{w.name}</div>
                    <div className="text-[8px] text-white/60">
                      {w.gameMode.toUpperCase()} · Seed: {w.seed}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResumeWorld(w)}
                    className="rounded-xs border border-emerald-500 bg-emerald-600 px-3 py-1.5 text-[9px] font-bold text-white hover:bg-emerald-500"
                  >
                    PLAY
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls Guide Footnote */}
        <div className="mt-5 max-w-md text-center text-[8px] leading-relaxed text-white/50">
          <span className="text-white/80">CONTROLS:</span> WASD Move · Mouse Look · Left Click Mine · Right Click Place/Interact · 1-9 Hotbar · E Inventory/Craft · F3 Debug · Esc Pause
        </div>
      </div>
    </div>
  );
}
