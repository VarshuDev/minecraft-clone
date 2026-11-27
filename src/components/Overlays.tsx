import { type GameSettings } from "@/game/storage";

export function PauseScreen({
  settings,
  onUpdateSettings,
  onResume,
  onSaveAndQuit,
}: {
  settings: GameSettings;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onResume: () => void;
  onSaveAndQuit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 font-pixel text-white backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-sm border-2 border-[#2b2b2b] bg-[#1a1a1a]/90 p-5 text-center shadow-2xl">
        <h2 className="mb-4 text-xl sm:text-2xl font-bold tracking-[0.14em] text-white drop-shadow">
          GAME PAUSED
        </h2>

        {/* Settings inside pause menu */}
        <div className="mb-4 space-y-3 rounded-xs border border-white/10 bg-black/40 p-3 text-left text-[9px]">
          {/* Render Distance */}
          <div className="flex items-center justify-between">
            <span className="text-white/70">RENDER DISTANCE:</span>
            <div className="flex gap-1">
              {[2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onUpdateSettings({ renderDistance: d })}
                  className={`rounded-xs px-2 py-0.5 ${
                    settings.renderDistance === d ? "bg-emerald-600 text-white" : "bg-black/60 text-white/50"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Shadows toggle */}
          <div className="flex items-center justify-between">
            <span className="text-white/70">SMOOTH SHADOWS:</span>
            <button
              type="button"
              onClick={() => onUpdateSettings({ shadows: !settings.shadows })}
              className={`rounded-xs px-2.5 py-0.5 ${
                settings.shadows ? "bg-emerald-600 text-white" : "bg-red-700/60 text-white/70"
              }`}
            >
              {settings.shadows ? "ON" : "OFF"}
            </button>
          </div>

          {/* Audio toggle */}
          <div className="flex items-center justify-between">
            <span className="text-white/70">AUDIO & SOUND:</span>
            <button
              type="button"
              onClick={() => onUpdateSettings({ muted: !settings.muted })}
              className={`rounded-xs px-2.5 py-0.5 ${
                !settings.muted ? "bg-emerald-600 text-white" : "bg-red-700/60 text-white/70"
              }`}
            >
              {!settings.muted ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full rounded-xs border-2 border-emerald-400 bg-emerald-600 py-2.5 text-[11px] font-bold tracking-wider text-white shadow hover:bg-emerald-500"
          >
            BACK TO GAME
          </button>
          <button
            type="button"
            onClick={onSaveAndQuit}
            className="w-full rounded-xs border border-white/20 bg-black/50 py-2 text-[10px] tracking-wider text-white/80 hover:bg-black/80 hover:text-white"
          >
            SAVE &amp; QUIT TO TITLE
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeathScreen({
  onRespawn,
  onTitle,
}: {
  onRespawn: () => void;
  onTitle: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-red-950/80 p-4 font-pixel text-white backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-sm border-2 border-red-900 bg-black/90 p-6 text-center shadow-2xl">
        <h2 className="mb-2 text-3xl font-bold tracking-[0.2em] text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
          YOU DIED!
        </h2>
        <p className="mb-6 text-[10px] text-white/60">
          The depths claimed another soul.
        </p>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onRespawn}
            className="w-full rounded-xs border-2 border-emerald-400 bg-emerald-600 py-2.5 text-[11px] font-bold tracking-wider text-white shadow hover:bg-emerald-500"
          >
            RESPAWN
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="w-full rounded-xs border border-white/20 bg-black/50 py-2 text-[10px] tracking-wider text-white/80 hover:bg-black/80 hover:text-white"
          >
            TITLE SCREEN
          </button>
        </div>
      </div>
    </div>
  );
}

export function VictoryScreen({
  onContinue,
  onTitle,
}: {
  onContinue: () => void;
  onTitle: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 font-pixel text-white backdrop-blur-md">
      <div className="w-full max-w-md rounded border-2 border-purple-500/80 bg-gradient-to-b from-[#18092b] to-[#0c0517] p-6 text-center shadow-[0_0_50px_rgba(168,85,247,0.4)]">
        <div className="mb-2 text-3xl animate-bounce">🏆</div>
        <h2 className="mb-1 text-2xl sm:text-3xl font-extrabold tracking-[0.16em] text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-fuchsia-300 to-purple-300 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
          VICTORY ACHIEVED!
        </h2>
        <p className="mb-4 text-xs font-semibold text-fuchsia-200/90 tracking-wide">
          You have conquered The End and slain the Ender Dragon!
        </p>

        {/* End Poem Box */}
        <div className="mb-5 rounded border border-purple-500/30 bg-black/60 p-3 text-left text-[9px] leading-relaxed text-purple-200/80 space-y-2">
          <p className="italic">
            &ldquo;And the universe said I love you because you are love. And the game was over and the player woke up from the dream. And the player began a new dream. And the player was you.&rdquo;
          </p>
          <div className="border-t border-purple-500/20 pt-2 flex flex-wrap gap-2 justify-center">
            <span className="rounded bg-purple-900/60 px-2 py-0.5 text-[8px] text-fuchsia-300 border border-purple-400/40">
              🐉 Free the End
            </span>
            <span className="rounded bg-purple-900/60 px-2 py-0.5 text-[8px] text-amber-300 border border-amber-400/40">
              🥚 The Dragon Egg
            </span>
            <span className="rounded bg-purple-900/60 px-2 py-0.5 text-[8px] text-emerald-300 border border-emerald-400/40">
              🌌 End Portal Master
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded border-2 border-fuchsia-400 bg-gradient-to-r from-purple-600 to-fuchsia-600 py-3 text-[11px] font-bold tracking-wider text-white shadow-[0_4px_16px_rgba(192,132,252,0.5)] hover:from-purple-500 hover:to-fuchsia-500 cursor-pointer"
          >
            RETURN TO OVERWORLD &amp; CONTINUE
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="w-full rounded border border-white/20 bg-black/60 py-2.5 text-[10px] tracking-wider text-white/80 hover:bg-black/80 hover:text-white cursor-pointer"
          >
            SAVE &amp; TITLE SCREEN
          </button>
        </div>
      </div>
    </div>
  );
}
