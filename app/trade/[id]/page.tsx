"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CircleCheck, ExternalLink, Hourglass, Loader2, LockKeyhole, RotateCcw, TriangleAlert } from "lucide-react";
import { useLoc } from "@/lib/use-loc";
import { docsOf, eventsOf, isOpen, refundAfterDeadline } from "@/lib/loc";
import type { Settlement, Trade } from "@/lib/types";
import { DOC_LABELS } from "@/lib/types";
import { explorerAddress, fmtAmount, fmtDate, shortAddr } from "@/lib/explorer";
import { UNIT } from "@/lib/config";
import { PARTY_NAMES } from "@/lib/placeholder-data";
import { Amount, Empty, Hash, PageHeader, RoleDot, Row, StatusPill, TxLink, fmtDuration, useCountdown } from "@/components/ui";
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

  return (
    <div>
      <Link href="/buyer" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> All trades
      </Link>
      <PageHeader
        eyebrow="Trade record · Screen D"
        title={trade.title}
        sub={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs">{shortAddr(trade.id, 6)}</span>
            <a href={explorerAddress(trade.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs hover:text-fg">
              account on Explorer <ExternalLink className="size-3" />
            </a>
            <PlaceholderTag id="P15" />
          </span>
        }
      >
        <StatusPill status={trade.status} />
      </PageHeader>

      <Banner trade={trade} escrow={escrow} refundable={refundable} left={left} busy={busy} onRefund={refund} />

      <section className="card mt-6 p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="font-medium">Settlement timeline</div>
          <span className="text-xs text-muted">Funded → Documents → Verified → Paid</span>
        </div>
        <Timeline trade={trade} docs={docs} events={events} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="font-medium">Audit trail</div>
              <span className="inline-flex items-center gap-2 text-xs text-muted">
                every step is a transaction <PlaceholderTag id="P11" />
              </span>
            </div>
            <AuditTrail events={events} />
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4 font-medium">Document fingerprints</div>
            <ul className="divide-y divide-line">
              {trade.requiredDocs.map((d) => {
                const doc = docs.find((x) => x.documentType === d);
                return (
                  <li key={d} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
                    <div className="min-w-0 flex-1 basis-48">
                      <div className="text-sm">{DOC_LABELS[d]}</div>
                      <div className="truncate text-xs text-muted">{doc ? doc.filename : "Not submitted"}</div>
                    </div>
                    {doc ? <Hash value={doc.hash} n={10} /> : <span className="text-xs text-muted">—</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <div className="font-medium">Balances</div>
              <PlaceholderTag id="P13" />
            </div>
            <div className="mt-3 space-y-3">
              <Balance label="Escrow vault" icon={<LockKeyhole className="size-3.5 text-money" />} value={escrow} tone={escrow ? "text-money" : ""} />
              <Balance label={PARTY_NAMES.buyer} icon={<RoleDot role="buyer" />} value={s.balances[trade.buyer] ?? 0} />
              <Balance label={PARTY_NAMES.seller} icon={<RoleDot role="seller" />} value={s.balances[trade.seller] ?? 0} />
            </div>
          </section>

          <section className="card p-5">
            <div className="font-medium">Terms</div>
            <div className="mt-3 space-y-0.5 text-sm">
              <Row k="Amount" v={`${fmtAmount(trade.amount)} ${UNIT}`} />
              <Row k="Created" v={fmtDate(trade.createdAt)} />
              <Row k="Deadline" v={fmtDate(trade.deadline)} />
              <Row
                k="Time left"
                v={
                  <span className="inline-flex items-center gap-1.5">
                    {isOpen(trade) ? (left ? fmtDuration(left) : "passed") : "settled"} <PlaceholderTag id="P17" />
                  </span>
                }
              />
            </div>
            <div className="mt-3 rounded-lg bg-panel-2 px-3.5 py-3 text-sm ring-1 ring-line">
              <span className="text-muted">Goods · </span>
              {trade.goods}
            </div>
            <div className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
              {(["buyer", "seller", "inspector"] as const).map((r) => (
                <div key={r} className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <RoleDot role={r} /> {PARTY_NAMES[r]}
                  </span>
                  <a href={explorerAddress(trade[r])} target="_blank" rel="noreferrer" className="font-mono text-xs text-muted hover:text-fg">
                    {shortAddr(trade[r])}
                  </a>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <SettlementCard settlement={settlement} onClose={() => setSettlement(null)} />
    </div>
  );
}

function Balance({ label, icon, value, tone = "" }: { label: string; icon: React.ReactNode; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted">
        {icon} <span className="truncate">{label}</span>
      </span>
      <span className={`text-sm font-medium ${tone}`}>
        <Amount value={value} className="text-[15px]" />
      </span>
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
  const box = "flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4 ring-1";
  if (trade.status === "Paid")
    return (
      <div className={`${box} bg-money/[0.07] ring-money/30`}>
        <div className="flex items-center gap-3">
          <CircleCheck className="size-5 shrink-0 text-money" />
          <div>
            <div className="font-medium">
              Shipment verified → {fmtAmount(trade.amount)} {UNIT} released to seller
            </div>
            <div className="text-sm text-muted">
              {trade.approvedAt && `Approved by the inspector on ${fmtDate(trade.approvedAt)}. `}Verification and payment were one transaction.
            </div>
          </div>
        </div>
        {trade.settleTxSig && <TxLink sig={trade.settleTxSig} label="settlement tx" />}
      </div>
    );
  if (trade.status === "Refunded")
    return (
      <div className={`${box} bg-buyer/[0.07] ring-buyer/30`}>
        <div className="flex items-center gap-3">
          <RotateCcw className="size-5 shrink-0 text-buyer" />
          <div>
            <div className="font-medium">
              Deadline reached → {fmtAmount(trade.amount)} {UNIT} refunded to buyer
            </div>
            <div className="text-sm text-muted">No approved shipment before the deadline, so the escrow went back to the buyer.</div>
          </div>
        </div>
        {trade.settleTxSig && <TxLink sig={trade.settleTxSig} label="refund tx" />}
      </div>
    );
  if (refundable)
    return (
      <div className={`${box} bg-warn/[0.07] ring-warn/30`}>
        <div className="flex items-center gap-3">
          <TriangleAlert className="size-5 shrink-0 text-warn" />
          <div>
            <div className="flex flex-wrap items-center gap-2 font-medium">
              Deadline reached → funds refundable to buyer <PlaceholderTag id="P9" />
            </div>
            <div className="text-sm text-muted">
              {fmtAmount(escrow)} {UNIT} is still in escrow without an approved shipment. Anyone can trigger the refund; it can only go to the buyer.
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
    <div className={`${box} bg-panel ring-line`}>
      <div className="flex items-center gap-3">
        <LockKeyhole className="size-5 shrink-0 text-money" />
        <div>
          <div className="font-medium">
            {fmtAmount(escrow)} {UNIT} locked in escrow
          </div>
          <div className="text-sm text-muted">
            Released to the seller when the inspector approves. Refundable to the buyer if the deadline passes first.
          </div>
        </div>
      </div>
      <div className="inline-flex items-center gap-1.5 text-sm tabular-nums text-muted">
        <Hourglass className="size-4" /> {fmtDuration(left)} to deadline
      </div>
    </div>
  );
}
