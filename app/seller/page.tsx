"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { useLoc } from "@/lib/use-loc";
import { docsOf, isOpen, submitDocument } from "@/lib/loc";
import type { DocumentType, Trade } from "@/lib/types";
import { DOC_LABELS } from "@/lib/types";
import { UNIT } from "@/lib/config";
import { PARTY_NAMES } from "@/lib/placeholder-data";
import { explorerAddress, fmtDate, fmtMoney, shortAddr, tradeRef } from "@/lib/explorer";
import { sellerOrder } from "@/lib/order";
import { Empty, PageHeader, SectionHead, StatusPill, TxLink, fmtDuration, useCountdown } from "@/components/ui";
import { DocumentSlot, type Staged } from "@/components/DocumentSlot";
import { PlaceholderTag } from "@/components/PlaceholderTag";
import { useApp } from "@/components/Providers";

export default function SellerShipments() {
  const s = useLoc();
  const { toast, focus, setFocus } = useApp();
  const [staged, setStaged] = useState<Partial<Record<DocumentType, Staged>>>({});
  const [busy, setBusy] = useState(false);

  const trades = s ? sellerOrder(s.trades) : [];
  const trade = trades.find((t) => t.id === focus) ?? trades[0];

  useEffect(() => setStaged({}), [trade?.id]);

  const left = useCountdown(trade?.deadline ?? 0);

  if (!s) return <div className="h-96" />;

  if (!trade)
    return (
      <div>
        <PageHeader eyebrow="Seller · Shipment" title="Ship and prove it" />
        <Empty>No trades yet. Switch to Buyer to create one.</Empty>
      </div>
    );

  const docs = docsOf(s, trade.id);
  const escrow = s.vaults[trade.id] ?? 0;
  const expired = left === 0;
  const locked = !isOpen(trade) || expired;
  const stagedList = trade.requiredDocs.filter((d) => staged[d]);
  const ready = trade.requiredDocs.filter((d) => staged[d] || docs.some((x) => x.documentType === d)).length;
  const missing = trade.requiredDocs.filter((d) => !docs.some((x) => x.documentType === d) && !staged[d]);
  const ref = tradeRef(s.trades, trade.id);

  async function submit() {
    if (!trade) return;
    setFocus(trade.id);
    setBusy(true);
    let lastSig = "";
    try {
      for (const d of stagedList) {
        const st = staged[d]!;
        const { txSig } = await submitDocument(trade.id, { documentType: d, filename: st.filename, hash: st.hash });
        lastSig = txSig;
        setStaged((x) => ({ ...x, [d]: undefined }));
      }
      toast({
        kind: "ok",
        title: `${stagedList.length} document hash${stagedList.length === 1 ? "" : "es"} recorded on-chain`,
        sig: lastSig,
      });
    } catch (err) {
      toast({ kind: "err", title: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const rejected = trade.status === "Rejected";

  return (
    <div>
      <PageHeader
        eyebrow={rejected ? `${ref} · Rejected by verifier` : `Seller · Shipment · ${ref}`}
        title={rejected ? "Shipment not approved. Funds remain in escrow." : trade.title}
        tone={rejected ? "danger" : "fg"}
      >
        {!rejected && <StatusPill status={trade.status} label={statusLabel(trade, expired)} />}
      </PageHeader>

      <div className="grid gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[oklch(0.96_0.015_160)] p-5">
          <div className="text-[13px] font-medium text-money-ink">
            {escrow > 0 ? "Locked in escrow" : trade.status === "Paid" ? "Released to you" : "No longer in escrow"}
          </div>
          <div className="mt-2 font-mono text-[30px] leading-none tabular-nums">{fmtMoney(escrow > 0 ? escrow : trade.amount)}</div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px]">
            <PlaceholderTag id="P15" />
            <TxLink sig={trade.fundTxSig} label="escrow tx" />
          </div>
        </div>
        <Cell label="Goods">{trade.goods}</Cell>
        <Cell label="Buyer">
          {PARTY_NAMES.buyer}
          <a href={explorerAddress(trade.buyer)} target="_blank" rel="noreferrer" className="mt-1 block font-mono text-xs text-muted hover:text-fg">
            {shortAddr(trade.buyer)}
          </a>
        </Cell>
        <Cell label="Deadline">
          {fmtDate(trade.deadline)}
          <div className={`mt-1 flex items-center gap-2 text-xs ${expired && isOpen(trade) ? "text-danger" : "text-muted"}`}>
            {!isOpen(trade) ? "settled" : expired ? "passed" : `${fmtDuration(left)} left`} <PlaceholderTag id="P17" />
          </div>
        </Cell>
      </div>

      <StatusNote trade={trade} expired={expired} missing={missing.map((d) => DOC_LABELS[d])} />

      <section className="mt-9">
        <SectionHead
          title="Required documents"
          note={
            <span className="inline-flex flex-wrap items-center gap-2">
              Files stay off-chain. Their SHA-256 hashes are recorded on-chain. <PlaceholderTag id="P6" />
            </span>
          }
        />
        <ul>
          {trade.requiredDocs.map((d) => (
            <DocumentSlot
              key={`${trade.id}-${d}`}
              trade={trade}
              type={d}
              recorded={docs.find((x) => x.documentType === d)}
              staged={staged[d]}
              onStage={(v) => setStaged((x) => ({ ...x, [d]: v }))}
              locked={locked || busy}
            />
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-x-5 gap-y-3">
          <span className="text-sm text-muted">
            {ready} of {trade.requiredDocs.length} documents ready
          </span>
          <button onClick={submit} disabled={busy || locked || stagedList.length === 0} className="btn btn-money py-3">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? "Recording on-chain…" : rejected ? "Resubmit shipment proof" : "Submit shipment proof"}
          </button>
        </div>
      </section>
    </div>
  );
}

function statusLabel(t: Trade, expired: boolean) {
  if (t.status === "Funded") return expired ? "Deadline passed" : "Funded · awaiting shipment proof";
  if (t.status === "DocumentsSubmitted") return "Documents submitted";
  return undefined;
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-panel p-5">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="mt-2 text-[15px] leading-snug">{children}</div>
    </div>
  );
}

// One line under the summary saying what happens next for this trade.
function StatusNote({ trade, expired, missing }: { trade: Trade; expired: boolean; missing: string[] }) {
  const st = trade.status;
  let tone = "border-line bg-panel";
  let title = "";
  let body: React.ReactNode = null;
  if (st === "Paid") {
    tone = "border-money/40 bg-money/[0.06]";
    title = "Paid";
    body = "The inspector approved the shipment and the escrow paid you in the same transaction.";
  } else if (st === "Refunded") {
    title = "Refunded to buyer";
    body = "The deadline passed without an approved shipment, so the escrow went back to the buyer.";
  } else if (expired) {
    tone = "border-danger/40 bg-danger/[0.05]";
    title = "Deadline passed";
    body = "Documents can no longer be submitted. The buyer can now take a refund.";
  } else if (st === "Rejected") {
    tone = "border-danger/40 bg-danger/[0.05]";
    title = "What happens next";
    body = (
      <>
        Escrow still holds {fmtMoney(trade.amount)} {UNIT}. Nothing moves on rejection. Replace the document that was wrong
        and resubmit before the deadline; new hashes are recorded alongside the rejected ones.
      </>
    );
  } else if (st === "DocumentsSubmitted") {
    tone = "border-info/35 bg-info/[0.05]";
    title = "Waiting for the inspector";
    body = "All required document hashes are recorded. Switch to Inspector to approve the shipment.";
  } else {
    title = "Next: submit your documents";
    body = missing.length ? <>Still needed: {missing.join(", ")}.</> : "Everything is staged. Press Submit shipment proof.";
  }
  return (
    <div className={`mt-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-[4px] border px-5 py-4 ${tone}`}>
      <div className="min-w-0 max-w-3xl">
        <div className="text-[15px] font-semibold">{title}</div>
        <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
      </div>
      <Link href={`/trade/${trade.id}`} className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-sm font-medium text-money-ink hover:underline">
        Trade record <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
