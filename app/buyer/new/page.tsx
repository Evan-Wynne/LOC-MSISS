"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock } from "lucide-react";
import { createTrade } from "@/lib/loc";
import { useLoc } from "@/lib/use-loc";
import { DEMO_WALLETS, PARTY_NAMES } from "@/lib/placeholder-data";
import { DOC_LABELS, DOC_TYPES, type DocumentType } from "@/lib/types";
import { fmtAmount, fmtDate, fmtMoney, shortAddr } from "@/lib/explorer";
import { CHAIN_MODE, SHOW_MOCK_LABELS, UNIT, UNIT_LONG } from "@/lib/config";
import { FormRow, PageHeader, Row, fmtDuration } from "@/components/ui";
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
      <PageHeader eyebrow="Buyer · New letter of credit" title="Terms of trade" />
      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="-mt-4">
          <FormRow label="Trade title">
            <input className="input" value={f.title} maxLength={64} onChange={(e) => set("title", e.target.value)} required />
          </FormRow>
          <FormRow label={<span className="inline-flex items-center gap-2">Seller <PlaceholderTag id="P12" /></span>}>
            <LockedParty role="seller" />
          </FormRow>
          <FormRow label="Goods description" hint="Quantity, Incoterm">
            <textarea className="input min-h-20" value={f.goods} maxLength={128} onChange={(e) => set("goods", e.target.value)} required />
          </FormRow>
          <FormRow label="Payment amount">
            <div className="relative max-w-[280px]">
              <input
                className="input pr-16 font-mono tabular-nums"
                type="number"
                min={1}
                step="any"
                value={f.amount}
                onChange={(e) => set("amount", +e.target.value)}
                aria-label="Payment amount"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-muted">{UNIT}</span>
            </div>
            {f.amount > balance && <p className="mt-2 text-xs text-danger">That&apos;s more than the buyer wallet holds ({fmtMoney(balance)} {UNIT}).</p>}
          </FormRow>
          <FormRow label="Shipment deadline" hint={f.deadline ? `in ${fmtDuration(left)}` : undefined}>
            <input
              className="input max-w-[280px]"
              type="datetime-local"
              value={f.deadline ? toLocalInput(f.deadline) : ""}
              onChange={(e) => {
                const ms = new Date(e.target.value).getTime();
                if (!isNaN(ms)) setF((x) => ({ ...x, deadline: ms, preset: -1 }));
              }}
              aria-label="Shipment deadline"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setF((x) => ({ ...x, deadline: Date.now() + p.ms, preset: i }))}
                  className={`rounded-[3px] border px-2 py-1 text-xs transition-colors ${
                    f.preset === i ? "border-fg bg-fg text-bg" : "border-line-2 bg-panel text-muted hover:text-fg"
                  }`}
                >
                  {p.label}
                  {p.hint && <span className="opacity-70"> · {p.hint}</span>}
                </button>
              ))}
            </div>
          </FormRow>
          <FormRow label="Required documents" hint="Each needs a recorded hash before approval">
            <div className="space-y-2 pt-[9px]">
              {DOC_TYPES.map((d) => {
                const on = f.requiredDocs.includes(d);
                return (
                  <button key={d} type="button" onClick={() => toggleDoc(d)} aria-pressed={on} className="flex items-center gap-2.5 text-[15px]">
                    <span className={`grid size-4 place-items-center rounded-[3px] border ${on ? "border-money bg-money text-white" : "border-line-2 bg-panel"}`}>
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    {DOC_LABELS[d]}
                  </button>
                );
              })}
              {f.requiredDocs.length === 0 && <p className="text-xs text-danger">Pick at least one.</p>}
            </div>
          </FormRow>
          <FormRow label={<span className="inline-flex items-center gap-2">Inspector / verifier <PlaceholderTag id="P12" /></span>}>
            <LockedParty role="inspector" />
          </FormRow>
        </div>

        <aside className="h-fit lg:sticky lg:top-8">
          <div className="rounded-[4px] border-[1.5px] border-fg bg-panel p-6">
            <div className="eyebrow text-muted">Escrow</div>
            <div className="mt-4 font-mono text-[34px] font-medium leading-none tabular-nums">{fmtMoney(f.amount || 0)}</div>
            <div className="mt-2 text-sm text-muted">{UNIT_LONG}, held by the contract</div>

            <div className="mt-5 space-y-2.5 border-t border-line pt-5 text-sm leading-relaxed">
              <p>Released to the seller when the verifier approves.</p>
              <p>Refundable to you after {f.deadline ? fmtDate(f.deadline) : "the deadline"}.</p>
            </div>

            <div className="mt-5 space-y-0.5 border-t border-line pt-4 text-sm">
              <Row
                k={
                  <span className="inline-flex items-center gap-1.5">
                    Your balance <PlaceholderTag id="P13" />
                  </span>
                }
                v={<span className="font-mono font-normal">{fmtMoney(balance)}</span>}
              />
              <Row k="Documents" v={<span className="font-normal">{f.requiredDocs.length} required</span>} />
            </div>

            <button className="btn btn-money mt-5 w-full py-3.5" disabled={busy || !valid}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              {busy ? "Locking funds in escrow…" : "Fund escrow"}
            </button>
            {!CHAIN_MODE && SHOW_MOCK_LABELS && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <PlaceholderTag id="P4" /> Funding is simulated in mock mode.
              </div>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}

function LockedParty({ role }: { role: "seller" | "inspector" }) {
  return (
    <div className="input flex items-center gap-2">
      <span className="truncate">{PARTY_NAMES[role]}</span>
      <span className="ml-auto font-mono text-[13px] text-muted">{shortAddr(DEMO_WALLETS[role])}</span>
    </div>
  );
}
