import { useState, useEffect } from "react";
import { ITEMS } from "@/game/blocks";
import type { MinecraftHudState } from "@/game/engine";
import { Icon } from "./Icons";

interface HudProps {
  hud: MinecraftHudState;
  muted: boolean;
  isTouch?: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onSelectSlot: (slotIndex: number) => void;
  onOpenCrafting: () => void;
  onToggleF3: () => void;
}

export function Hud({
  hud,
  muted,
  isTouch: _isTouch,
  onPause,
  onToggleMute,
  onSelectSlot,
  onOpenCrafting,
  onToggleF3,
}: HudProps) {
  const [tooltipName, setTooltipName] = useState<string>("");
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Show held item tooltip on slot change
  useEffect(() => {
    if (hud.heldName) {
      setTooltipName(hud.heldName);
      setTooltipVisible(true);
      const timer = setTimeout(() => setTooltipVisible(false), 2400);
      return () => clearTimeout(timer);
    } else {
      setTooltipVisible(false);
    }
  }, [hud.selectedSlot, hud.heldName]);

  // Hearts calculation (10 hearts = 20 HP)
  const hearts = Array.from({ length: 10 }, (_, i) => {
    const val = hud.health - i * 2;
    if (val >= 2) return "full";
    if (val === 1) return "half";
    return "empty";
  });

  // Hunger drumsticks calculation (10 drumsticks = 20 hunger)
  const drumsticks = Array.from({ length: 10 }, (_, i) => {
    const val = hud.hunger - i * 2;
    if (val >= 2) return "full";
    if (val === 1) return "half";
    return "empty";
  });

  // Oxygen bubbles calculation (10 bubbles = 20 oxygen)
  const showOxygen = hud.inWater || hud.oxygen < hud.maxOxygen;
  const bubbles = Array.from({ length: 10 }, (_, i) => {
    const val = hud.oxygen - i * 2;
    if (val >= 2) return "full";
    if (val === 1) return "half";
    return "empty";
  });

  return (
    <div className="no-select pointer-events-none absolute inset-0 z-10 font-pixel">
      {/* Hurt Vignette Flash */}
      {hud.hurtFlash && (
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-red-600/35 transition-opacity duration-150" />
      )}

      {/* Crosshair */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-4 w-4">
          <div className="absolute left-1.5 top-0 h-4 w-1 bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
          <div className="absolute left-0 top-1.5 h-1 w-4 bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]" />
          <div className="absolute left-1.5 top-1.5 h-1 w-1 bg-black/60" />
        </div>
      </div>

      {/* Top Header Controls */}
      <header className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <span className="rounded border border-black/40 bg-black/60 px-2 py-1 text-[10px] tracking-wider text-white shadow">
            {hud.gameMode.toUpperCase()}
          </span>
          {hud.debug.biome && (
            <span className="hidden rounded border border-black/40 bg-black/50 px-2 py-1 text-[9px] text-emerald-300 sm:inline">
              {hud.debug.biome}
            </span>
          )}
          {hud.debug.dayTimeTicks < 12000 ? (
            <span className="hidden rounded border border-black/40 bg-amber-500/20 px-2 py-1 text-[9px] text-amber-300 sm:inline">
              DAY
            </span>
          ) : (
            <span className="hidden rounded border border-black/40 bg-indigo-500/20 px-2 py-1 text-[9px] text-indigo-300 sm:inline">
              NIGHT
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onToggleF3}
            className={`btn-icon !h-8 !w-8 text-[11px] ${hud.isF3Open ? "border-emerald-400 text-emerald-300" : "text-white/70"}`}
            title="Toggle F3 Debug (F3)"
          >
            F3
          </button>
          <button
            type="button"
            onClick={onOpenCrafting}
            className="btn-icon !h-8 !w-8 text-[11px] text-white/80"
            title="Open Crafting / Inventory (E)"
          >
            E
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="btn-icon !h-8 !w-8 text-[15px] text-white/80"
            title={muted ? "Unmute" : "Mute"}
          >
            <Icon name={muted ? "mute" : "sound"} />
          </button>
          <button
            type="button"
            onClick={onPause}
            className="btn-icon !h-8 !w-8 text-[15px] text-white/80"
            title="Pause (Esc)"
          >
            <Icon name="pause" />
          </button>
        </div>
      </header>

      {/* F3 Debug Overlay */}
      {hud.isF3Open && (
        <div className="absolute inset-x-3 top-14 flex justify-between text-[10px] leading-relaxed tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
          <div className="space-y-0.5 rounded bg-black/65 p-2.5 backdrop-blur-sm">
            <div className="text-emerald-400">Minecraft Web 3D (Infinite Voxel Engine)</div>
            <div>FPS: {hud.debug.fps}</div>
            <div>
              XYZ: {hud.debug.x.toFixed(1)} / {hud.debug.y.toFixed(1)} / {hud.debug.z.toFixed(1)}
            </div>
            <div>
              Chunk: {hud.debug.chunkX} / {hud.debug.chunkZ}
            </div>
            <div>Facing: {hud.debug.facing}</div>
            <div>Biome: {hud.debug.biome}</div>
            <div>Day Ticks: {hud.debug.dayTimeTicks} / 24000</div>
            <div>Loaded Chunks: {hud.debug.loadedChunks}</div>
            <div>Seed: {hud.debug.seed}</div>
          </div>

          {hud.targetBlock && (
            <div className="space-y-0.5 rounded bg-black/65 p-2.5 text-right backdrop-blur-sm">
              <div className="text-amber-300">Targeted Block</div>
              <div>{hud.targetBlock.name}</div>
              <div>
                Pos: {hud.targetBlock.x}, {hud.targetBlock.y}, {hud.targetBlock.z}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Item Name Tooltip above hotbar */}
      {tooltipVisible && tooltipName && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="rounded border border-black/70 bg-black/75 px-3 py-1 text-center text-[12px] tracking-wider text-white shadow-lg">
            {tooltipName}
          </div>
        </div>
      )}

      {/* Survival Status Bars (Health Hearts on Left & Hunger Drumsticks on Right) */}
      {hud.gameMode === "survival" && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex w-[380px] max-w-[94vw] items-end justify-between px-1">
          {/* Health Hearts (Left) */}
          <div className="flex gap-1">
            {hearts.map((h, i) => (
              <span
                key={i}
                className={`relative inline-block h-4 w-4 ${hud.health <= 4 ? "animate-pulse" : ""}`}
                title={`Health: ${hud.health}/${hud.maxHealth}`}
              >
                <svg viewBox="0 0 16 16" className="h-full w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                  <path
                    d="M 8,14 L 2,8 C 0,6 0,2 4,1 C 6,1 7,3 8,4 C 9,3 10,1 12,1 C 16,2 16,6 14,8 Z"
                    fill="#2a0d0d"
                    stroke="#110505"
                    strokeWidth="1.2"
                  />
                  {h === "full" && (
                    <path
                      d="M 8,13 L 3,8 C 1.2,6.2 1.2,2.8 4,2 C 5.6,2 6.6,3.4 8,4.5 C 9.4,3.4 10.4,2 12,2 C 14.8,2.8 14.8,6.2 13,8 Z"
                      fill="#e02525"
                    />
                  )}
                  {h === "half" && (
                    <path
                      d="M 8,13 L 3,8 C 1.2,6.2 1.2,2.8 4,2 C 5.6,2 6.6,3.4 8,4.5 L 8,13 Z"
                      fill="#e02525"
                    />
                  )}
                </svg>
              </span>
            ))}
          </div>

          {/* Right Column: Oxygen Bubbles + Hunger Drumsticks */}
          <div className="flex flex-col items-end gap-1">
            {showOxygen && (
              <div className="flex gap-1">
                {bubbles.map((b, i) => (
                  <span
                    key={i}
                    className="relative inline-block h-3.5 w-3.5"
                    title={`Oxygen: ${hud.oxygen}/${hud.maxOxygen}`}
                  >
                    {b === "full" ? (
                      <svg viewBox="0 0 16 16" className="h-full w-full drop-shadow">
                        <circle cx="8" cy="8" r="7" fill="#1b85db" stroke="#00356b" strokeWidth="1.5" />
                        <circle cx="6" cy="5" r="2" fill="#75d6ff" />
                      </svg>
                    ) : b === "half" ? (
                      <svg viewBox="0 0 16 16" className="h-full w-full drop-shadow">
                        <circle cx="8" cy="8" r="4.5" fill="#1b85db" stroke="#00356b" strokeWidth="1.5" />
                        <circle cx="7" cy="6" r="1.5" fill="#75d6ff" />
                      </svg>
                    ) : (
                      <span className="block h-3.5 w-3.5" />
                    )}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-row-reverse gap-1">
              {drumsticks.map((d, i) => (
                <span
                  key={i}
                  className={`relative inline-block h-4 w-4 ${hud.hunger <= 4 ? "animate-bounce" : ""}`}
                  title={`Hunger: ${hud.hunger}/${hud.maxHunger}`}
                >
                  <svg viewBox="0 0 16 16" className="h-full w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                    <path
                      d="M12 2 C14 2 15 4 14 6 C13 7.5 11 9 9 10 L7 12 L5 11 L8 8 C9 6 10 3 12 2 Z"
                      fill="#241b12"
                      stroke="#120d08"
                      strokeWidth="1.2"
                    />
                    {d === "full" && (
                      <>
                        <path
                          d="M12 3 C13.5 3 14 4.5 13.5 5.5 C12.5 7 10.5 8.5 8.5 9.5 L7.5 8.5 C8.5 6.5 10 3.5 12 3 Z"
                          fill="#bd6e28"
                          stroke="#753d10"
                          strokeWidth="0.8"
                        />
                        <circle cx="11.5" cy="4.5" r="1.2" fill="#e89d46" />
                        <line x1="7" y1="10" x2="4" y2="13" stroke="#f0efe8" strokeWidth="2" strokeLinecap="round" />
                      </>
                    )}
                    {d === "half" && (
                      <>
                        <path
                          d="M12 3 C13.5 3 14 4.5 13.5 5.5 C12.5 7 10.5 8.5 9.5 9 C9.5 7.5 10.5 4.5 12 3 Z"
                          fill="#bd6e28"
                          stroke="#753d10"
                          strokeWidth="0.8"
                        />
                        <line x1="7" y1="10" x2="4" y2="13" stroke="#f0efe8" strokeWidth="2" strokeLinecap="round" />
                      </>
                    )}
                  </svg>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 9-Slot Hotbar */}
      <footer className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2">
        <div className="flex items-center rounded-sm border-2 border-[#1c1c1c] bg-[#8f8f8f] p-1 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_6px_16px_rgba(0,0,0,0.6)]">
          {hud.hotbar.map((slot, index) => {
            const isSelected = index === hud.selectedSlot;
            const def = slot ? ITEMS[slot.item] : null;

            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelectSlot(index)}
                className={`relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center border-2 transition-all ${
                  isSelected
                    ? "z-10 scale-105 border-white bg-[#555555] shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    : "border-[#373737] bg-[#8b8b8b] hover:bg-[#9c9c9c]"
                }`}
              >
                {/* Slot Number Label */}
                <span className="absolute left-0.5 top-0.5 text-[8px] text-white/40">
                  {index + 1}
                </span>

                {/* Item representation */}
                {slot && def ? (
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className="h-5 w-5 sm:h-6 sm:w-6 rounded-xs shadow-sm"
                      style={{
                        backgroundColor: def.color || "#888888",
                        border: "1px solid rgba(0,0,0,0.4)",
                      }}
                    />
                    {slot.count > 1 && (
                      <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                        {slot.count}
                      </span>
                    )}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
