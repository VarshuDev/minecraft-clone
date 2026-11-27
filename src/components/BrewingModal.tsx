import { useState, useEffect } from "react";
import { ITEMS, type ItemId } from "@/game/blocks";
import type { BrewingStandData } from "@/game/storage";

interface BrewingModalProps {
  isOpen: boolean;
  brewingPosKey: string;
  brewingData: BrewingStandData;
  inventory: Record<string, number>;
  hotbar: Array<{ item: ItemId; count: number } | null>;
  onClose: () => void;
  onUpdateBrewing: (posKey: string, data: BrewingStandData) => void;
  onUpdatePlayerInventory: (
    inventory: Record<string, number>,
    hotbar: Array<{ item: ItemId; count: number } | null>,
  ) => void;
}

export function BrewingModal({
  isOpen,
  brewingPosKey,
  brewingData,
  inventory,
  hotbar,
  onClose,
  onUpdateBrewing,
  onUpdatePlayerInventory,
}: BrewingModalProps) {
  const [data, setData] = useState<BrewingStandData>(brewingData);

  useEffect(() => {
    setData(brewingData);
  }, [brewingData, brewingPosKey]);

  // Live polling for brewing animation
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      if (typeof window !== "undefined" && (window as any).__game) {
        const live = (window as any).__game.getBrewingData(brewingPosKey);
        if (live) setData({ ...live });
      }
    }, 150);
    return () => clearInterval(timer);
  }, [isOpen, brewingPosKey]);

  // Keydown close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyE" || e.code === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBottleClick = (index: number) => {
    const bottle = data.bottles[index];
    if (!bottle) return;

    // Return to inventory
    const newInv = { ...inventory };
    newInv[bottle.item] = (newInv[bottle.item] || 0) + bottle.count;
    const newBottles = [...data.bottles];
    newBottles[index] = null;
    const nextData = { ...data, bottles: newBottles };

    setData(nextData);
    onUpdateBrewing(brewingPosKey, nextData);
    onUpdatePlayerInventory(newInv, hotbar);
  };

  const handleIngredientClick = () => {
    if (!data.ingredient) return;

    const newInv = { ...inventory };
    newInv[data.ingredient.item] = (newInv[data.ingredient.item] || 0) + data.ingredient.count;
    const nextData = { ...data, ingredient: null, brewProgress: 0 };

    setData(nextData);
    onUpdateBrewing(brewingPosKey, nextData);
    onUpdatePlayerInventory(newInv, hotbar);
  };

  const handleInvItemClick = (item: ItemId) => {
    const count = inventory[item] || 0;
    if (count <= 0) return;

    // 1) Fuel: Blaze Powder
    if (item === "blaze_powder" && data.fuel < 20) {
      const newInv = { ...inventory };
      newInv[item]--;
      if (newInv[item] <= 0) delete newInv[item];
      const nextData = { ...data, fuel: Math.min(20, data.fuel + 20) };
      setData(nextData);
      onUpdateBrewing(brewingPosKey, nextData);
      onUpdatePlayerInventory(newInv, hotbar);
      return;
    }

    // 2) Bottles / Potions
    if (item === "glass_bottle" || item.startsWith("potion_")) {
      const emptyIdx = data.bottles.findIndex((b) => b === null);
      if (emptyIdx !== -1) {
        const newInv = { ...inventory };
        newInv[item]--;
        if (newInv[item] <= 0) delete newInv[item];
        const newBottles = [...data.bottles];
        newBottles[emptyIdx] = { item, count: 1 };
        const nextData = { ...data, bottles: newBottles };
        setData(nextData);
        onUpdateBrewing(brewingPosKey, nextData);
        onUpdatePlayerInventory(newInv, hotbar);
        return;
      }
    }

    // 3) Ingredient
    const validIngs = ["nether_wart", "sugar", "blaze_powder", "spider_eye", "apple", "redstone_dust", "feather"];
    if (validIngs.includes(item)) {
      if (!data.ingredient) {
        const newInv = { ...inventory };
        const take = Math.min(count, 64);
        newInv[item] -= take;
        if (newInv[item] <= 0) delete newInv[item];
        const nextData = { ...data, ingredient: { item, count: take }, brewProgress: 0 };
        setData(nextData);
        onUpdateBrewing(brewingPosKey, nextData);
        onUpdatePlayerInventory(newInv, hotbar);
      } else if (data.ingredient.item === item && data.ingredient.count < 64) {
        const newInv = { ...inventory };
        newInv[item]--;
        if (newInv[item] <= 0) delete newInv[item];
        const nextData = { ...data, ingredient: { item, count: data.ingredient.count + 1 } };
        setData(nextData);
        onUpdateBrewing(brewingPosKey, nextData);
        onUpdatePlayerInventory(newInv, hotbar);
      }
    }
  };

  const brewPct = Math.round((data.brewProgress || 0) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs select-none">
      <div className="relative flex flex-col rounded-sm border-2 border-[#1c1c1c] bg-[#c6c6c6] p-4 text-[#373737] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_12px_32px_rgba(0,0,0,0.85)] max-w-sm w-full">
        {/* Title Header */}
        <div className="flex items-center justify-between border-b border-[#9e9e9e] pb-2 mb-3">
          <span className="font-bold text-sm tracking-wide text-[#2b2b2b]">Brewing Stand</span>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded border border-[#555] bg-[#999] hover:bg-[#bbb] text-xs font-bold text-white shadow"
          >
            ✕
          </button>
        </div>

        {/* Brewing Stand Workspace Graphic */}
        <div className="relative mb-4 flex flex-col items-center justify-center rounded border border-[#8e8e8e] bg-[#8b8b8b] p-4 shadow-inner">
          {/* Top: Fuel on left + Ingredient in Center */}
          <div className="flex items-center justify-between w-full px-4 mb-2">
            {/* Fuel Gauge */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-amber-900">FUEL</span>
              <div
                className="h-7 w-7 rounded border-2 border-[#373737] bg-[#555] flex items-center justify-center text-xs shadow-inner"
                title={`Blaze Fuel: ${data.fuel}/20`}
              >
                🔥
              </div>
            </div>

            {/* Top Ingredient Slot */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-[#373737]">INGREDIENT</span>
              <button
                type="button"
                onClick={handleIngredientClick}
                className="relative flex h-10 w-10 items-center justify-center rounded border-2 border-[#373737] bg-[#8b8b8b] hover:bg-[#a0a0a0] shadow-inner"
              >
                {data.ingredient && (
                  <div
                    className="h-6 w-6 rounded-xs flex items-center justify-center text-[9px] font-bold text-white shadow"
                    style={{ backgroundColor: ITEMS[data.ingredient.item]?.color || "#ef4444" }}
                  >
                    {data.ingredient.count > 1 ? data.ingredient.count : ""}
                  </div>
                )}
              </button>
            </div>

            <div className="w-7" />
          </div>

          {/* Bubbling Alembic Progress Arrow */}
          <div className="relative h-6 w-24 bg-[#373737] rounded overflow-hidden mb-3 border border-black/40">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 transition-all duration-150"
              style={{ width: `${brewPct}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white tracking-widest drop-shadow">
              {brewPct > 0 ? `${brewPct}%` : "READY"}
            </span>
          </div>

          {/* Bottom 3 Potion Slots (Tripod layout) */}
          <div className="flex items-center justify-center gap-4">
            {data.bottles.map((b, idx) => {
              const def = b ? ITEMS[b.item] : null;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleBottleClick(idx)}
                  className="relative flex h-10 w-10 items-center justify-center rounded border-2 border-[#373737] bg-[#8b8b8b] hover:bg-[#a0a0a0] shadow-inner"
                  title={def ? def.name : `Bottle Slot ${idx + 1}`}
                >
                  {b && def ? (
                    <div
                      className="h-6 w-6 rounded-xs flex items-center justify-center text-[8px] font-bold text-white shadow"
                      style={{ backgroundColor: def.color || "#38bdf8" }}
                    >
                      🧪
                    </div>
                  ) : (
                    <span className="text-gray-500 text-xs opacity-50">🧪</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Player Inventory Tray */}
        <div className="border-t border-[#9e9e9e] pt-2">
          <span className="text-[10px] font-bold text-[#373737] block mb-1">Inventory (Click to insert)</span>
          <div className="grid grid-cols-6 gap-1 max-h-36 overflow-y-auto p-1 bg-[#8b8b8b] rounded border border-[#555] shadow-inner">
            {Object.entries(inventory).map(([item, count]) => {
              if (count <= 0) return null;
              const def = ITEMS[item as ItemId];
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleInvItemClick(item as ItemId)}
                  className="relative flex h-9 w-9 items-center justify-center rounded border border-[#373737] bg-[#a0a0a0] hover:bg-[#c0c0c0] shadow"
                  title={`${def?.name || item} (${count})`}
                >
                  <div
                    className="h-5 w-5 rounded-xs flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ backgroundColor: def?.color || "#555" }}
                  >
                    {count > 1 ? count : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
