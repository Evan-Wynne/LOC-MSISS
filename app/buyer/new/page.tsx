"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock } from "lucide-react";
import { createTrade } from "@/lib/loc";
import { useLoc } from "@/lib/use-loc";
import { DEMO_WALLETS, PARTY_NAMES } from "@/lib/placeholder-data";
import { DOC_LABELS, DOC_TYPES, type DocumentType } from "@/lib/types";
import { fmtAmount, fmtDate, shortAddr } from "@/lib/explorer";
import { UNIT, UNIT_LONG } from "@/lib/config";
import { Field, PageHeader, Row, RoleDot, fmtDuration } from "@/components/ui";
import { PlaceholderTag } from "@/components/PlaceholderTag";
import { useApp } from "@/components/Providers";

const MIN = 60_000;
const DAY = 86_400_000;
const PRESETS = [
  { label: "+2 min", hint: "demo refund", ms: 2 * MIN },
  { label: "+7 days", ms: 7 * DAY },
  { label: "+30 days", ms: 30 * DAY },
];

// <input type="datetime-local"> works in local time without a zone suffix.
const toLocalInput = (ms: number) => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function NewTrade() {
  const router = useRouter();
  const { toast, setRole } = useApp();
  const s = useLoc();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    title: "Cocoa beans, 200 bags",
    goods: "200 bags × 60 kg fermented and dried cocoa beans, FOB Tema",
    amount: 36_000,
    deadline: 0,
    preset: 1,
    requiredDocs: [...DOC_TYPES] as DocumentType[],
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  // Set the default deadline on the client only, to avoid a hydration mismatch.
  useEffect(() => {
    setF((x) => (x.deadline ? x : { ...x, deadline: Date.now() + PRESETS[1].ms }));
  }, []);

  const balance = s?.balances[DEMO_WALLETS.buyer] ?? 0;
  const toggleDoc = (d: DocumentType) =>
    set("requiredDocs", f.requiredDocs.includes(d) ? f.requiredDocs.filter((x) => x !== d) : DOC_TYPES.filter((x) => x === d || f.requiredDocs.includes(x)));
  const valid = f.title.trim() && f.goods.trim() && f.amount > 0 && f.amount <= balance && f.requiredDocs.length > 0 && f.deadline > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Presets count from the moment you press the button, so "+2 min" is really 2 minutes.
      const deadline = f.preset >= 0 ? Date.now() + PRESETS[f.preset].ms : f.deadline;
      const { tradeId, txSig } = await createTrade({
        title: f.title.trim(),
        goods: f.goods.trim(),
        amount: f.amount,
        deadline,
        requiredDocs: f.requiredDocs,
        seller: DEMO_WALLETS.seller,
        inspector: DEMO_WALLETS.inspector,
      });
      toast({ kind: "ok", title: `Escrow funded: ${fmtAmount(f.amount)} ${UNIT} locked`, sig: txSig });
      setRole("buyer");
      router.push(`/trade/${tradeId}`);
    } catch (err) {
      toast({ kind: "err", title: (err as Error).message });
      setBusy(false);
    }
  }

  const left = f.deadline ? Math.max(0, Math.round((f.deadline - Date.now()) / 1000)) : 0;

  return (
    <div>
      <PageHeader
        role="buyer"
        eyebrow="Buyer · Screen A"
        title="Create a letter of credit"
        sub="Agree the terms with your seller, then lock the payment in escrow. It's released only when the inspector approves the shipment, or refunded to you after the deadline."
      />
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="card space-y-5 p-5 sm:p-6">
          <Field label="Trade title">
            <input className="input" value={f.title} maxLength={64} onChange={(e) => set("title", e.target.value)} required />
          </Field>
          <Field label="Goods description" hint="Quantity, Incoterm">
            <textarea className="input min-h-20" value={f.goods} maxLength={128} onChange={(e) => set("goods", e.target.value)} required />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Payment amount" hint={UNIT_LONG}>
              <input className="input tabular-nums" type="number" min={1} step="any" value={f.amount} onChange={(e) => set("amount", +e.target.value)} />
            </Field>
            <Field label="Shipment deadline" hint={f.deadline ? `in ${fmtDuration(left)}` : undefined}>
              <input
                className="input"
                type="datetime-local"
                value={f.deadline ? toLocalInput(f.deadline) : ""}
                onChange={(e) => {
                  const ms = new Date(e.target.value).getTime();
                  if (!isNaN(ms)) setF((x) => ({ ...x, deadline: ms, preset: -1 }));
                }}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESETS.map((p, i) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setF((x) => ({ ...x, deadline: Date.now() + p.ms, preset: i }))}
                    className={`rounded-md px-2 py-1 text-xs ring-1 transition-colors ${
                      f.preset === i ? "bg-panel-2 text-fg ring-fg/30" : "text-muted ring-line hover:text-fg"
                    }`}
                  >
                    {p.label}
                    {p.hint && <span className="text-muted"> · {p.hint}</span>}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div>
            <div className="mb-1.5 text-sm font-medium">Required documents</div>
            <div className="flex flex-wrap gap-2">
              {DOC_TYPES.map((d) => {
                const on = f.requiredDocs.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDoc(d)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 transition-colors ${
                      on ? "bg-panel-2 text-fg ring-fg/25" : "text-muted ring-line hover:text-fg"
                    }`}
                  >
                    <span className={`grid size-4 place-items-center rounded ${on ? "bg-fg text-bg" : "ring-1 ring-line-2"}`}>
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    {DOC_LABELS[d]}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">The seller must record a hash for each one before the inspector can approve.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <LockedParty label="Seller" role="seller" />
            <LockedParty label="Inspector / verifier" role="inspector" />
          </div>
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="eyebrow text-muted">LC terms</span>
              <span className="font-mono text-[11px] text-muted">draft</span>
            </div>
            <div className="p-5">
              <div className="text-xs text-muted">Amount to lock in escrow</div>
              <div className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
                {fmtAmount(f.amount || 0)} <span className="text-lg font-normal text-muted">{UNIT}</span>
              </div>
              <div className="mt-1 text-xs text-muted">{UNIT_LONG}</div>

              <div className="mt-5 space-y-0.5 border-t border-line pt-4 text-sm">
                <Row k="Deadline" v={f.deadline ? fmtDate(f.deadline) : "…"} />
                <Row k="Seller" v={<span className="font-mono text-xs">{shortAddr(DEMO_WALLETS.seller)}</span>} />
                <Row k="Inspector" v={<span className="font-mono text-xs">{shortAddr(DEMO_WALLETS.inspector)}</span>} />
                <Row
                  k={
                    <span className="inline-flex items-center gap-1.5">
                      Your balance <PlaceholderTag id="P13" />
                    </span>
                  }
                  v={`${fmtAmount(balance)} ${UNIT}`}
                />
              </div>

              <div className="mt-4 border-t border-line pt-4">
                <div className="text-xs text-muted">Documents the seller must prove</div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {f.requiredDocs.length === 0 && <li className="text-danger">Pick at least one</li>}
                  {f.requiredDocs.map((d) => (
                    <li key={d} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-seller" /> {DOC_LABELS[d]}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 rounded-lg bg-panel-2 px-3.5 py-3 text-xs leading-relaxed text-muted ring-1 ring-line">
                <span className="text-fg">Settlement rule.</span> Inspector approves → released to seller. Deadline
                passes without approval → refundable to you.
              </div>

              <button className="btn btn-money mt-5 w-full" disabled={busy || !valid}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                {busy ? "Locking funds in escrow…" : "Fund escrow"}
              </button>
              {f.amount > balance && <p className="mt-2 text-xs text-danger">That&apos;s more than the buyer wallet holds.</p>}
              <div className="mt-3 flex justify-center">
                <PlaceholderTag id="P4" />
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

function LockedParty({ label, role }: { label: string; role: "seller" | "inspector" }) {
  return (
    <Field
      label={label}
      hint={
        <span className="inline-flex items-center gap-1.5">
          demo wallet <PlaceholderTag id="P12" />
        </span>
      }
    >
      <div className="input flex items-center gap-2">
        <RoleDot role={role} />
        <span className="truncate">{PARTY_NAMES[role]}</span>
        <span className="ml-auto font-mono text-xs text-muted">{shortAddr(DEMO_WALLETS[role])}</span>
      </div>
    </Field>
  );
}
