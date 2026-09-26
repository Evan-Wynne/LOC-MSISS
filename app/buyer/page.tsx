"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { useLoc } from "@/lib/use-loc";
import { isOpen } from "@/lib/loc";
import { DEMO_WALLETS } from "@/lib/placeholder-data";
import { fmtAmount, fmtDate, shortAddr } from "@/lib/explorer";
import { UNIT } from "@/lib/config";
import { Amount, Empty, PageHeader, StatusPill } from "@/components/ui";
import { PlaceholderTag } from "@/components/PlaceholderTag";

export default function BuyerTrades() {
  const s = useLoc();
  if (!s) return <div className="h-96" />;

  const locked = s.trades.filter(isOpen).reduce((t, x) => t + (s.vaults[x.id] ?? 0), 0);
  const released = s.trades.filter((t) => t.status === "Paid").reduce((t, x) => t + x.amount, 0);

  return (
    <div>
      <PageHeader role="buyer" eyebrow="Buyer" title="Your trades" sub="Every trade you've funded, with its escrow status. Open one to see the full on-chain record.">
        <Link href="/buyer/new" className="btn btn-primary">
          <Plus className="size-4" /> New trade
        </Link>
      </PageHeader>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Buyer wallet" sub={shortAddr(DEMO_WALLETS.buyer)} value={s.balances[DEMO_WALLETS.buyer] ?? 0} tag />
        <Stat label="Locked in escrow" value={locked} tone="text-money" />
        <Stat label="Released to sellers" value={released} />
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
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {s.trades.map((t) => (
              <li key={t.id}>
                <Link href={`/trade/${t.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-panel-2/60">
                  <div className="min-w-0 flex-1 basis-64">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{t.title}</span>
                      <StatusPill status={t.status} />
                      {t.id.startsWith("trd_seed") && <PlaceholderTag id="P14" />}
                    </div>
                    <div className="mt-0.5 truncate text-sm text-muted">{t.goods}</div>
                  </div>
                  <div className="text-sm tabular-nums">
                    {fmtAmount(t.amount)} <span className="text-muted">{UNIT}</span>
                  </div>
                  <div className="w-44 text-xs text-muted">Deadline {fmtDate(t.deadline)}</div>
                  <ChevronRight className="hidden size-4 text-muted sm:block" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, sub, value, tone = "", tag }: { label: string; sub?: string; value: number; tone?: string; tag?: boolean }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>
          {label} {sub && <span className="font-mono">· {sub}</span>}
        </span>
        {tag && <PlaceholderTag id="P13" />}
      </div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight ${tone}`}>
        <Amount value={value} />
      </div>
    </div>
  );
}
