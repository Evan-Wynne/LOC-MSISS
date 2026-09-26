"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { useLoc } from "@/lib/use-loc";
import { approveShipment, docsOf, isOpen, rejectShipment } from "@/lib/loc";
import type { Settlement } from "@/lib/types";
import { DOC_LABELS } from "@/lib/types";
import { fmtDate, fmtMoney, tradeRef } from "@/lib/explorer";
import { inspectorOrder } from "@/lib/order";
import { PARTY_NAMES } from "@/lib/placeholder-data";
import { UNIT } from "@/lib/config";
import { Empty, Hash, PageHeader, SectionHead, StatusPill, TxLink, fmtDuration, useCountdown } from "@/components/ui";
import { VerifyDropZone } from "@/components/VerifyDropZone";
import { SettlementCard } from "@/components/SettlementCard";
import { PlaceholderTag } from "@/components/PlaceholderTag";
import { useApp } from "@/components/Providers";

export default function InspectorQueue() {
  const s = useLoc();
  const { toast, focus, setFocus } = useApp();
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);

  const trades = s ? inspectorOrder(s.trades) : [];
  const trade = trades.find((t) => t.id === focus) ?? trades[0];
  const left = useCountdown(trade?.deadline ?? 0);

  if (!s) return <div className="h-96" />;

  if (!trade)
    return (
      <div>
        <PageHeader eyebrow="Inspector · Verification" title="Review shipment proof" />
        <Empty>Nothing to inspect yet.</Empty>
      </div>
    );

  const docs = docsOf(s, trade.id);
  const escrow = s.vaults[trade.id] ?? 0;
  const ready = trade.status === "DocumentsSubmitted";

  async function run(kind: "approve" | "reject") {
    if (!trade) return;
    setFocus(trade.id);
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

  const ref = tradeRef(s.trades, trade.id);
  const matched = docs.length;

  return (
    <div>
      <PageHeader eyebrow={`Inspector · Verification · ${ref}`} title="Review shipment proof">
        <StatusPill status={trade.status} />
      </PageHeader>

      {/* PLACEHOLDER[P19]: one designated inspector key (a demo key held by the server in chain mode); its approval is an attestation, not proof of the physical shipment → REAL: multisig verifiers, shipping-line data, electronic bills of lading or an oracle attestation (see docs/ROADMAP.md §7) */}
      <div className="grid overflow-hidden rounded-[4px] border-[1.5px] border-fg md:grid-cols-3">
        <div className="bg-panel p-5 sm:p-6">
          <div className="eyebrow text-muted">Off-chain</div>
          <div className="mt-2 text-[17px] font-semibold">Physical shipment</div>
          <p className="mt-1 text-sm text-muted">{trade.goods}</p>
        </div>
        <div className="bg-fg p-5 text-bg sm:p-6">
          <div className="eyebrow flex items-center gap-2 text-bg/70">
            The bridge <PlaceholderTag id="P19" />
          </div>
          <div className="mt-2 text-[17px] font-semibold">You, the verifier</div>
          <p className="mt-1 text-sm text-bg/80">Your signed approval is the only link between the goods and the payment.</p>
        </div>
        <div className="border-t border-line bg-panel p-5 sm:p-6 md:border-l md:border-t-0">
          <div className="eyebrow text-muted">On-chain</div>
          <div className="mt-2 text-[17px] font-semibold">Escrow contract</div>
          <p className="mt-1 text-sm text-muted">Checks your signature and that every required hash is recorded, not the goods.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-9">
          <section>
            <SectionHead title="Documents and on-chain hashes" note={`${matched} of ${trade.requiredDocs.length} recorded`} />
            <ul>
              {trade.requiredDocs.map((d) => {
                const doc = docs.find((x) => x.documentType === d);
                return (
                  <li key={d} className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-b border-line py-3.5">
                    <div className="min-w-0 flex-1 basis-48">
                      <div className="text-[15px] font-medium">{DOC_LABELS[d]}</div>
                      <div className="truncate text-[13px] text-muted">{doc ? doc.filename : "Not submitted"}</div>
                    </div>
                    {doc ? (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <Hash value={doc.hash} n={10} className="!text-fg" />
                        {doc.txSig && <TxLink sig={doc.txSig} />}
                        <span className="text-[13px] font-semibold text-money-ink">✓ Recorded</span>
                      </div>
                    ) : (
                      <span className="text-[13px] font-medium text-danger">Missing</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <SectionHead title="Verify a document" note="Change a single character and it fails." />
            <p className="mb-4 mt-3 text-sm text-muted">
              Got a copy from the seller or the shipping line? Check it against the hash recorded on-chain.
            </p>
            <VerifyDropZone key={trade.id} trade={trade} docs={docs} />
          </section>
        </div>

        <aside className="h-fit lg:sticky lg:top-8">
          <div className="card p-6">
            <div className="space-y-2.5 text-[15px]">
              <KV k="Seller" v={PARTY_NAMES.seller} />
              <KV k="Buyer" v={PARTY_NAMES.buyer} />
              <KV k="Escrow balance" v={<span className="font-mono">{fmtMoney(escrow)} {UNIT}</span>} />
              <KV k="Deadline" v={fmtDate(trade.deadline)} />
              <KV k="Time left" v={left ? fmtDuration(left) : "passed"} />
            </div>
            <div className="mt-5 grid gap-2.5 border-t border-line pt-5">
              <button onClick={() => run("approve")} disabled={!ready || !!busy} className="btn btn-money w-full py-3.5">
                {busy === "approve" && <Loader2 className="size-4 animate-spin" />}
                {busy === "approve" ? "Approving and releasing…" : "Approve shipment"}
              </button>
              <button onClick={() => run("reject")} disabled={!ready || !!busy} className="btn btn-danger w-full py-3.5">
                {busy === "reject" && <Loader2 className="size-4 animate-spin" />}
                Reject
              </button>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              {ready
                ? "Approval releases the escrow to the seller in the same transaction."
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
            <div className="mt-3 flex items-center justify-between gap-2">
              <Link href={`/trade/${trade.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-money-ink hover:underline">
                Trade record <ArrowRight className="size-3.5" />
              </Link>
              <PlaceholderTag id="P7" />
            </div>
          </div>
        </aside>
      </div>

      <SettlementCard settlement={settlement} onClose={() => setSettlement(null)} />
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
