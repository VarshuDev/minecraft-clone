import { useState, useEffect, useCallback } from "react";
import { ITEMS, type ItemId } from "@/game/blocks";

export interface SlotData {
  item: ItemId;
  count: number;
}

interface ChestModalProps {
  isOpen: boolean;
  chestPosKey: string;
  initialChestSlots: Array<SlotData | null>;
  inventory: Record<string, number>;
  hotbar: Array<SlotData | null>;
  onClose: () => void;
  onSaveChest: (posKey: string, slots: Array<SlotData | null>) => void;
  onUpdatePlayerInventory: (
    inventory: Record<string, number>,
    hotbar: Array<SlotData | null>,
  ) => void;
}

export function ChestModal({
  isOpen,
  chestPosKey,
  initialChestSlots,
  inventory,
  hotbar,
  onClose,
  onSaveChest,
  onUpdatePlayerInventory,
}: ChestModalProps) {
  // 27 slots for chest
  const [chestSlots, setChestSlots] = useState<Array<SlotData | null>>(() => {
    const slots = Array(27).fill(null);
    for (let i = 0; i < 27; i++) {
      if (initialChestSlots[i]) slots[i] = { ...initialChestSlots[i]! };
    }
    return slots;
  });

  // Local copy of hotbar
  const [localHotbar, setLocalHotbar] = useState<Array<SlotData | null>>(() =>
    hotbar.map((s) => (s ? { ...s } : null)),
  );

  // Local inventory flattened into 27 slots for authentic Minecraft inventory grid
  const [invSlots, setInvSlots] = useState<Array<SlotData | null>>(() => {
    const slots: Array<SlotData | null> = Array(27).fill(null);
    let idx = 0;
    for (const [id, count] of Object.entries(inventory)) {
      if (count > 0 && idx < 27) {
        slots[idx++] = { item: id as ItemId, count };
      }
    }
    return slots;
  });

  // Sync when chestPosKey changes
  useEffect(() => {
    const slots = Array(27).fill(null);
    for (let i = 0; i < 27; i++) {
      if (initialChestSlots[i]) slots[i] = { ...initialChestSlots[i]! };
    }
    setChestSlots(slots);
  }, [chestPosKey, initialChestSlots]);

  // Sync hotbar / inventory props
  useEffect(() => {
    setLocalHotbar(hotbar.map((s) => (s ? { ...s } : null)));
    const slots: Array<SlotData | null> = Array(27).fill(null);
    let idx = 0;
    for (const [id, count] of Object.entries(inventory)) {
      if (count > 0 && idx < 27) {
        slots[idx++] = { item: id as ItemId, count };
      }
    }
    setInvSlots(slots);
  }, [inventory, hotbar]);

  // Sync back state
  const syncBack = useCallback(
    (
      newChest: Array<SlotData | null>,
      newInv: Array<SlotData | null>,
      newHb: Array<SlotData | null>,
    ) => {
      setChestSlots(newChest);
      setInvSlots(newInv);
      setLocalHotbar(newHb);

      onSaveChest(chestPosKey, newChest);

      const nextInvMap: Record<string, number> = {};
      newInv.forEach((slot) => {
        if (slot) {
          nextInvMap[slot.item] = (nextInvMap[slot.item] || 0) + slot.count;
        }
      });
      onUpdatePlayerInventory(nextInvMap, newHb);
    },
    [chestPosKey, onSaveChest, onUpdatePlayerInventory],
  );

  // Transfer from Chest to Player
  const handleChestSlotClick = (index: number) => {
    const target = chestSlots[index];
    if (!target) return;

    const newChest = [...chestSlots];
    const newInv = [...invSlots];
    const newHb = [...localHotbar];

    let remaining = target.count;

    // 1. Try merging into existing hotbar stack
    for (let i = 0; i < 9 && remaining > 0; i++) {
      if (newHb[i] && newHb[i]!.item === target.item && newHb[i]!.count < 64) {
        const space = 64 - newHb[i]!.count;
        const add = Math.min(space, remaining);
        newHb[i] = { item: target.item, count: newHb[i]!.count + add };
        remaining -= add;
      }
    }

    // 2. Try merging into existing inventory slot
    for (let i = 0; i < 27 && remaining > 0; i++) {
      if (newInv[i] && newInv[i]!.item === target.item && newInv[i]!.count < 64) {
        const space = 64 - newInv[i]!.count;
        const add = Math.min(space, remaining);
        newInv[i] = { item: target.item, count: newInv[i]!.count + add };
        remaining -= add;
      }
    }

    // 3. Try empty hotbar slot
    for (let i = 0; i < 9 && remaining > 0; i++) {
      if (!newHb[i]) {
        newHb[i] = { item: target.item, count: remaining };
        remaining = 0;
      }
    }

    // 4. Try empty inventory slot
    for (let i = 0; i < 27 && remaining > 0; i++) {
      if (!newInv[i]) {
        newInv[i] = { item: target.item, count: remaining };
        remaining = 0;
      }
    }

    if (remaining === 0) {
      newChest[index] = null;
    } else {
      newChest[index] = { item: target.item, count: remaining };
    }

    syncBack(newChest, newInv, newHb);
  };

  // Transfer from Player Inventory or Hotbar to Chest
  const handlePlayerSlotClick = (source: "inv" | "hotbar", index: number) => {
    const target = source === "inv" ? invSlots[index] : localHotbar[index];
    if (!target) return;

    const newChest = [...chestSlots];
    const newInv = [...invSlots];
    const newHb = [...localHotbar];

    let remaining = target.count;

    // 1. Try merging into existing chest stack
    for (let i = 0; i < 27 && remaining > 0; i++) {
      if (newChest[i] && newChest[i]!.item === target.item && newChest[i]!.count < 64) {
        const space = 64 - newChest[i]!.count;
        const add = Math.min(space, remaining);
        newChest[i] = { item: target.item, count: newChest[i]!.count + add };
        remaining -= add;
      }
    }

    // 2. Try empty chest slot
    for (let i = 0; i < 27 && remaining > 0; i++) {
      if (!newChest[i]) {
        newChest[i] = { item: target.item, count: remaining };
        remaining = 0;
      }
    }

    if (source === "inv") {
      newInv[index] = remaining > 0 ? { item: target.item, count: remaining } : null;
    } else {
      newHb[index] = remaining > 0 ? { item: target.item, count: remaining } : null;
    }

    syncBack(newChest, newInv, newHb);
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 font-pixel backdrop-blur-xs select-none">
      <div className="relative flex w-full max-w-lg flex-col rounded-sm border-2 border-[#1f1f1f] bg-[#c6c6c6] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.85)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#8b8b8b]">
          <div className="text-[12px] tracking-wider text-[#373737] font-bold">
            CHEST STORAGE (27 SLOTS)
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

        {/* Chest 3x9 Grid */}
        <div className="mt-3">
          <div className="text-[9px] text-[#444444] mb-1">Click an item to transfer:</div>
          <div className="grid grid-cols-9 gap-1.5 p-2 bg-[#8b8b8b] rounded-xs border-2 border-[#373737]">
            {chestSlots.map((slot, i) => {
              const def = slot ? ITEMS[slot.item] : null;
              return (
                <button
                  key={`chest-${i}`}
                  type="button"
                  onClick={() => handleChestSlotClick(i)}
                  className="relative flex h-10 w-10 items-center justify-center border-2 border-t-[#373737] border-l-[#373737] border-b-white border-r-white bg-[#8b8b8b] hover:bg-[#a0a0a0] transition-colors"
                >
                  {slot && def && (
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                      <div
                        className="h-5 w-5 rounded-xs shadow-xs"
                        style={{ backgroundColor: def.color || "#888888" }}
                      />
                      <span className="absolute bottom-0 right-0.5 text-[8px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                        {slot.count}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="my-3 flex items-center justify-between border-t border-[#8b8b8b] pt-2">
          <span className="text-[11px] font-bold text-[#373737]">INVENTORY & HOTBAR</span>
        </div>

        {/* Player Main Inventory 3x9 Grid */}
        <div className="grid grid-cols-9 gap-1.5 p-2 bg-[#8b8b8b] rounded-xs border-2 border-[#373737]">
          {invSlots.map((slot, i) => {
            const def = slot ? ITEMS[slot.item] : null;
            return (
              <button
                key={`inv-${i}`}
                type="button"
                onClick={() => handlePlayerSlotClick("inv", i)}
                className="relative flex h-10 w-10 items-center justify-center border-2 border-t-[#373737] border-l-[#373737] border-b-white border-r-white bg-[#8b8b8b] hover:bg-[#a0a0a0] transition-colors"
              >
                {slot && def && (
                  <div className="flex flex-col items-center justify-center pointer-events-none">
                    <div
                      className="h-5 w-5 rounded-xs shadow-xs"
                      style={{ backgroundColor: def.color || "#888888" }}
                    />
                    <span className="absolute bottom-0 right-0.5 text-[8px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                      {slot.count}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Hotbar 1x9 Grid */}
        <div className="mt-2.5">
          <div className="grid grid-cols-9 gap-1.5 p-2 bg-[#707070] rounded-xs border-2 border-[#373737]">
            {localHotbar.map((slot, i) => {
              const def = slot ? ITEMS[slot.item] : null;
              return (
                <button
                  key={`hb-${i}`}
                  type="button"
                  onClick={() => handlePlayerSlotClick("hotbar", i)}
                  className="relative flex h-10 w-10 items-center justify-center border-2 border-t-[#373737] border-l-[#373737] border-b-white border-r-white bg-[#8b8b8b] hover:bg-[#a0a0a0] transition-colors"
                >
                  <span className="absolute left-0.5 top-0 text-[7px] text-white/40">
                    {i + 1}
                  </span>
                  {slot && def && (
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                      <div
                        className="h-5 w-5 rounded-xs shadow-xs"
                        style={{ backgroundColor: def.color || "#888888" }}
                      />
                      <span className="absolute bottom-0 right-0.5 text-[8px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                        {slot.count}
                      </span>
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
}
