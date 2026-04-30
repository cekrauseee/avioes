import { Nav } from "./nav";
import { ThemeToggle } from "./theme-toggle";
import type { Theme } from "../lib/types";

export function AppShell({
  children,
  theme,
  scroll = false,
}: {
  children: React.ReactNode;
  theme: Theme;
  scroll?: boolean;
}) {
  return (
    <div className="flex h-full w-full flex-col">
      <div
        className={
          scroll
            ? "scroll-area flex-1 overflow-y-auto"
            : "flex-1 overflow-hidden"
        }
      >
        {children}
      </div>
      <div className="flex items-center justify-between border-t border-line bg-bg-soft px-5 py-2.5 pb-[max(env(safe-area-inset-bottom),0.6rem)]">
        <Nav />
        <ThemeToggle theme={theme} />
      </div>
    </div>
  );
}
