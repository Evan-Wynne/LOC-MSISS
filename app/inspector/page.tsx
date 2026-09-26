"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Stamp, X } from "lucide-react";
import { useLoc } from "@/lib/use-loc";
import { approveShipment, docsOf, isOpen, rejectShipment } from "@/lib/loc";
import type { Settlement } from "@/lib/types";
import { DOC_LABELS } from "@/lib/types";
import { fmtAmount, fmtDate } from "@/lib/explorer";
import { UNIT } from "@/lib/config";
import { Amount, Empty, Hash, PageHeader, Party, StatusPill, TxLink, fmtDuration, useCountdown } from "@/components/ui";
import { TradePicker } from "@/components/TradePicker";
import { VerifyDropZone } from "@/components/VerifyDropZone";
import { SettlementCard } from "@/components/SettlementCard";
import { PlaceholderTag } from "@/components/PlaceholderTag";
import { useApp } from "@/components/Providers";

const RANK: Record<string, number> = { DocumentsSubmitted: 0, Funded: 1, Rejected: 2, Paid: 3, Refunded: 4, Verified: 3 };

export default function InspectorQueue() {
  const s = useLoc();
  const { toast } = useApp();
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);

  const trades = s ? [...s.trades].sort((a, b) => RANK[a.status] - RANK[b.status] || b.createdAt - a.createdAt) : [];
  const trade = trades.find((t) => t.id === selected) ?? trades[0];
  const left = useCountdown(trade?.deadline ?? 0);

  if (!s) return <div className="h-96" />;

  const header = (
    <PageHeader
      role="inspector"
      eyebrow="Inspector · Screen C"
      title="Verify the shipment"
      sub="Check the goods and the documents, then approve on-chain. Your approval is what releases the escrow."
    />
  );
  if (!trade)
    return (
      <div>
        {header}
        <Empty>Nothing to inspect yet.</Empty>
      </div>
    );

  const docs = docsOf(s, trade.id);
  const escrow = s.vaults[trade.id] ?? 0;
  const ready = trade.status === "DocumentsSubmitted";

  async function run(kind: "approve" | "reject") {
    if (!trade) return;
    setSelected(trade.id);
    setBusy(kind);
    try {
      if (kind === "approve") {
        const amount = escrow;
        const { txSig } = await approveShipment(trade.id);
        setSettlement({ kind: "released", tradeId: trade.id, title: trade.title, amount, to: trade.seller, txSig });
      } else {
        const { txSig } = await rejectShipment(trade.id);
        toast({ kind: "ok", title: "Shipment rejected. Funds stay in escrow; the seller can resubmit.", sig: txSig });
      }
    } catch (err) {
      toast({ kind: "err", title: (err as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {header}
      <TradePicker trades={trades} value={trade.id} onChange={setSelected} />

      {/* PLACEHOLDER[P19]: one designated inspector key (a demo key held by the server in chain mode); its approval is an attestation, not proof of the physical shipment → REAL: multisig verifiers, shipping-line data, electronic bills of lading or an oracle attestation (see docs/ROADMAP.md §7) */}
      <div className="mb-6 flex gap-3 rounded-2xl border border-inspector/25 bg-inspector/[0.06] px-5 py-4">
        <Stamp className="mt-0.5 size-5 shrink-0 text-inspector" />
        <div className="text-sm leading-relaxed">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            You are the bridge between the physical shipment and the chain.
            <PlaceholderTag id="P19" />
          </div>
          <p className="mt-1 text-muted">
            The contract can&apos;t see the goods. It checks that <span className="text-fg">you, the authorised inspector,</span>{" "}
            approved, and that every required document hash is recorded. Inspect the shipment before you sign.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold tracking-tight">{trade.title}</div>
                <div className="mt-1 text-sm text-muted">{trade.goods}</div>
              </div>
              <StatusPill status={trade.status} />
            </div>
            <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-4">
              <Party role="buyer" addr={trade.buyer} />
              <Party role="seller" addr={trade.seller} />
              <div>
                <div className="text-xs text-muted">Escrow balance</div>
                <div className="mt-0.5 text-lg font-semibold">
                  <Amount value={escrow} className={escrow ? "text-money" : ""} />
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Deadline</div>
                <div className="mt-0.5 text-sm font-medium tabular-nums">{left ? `in ${fmtDuration(left)}` : "Passed"}</div>
                <div className="text-xs text-muted">{fmtDate(trade.deadline)}</div>
              </div>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="font-medium">Recorded documents</div>
              <span className="text-xs text-muted">
                {docs.length} of {trade.requiredDocs.length} required
              </span>
            </div>
            <ul className="divide-y divide-line">
              {trade.requiredDocs.map((d) => {
                const doc = docs.find((x) => x.documentType === d);
                return (
                  <li key={d} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5">
                    <div className="min-w-0 flex-1 basis-48">
                      <div className="text-sm font-medium">{DOC_LABELS[d]}</div>
                      <div className="truncate text-xs text-muted">{doc ? `${doc.filename} · ${fmtDate(doc.submittedAt)}` : "Not submitted"}</div>
                    </div>
                    {doc ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Hash value={doc.hash} n={10} />
                        {doc.txSig && <TxLink sig={doc.txSig} />}
                      </div>
                    ) : (
                      <span className="text-xs text-danger/80">missing</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card p-5 sm:p-6">
            <div className="mb-4">
              <div className="font-medium">Verify a document</div>
              <p className="mt-1 text-sm text-muted">
                Got a copy from the seller or the shipping line? Check it against the hash on-chain. Change a single
                character and it fails.
              </p>
            </div>
            <VerifyDropZone key={trade.id} trade={trade} docs={docs} />
          </section>
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="eyebrow text-inspector">Decision</div>
              <PlaceholderTag id="P7" />
            </div>
            <div className="mt-2 text-sm text-muted">
              Approving releases{" "}
              <span className="font-medium text-fg">
                {fmtAmount(escrow)} {UNIT}
              </span>{" "}
              from escrow to the seller in one transaction.
            </div>
            <div className="mt-5 grid gap-2">
              <button onClick={() => run("approve")} disabled={!ready || !!busy} className="btn btn-money w-full">
                {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {busy === "approve" ? "Approving and releasing…" : "Approve shipment"}
              </button>
              <button onClick={() => run("reject")} disabled={!ready || !!busy} className="btn btn-danger w-full">
                {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                Reject
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              {ready
                ? "All required documents are recorded."
                : trade.status === "Paid"
                  ? "Already approved and paid."
                  : trade.status === "Refunded"
                    ? "Refunded to the buyer after the deadline."
                    : trade.status === "Rejected"
                      ? "Rejected. Waiting for the seller to resubmit."
                      : !isOpen(trade)
                        ? ""
                        : "Waiting for the seller to submit every required document."}
            </p>
            <Link href={`/trade/${trade.id}`} className="mt-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
              Trade record <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </aside>
      </div>

      <SettlementCard settlement={settlement} onClose={() => setSettlement(null)} />
    </div>
  );
}
