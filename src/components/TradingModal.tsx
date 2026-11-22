import React, { useState } from "react";
import { ITEMS, type ItemId, type VillagerProfession } from "@/game/blocks";
import { type MobEntity } from "@/game/mobs";

interface TradingModalProps {
  isOpen: boolean;
  villager: MobEntity | null;
  hotbar: Array<{ item: ItemId; count: number; enchantments?: Record<string, number> } | null>;
  inventory: Record<string, number>;
  onClose: () => void;
  onTrade: (villagerId: string, tradeIndex: number) => boolean;
}

const PROFESSION_META: Record<
  VillagerProfession,
  { title: string; subtitle: string; icon: string; badgeColor: string; robeColor: string }
> = {
  farmer: {
    title: "VILLAGER FARMER",
    subtitle: "Harvest barter, golden grain, apples & emeralds",
    icon: "🌾",
    badgeColor: "#4a7c3f",
    robeColor: "#8b6508",
  },
  weaponsmith: {
    title: "VILLAGER WEAPONSMITH",
    subtitle: "Forges heavy iron blades, bows & enchanted swords",
    icon: "⚔️",
    badgeColor: "#59606d",
    robeColor: "#2e2b2a",
  },
  librarian: {
    title: "VILLAGER LIBRARIAN",
    subtitle: "Ancient knowledge, bookshelves & enchanted books",
    icon: "📚",
    badgeColor: "#9e3838",
    robeColor: "#7d2222",
  },
  cleric: {
    title: "VILLAGER CLERIC",
    subtitle: "Mystic alchemy, lapis lazuli, redstone & glowstone",
    icon: "⚗️",
    badgeColor: "#7e38a8",
    robeColor: "#571e7a",
  },
};

export const TradingModal: React.FC<TradingModalProps> = ({
  isOpen,
  villager,
  hotbar,
  inventory,
  onClose,
  onTrade,
}) => {
  const [selectedTradeIndex, setSelectedTradeIndex] = useState(0);

  if (!isOpen || !villager || !villager.trades) return null;

  const prof = villager.profession || "farmer";
  const meta = PROFESSION_META[prof];
  const trades = villager.trades;
  const activeTrade = trades[selectedTradeIndex] || trades[0];

  // Helper to count player's items
  const getItemCount = (item: ItemId) => {
    let count = inventory[item] || 0;
    for (const slot of hotbar) {
      if (slot && slot.item === item) count += slot.count;
    }
    return count;
  };

  const emeraldCount = getItemCount("item_emerald");

  const canAfford = (trade: typeof activeTrade) => {
    if (!trade) return false;
    if (trade.uses >= trade.maxUses) return false;
    if (getItemCount(trade.in1.item) < trade.in1.count) return false;
    if (trade.in2 && getItemCount(trade.in2.item) < trade.in2.count) return false;
    return true;
  };

  const handleExecuteTrade = (idx: number) => {
    if (onTrade(villager.id, idx)) {
      // Re-trigger render
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none"
      style={{
        backgroundColor: "rgba(10, 14, 20, 0.78)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex flex-col w-full max-w-2xl text-white rounded shadow-2xl"
        style={{
          backgroundColor: "#c6c6c6",
          border: "4px solid #3c3c3c",
          boxShadow: "inset 4px 4px 0 #ffffff, inset -4px -4px 0 #555555, 0 10px 30px rgba(0,0,0,0.85)",
          imageRendering: "pixelated",
          fontFamily: "'Minecraft', monospace, sans-serif",
        }}
      >
        {/* Header Strip */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b-2"
          style={{
            backgroundColor: "#2e2e2e",
            borderColor: "#1a1a1a",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wider text-amber-300">
                  {meta.title}
                </h2>
                <span
                  className="px-2 py-0.5 text-[10px] uppercase font-bold text-white rounded border border-black/40"
                  style={{ backgroundColor: meta.badgeColor }}
                >
                  Level 2 Trader
                </span>
              </div>
              <p className="text-[11px] text-gray-300 font-sans tracking-wide">
                {meta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Emerald Counter */}
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded border-2 border-emerald-900 bg-emerald-950/80 shadow-inner"
              title="Your Emerald Balance"
            >
              <span className="text-base">❇️</span>
              <span className="text-xs font-bold text-emerald-300 font-mono">
                {emeraldCount} Emeralds
              </span>
            </div>

            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 text-xs font-bold text-gray-200 transition bg-red-800 rounded border border-red-950 hover:bg-red-700 active:translate-y-0.5"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body: Split Left (Trades List) & Right (Active Trade Execution) */}
        <div className="flex flex-col md:flex-row gap-3 p-4" style={{ backgroundColor: "#8b8b8b" }}>
          {/* Left: Trade Offers Selection */}
          <div
            className="flex flex-col gap-2 p-2 rounded md:w-1/2 overflow-y-auto max-h-[340px]"
            style={{
              backgroundColor: "#373737",
              border: "3px solid #222222",
              boxShadow: "inset 2px 2px 0 #181818, inset -2px -2px 0 #555555",
            }}
          >
            <div className="text-[11px] font-bold text-amber-300 px-1 uppercase tracking-wider mb-1">
              Available Merchant Offers:
            </div>

            {trades.map((trade, idx) => {
              const in1Def = ITEMS[trade.in1.item];
              const in2Def = trade.in2 ? ITEMS[trade.in2.item] : null;
              const outDef = ITEMS[trade.out.item];
              const affordable = canAfford(trade);
              const isSelected = selectedTradeIndex === idx;
              const isLocked = trade.uses >= trade.maxUses;

              return (
                <div
                  key={trade.id}
                  onClick={() => setSelectedTradeIndex(idx)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition border-2 ${
                    isSelected
                      ? "border-amber-400 bg-amber-950/40 shadow-inner"
                      : "border-black/50 bg-[#282828] hover:bg-[#323232]"
                  }`}
                >
                  {/* Inputs */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded border border-black/60 relative font-mono text-xs font-bold shadow"
                      style={{ backgroundColor: in1Def?.color || "#555" }}
                      title={`${trade.in1.count}x ${in1Def?.name}`}
                    >
                      <span className="text-[9px] drop-shadow">{in1Def?.short}</span>
                      <span className="absolute bottom-0 right-0.5 text-[9px] text-white drop-shadow font-bold">
                        {trade.in1.count}
                      </span>
                    </div>

                    {in2Def && (
                      <>
                        <span className="text-xs text-gray-400">+</span>
                        <div
                          className="flex items-center justify-center w-8 h-8 rounded border border-black/60 relative font-mono text-xs font-bold shadow"
                          style={{ backgroundColor: in2Def?.color || "#555" }}
                          title={`${trade.in2?.count}x ${in2Def?.name}`}
                        >
                          <span className="text-[9px] drop-shadow">{in2Def?.short}</span>
                          <span className="absolute bottom-0 right-0.5 text-[9px] text-white drop-shadow font-bold">
                            {trade.in2?.count}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Arrow */}
                  <span className="text-emerald-400 font-bold text-sm px-1">➜</span>

                  {/* Output */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded border border-black/60 relative font-mono text-xs font-bold shadow ${
                        trade.out.enchantments ? "ring-2 ring-purple-400 animate-pulse" : ""
                      }`}
                      style={{
                        backgroundColor: outDef?.color || "#555",
                        background: trade.out.enchantments
                          ? "linear-gradient(135deg, #7b1fa2, #311b92)"
                          : outDef?.color,
                      }}
                      title={`${trade.out.count}x ${outDef?.name}`}
                    >
                      <span className="text-[9px] drop-shadow">{outDef?.short}</span>
                      <span className="absolute bottom-0 right-0.5 text-[9px] text-white drop-shadow font-bold">
                        {trade.out.count}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      {isLocked ? (
                        <span className="text-[10px] text-red-400 font-bold">LOCKED</span>
                      ) : affordable ? (
                        <span className="text-[10px] text-emerald-400 font-bold">READY</span>
                      ) : (
                        <span className="text-[10px] text-gray-400">NEED ITEMS</span>
                      )}
                      <span className="text-[9px] text-gray-400">
                        {trade.uses}/{trade.maxUses}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Active Selected Trade Details & Execution */}
          <div
            className="flex flex-col justify-between p-4 rounded md:w-1/2"
            style={{
              backgroundColor: "#2c2c2c",
              border: "3px solid #1a1a1a",
              boxShadow: "inset 2px 2px 0 #111111, inset -2px -2px 0 #444444",
            }}
          >
            <div>
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wide border-b border-gray-700 pb-1.5 mb-3">
                Selected Transaction:
              </div>

              {/* Visual Trade Exchange Display */}
              <div className="flex items-center justify-center gap-4 py-4 px-2 rounded bg-black/30 border border-gray-700 mb-4">
                {/* Inputs */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex items-center justify-center w-12 h-12 rounded border-2 border-black/80 font-mono text-xs font-bold shadow-lg relative"
                      style={{ backgroundColor: ITEMS[activeTrade.in1.item]?.color || "#555" }}
                    >
                      <span className="text-[11px] drop-shadow">{ITEMS[activeTrade.in1.item]?.short}</span>
                      <span className="absolute bottom-0.5 right-1 text-xs text-white font-bold drop-shadow">
                        {activeTrade.in1.count}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-300 mt-1 max-w-[70px] text-center truncate">
                      {ITEMS[activeTrade.in1.item]?.name}
                    </span>
                    <span
                      className={`text-[9px] font-bold ${
                        getItemCount(activeTrade.in1.item) >= activeTrade.in1.count
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      Have: {getItemCount(activeTrade.in1.item)}
                    </span>
                  </div>

                  {activeTrade.in2 && (
                    <div className="flex flex-col items-center">
                      <div
                        className="flex items-center justify-center w-12 h-12 rounded border-2 border-black/80 font-mono text-xs font-bold shadow-lg relative"
                        style={{ backgroundColor: ITEMS[activeTrade.in2.item]?.color || "#555" }}
                      >
                        <span className="text-[11px] drop-shadow">{ITEMS[activeTrade.in2.item]?.short}</span>
                        <span className="absolute bottom-0.5 right-1 text-xs text-white font-bold drop-shadow">
                          {activeTrade.in2.count}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-300 mt-1 max-w-[70px] text-center truncate">
                        {ITEMS[activeTrade.in2.item]?.name}
                      </span>
                      <span
                        className={`text-[9px] font-bold ${
                          getItemCount(activeTrade.in2.item) >= activeTrade.in2.count
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        Have: {getItemCount(activeTrade.in2.item)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center">
                  <span className="text-2xl text-emerald-400 font-bold drop-shadow">➜</span>
                  <span className="text-[9px] text-emerald-300 font-mono">+{activeTrade.xpReward} XP</span>
                </div>

                {/* Output */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded border-2 border-black/80 font-mono text-xs font-bold shadow-lg relative ${
                      activeTrade.out.enchantments ? "ring-2 ring-purple-400 animate-pulse" : ""
                    }`}
                    style={{
                      backgroundColor: ITEMS[activeTrade.out.item]?.color || "#555",
                      background: activeTrade.out.enchantments
                        ? "linear-gradient(135deg, #7b1fa2, #311b92)"
                        : ITEMS[activeTrade.out.item]?.color,
                    }}
                  >
                    <span className="text-[11px] drop-shadow">{ITEMS[activeTrade.out.item]?.short}</span>
                    <span className="absolute bottom-0.5 right-1 text-xs text-white font-bold drop-shadow">
                      {activeTrade.out.count}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-300 mt-1 max-w-[80px] text-center truncate">
                    {ITEMS[activeTrade.out.item]?.name}
                  </span>
                  {activeTrade.out.enchantments && (
                    <span className="text-[9px] text-purple-300 font-bold">
                      ✨ Enchanted
                    </span>
                  )}
                </div>
              </div>

              {/* Trade Lore / Enchantment Lore */}
              {activeTrade.out.enchantments && (
                <div className="p-2 mb-3 rounded bg-purple-950/60 border border-purple-600/50 text-[11px] text-purple-200">
                  <div className="font-bold text-amber-300 mb-0.5">Enchantment Lore:</div>
                  {Object.entries(activeTrade.out.enchantments).map(([id, lvl]) => (
                    <div key={id} className="capitalize">
                      ✨ {id.replace("_", " ")} {lvl === 1 ? "I" : lvl === 2 ? "II" : lvl === 3 ? "III" : "IV"}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trade Action Button */}
            <div>
              <button
                disabled={!canAfford(activeTrade)}
                onClick={() => handleExecuteTrade(selectedTradeIndex)}
                className={`w-full py-3 px-4 rounded text-sm font-bold uppercase tracking-wider transition border-2 ${
                  canAfford(activeTrade)
                    ? "bg-emerald-700 hover:bg-emerald-600 active:translate-y-0.5 text-white border-emerald-950 shadow-lg cursor-pointer"
                    : "bg-gray-700 text-gray-400 border-gray-900 cursor-not-allowed opacity-60"
                }`}
                style={{
                  boxShadow: canAfford(activeTrade)
                    ? "inset 2px 2px 0 rgba(255,255,255,0.3), inset -2px -2px 0 rgba(0,0,0,0.5)"
                    : "none",
                }}
              >
                {activeTrade.uses >= activeTrade.maxUses
                  ? "❌ Trade Sold Out"
                  : canAfford(activeTrade)
                  ? "❇️ Trade Now"
                  : "🔒 Need Required Items"}
              </button>
            </div>
          </div>
        </div>

        {/* Hotbar Overview Bar */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t-2"
          style={{
            backgroundColor: "#222222",
            borderColor: "#111111",
          }}
        >
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Hotbar Items Quick View:
          </span>
          <div className="flex gap-1.5">
            {hotbar.map((slot, i) => {
              const def = slot ? ITEMS[slot.item] : null;
              return (
                <div
                  key={i}
                  className="w-7 h-7 rounded border border-black/70 flex items-center justify-center relative font-mono text-[9px] font-bold"
                  style={{
                    backgroundColor: def ? def.color : "rgba(0,0,0,0.3)",
                  }}
                  title={def ? `${slot?.count}x ${def.name}` : `Slot ${i + 1}`}
                >
                  {def?.short}
                  {slot && slot.count > 1 && (
                    <span className="absolute bottom-0 right-0.5 text-[8px] text-white font-bold drop-shadow">
                      {slot.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
