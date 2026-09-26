"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Hourglass, Loader2, LockKeyhole, RotateCcw, TriangleAlert } from "lucide-react";
import { useLoc } from "@/lib/use-loc";
import { docsOf, eventsOf, isOpen, refundAfterDeadline } from "@/lib/loc";
import type { Settlement, Trade } from "@/lib/types";
import { DOC_LABELS } from "@/lib/types";
import { explorerAddress, explorerTx, fmtDate, fmtMoney, shortAddr, tradeRef } from "@/lib/explorer";
import { CHAIN_MODE, UNIT } from "@/lib/config";
import { PARTY_NAMES } from "@/lib/placeholder-data";
import { Empty, Hash, PageHeader, Row, SectionHead, StatusPill, fmtDuration, useCountdown } from "@/components/ui";
import { AuditTrail, Timeline } from "@/components/Timeline";
import { SettlementCard } from "@/components/SettlementCard";
import { PlaceholderTag } from "@/components/PlaceholderTag";
import { useApp } from "@/components/Providers";

export default function TradeRecord() {
  const { id } = useParams<{ id: string }>();
  const s = useLoc();
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const trade = s?.trades.find((t) => t.id === id);
  const left = useCountdown(trade?.deadline ?? 0);

  if (!s) return <div className="h-96" />;
  if (!trade)
    return (
      <Empty>
        Trade not found.{" "}
        <Link href="/buyer" className="text-fg underline">
          Back to trades
        </Link>
      </Empty>
    );

  const docs = docsOf(s, trade.id);
  const events = eventsOf(s, trade.id);
  const escrow = s.vaults[trade.id] ?? 0;
  const refundable = isOpen(trade) && left === 0;

  async function refund() {
    if (!trade) return;
    setBusy(true);
    try {
      const amount = escrow;
      const { txSig } = await refundAfterDeadline(trade.id);
      setSettlement({ kind: "refunded", tradeId: trade.id, title: trade.title, amount, to: trade.buyer, txSig });
    } catch (err) {
      toast({ kind: "err", title: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const ref = tradeRef(s.trades, trade.id);
  const settled = trade.status === "Paid" || trade.status === "Refunded";
  const rejected = trade.status === "Rejected";

  return (
    <div>
      <Link href="/buyer" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> All trades
      </Link>

      {settled ? (
        <SettledHero trade={trade} ref_={ref} />
      ) : (
        <PageHeader
          eyebrow={rejected ? `${ref} · Rejected by verifier` : `Trade record · ${ref}`}
          title={rejected ? "Shipment not approved. Funds remain in escrow." : trade.title}
          tone={rejected ? "danger" : "fg"}
        >
          {!rejected && <StatusPill status={trade.status} />}
        </PageHeader>
      )}

      {!settled && <Banner trade={trade} escrow={escrow} refundable={refundable} left={left} busy={busy} onRefund={refund} />}

      <section className="card mt-8 p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[17px] font-semibold">Settlement timeline</div>
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted">Funded → Documents → Verified → Paid</span>
        </div>
        <Timeline trade={trade} docs={docs} events={events} />
      </section>

      <section className="mt-9">
        <SectionHead
          title="Trade record"
          note={
            <span className="inline-flex items-center gap-2">
              <PlaceholderTag id="P11" /> {CHAIN_MODE ? "Every step is a Solana transaction anyone can inspect." : "Every step is logged with its transaction reference."}
            </span>
          }
        />
        <AuditTrail events={events} />
        {settled && (
          <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-[4px] border border-dashed border-line-2 px-5 py-4">
            <span className="text-[13px] text-muted">Other outcome</span>
            <span className="text-[15px]">
              {trade.status === "Paid" ? "Deadline reached → funds refundable to buyer" : "Inspector approves → funds released to seller"}
            </span>
          </div>
        )}
      </section>

      <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <SectionHead title="Document fingerprints" note="SHA-256, recorded on-chain" />
          <ul>
            {trade.requiredDocs.map((d) => {
              const doc = docs.find((x) => x.documentType === d);
              return (
                <li key={d} className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line py-3.5">
                  <div className="min-w-0 flex-1 basis-48">
                    <div className="text-[15px] font-medium">{DOC_LABELS[d]}</div>
                    <div className="truncate text-[13px] text-muted">{doc ? doc.filename : "Not submitted"}</div>
                  </div>
                  {doc ? <Hash value={doc.hash} n={10} className="!text-fg" /> : <span className="text-[13px] text-muted">—</span>}
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <div className="eyebrow text-muted">Balances</div>
              <PlaceholderTag id="P13" />
            </div>
            <div className="mt-3 space-y-2.5">
              <Balance label="Escrow vault" value={escrow} strong />
              <Balance label={PARTY_NAMES.buyer} value={s.balances[trade.buyer] ?? 0} />
              <Balance label={PARTY_NAMES.seller} value={s.balances[trade.seller] ?? 0} />
            </div>
          </section>

          <section className="card p-5">
            <div className="eyebrow text-muted">Terms</div>
            <div className="mt-3 space-y-0.5 text-sm">
              <Row k="Amount" v={<span className="font-mono font-normal">{fmtMoney(trade.amount)} {UNIT}</span>} />
              <Row k="Created" v={<span className="font-normal">{fmtDate(trade.createdAt)}</span>} />
              <Row k="Deadline" v={<span className="font-normal">{fmtDate(trade.deadline)}</span>} />
              <Row
                k="Time left"
                v={
                  <span className="inline-flex items-center gap-1.5 font-normal">
                    {isOpen(trade) ? (left ? fmtDuration(left) : "passed") : "settled"} <PlaceholderTag id="P17" />
                  </span>
                }
              />
            </div>
            <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed">{trade.goods}</p>
            <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
              {(["buyer", "seller", "inspector"] as const).map((r) => (
                <div key={r} className="flex items-center justify-between gap-3">
                  <span>{PARTY_NAMES[r]}</span>
                  <a href={explorerAddress(trade[r])} target="_blank" rel="noreferrer" className="font-mono text-xs text-muted hover:text-fg">
                    {shortAddr(trade[r])}
                  </a>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <a href={explorerAddress(trade.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-money-ink hover:underline">
                  Trade account {shortAddr(trade.id, 6)} {CHAIN_MODE && <ExternalLink className="size-3" />}
                </a>
                <PlaceholderTag id="P15" />
              </div>
            </div>
          </section>
        </aside>
      </div>

      <SettlementCard settlement={settlement} onClose={() => setSettlement(null)} />
    </div>
  );
}

function Balance({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={`truncate ${strong ? "font-medium text-money-ink" : "text-muted"}`}>{label}</span>
      <span className="font-mono tabular-nums">{fmtMoney(value)}</span>
    </div>
  );
}

// Full-width result block for a finished trade (design B, screen D).
function SettledHero({ trade, ref_ }: { trade: Trade; ref_: string }) {
  const paid = trade.status === "Paid";
  return (
    <div className={`rounded-[4px] px-6 py-7 text-white sm:px-8 ${paid ? "bg-money" : "bg-fg"}`}>
      <div className="font-mono text-xs uppercase tracking-[0.08em] text-white/80">
        Settlement · {ref_} · {paid ? "Paid" : "Refunded"}
      </div>
      <h1 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">
        {paid ? `Shipment verified → ${UNIT} released to seller` : `Deadline reached → ${UNIT} refunded to buyer`}
      </h1>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-9 gap-y-2 text-[15px] text-white/90">
        <span>
          <span className="font-mono text-[20px] text-white">
            {fmtMoney(trade.amount)} {UNIT}
          </span>{" "}
          {paid ? "released" : "refunded"}
        </span>
        <span>
          Escrow balance <span className="font-mono">0.00</span>
        </span>
        <span>{paid ? `Verified by ${PARTY_NAMES.inspector}` : "No approved shipment before the deadline"}</span>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/25 pt-4 text-sm">
        <PlaceholderTag id="P15" />
        {trade.settleTxSig && (
          <a href={explorerTx(trade.settleTxSig)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-mono text-white">
            {paid ? "settlement" : "refund"} tx {shortAddr(trade.settleTxSig, 4)}
            {CHAIN_MODE && (
              <>
                <span className="font-sans underline underline-offset-2">Open in Solana Explorer</span> <ExternalLink className="size-3" />
              </>
            )}
          </a>
        )}
      </div>
    </div>
  );
}

function Banner({
  trade,
  escrow,
  refundable,
  left,
  busy,
  onRefund,
}: {
  trade: Trade;
  escrow: number;
  refundable: boolean;
  left: number;
  busy: boolean;
  onRefund: () => void;
}) {
  const box = "flex flex-wrap items-center justify-between gap-4 rounded-[4px] border px-5 py-4";
  if (refundable)
    return (
      <div className={`${box} border-warn/50 bg-warn/[0.07]`}>
        <div className="flex items-center gap-3">
          <TriangleAlert className="size-5 shrink-0 text-warn" />
          <div>
            <div className="flex flex-wrap items-center gap-2 font-semibold">
              Deadline reached → funds refundable to buyer <PlaceholderTag id="P9" />
            </div>
            <div className="text-sm text-muted">
              {fmtMoney(escrow)} {UNIT} is still in escrow without an approved shipment. Anyone can trigger the refund; it can only go to the buyer.
            </div>
          </div>
        </div>
        <button onClick={onRefund} disabled={busy} className="btn btn-primary">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
          {busy ? "Refunding…" : "Refund to buyer"}
        </button>
      </div>
    );
  return (
    <div className={`${box} border-money/35 bg-[oklch(0.96_0.015_160)]`}>
      <div className="flex items-center gap-3">
        <LockKeyhole className="size-5 shrink-0 text-money-ink" />
        <div>
          <div className="font-semibold">
            <span className="font-mono">{fmtMoney(escrow)}</span> {UNIT} locked in escrow
          </div>
          <div className="text-sm text-muted">
            {trade.status === "Rejected"
              ? "Nothing moves on rejection. The seller can resubmit corrected documents before the deadline."
              : "Released to the seller when the inspector approves. Refundable to the buyer if the deadline passes first."}
          </div>
        </div>
      </div>
      <div className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-muted">
        <Hourglass className="size-4" /> {fmtDuration(left)} to deadline
      </div>
    </div>
  );
}
