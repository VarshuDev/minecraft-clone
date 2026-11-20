import { useCallback, useRef } from "react";
import { Icon } from "./Icons";

interface TouchControlsProps {
  onMove: (x: number, forward: number) => void;
  onMine: (active: boolean) => void;
  onPlace: () => void;
  onJump: () => void;
  minePulse: number;
}

export function TouchControls({ onMove, onMine, onPlace, onJump, minePulse }: TouchControlsProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);

  const update = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current;
      const knob = knobRef.current;
      if (!base || !knob) return;
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const max = rect.width / 2 - 20;
      const dist = Math.hypot(dx, dy);
      if (dist > max) {
        dx = (dx / dist) * max;
        dy = (dy / dist) * max;
      }
      knob.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      const nx = dx / max;
      const ny = dy / max;
      onMove(Math.abs(nx) > 0.16 ? nx : 0, Math.abs(ny) > 0.16 ? -ny : 0);
    },
    [onMove],
  );

  const reset = useCallback(() => {
    activeId.current = null;
    if (knobRef.current) knobRef.current.style.transform = "translate3d(0,0,0)";
    onMove(0, 0);
  }, [onMove]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 touch-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="anim-hint absolute inset-x-0 top-[26%] text-center font-pixel text-[9px] tracking-[0.22em] text-paper/70 [text-shadow:0_2px_4px_rgba(0,0,0,.8)]">
        DRAG ANYWHERE TO LOOK
      </div>

      {/* movement stick */}
      <div
        className="pointer-events-auto absolute left-4 sm:left-6"
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div
          ref={baseRef}
          className="touch-pad relative grid h-[118px] w-[118px] place-items-center rounded-full"
          onPointerDown={(e) => {
            e.preventDefault();
            activeId.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            update(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (activeId.current === e.pointerId) update(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (activeId.current === e.pointerId) reset();
          }}
          onPointerCancel={reset}
          onPointerLeave={(e) => {
            if (activeId.current === e.pointerId && e.buttons === 0) reset();
          }}
          role="presentation"
          aria-label="Movement joystick"
        >
          <div className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-white/12" />
          <div className="pointer-events-none absolute left-1/2 top-2 h-1 w-1 -translate-x-1/2 rounded-full bg-grass/60" />
          <div className="pointer-events-none absolute bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-grass/60" />
          <div className="pointer-events-none absolute left-2 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-grass/60" />
          <div className="pointer-events-none absolute right-2 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-grass/60" />
          <div
            ref={knobRef}
            className="touch-knob pointer-events-none flex h-[52px] w-[52px] items-center justify-center rounded-full will-change-transform"
          >
            <span className="font-pixel text-[9px] text-ink/70">MOVE</span>
          </div>
        </div>
      </div>

      {/* action buttons */}
      <div
        className="pointer-events-auto absolute right-4 flex flex-col items-end gap-2.5 sm:right-6"
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="jump-btn flex h-[52px] w-[52px] flex-col items-center justify-center rounded-full"
            onPointerDown={(e) => {
              e.preventDefault();
              onPlace();
            }}
            aria-label="Place block"
          >
            <Icon name="cube" className="text-[18px] text-mint" />
            <span className="font-pixel text-[6px] tracking-wider text-haze">BUILD</span>
          </button>

          <button
            type="button"
            className="jump-btn flex h-[56px] w-[56px] items-center justify-center rounded-full"
            onPointerDown={(e) => {
              e.preventDefault();
              onJump();
            }}
            aria-label="Jump"
          >
            <Icon name="arrowUp" className="text-[22px]" />
          </button>
        </div>

        <button
          type="button"
          className="mine-btn relative flex h-[84px] w-[84px] flex-col items-center justify-center rounded-full active:scale-95"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            onMine(true);
          }}
          onPointerUp={() => onMine(false)}
          onPointerCancel={() => onMine(false)}
          onLostPointerCapture={() => onMine(false)}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Mine block"
        >
          <span key={minePulse} className="anim-tap flex flex-col items-center gap-0.5">
            <Icon name="pickaxe" className="text-[26px]" />
            <span className="font-pixel text-[9px] tracking-[0.08em]">MINE</span>
          </span>
          <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-white/30" />
        </button>
      </div>
    </div>
  );
}
