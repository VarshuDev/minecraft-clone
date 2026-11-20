import { formatScore, type HighScore } from "@/game/storage";
import { Icon } from "./Icons";

const RANK_COLORS = ["#ffd76a", "#c9f0e0", "#e6a879"];

export function ScoreTable({
  scores,
  highlightId,
  dense = false,
}: {
  scores: HighScore[];
  highlightId?: string | null;
  dense?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[4px] border border-white/8 bg-black/20">
      <div className="grid grid-cols-[28px_1fr_auto] items-center gap-2 border-b border-white/10 bg-white/[0.035] px-2.5 py-2 font-pixel text-[9px] tracking-[0.16em] text-haze/80">
        <span>#</span>
        <span>MINER</span>
        <span className="text-right">SCORE</span>
      </div>

      {scores.length === 0 && (
        <div className="px-3 py-8 text-center text-sm text-haze/70">
          No runs logged yet.
          <br />
          <span className="text-grass">Be the first to strike a vein.</span>
        </div>
      )}

      <ul className={dense ? "" : "divide-y divide-white/[0.06]"}>
        {scores.map((s, i) => {
          const isNew = s.id === highlightId;
          return (
            <li
              key={s.id}
              className={`leader-row grid grid-cols-[28px_1fr_auto] items-center gap-2 px-2.5 ${
                dense ? "py-1.5" : "py-2"
              } ${isNew ? "bg-lime/10 ring-1 ring-inset ring-lime/40" : ""}`}
            >
              <span
                className="font-pixel text-[11px] tabular-nums"
                style={{ color: RANK_COLORS[i] ?? "rgba(165,196,186,0.6)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                {i === 0 ? (
                  <Icon name="trophy" className="shrink-0 text-[12px] text-gold" />
                ) : (
                  <span className="h-1 w-1 shrink-0 rounded-full bg-haze/40" />
                )}
                <span className="truncate font-pixel text-[10px] tracking-[0.06em] text-paper/90">{s.name}</span>
                {s.mode === "daily" && (
                  <span className="shrink-0 rounded-sm bg-mint/15 px-1 py-0.5 font-pixel text-[6px] tracking-wider text-mint">
                    DAILY
                  </span>
                )}
                {isNew && (
                  <span className="shrink-0 rounded-sm bg-lime px-1 py-0.5 font-pixel text-[7px] tracking-wider text-ink">
                    NEW
                  </span>
                )}
                {!dense && (
                  <span className="ml-1 hidden shrink-0 items-center gap-1 text-[10px] text-haze/55 sm:flex">
                    <span className="h-1.5 w-1.5 rounded-[1px] bg-mint/80" />
                    {s.crystals}
                  </span>
                )}
              </span>
              <span className="text-right font-pixel text-[11px] tabular-nums text-lime">
                {formatScore(s.score)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
