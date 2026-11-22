import React, { useState, useMemo } from "react";
import {
  ITEMS,
  type ItemId,
  type EnchantmentId,
  type EnchantmentOffer,
} from "@/game/blocks";

interface EnchantingModalProps {
  isOpen: boolean;
  bookshelfCount: number;
  playerLevel: number;
  hotbar: Array<{ item: ItemId; count: number; enchantments?: Record<string, number> } | null>;
  inventory: Record<string, number>;
  onClose: () => void;
  onEnchant: (
    slotIndex: number,
    enchantmentId: EnchantmentId,
    level: number,
    xpLevelCost: number,
    lapisCost: number,
  ) => boolean;
}

// Standard Galactic Alphabet style runic text strings
const RUNIC_PHRASES = [
  "ᔑ ʖ ᓵ ↸ ᒷ ⎓ ⊣ ⍑ ╎ ⋮",
  "ᒲ ᔑ ⊣ ╎ ᓵ  ᓭ ᡂ ᒷ ꖎ ꖎ",
  "ᒷ ꖎ ╎ ℸ ᒷ  !¡ 𝙹 ∴ ᒷ ∷",
  "ᓵ ⍑ ᔑ 𝙹 ᓭ  ᒷ ᒲ ʖ ∷ ᔑ ᓵ ᒷ",
  "ᓭ ⍑ ᔑ ∷ !¡ ᒷ ∷  ʖ ꖎ ᔑ ↸ ᒷ",
  "⎓ 𝙹 ∷ ℸ ⚍  Montreal",
  "ᒷ ℸ ᒷ ∷ リ ᔑ ꖎ  ⎓ ꖎ ᔑ ᒲ ᒷ",
  "⚍ リ ʖ ∷ ᒷ ᔑ ꖌ ᔑ ʖ ꖎ ᒷ",
];

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V"];

export const EnchantingModal: React.FC<EnchantingModalProps> = ({
  isOpen,
  bookshelfCount,
  playerLevel,
  hotbar,
  inventory,
  onClose,
  onEnchant,
}) => {
  const [selectedHotbarSlot, setSelectedHotbarSlot] = useState<number | null>(null);

  // Auto-select first enchantable item in hotbar if none selected
  React.useEffect(() => {
    if (selectedHotbarSlot === null) {
      const idx = hotbar.findIndex((slot) => {
        if (!slot) return false;
        const def = ITEMS[slot.item];
        return def?.category === "tool" || def?.category === "weapon" || def?.category === "armor";
      });
      if (idx !== -1) setSelectedHotbarSlot(idx);
    }
  }, [hotbar, selectedHotbarSlot]);

  // Count total Lapis Lazuli in inventory + hotbar
  const totalLapis = useMemo(() => {
    let count = inventory["item_lapis"] || 0;
    hotbar.forEach((slot) => {
      if (slot && slot.item === "item_lapis") count += slot.count;
    });
    return count;
  }, [inventory, hotbar]);

  // Selected item details
  const targetSlot = selectedHotbarSlot !== null ? hotbar[selectedHotbarSlot] : null;
  const targetDef = targetSlot ? ITEMS[targetSlot.item] : null;

  // Generate 3 enchantment offers based on item category and bookshelf power
  const offers: EnchantmentOffer[] = useMemo(() => {
    if (!targetSlot || !targetDef) return [];

    const isSword = targetDef.tool?.kind === "sword" || targetDef.category === "weapon";
    const isPickaxe = targetDef.tool?.kind === "pickaxe";
    const isArmor = targetDef.category === "armor";

    // Power scaling: 0 bookshelves -> level 1..8, 15 bookshelves -> level 1..30
    const bCap = Math.min(15, bookshelfCount);
    const topReq = Math.max(1, Math.min(8, Math.floor(bCap / 3) + 1));
    const midReq = Math.max(8, Math.min(18, Math.floor(bCap * 0.8) + 7));
    const botReq = Math.max(14, Math.min(30, Math.floor(bCap * 1.5) + 10));

    const result: EnchantmentOffer[] = [];

    // Offer 1 (Tier 1: 1 Lapis, 1 XP level cost)
    if (isSword) {
      result.push({
        id: "sharpness",
        name: "Sharpness I",
        level: 1,
        costXp: 1,
        minPlayerLevel: topReq,
        lapisCost: 1,
        runeName: RUNIC_PHRASES[0],
        description: "+1.25 Attack Damage",
      });
    } else if (isArmor) {
      result.push({
        id: "protection",
        name: "Protection I",
        level: 1,
        costXp: 1,
        minPlayerLevel: topReq,
        lapisCost: 1,
        runeName: RUNIC_PHRASES[1],
        description: "+4% All Damage Reduction",
      });
    } else {
      result.push({
        id: "efficiency",
        name: "Efficiency I",
        level: 1,
        costXp: 1,
        minPlayerLevel: topReq,
        lapisCost: 1,
        runeName: RUNIC_PHRASES[2],
        description: "+35% Mining Speed",
      });
    }

    // Offer 2 (Tier 2: 2 Lapis, 2 XP levels cost)
    if (isSword) {
      const chooseFire = bCap >= 5;
      result.push({
        id: chooseFire ? "fire_aspect" : "sharpness",
        name: chooseFire ? "Fire Aspect I" : "Sharpness II",
        level: chooseFire ? 1 : 2,
        costXp: 2,
        minPlayerLevel: midReq,
        lapisCost: 2,
        runeName: RUNIC_PHRASES[3],
        description: chooseFire ? "Sets enemies ablaze upon hit" : "+2.5 Attack Damage",
      });
    } else if (isArmor) {
      result.push({
        id: "protection",
        name: "Protection II",
        level: 2,
        costXp: 2,
        minPlayerLevel: midReq,
        lapisCost: 2,
        runeName: RUNIC_PHRASES[4],
        description: "+8% All Damage Reduction",
      });
    } else if (isPickaxe && bCap >= 6) {
      result.push({
        id: "fortune",
        name: "Fortune I",
        level: 1,
        costXp: 2,
        minPlayerLevel: midReq,
        lapisCost: 2,
        runeName: RUNIC_PHRASES[5],
        description: "Chance of 2x ore drop yields",
      });
    } else {
      result.push({
        id: "efficiency",
        name: "Efficiency II",
        level: 2,
        costXp: 2,
        minPlayerLevel: midReq,
        lapisCost: 2,
        runeName: RUNIC_PHRASES[2],
        description: "+70% Mining Speed",
      });
    }

    // Offer 3 (Tier 3: 3 Lapis, 3 XP levels cost, High Level Requirement)
    if (isSword) {
      const eliteFire = bCap >= 10;
      result.push({
        id: eliteFire ? "fire_aspect" : "sharpness",
        name: eliteFire ? "Fire Aspect II" : bCap >= 8 ? "Sharpness IV" : "Sharpness III",
        level: eliteFire ? 2 : bCap >= 8 ? 4 : 3,
        costXp: 3,
        minPlayerLevel: botReq,
        lapisCost: 3,
        runeName: RUNIC_PHRASES[6],
        description: eliteFire ? "Incinerates hit mobs with high burn damage" : "+3.75 - +5.0 Attack Damage",
      });
    } else if (isArmor) {
      result.push({
        id: "protection",
        name: bCap >= 12 ? "Protection IV" : "Protection III",
        level: bCap >= 12 ? 4 : 3,
        costXp: 3,
        minPlayerLevel: botReq,
        lapisCost: 3,
        runeName: RUNIC_PHRASES[7],
        description: "+12% - +16% All Damage Reduction",
      });
    } else if (isPickaxe && bCap >= 8) {
      result.push({
        id: "fortune",
        name: bCap >= 12 ? "Fortune III" : "Fortune II",
        level: bCap >= 12 ? 3 : 2,
        costXp: 3,
        minPlayerLevel: botReq,
        lapisCost: 3,
        runeName: RUNIC_PHRASES[5],
        description: "High chance of 2x - 3x mineral ore drops",
      });
    } else {
      result.push({
        id: "efficiency",
        name: bCap >= 10 ? "Efficiency IV" : "Efficiency III",
        level: bCap >= 10 ? 4 : 3,
        costXp: 3,
        minPlayerLevel: botReq,
        lapisCost: 3,
        runeName: RUNIC_PHRASES[2],
        description: "+105% - +140% Turbo Mining Speed",
      });
    }

    return result;
  }, [targetSlot, targetDef, bookshelfCount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 font-pixel backdrop-blur-xs">
      <div className="relative w-full max-w-[560px] rounded-xs border-4 border-[#1e1429] bg-[#2d1b38] p-4 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#4a275e] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h2 className="text-base font-bold tracking-wider text-[#ffd700] drop-shadow-md">
              ENCHANTING TABLE
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-xs border border-white/30 bg-red-900/80 text-sm font-bold text-white hover:bg-red-700"
          >
            ✕
          </button>
        </div>

        {/* Bookshelf & Status Info */}
        <div className="mt-2.5 flex items-center justify-between rounded-xs border border-[#4a275e] bg-[#1d1124] px-3 py-1.5 text-[11px]">
          <div className="flex items-center gap-2 text-[#b3ff30]">
            <span>📚 Bookshelf Power:</span>
            <span className="font-bold text-white">{bookshelfCount} / 15</span>
            <span className="text-white/50">
              (Max Level: {Math.max(8, Math.min(30, Math.floor(bookshelfCount * 1.5) + 10))})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#40c4ff]">
              <span>🔵 Lapis:</span>
              <span className="font-bold text-white">{totalLapis}</span>
            </span>
            <span className="flex items-center gap-1 text-[#80ff20]">
              <span>⭐ Level:</span>
              <span className="font-bold text-white">{playerLevel}</span>
            </span>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-5">
          {/* Left Column: Target Item & Lapis Lazuli Slots (2 cols) */}
          <div className="sm:col-span-2 flex flex-col items-center justify-center rounded-xs border-2 border-[#4a275e] bg-[#22132b] p-3">
            <div className="flex items-center gap-3">
              {/* Item Slot */}
              <div className="flex flex-col items-center">
                <span className="mb-1 text-[9px] text-white/60">ITEM</span>
                <div className="flex h-14 w-14 items-center justify-center rounded-xs border-2 border-[#693185] bg-[#140b1a] shadow-inner">
                  {targetSlot && targetDef ? (
                    <div className="relative flex flex-col items-center">
                      <div
                        className="h-8 w-8 rounded-xs shadow-md"
                        style={{
                          backgroundColor: targetDef.color || "#888888",
                          border: "1px solid rgba(0,0,0,0.5)",
                        }}
                      />
                      {targetSlot.enchantments && Object.keys(targetSlot.enchantments).length > 0 && (
                        <div className="absolute inset-0 animate-pulse rounded-xs bg-gradient-to-tr from-purple-600/70 via-fuchsia-400/50 to-cyan-400/40" />
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-white/30 text-center px-1">Insert Tool</span>
                  )}
                </div>
              </div>

              <span className="text-lg text-white/40">+</span>

              {/* Lapis Slot */}
              <div className="flex flex-col items-center">
                <span className="mb-1 text-[9px] text-[#40c4ff]">LAPIS</span>
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xs border-2 border-[#1f4fc9] bg-[#0c1836] shadow-inner">
                  <div className="h-6 w-6 rounded-xs bg-[#1f4fc9] shadow-sm flex items-center justify-center text-[10px] text-white font-bold">
                    💎
                  </div>
                  <span className="mt-0.5 text-[9px] font-bold text-[#80d8ff]">{totalLapis}</span>
                </div>
              </div>
            </div>

            {/* Target Item Name & Lore */}
            {targetDef && (
              <div className="mt-3 w-full text-center">
                <div className="text-xs font-bold text-white">{targetDef.name}</div>
                {targetSlot?.enchantments && Object.keys(targetSlot.enchantments).length > 0 ? (
                  <div className="mt-1 flex flex-wrap justify-center gap-1">
                    {Object.entries(targetSlot.enchantments).map(([id, lvl]) => (
                      <span
                        key={id}
                        className="rounded bg-purple-900/60 px-1.5 py-0.5 text-[9px] font-semibold text-[#b388ff]"
                      >
                        {id.replace("_", " ").toUpperCase()} {ROMAN_NUMERALS[lvl - 1] || lvl}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-white/40">Ready to enchant</span>
                )}
              </div>
            )}
          </div>

          {/* Right Column: 3 Enchantment Options (3 cols) */}
          <div className="sm:col-span-3 flex flex-col gap-2">
            {offers.length > 0 ? (
              offers.map((offer, idx) => {
                const canAffordLevel = playerLevel >= offer.minPlayerLevel;
                const canAffordLapis = totalLapis >= offer.lapisCost;
                const canEnchant = canAffordLevel && canAffordLapis;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!canEnchant || selectedHotbarSlot === null}
                    onClick={() => {
                      if (selectedHotbarSlot !== null) {
                        onEnchant(
                          selectedHotbarSlot,
                          offer.id,
                          offer.level,
                          offer.costXp,
                          offer.lapisCost,
                        );
                      }
                    }}
                    className={`group relative flex items-center justify-between rounded-xs border-2 px-3 py-2 text-left transition-all ${
                      canEnchant
                        ? "border-[#693185] bg-[#3a1d47] hover:border-[#ffd700] hover:bg-[#522566] cursor-pointer shadow-md"
                        : "border-[#301c38] bg-[#1d1222] opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {/* Left: Runic Text & Preview */}
                    <div className="flex flex-col">
                      <span className="text-[10px] tracking-widest text-[#a874b8] group-hover:text-[#e0b0f0]">
                        {offer.runeName}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-[#ffd700]">
                          {offer.name}
                        </span>
                        <span className="text-[10px] text-[#40c4ff]">
                          (Cost: {offer.lapisCost} Lapis, {offer.costXp} LVL)
                        </span>
                      </div>
                      <span className="text-[9px] text-white/60">{offer.description}</span>
                    </div>

                    {/* Right: Required Level Badge */}
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-xs border font-bold text-sm ${
                        canAffordLevel
                          ? "border-[#80ff20] bg-black/60 text-[#80ff20] shadow-[0_0_6px_rgba(128,255,32,0.4)]"
                          : "border-red-500/50 bg-black/60 text-red-400"
                      }`}
                    >
                      {offer.minPlayerLevel}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center rounded-xs border-2 border-dashed border-[#4a275e] p-6 text-center text-xs text-white/50">
                Click a tool, sword, or armor piece from your hotbar below to view enchantments!
              </div>
            )}
          </div>
        </div>

        {/* Hotbar Selection Grid */}
        <div className="mt-4 border-t-2 border-[#4a275e] pt-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/70">
            <span>CHOOSE AN ITEM FROM YOUR HOTBAR TO ENCHANT:</span>
          </div>

          <div className="grid grid-cols-9 gap-1.5 rounded-xs border border-[#4a275e] bg-[#1d1124] p-2">
            {hotbar.map((slot, idx) => {
              const def = slot ? ITEMS[slot.item] : null;
              const isEnchantable =
                def && (def.category === "tool" || def.category === "weapon" || def.category === "armor");
              const isSelected = idx === selectedHotbarSlot;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!slot}
                  onClick={() => setSelectedHotbarSlot(idx)}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-xs border-2 transition-all ${
                    isSelected
                      ? "border-[#ffd700] bg-[#4a275e] scale-105 z-10 shadow-[0_0_8px_rgba(255,215,0,0.6)]"
                      : isEnchantable
                        ? "border-[#693185] bg-[#2d1936] hover:bg-[#3d2249]"
                        : "border-white/10 bg-black/30 opacity-40 cursor-default"
                  }`}
                >
                  <span className="absolute left-0.5 top-0.5 text-[7px] text-white/40">
                    {idx + 1}
                  </span>
                  {slot && def && (
                    <div className="relative flex flex-col items-center">
                      <div
                        className="h-5 w-5 rounded-xs shadow-sm"
                        style={{ backgroundColor: def.color || "#888" }}
                      />
                      {slot.enchantments && Object.keys(slot.enchantments).length > 0 && (
                        <div className="absolute inset-0 animate-pulse rounded-xs bg-gradient-to-tr from-purple-600/70 via-fuchsia-400/50 to-cyan-400/40" />
                      )}
                      {slot.count > 1 && (
                        <span className="absolute -bottom-1 -right-1 text-[8px] font-bold text-white drop-shadow">
                          {slot.count}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
