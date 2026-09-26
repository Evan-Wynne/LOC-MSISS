"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Loader2, LockKeyhole, Send, ShieldCheck, Timer } from "lucide-react";
import { useLoc } from "@/lib/use-loc";
import { docsOf, isOpen, submitDocument } from "@/lib/loc";
import type { DocumentType } from "@/lib/types";
import { DOC_LABELS } from "@/lib/types";
import { UNIT_LONG } from "@/lib/config";
import { Amount, Empty, PageHeader, Party, StatusPill, TxLink, fmtDuration, useCountdown } from "@/components/ui";
import { DocumentSlot, type Staged } from "@/components/DocumentSlot";
import { TradePicker } from "@/components/TradePicker";
import { PlaceholderTag } from "@/components/PlaceholderTag";
import { useApp } from "@/components/Providers";

export default function SellerShipments() {
  const s = useLoc();
  const { toast } = useApp();
  const [selected, setSelected] = useState<string>();
  const [staged, setStaged] = useState<Partial<Record<DocumentType, Staged>>>({});
  const [busy, setBusy] = useState(false);

  const trades = s ? [...s.trades].sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || b.createdAt - a.createdAt) : [];
  const trade = trades.find((t) => t.id === selected) ?? trades[0];

  useEffect(() => setStaged({}), [trade?.id]);

  const left = useCountdown(trade?.deadline ?? 0);

  if (!s) return <div className="h-96" />;

  const header = (
    <PageHeader
      role="seller"
      eyebrow="Seller · Screen B"
      title="Ship and prove it"
      sub="The buyer's payment is already locked in escrow. Submit your shipping documents; only their fingerprints are recorded on-chain."
    />
  );
  if (!trade)
    return (
      <div>
        {header}
        <Empty>No trades yet. Switch to Buyer to create one.</Empty>
      </div>
    );

  const docs = docsOf(s, trade.id);
  const escrow = s.vaults[trade.id] ?? 0;
  const expired = left === 0;
  const locked = !isOpen(trade) || expired;
  const stagedList = trade.requiredDocs.filter((d) => staged[d]);
  const missing = trade.requiredDocs.filter((d) => !docs.some((x) => x.documentType === d) && !staged[d]);

  async function submit() {
    if (!trade) return;
    setSelected(trade.id);
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

  return (
    <div>
      {header}
      <TradePicker trades={trades} value={trade.id} onChange={setSelected} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-money/10 ring-1 ring-money/25">
                  <LockKeyhole className="size-5 text-money" />
                </div>
                <div>
                  <div className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    <Amount value={escrow} className={escrow > 0 ? "text-money" : ""} unitClass="text-money/60" />
                  </div>
                  <div className="text-sm text-muted">
                    {escrow > 0 ? "locked in escrow for you" : trade.status === "Paid" ? "released to you" : "no longer in escrow"} · {UNIT_LONG}
                  </div>
                </div>
              </div>
              <StatusPill status={trade.status} />
            </div>
            <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
              <Party role="buyer" addr={trade.buyer} />
              <div>
                <div className="text-xs text-muted">Escrow funded</div>
                <div className="mt-1">
                  <TxLink sig={trade.fundTxSig} label="create tx" />
                </div>
                <div className="mt-1">
                  <PlaceholderTag id="P15" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Timer className="size-3.5" /> Shipment deadline
                </div>
                <div className={`mt-1 text-sm font-medium tabular-nums ${expired && isOpen(trade) ? "text-danger" : ""}`}>
                  {expired ? "Passed" : `in ${fmtDuration(left)}`}
                </div>
                <div className="mt-1">
                  <PlaceholderTag id="P17" />
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-lg bg-panel-2 px-4 py-3 text-sm ring-1 ring-line">
              <span className="text-muted">Goods · </span>
              {trade.goods}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
              <div>
                <div className="font-medium">Shipment documents</div>
                <div className="text-xs text-muted">
                  {docs.length} of {trade.requiredDocs.length} recorded
                </div>
              </div>
              <PlaceholderTag id="P6" />
            </div>
            <ul className="divide-y divide-line">
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel-2/40 px-5 py-4">
              <div className="flex items-start gap-2 text-xs text-muted">
                <ShieldCheck className="mt-px size-3.5 shrink-0 text-money" />
                <span>Files never leave your browser. Only the SHA-256 fingerprint and a short filename are recorded.</span>
              </div>
              <button onClick={submit} disabled={busy || locked || stagedList.length === 0} className="btn btn-primary">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {busy ? "Recording on-chain…" : `Submit shipment proof${stagedList.length ? ` (${stagedList.length})` : ""}`}
              </button>
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <StatusBox
            status={trade.status}
            expired={expired}
            missing={missing.map((d) => DOC_LABELS[d])}
            tradeId={trade.id}
          />
        </aside>
      </div>
    </div>
  );
}

function StatusBox({ status, expired, missing, tradeId }: { status: string; expired: boolean; missing: string[]; tradeId: string }) {
  let tone = "ring-line";
  let title = "";
  let body: React.ReactNode = null;
  if (status === "Paid") {
    tone = "ring-money/30 bg-money/[0.06]";
    title = "Paid";
    body = "The inspector approved the shipment and the escrow paid you in the same transaction.";
  } else if (status === "Refunded") {
    title = "Refunded to buyer";
    body = "The deadline passed without an approved shipment, so the escrow went back to the buyer.";
  } else if (expired) {
    tone = "ring-danger/30 bg-danger/[0.06]";
    title = "Deadline passed";
    body = "Documents can no longer be submitted. The buyer can now take a refund.";
  } else if (status === "Rejected") {
    tone = "ring-danger/30 bg-danger/[0.06]";
    title = "Inspector rejected the shipment";
    body = "Replace the documents that were wrong and submit again before the deadline.";
  } else if (status === "DocumentsSubmitted") {
    tone = "ring-inspector/30 bg-inspector/[0.06]";
    title = "Waiting for the inspector";
    body = "All required document hashes are recorded. Switch to Inspector to approve the shipment.";
  } else {
    title = "Next: submit your documents";
    body = missing.length ? <>Still needed: {missing.join(", ")}.</> : "Everything is staged. Press Submit.";
  }
  return (
    <div className={`card p-5 ring-1 ${tone}`}>
      <div className="flex items-center gap-2 font-medium">
        {(expired || status === "Rejected") && status !== "Paid" && status !== "Refunded" && <AlertTriangle className="size-4 text-danger" />}
        {title}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
      <Link href={`/trade/${tradeId}`} className="mt-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        Trade record <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
