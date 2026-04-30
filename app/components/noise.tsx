export function Noise() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.06] mix-blend-multiply dark:mix-blend-screen dark:opacity-[0.08]"
    >
      <filter id="grain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}
