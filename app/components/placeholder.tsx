type Props = {
  ratio?: string;
  label?: string;
  className?: string;
  tone?: "sage" | "clay" | "ink";
};

export function Placeholder({
  ratio = "1 / 1",
  label = "ilustração em breve",
  className = "",
  tone = "ink",
}: Props) {
  const color =
    tone === "sage"
      ? "text-sage border-sage/40"
      : tone === "clay"
        ? "text-clay border-clay/40"
        : "text-ink-faint border-ink/15";

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-dashed ${color} bg-paper ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] opacity-60">
          {label}
        </span>
      </div>
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 14px)",
        }}
      />
    </div>
  );
}
