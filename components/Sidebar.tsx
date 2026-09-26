"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Role, Trade } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/placeholder-data";
import { tradeRef } from "@/lib/explorer";
import { inspectorOrder, sellerOrder, shortTitle } from "@/lib/order";
import { useLoc } from "@/lib/use-loc";
import { useApp } from "./Providers";

const ROLE_HOME: Record<Role, string> = { buyer: "/buyer", seller: "/seller", inspector: "/inspector" };

const item = "block truncate rounded-[4px] px-3 py-[9px] text-sm transition-colors";
const idle = `${item} text-fg hover:bg-fg/5`;

// Design B: fixed left column on desktop (brand, role switcher, trades);
// a compact header with a scrolling row of links on phones.
export function Sidebar() {
  const { role, setRole, focus, setFocus } = useApp();
  const s = useLoc();
  const router = useRouter();
  const path = usePathname();

  // Opening a role's page directly (link, refresh) switches to that role too.
  // Runs on path changes only, so a click on the switcher isn't undone mid-navigation.
  useEffect(() => {
    const r = (Object.keys(ROLE_HOME) as Role[]).find((k) => path === ROLE_HOME[k] || path.startsWith(`${ROLE_HOME[k]}/`));
    if (r) setRole(r);
  }, [path, setRole]);

  const trades = s?.trades ?? [];
  const recordId = path.startsWith("/trade/") ? decodeURIComponent(path.slice(7)) : undefined;

  type Link_ = { key: string; label: string; href: string; active: boolean; rejected?: boolean; onClick?: () => void };
  let section = "Trades";
  let links: Link_[];
  if (role === "buyer") {
    links = [
      { key: "all", label: "All trades", href: "/buyer", active: path === "/buyer" || !!recordId },
      { key: "new", label: "New trade", href: "/buyer/new", active: path === "/buyer/new" },
    ];
  } else {
    const list: Trade[] = role === "seller" ? sellerOrder(trades) : inspectorOrder(trades);
    if (role === "inspector") section = "Review queue";
    const home = ROLE_HOME[role];
    const shown = recordId ?? (path === home ? (list.find((t) => t.id === focus) ?? list[0])?.id : undefined);
    links = list.map((t) => ({
      key: t.id,
      label: `${tradeRef(trades, t.id)} · ${shortTitle(t)}`,
      href: home,
      active: t.id === shown,
      rejected: t.status === "Rejected",
      onClick: () => setFocus(t.id),
    }));
  }

  const roleSwitch = (r: Role, compact: boolean) => {
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
        className={
          compact
            ? `rounded-[4px] px-2.5 py-1.5 text-[13px] ${active ? "bg-fg font-medium text-bg" : "text-fg"}`
            : active
              ? `${item} w-full bg-fg text-left font-medium text-bg`
              : `${idle} w-full text-left`
        }
      >
        {ROLE_LABELS[r]}
      </button>
    );
  };

  const linkCls = (l: Link_) =>
    l.active
      ? `${item} font-medium ${l.rejected ? "bg-danger/10 text-danger" : "bg-money/10 text-money-ink"}`
      : idle;

  const brand = (
    <Link href="/" className="block">
      <div className="text-[17px] font-bold tracking-[-0.01em]">Tradelock</div>
      <div className="mt-0.5 font-mono text-[11px] tracking-[0.06em] text-muted">SOLANA · DEVNET</div>
    </Link>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden border-r border-line bg-panel-2 lg:block">
        <div className="sticky top-0 max-h-dvh overflow-y-auto px-5 pb-8 pt-7">
          {brand}
          <div className="eyebrow mt-8 text-muted">Viewing as</div>
          <div className="mt-2.5 space-y-0.5" role="tablist" aria-label="Active role">
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => roleSwitch(r, false))}
          </div>
          <div className="eyebrow mt-8 text-muted">{section}</div>
          <nav className="mt-2.5 space-y-0.5">
            {links.map((l) => (
              <Link key={l.key} href={l.href} onClick={l.onClick} className={linkCls(l)}>
                {l.label}
              </Link>
            ))}
            {links.length === 0 && <div className="px-3 py-2 text-sm text-muted">No trades yet</div>}
          </nav>
        </div>
      </aside>

      {/* Phone / tablet */}
      <header className="sticky top-0 z-40 border-b border-line bg-panel-2 lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
          {brand}
          <div className="flex rounded-[5px] border border-line bg-panel p-0.5" role="tablist" aria-label="Active role">
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => roleSwitch(r, true))}
          </div>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2">
          {links.map((l) => (
            <Link key={l.key} href={l.href} onClick={l.onClick} className={`${linkCls(l)} shrink-0 py-1.5`}>
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
