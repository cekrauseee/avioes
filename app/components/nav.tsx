"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Contar" },
  { href: "/diary", label: "Diário" },
  { href: "/scoreboard", label: "Placar" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-5 font-display text-sm">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              active
                ? "text-ink underline decoration-clay decoration-2 underline-offset-[6px]"
                : "text-ink-soft hover:text-ink transition-colors"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
