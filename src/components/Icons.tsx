import type { SVGProps } from "react";

type IconName =
  | "play"
  | "pause"
  | "restart"
  | "home"
  | "sound"
  | "mute"
  | "trophy"
  | "pickaxe"
  | "clock"
  | "sparkle"
  | "keyboard"
  | "mouse"
  | "touch"
  | "arrowUp"
  | "arrowRight"
  | "info"
  | "target"
  | "chevron"
  | "bolt"
  | "flame"
  | "cube"
  | "calendar"
  | "infinity"
  | "sun";

const paths: Record<IconName, React.ReactNode> = {
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.5" height="14" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="0.5" fill="currentColor" stroke="none" />
    </>
  ),
  restart: (
    <>
      <path d="M4 12a8 8 0 1 0 2.5-5.8" />
      <path d="M4 4v4h4" />
    </>
  ),
  home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10.5V20h12v-9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  sound: (
    <>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4Z" fill="currentColor" stroke="none" />
      <path d="M15.5 9a4.5 4.5 0 0 1 0 6" />
      <path d="M18 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4Z" fill="currentColor" stroke="none" />
      <path d="m16 9.5 5 5m0-5-5 5" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5.5H5v2a3 3 0 0 0 3 3M16 5.5h3v2a3 3 0 0 1-3 3" />
      <path d="M12 13v4M9 20h6M10 20l.5-3h3l.5 3" />
    </>
  ),
  pickaxe: (
    <>
      <path d="M4 20 14.5 9.5" strokeWidth={2.4} />
      <path d="M8.5 4.5c3-1.5 7-.8 9.5 1.5-3 .4-5 1.6-6.6 3.6-1.9 2.4-2.4 4.7-2.6 6.9-1.6-2.2-2.6-4.4-2.6-6.7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5 13.6 9l5.4 1.7-5.4 1.7L12 18l-1.6-5.6L5 10.7 10.4 9 12 3.5Z" />
      <path d="M18.5 16.5 19.3 19l2.7.8-2.7.8-.8 2.4" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2.5" y="6.5" width="19" height="11" rx="1.6" />
      <path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7 13.5h10" />
    </>
  ),
  mouse: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="5" />
      <path d="M12 7v4" />
    </>
  ),
  touch: (
    <>
      <path d="M9 11V6.5a2 2 0 1 1 4 0V12" />
      <path d="M13 11V9.8a2 2 0 1 1 4 0V14c0 4-2.4 6-6 6h-1c-2.4 0-3.4-1.2-4.3-2.7L4 14.5a2 2 0 0 1 3.4-2L9 14" />
    </>
  ),
  arrowUp: <path d="M12 19V5m0 0-6 6m6-6 6 6" />,
  arrowRight: <path d="M5 12h14m0 0-6-6m6 6-6 6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8h.01" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  bolt: <path d="M13 2.5 5 13h6l-1 8.5L19 11h-6l0-8.5Z" fill="currentColor" stroke="none" />,
  flame: (
    <path d="M12 3.5c2 3 5 5.2 5 9.2a5 5 0 1 1-10 0c0-2.4 1.3-4.6 3-6.2-.2 1.8.6 2.9 1.5 3.3.2-2.2 0-4.3.5-6.3Z" />
  ),
  cube: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  infinity: (
    <path d="M18.2 9c1.9 0 3.3 1.3 3.3 3s-1.4 3-3.3 3c-2.6 0-4.4-6-7.4-6-1.9 0-3.3 1.3-3.3 3s1.4 3 3.3 3c3 0 4.8-6 7.4-6Z" />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5V5M12 19v2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2.5 12H5M19 12h2.5M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </>
  ),
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

/** Isometric voxel cube used as an emblem and as ore swatches. */
export function BlockCube({
  top = "#a8f07a",
  left = "#6bc249",
  right = "#4d9836",
  soil,
  className,
  style,
}: {
  top?: string;
  left?: string;
  right?: string;
  soil?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden="true">
      <path d="M32 4 60 19 32 34 4 19Z" fill={top} />
      <path d="M4 19v26l28 15V34Z" fill={left} />
      <path d="M60 19v26L32 60V34Z" fill={right} />
      {soil && (
        <>
          <path d="M4 30v15l28 15V34Z" fill="#7d5236" opacity="0.95" />
          <path d="M60 30v15L32 60V34Z" fill="#68432c" opacity="0.95" />
          <path d="M4 30l6-3 7 2 8-3 7 3 6-2 8 3 7-2 7 4v3l-28 15L4 33Z" fill="#7fbf52" />
        </>
      )}
      <path d="M32 4 60 19 32 34 4 19Z" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1.4" />
      <path d="M4 19v26l28 15V34Z" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.2" />
      <path d="M60 19v26L32 60V34Z" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.2" />
    </svg>
  );
}
