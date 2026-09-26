"use client";

import Link from "next/link";
import { useLoc } from "@/lib/use-loc";
import { isOpen } from "@/lib/loc";
import { DEMO_WALLETS, PARTY_NAMES } from "@/lib/placeholder-data";
import { fmtMoney, shortAddr, tradeRef } from "@/lib/explorer";
import { UNIT } from "@/lib/config";
import type { Trade } from "@/lib/types";
import { Empty, PageHeader, StatusPill } from "@/components/ui";
import { PlaceholderTag } from "@/components/PlaceholderTag";

const day = (ms: number) => new Date(ms).toLocaleDateString("en-IE", { day: "numeric", month: "short" });

function when(t: Trade) {
  if (t.status === "Paid") return `settled ${day(t.approvedAt ?? t.deadline)}`;
  if (t.status === "Refunded") return "refunded";
  return `due ${day(t.deadline)}`;
}

export default function BuyerTrades() {
  const s = useLoc();
  if (!s) return <div className="h-96" />;

  const locked = s.trades.filter(isOpen).reduce((t, x) => t + (s.vaults[x.id] ?? 0), 0);
  const released = s.trades.filter((t) => t.status === "Paid").reduce((t, x) => t + x.amount, 0);
  const hasSeed = s.trades.some((t) => t.id.startsWith("trd_seed"));

  return (
    <div>
      <PageHeader eyebrow={`Buyer · ${PARTY_NAMES.buyer}`} title="Letters of credit">
        <Link href="/buyer/new" className="btn btn-money">
          New trade
        </Link>
      </PageHeader>

      <div className="mb-8 grid overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-3 [&>*]:bg-panel gap-px">
        <Stat label="Locked in escrow" value={locked} money />
        <Stat label="Released to sellers" value={released} />
        <Stat
          label={
            <span className="inline-flex items-center gap-2">
              Buyer wallet <span className="font-mono text-xs">{shortAddr(DEMO_WALLETS.buyer)}</span> <PlaceholderTag id="P13" />
            </span>
          }
          value={s.balances[DEMO_WALLETS.buyer] ?? 0}
        />
      </div>

      {s.trades.length === 0 ? (
        <Empty>
          No trades yet.{" "}
          <Link href="/buyer/new" className="text-fg underline">
            Create the first one
          </Link>
          .
        </Empty>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[96px_minmax(0,1fr)_minmax(0,180px)_140px_180px] gap-4 border-t-[1.5px] border-fg py-3.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
              <span>Ref</span>
              <span>Goods / route</span>
              <span>Seller</span>
              <span className="text-right">{UNIT}</span>
              <span>Status</span>
            </div>
            <ul className="border-t border-line">
              {s.trades.map((t) => (
                <li key={t.id} className="border-b border-line">
                  <Link
                    href={`/trade/${t.id}`}
                    className="grid grid-cols-[96px_minmax(0,1fr)_minmax(0,180px)_140px_180px] items-center gap-4 py-4 transition-colors hover:bg-fg/[0.03]"
                  >
                    <span className="font-mono text-[13px]">{tradeRef(s.trades, t.id)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium">{t.title}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {t.goods} · {when(t)}
                      </span>
                    </span>
                    <span className="truncate text-[15px]">{PARTY_NAMES.seller}</span>
                    <span className="text-right font-mono text-[15px] tabular-nums">{fmtMoney(t.amount)}</span>
                    <span>
                      <StatusPill status={t.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Phone list */}
          <ul className="border-t-[1.5px] border-fg md:hidden">
            {s.trades.map((t) => (
              <li key={t.id} className="border-b border-line">
                <Link href={`/trade/${t.id}`} className="block py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[13px] text-muted">{tradeRef(s.trades, t.id)}</span>
                    <StatusPill status={t.status} />
                  </div>
                  <div className="mt-1.5 text-[15px] font-medium">{t.title}</div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[13px] text-muted">
                    <span className="truncate">{when(t)}</span>
                    <span className="shrink-0 font-mono text-[15px] text-fg tabular-nums">{fmtMoney(t.amount)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {hasSeed && (
            <div className="mt-6 flex items-center gap-3 text-[13px] text-muted">
              <PlaceholderTag id="P14" />
              Seeded trades, counterparties and amounts are placeholder data.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, money }: { label: React.ReactNode; value: number; money?: boolean }) {
  return (
    <div className={`px-5 py-4 ${money ? "!bg-[oklch(0.96_0.015_160)]" : ""}`}>
      <div className={`text-[13px] ${money ? "font-medium text-money-ink" : "text-muted"}`}>{label}</div>
      <div className="mt-1.5 font-mono text-[26px] leading-none tabular-nums">
        {fmtMoney(value)} <span className="font-sans text-[13px] text-muted">{UNIT}</span>
      </div>
    </div>
  );
}
