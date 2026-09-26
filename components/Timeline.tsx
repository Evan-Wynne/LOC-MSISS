"use client";

import { Check, RotateCcw, X } from "lucide-react";
import type { Role, Trade, TradeDocument, TradeEvent, TradeEventKind } from "@/lib/types";
import { DOC_LABELS } from "@/lib/types";
import { fmtDate } from "@/lib/explorer";
import { ROLE_LABELS } from "@/lib/placeholder-data";
import { ROLE_TEXT, RoleDot, TxLink } from "./ui";

type StepState = "done" | "current" | "todo" | "failed";
type Step = { key: string; label: string; sub: string; actor: Role | "program"; state: StepState; event?: TradeEvent };

const last = (events: TradeEvent[], kind: TradeEventKind) => [...events].reverse().find((e) => e.kind === kind);

export function buildSteps(trade: Trade, docs: TradeDocument[], events: TradeEvent[]): Step[] {
  const s = trade.status;
  const have = trade.requiredDocs.filter((r) => docs.some((d) => d.documentType === r)).length;
  const need = trade.requiredDocs.length;
  const docsDone = s === "DocumentsSubmitted" || s === "Paid" || (s === "Rejected" && have === need);
  const steps: Step[] = [
    { key: "funded", label: "Funded", sub: "Buyer locked tUSDC in escrow", actor: "buyer", state: "done", event: last(events, "Funded") },
    {
      key: "docs",
      label: "Documents submitted",
      sub: `${have} of ${need} document hashes recorded`,
      actor: "seller",
      state: docsDone ? "done" : s === "Refunded" ? "todo" : "current",
      event: last(events, "DocumentSubmitted"),
    },
  ];
  if (s === "Refunded") {
    steps.push({ key: "refunded", label: "Refunded", sub: "Deadline passed; escrow returned to buyer", actor: "program", state: "done", event: last(events, "Refunded") });
    return steps;
  }
  steps.push(
    s === "Rejected"
      ? { key: "verify", label: "Rejected", sub: "Inspector rejected; seller can resubmit", actor: "inspector", state: "failed", event: last(events, "Rejected") }
      : {
          key: "verify",
          label: "Verified",
          sub: "Inspector approved the shipment",
          actor: "inspector",
          state: s === "Paid" ? "done" : s === "DocumentsSubmitted" ? "current" : "todo",
          event: last(events, "Verified"),
        },
    {
      key: "paid",
      label: "Paid",
      sub: "Escrow released to seller",
      actor: "program",
      state: s === "Paid" ? "done" : "todo",
      event: last(events, "Paid"),
    },
  );
  return steps;
}

export function Timeline({ trade, docs, events }: { trade: Trade; docs: TradeDocument[]; events: TradeEvent[] }) {
  const steps = buildSteps(trade, docs, events);
  return (
    <ol className={`grid gap-0 md:gap-3 ${steps.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
      {steps.map((st, i) => (
        <li key={st.key} className="relative flex gap-3 pb-6 md:block md:pb-0">
          {/* connector */}
          {i < steps.length - 1 && (
            <span
              className={`absolute left-[13px] top-7 h-[calc(100%-28px)] w-px md:left-8 md:top-[13px] md:h-px md:w-[calc(100%-20px)] ${
                st.state === "done" ? "bg-money" : "bg-line"
              }`}
            />
          )}
          <Dot state={st.state} refund={st.key === "refunded"} />
          <div className="min-w-0 md:mt-3 md:pr-3">
            <div className={`text-sm font-medium ${st.state === "todo" ? "text-muted" : st.state === "failed" ? "text-danger" : ""}`}>{st.label}</div>
            <div className="mt-0.5 text-xs leading-relaxed text-muted">{st.sub}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {st.actor !== "program" ? (
                <span className={`inline-flex items-center gap-1.5 ${ROLE_TEXT[st.actor]}`}>
                  <RoleDot role={st.actor} /> {ROLE_LABELS[st.actor]}
                </span>
              ) : (
                <span className="text-muted">Escrow program</span>
              )}
              {st.event && st.state !== "todo" && <TxLink sig={st.event.txSig} />}
            </div>
            {st.event && st.state !== "todo" && <div className="mt-0.5 text-[11px] text-muted/80">{fmtDate(st.event.at)}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Dot({ state, refund }: { state: StepState; refund?: boolean }) {
  const base = "relative z-10 grid size-[27px] shrink-0 place-items-center rounded-full ring-1";
  if (state === "done")
    return (
      <span className={`${base} ${refund ? "bg-fg text-bg ring-fg" : "bg-money text-white ring-money"}`}>
        {refund ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" strokeWidth={2.5} />}
      </span>
    );
  if (state === "failed")
    return (
      <span className={`${base} bg-danger text-white ring-danger`}>
        <X className="size-3.5" strokeWidth={2.5} />
      </span>
    );
  if (state === "current")
    return (
      <span className={`${base} bg-panel ring-fg`}>
        <span className="size-2 animate-pulse rounded-full bg-fg" />
      </span>
    );
  return <span className={`${base} bg-panel ring-line-2`} />;
}

const EVENT_LABEL: Record<TradeEventKind, string> = {
  Funded: "Escrow funded",
  DocumentSubmitted: "Document hash recorded",
  Rejected: "Shipment rejected",
  Verified: "Shipment verified",
  Paid: "Escrow released to seller",
  Refunded: "Escrow refunded to buyer",
};

const stamp = (ms: number) =>
  new Date(ms).toLocaleString("en-IE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }).replace(",", "");

// Ledger of every transaction on this trade, oldest first (design B, screen D).
export function AuditTrail({ events }: { events: TradeEvent[] }) {
  return (
    <ul>
      {events.map((e) => (
        <li
          key={e.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-0.5 border-b border-line py-3 md:grid-cols-[150px_minmax(0,1fr)_150px_120px]"
        >
          <span className="order-3 font-mono text-[13px] text-muted md:order-none">{stamp(e.at)}</span>
          <span className={`min-w-0 text-[15px] ${e.kind === "Paid" || e.kind === "Refunded" ? "font-semibold" : ""}`}>
            {EVENT_LABEL[e.kind]}
            {e.kind === "DocumentSubmitted" && e.detail && (
              <span className="text-muted"> · {DOC_LABELS[e.detail as keyof typeof DOC_LABELS] ?? e.detail}</span>
            )}
          </span>
          <span className="order-4 text-[13px] text-muted md:order-none md:text-[15px] md:text-fg">
            {e.actor === "anyone" ? "Anyone (after deadline)" : ROLE_LABELS[e.actor]}
          </span>
          <span className="row-span-2 self-center justify-self-end md:row-span-1">
            <TxLink sig={e.txSig} label="" />
          </span>
        </li>
      ))}
    </ul>
  );
}
