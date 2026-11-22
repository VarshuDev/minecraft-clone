import { useState, useEffect } from "react";
import {
  ITEMS,
  SMELTING_RECIPES,
  getFuelBurnTime,
  type ItemId,
} from "@/game/blocks";
import type { FurnaceData } from "@/game/storage";

interface FurnaceModalProps {
  isOpen: boolean;
  furnacePosKey: string;
  furnaceData: FurnaceData;
  inventory: Record<string, number>;
  hotbar: Array<{ item: ItemId; count: number } | null>;
  onClose: () => void;
  onUpdateFurnace: (posKey: string, data: FurnaceData) => void;
  onUpdatePlayerInventory: (
    inventory: Record<string, number>,
    hotbar: Array<{ item: ItemId; count: number } | null>,
  ) => void;
}

export function FurnaceModal({
  isOpen,
  furnacePosKey,
  furnaceData,
  inventory,
  hotbar,
  onClose,
  onUpdateFurnace,
  onUpdatePlayerInventory,
}: FurnaceModalProps) {
  // Local state synced from props
  const [data, setData] = useState<FurnaceData>(furnaceData);

  useEffect(() => {
    setData(furnaceData);
  }, [furnaceData, furnacePosKey]);

  // Live polling for smooth smelting animation while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      if (typeof window !== "undefined" && (window as any).__game) {
        const live = (window as any).__game.getFurnaceData(furnacePosKey);
        if (live) setData({ ...live });
      }
    }, 150);
    return () => clearInterval(timer);
  }, [isOpen, furnacePosKey]);

  // Handle keyboard close (E or Escape)
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

  const isBurning = data.burnTime > 0;
  const flamePct = data.maxBurnTime > 0 ? Math.min(100, Math.max(0, (data.burnTime / data.maxBurnTime) * 100)) : 0;
  const cookPct = Math.min(100, Math.max(0, data.cookProgress * 100));

  // Take output item
  const handleTakeOutput = () => {
    if (!data.output) return;
    const item = data.output.item;
    const count = data.output.count;

    const newHb = [...hotbar];
    let remaining = count;

    // Add to hotbar
    for (let i = 0; i < 9 && remaining > 0; i++) {
      if (newHb[i] && newHb[i]!.item === item && newHb[i]!.count < 64) {
        const space = 64 - newHb[i]!.count;
        const add = Math.min(space, remaining);
        newHb[i] = { item, count: newHb[i]!.count + add };
        remaining -= add;
      }
    }
    for (let i = 0; i < 9 && remaining > 0; i++) {
      if (!newHb[i]) {
        newHb[i] = { item, count: remaining };
        remaining = 0;
      }
    }

    const nextInv = { ...inventory };
    if (remaining > 0) {
      nextInv[item] = (nextInv[item] || 0) + remaining;
    }

    onUpdatePlayerInventory(nextInv, newHb);

    const nextData: FurnaceData = {
      ...data,
      output: null,
    };
    setData(nextData);
    onUpdateFurnace(furnacePosKey, nextData);
  };

  // Click on Input Slot to withdraw
  const handleTakeInput = () => {
    if (!data.input) return;
    const item = data.input.item;
    const count = data.input.count;
    const nextInv = { ...inventory, [item]: (inventory[item] || 0) + count };
    onUpdatePlayerInventory(nextInv, hotbar);
    const nextData = { ...data, input: null, cookProgress: 0 };
    setData(nextData);
    onUpdateFurnace(furnacePosKey, nextData);
  };

  // Click on Fuel Slot to withdraw
  const handleTakeFuel = () => {
    if (!data.fuel) return;
    const item = data.fuel.item;
    const count = data.fuel.count;
    const nextInv = { ...inventory, [item]: (inventory[item] || 0) + count };
    onUpdatePlayerInventory(nextInv, hotbar);
    const nextData = { ...data, fuel: null };
    setData(nextData);
    onUpdateFurnace(furnacePosKey, nextData);
  };

  // Click on Player item to deposit into Furnace
  const handleDepositItem = (item: ItemId, count: number, isHotbar: boolean, slotIndex?: number) => {
    const isSmeltable = SMELTING_RECIPES.some((r) => r.input === item);
    const fuelVal = getFuelBurnTime(item);

    if (!isSmeltable && fuelVal <= 0) return;

    // Remove 1 stack or unit from player
    const depositAmount = Math.min(count, 16);

    const nextInv = { ...inventory };
    const nextHb = [...hotbar];

    if (isHotbar && typeof slotIndex === "number") {
      if (nextHb[slotIndex]) {
        nextHb[slotIndex]!.count -= depositAmount;
        if (nextHb[slotIndex]!.count <= 0) nextHb[slotIndex] = null;
      }
    } else {
      nextInv[item] = (nextInv[item] || 0) - depositAmount;
      if (nextInv[item] <= 0) delete nextInv[item];
    }

    const nextData = { ...data };

    if (isSmeltable && (!nextData.input || nextData.input.item === item)) {
      nextData.input = {
        item,
        count: (nextData.input?.count || 0) + depositAmount,
      };
    } else if (fuelVal > 0 && (!nextData.fuel || nextData.fuel.item === item)) {
      nextData.fuel = {
        item,
        count: (nextData.fuel?.count || 0) + depositAmount,
      };
    } else {
      return; // Cannot deposit
    }

    onUpdatePlayerInventory(nextInv, nextHb);
    setData(nextData);
    onUpdateFurnace(furnacePosKey, nextData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 font-pixel backdrop-blur-xs select-none">
      <div className="relative flex w-full max-w-md flex-col rounded-sm border-2 border-[#1f1f1f] bg-[#c6c6c6] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.85)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#8b8b8b]">
          <div className="text-[12px] tracking-wider text-[#373737] font-bold">
            FURNACE (SMELTING & COOKING)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-xs bg-[#555555] text-white hover:bg-red-600 transition-colors"
            title="Close (E / Esc)"
          >
            ✕
          </button>
        </div>

        {/* Smelting Core Area */}
        <div className="my-5 flex items-center justify-around px-6 py-4 bg-[#8b8b8b] rounded-xs border-2 border-[#373737]">
          {/* Left Column: Input (top) + Flame + Fuel (bottom) */}
          <div className="flex flex-col items-center gap-2">
            {/* Input Slot */}
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-[#222222] mb-0.5">INGREDIENT</span>
              <button
                type="button"
                onClick={handleTakeInput}
                className="relative flex h-11 w-11 items-center justify-center border-2 border-t-[#373737] border-l-[#373737] border-b-white border-r-white bg-[#8b8b8b] hover:bg-[#a0a0a0] transition-colors"
              >
                {data.input ? (
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className="h-6 w-6 rounded-xs shadow-xs"
                      style={{ backgroundColor: ITEMS[data.input.item]?.color || "#888888" }}
                    />
                    <span className="absolute bottom-0 right-1 text-[8px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                      {data.input.count}
                    </span>
                  </div>
                ) : (
                  <span className="text-[8px] text-white/30">Ore/Meat</span>
                )}
              </button>
            </div>

            {/* Fire Flame Icon */}
            <div className="relative h-5 w-5 overflow-hidden">
              <svg viewBox="0 0 16 16" className="h-full w-full">
                <path
                  d="M8 1 C7 3 5 5 5 8 C5 11 7 14 8 15 C9 14 11 11 11 8 C11 5 9 3 8 1 Z"
                  fill="#444444"
                />
              </svg>
              {isBurning && (
                <div
                  className="absolute bottom-0 left-0 right-0 overflow-hidden transition-all duration-300"
                  style={{ height: `${flamePct}%` }}
                >
                  <svg viewBox="0 0 16 16" className="h-5 w-5">
                    <path
                      d="M8 1 C7 3 5 5 5 8 C5 11 7 14 8 15 C9 14 11 11 11 8 C11 5 9 3 8 1 Z"
                      fill="#ff6b00"
                    />
                    <path
                      d="M8 5 C7.5 6 6.5 7.5 6.5 9.5 C6.5 11 7.5 13 8 13.5 C8.5 13 9.5 11 9.5 9.5 C9.5 7.5 8.5 6 8 5 Z"
                      fill="#ffd000"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Fuel Slot */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={handleTakeFuel}
                className="relative flex h-11 w-11 items-center justify-center border-2 border-t-[#373737] border-l-[#373737] border-b-white border-r-white bg-[#8b8b8b] hover:bg-[#a0a0a0] transition-colors"
              >
                {data.fuel ? (
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className="h-6 w-6 rounded-xs shadow-xs"
                      style={{ backgroundColor: ITEMS[data.fuel.item]?.color || "#888888" }}
                    />
                    <span className="absolute bottom-0 right-1 text-[8px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                      {data.fuel.count}
                    </span>
                  </div>
                ) : (
                  <span className="text-[8px] text-white/30">Coal/Wood</span>
                )}
              </button>
              <span className="text-[8px] text-[#222222] mt-0.5">FUEL</span>
            </div>
          </div>

          {/* Center: Smelt Arrow Progress */}
          <div className="relative flex items-center justify-center">
            {/* Arrow background */}
            <div className="relative h-6 w-12 bg-[#555555] rounded-xs border border-[#373737] overflow-hidden">
              {/* Fill progress */}
              <div
                className="absolute inset-y-0 left-0 bg-white transition-all duration-200"
                style={{ width: `${cookPct}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[9px] font-bold text-black/70">▶▶</span>
              </div>
            </div>
          </div>

          {/* Right Column: Output Slot */}
          <div className="flex flex-col items-center">
            <span className="text-[8px] text-[#222222] mb-0.5">PRODUCT</span>
            <button
              type="button"
              onClick={handleTakeOutput}
              className="relative flex h-14 w-14 items-center justify-center border-2 border-t-[#373737] border-l-[#373737] border-b-white border-r-white bg-[#8b8b8b] hover:bg-[#a0a0a0] transition-colors"
            >
              {data.output ? (
                <div className="flex flex-col items-center justify-center">
                  <div
                    className="h-8 w-8 rounded-xs shadow-xs"
                    style={{ backgroundColor: ITEMS[data.output.item]?.color || "#888888" }}
                  />
                  <span className="absolute bottom-1 right-1.5 text-[9px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                    {data.output.count}
                  </span>
                </div>
              ) : (
                <span className="text-[8px] text-white/30">Empty</span>
              )}
            </button>
          </div>
        </div>

        {/* Player Inventory & Hotbar (Quick Deposit by clicking items) */}
        <div>
          <div className="text-[9px] font-bold text-[#373737] mb-1">
            CLICK TO DEPOSIT INGREDIENTS OR FUEL:
          </div>

          <div className="grid grid-cols-9 gap-1 p-1.5 bg-[#707070] rounded-xs border-2 border-[#373737]">
            {hotbar.map((slot, i) => {
              const def = slot ? ITEMS[slot.item] : null;
              return (
                <button
                  key={`furnace-hb-${i}`}
                  type="button"
                  onClick={() => slot && handleDepositItem(slot.item, slot.count, true, i)}
                  className="relative flex h-9 w-9 items-center justify-center border-2 border-t-[#373737] border-l-[#373737] border-b-white border-r-white bg-[#8b8b8b] hover:bg-[#a0a0a0] transition-colors"
                >
                  {slot && def && (
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                      <div
                        className="h-4 w-4 rounded-xs shadow-xs"
                        style={{ backgroundColor: def.color || "#888888" }}
                      />
                      <span className="absolute bottom-0 right-0.5 text-[7px] font-bold text-white drop-shadow">
                        {slot.count}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main Inventory items row preview */}
          <div className="mt-2 flex flex-wrap gap-1 p-1.5 bg-[#8b8b8b] rounded-xs border-2 border-[#373737] max-h-24 overflow-y-auto">
            {Object.entries(inventory).map(([id, count]) => {
              if (count <= 0) return null;
              const def = ITEMS[id as ItemId];
              return (
                <button
                  key={`furnace-inv-${id}`}
                  type="button"
                  onClick={() => handleDepositItem(id as ItemId, count, false)}
                  className="relative flex h-8 w-8 items-center justify-center border border-[#373737] bg-[#757575] hover:bg-[#888888] rounded-xs"
                  title={`${def?.name || id}: click to deposit`}
                >
                  <div
                    className="h-4 w-4 rounded-xs"
                    style={{ backgroundColor: def?.color || "#888888" }}
                  />
                  <span className="absolute bottom-0 right-0.5 text-[7px] font-bold text-white drop-shadow">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
