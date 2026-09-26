"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LockKeyhole, Ship, Stamp } from "lucide-react";
import type { Role } from "@/lib/types";
import { DEMO_WALLETS, ROLE_LABELS } from "@/lib/placeholder-data";
import { shortAddr } from "@/lib/explorer";
import { useApp } from "./Providers";
import { ROLE_BG } from "./ui";

const ROLE_ICON = { buyer: Building2, seller: Ship, inspector: Stamp };
const ROLE_HOME: Record<Role, string> = { buyer: "/buyer", seller: "/seller", inspector: "/inspector" };
const ROLE_LINKS: Record<Role, { href: string; label: string }[]> = {
  buyer: [
    { href: "/buyer", label: "Trades" },
    { href: "/buyer/new", label: "New trade" },
  ],
  seller: [{ href: "/seller", label: "Shipments" }],
  inspector: [{ href: "/inspector", label: "Verification" }],
};

export function Nav() {
  const { role, setRole } = useApp();
  const router = useRouter();
  const path = usePathname();

  // Opening a role's page directly (link, refresh) switches to that role too.
  // Runs on path changes only, so a click on the switcher isn't undone mid-navigation.
  useEffect(() => {
    const r = (Object.keys(ROLE_HOME) as Role[]).find((k) => path === ROLE_HOME[k] || path.startsWith(`${ROLE_HOME[k]}/`));
    if (r) setRole(r);
  }, [path, setRole]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-lg bg-money text-bg">
            <LockKeyhole className="size-4" strokeWidth={2.25} />
          </span>
          Tradelock
        </Link>

        <nav className="order-3 -mx-2.5 flex w-full items-center gap-1 text-sm md:order-none md:mx-0 md:w-auto">
          {ROLE_LINKS[role].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-2.5 py-1.5 transition-colors ${
                path === l.href ? "bg-panel-2 text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-mono text-xs text-muted lg:inline" title={DEMO_WALLETS[role]}>
            {shortAddr(DEMO_WALLETS[role])}
          </span>
          <div className="flex rounded-xl border border-line bg-panel p-1" role="tablist" aria-label="Active role">
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => {
              const Icon = ROLE_ICON[r];
              const active = r === role;
              return (
                <button
                  key={r}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setRole(r);
                    router.push(ROLE_HOME[r]);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    active ? "bg-panel-2 text-fg ring-1 ring-line-2" : "text-muted hover:text-fg"
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${ROLE_BG[r]} ${active ? "" : "opacity-50"}`} />
                  <Icon className="hidden size-3.5 sm:block" />
                  {ROLE_LABELS[r]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
