import { useState } from "react";
import {
  CREATIVE_CATALOG,
  ITEMS,
  RECIPES,
  type GameModeId,
  type ItemId,
  type Recipe,
} from "@/game/blocks";

interface CraftingModalProps {
  isOpen: boolean;
  isWorkstation: boolean;
  gameMode: GameModeId;
  inventory: Record<string, number>;
  hotbar: Array<{ item: ItemId; count: number } | null>;
  onClose: () => void;
  onCraft: (recipeId: string) => void;
  onAddCreativeItem: (item: ItemId) => void;
}

export function CraftingModal({
  isOpen,
  isWorkstation,
  gameMode,
  inventory,
  hotbar,
  onClose,
  onCraft,
  onAddCreativeItem,
}: CraftingModalProps) {
  const [filter, setFilter] = useState<"all" | "tools" | "blocks" | "food">("all");

  if (!isOpen) return null;

  // Aggregate current inventory items (both from storage and hotbar)
  const currentCounts: Record<string, number> = { ...inventory };
  hotbar.forEach((slot) => {
    if (slot) {
      currentCounts[slot.item] = (currentCounts[slot.item] || 0) + slot.count;
    }
  });

  // Filter recipes
  const displayRecipes = RECIPES.filter((r) => {
    if (filter === "tools") return ITEMS[r.out]?.category === "tool" || ITEMS[r.out]?.category === "weapon";
    if (filter === "blocks") return ITEMS[r.out]?.category === "block";
    if (filter === "food") return ITEMS[r.out]?.category === "food";
    return true;
  });

  const canCraft = (recipe: Recipe) => {
    if (gameMode === "creative") return true;
    return recipe.inputs.every((input) => (currentCounts[input.item] || 0) >= input.count);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 font-pixel backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-sm border-2 border-[#1f1f1f] bg-[#c6c6c6] shadow-[0_12px_36px_rgba(0,0,0,0.8)]">
        {/* Title Bar */}
        <div className="flex items-center justify-between border-b-2 border-[#3a3a3a] bg-[#8b8b8b] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[12px] tracking-wider text-white">
              {gameMode === "creative"
                ? "CREATIVE ITEM CATALOG"
                : isWorkstation
                  ? "CRAFTING TABLE (3×3 WORKBENCH)"
                  : "CRAFTING (2×2 INVENTORY)"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-xs bg-[#555555] text-white hover:bg-red-600"
            title="Close (E / Esc)"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="scroll-thin flex-1 overflow-y-auto p-4 text-[#2a2a2a]">
          {gameMode === "creative" ? (
            /* Creative Infinite Catalog */
            <div>
              <div className="mb-3 text-[10px] text-[#444444]">
                Click any block or tool to add a stack to your hotbar:
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                {CREATIVE_CATALOG.map((id) => {
                  const def = ITEMS[id];
                  if (!def) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onAddCreativeItem(id)}
                      className="group flex flex-col items-center justify-center rounded-xs border-2 border-[#373737] bg-[#8b8b8b] p-2 hover:border-white hover:bg-[#a0a0a0] transition-colors"
                    >
                      <div
                        className="h-8 w-8 rounded-xs shadow-sm mb-1.5"
                        style={{ backgroundColor: def.color || "#777777" }}
                      />
                      <span className="text-center text-[8px] leading-tight text-white group-hover:text-black line-clamp-1">
                        {def.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Survival Recipes & Crafting */
            <div className="space-y-4">
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`rounded-xs px-2.5 py-1 text-[9px] ${
                    filter === "all" ? "bg-[#373737] text-white" : "bg-[#a5a5a5] text-[#222222]"
                  }`}
                >
                  ALL RECIPES
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("tools")}
                  className={`rounded-xs px-2.5 py-1 text-[9px] ${
                    filter === "tools" ? "bg-[#373737] text-white" : "bg-[#a5a5a5] text-[#222222]"
                  }`}
                >
                  TOOLS & WEAPONS
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("blocks")}
                  className={`rounded-xs px-2.5 py-1 text-[9px] ${
                    filter === "blocks" ? "bg-[#373737] text-white" : "bg-[#a5a5a5] text-[#222222]"
                  }`}
                >
                  BLOCKS & BUILDING
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("food")}
                  className={`rounded-xs px-2.5 py-1 text-[9px] ${
                    filter === "food" ? "bg-[#373737] text-white" : "bg-[#a5a5a5] text-[#222222]"
                  }`}
                >
                  FOOD & COOKING
                </button>
              </div>

              {/* Recipe List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {displayRecipes.map((r) => {
                  const outDef = ITEMS[r.out];
                  const ready = canCraft(r);

                  return (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between rounded-xs border-2 p-2.5 transition-colors ${
                        ready
                          ? "border-emerald-600 bg-[#dfdfdf] shadow-xs"
                          : "border-[#8a8a8a] bg-[#b5b5b5] opacity-75"
                      }`}
                    >
                      {/* Output details */}
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs border border-black/40 shadow-sm"
                          style={{ backgroundColor: outDef?.color || "#666666" }}
                        >
                          {r.count > 1 && (
                            <span className="text-[10px] font-bold text-white drop-shadow">
                              {r.count}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[#1a1a1a]">
                            {outDef?.name}
                          </div>
                          <div className="text-[8px] text-[#4a4a4a]">{r.note}</div>
                          {/* Required Ingredients */}
                          <div className="mt-1 flex flex-wrap gap-1 text-[7px]">
                            {r.inputs.map((inp, idx) => {
                              const have = currentCounts[inp.item] || 0;
                              const hasEnough = have >= inp.count;
                              const inpDef = ITEMS[inp.item];
                              return (
                                <span
                                  key={idx}
                                  className={`rounded-xs px-1 py-0.5 ${
                                    hasEnough ? "bg-emerald-700/20 text-emerald-900" : "bg-red-700/20 text-red-900"
                                  }`}
                                >
                                  {inpDef?.short ?? inp.item}: {have}/{inp.count}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Craft Action Button */}
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => onCraft(r.id)}
                        className={`ml-2 shrink-0 rounded-xs border px-3 py-1.5 text-[9px] font-bold transition-all ${
                          ready
                            ? "border-emerald-800 bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
                            : "border-gray-500 bg-gray-400 text-gray-700 cursor-not-allowed"
                        }`}
                      >
                        CRAFT
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Current Materials Summary */}
              <div className="mt-4 rounded-xs border border-[#888888] bg-[#ababab] p-2.5">
                <div className="mb-1.5 text-[9px] font-bold text-[#222222]">
                  YOUR INVENTORY MATERIALS:
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(currentCounts).map(([item, count]) => {
                    if (count <= 0) return null;
                    const def = ITEMS[item as ItemId];
                    if (!def) return null;
                    return (
                      <span
                        key={item}
                        className="flex items-center gap-1 rounded-xs border border-black/30 bg-[#8b8b8b] px-2 py-0.5 text-[8px] text-white shadow-xs"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-2xs inline-block"
                          style={{ backgroundColor: def.color || "#888" }}
                        />
                        {def.short ?? def.name}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t-2 border-[#3a3a3a] bg-[#8b8b8b] px-4 py-2 text-[9px] text-white">
          <span>Press [E] or [Esc] to return to the game</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xs border border-black/40 bg-[#555555] px-3 py-1 hover:bg-[#666666]"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}
