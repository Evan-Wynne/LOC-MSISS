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
                st.state === "done" ? "bg-money/50" : "bg-line"
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
      <span className={`${base} ${refund ? "bg-buyer/15 text-buyer ring-buyer/40" : "bg-money/15 text-money ring-money/40"}`}>
        {refund ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" strokeWidth={2.5} />}
      </span>
    );
  if (state === "failed")
    return (
      <span className={`${base} bg-danger/15 text-danger ring-danger/40`}>
        <X className="size-3.5" strokeWidth={2.5} />
      </span>
    );
  if (state === "current")
    return (
      <span className={`${base} bg-panel ring-fg/40`}>
        <span className="size-2 animate-pulse rounded-full bg-fg" />
      </span>
    );
  return <span className={`${base} bg-panel ring-line`} />;
}

const EVENT_LABEL: Record<TradeEventKind, string> = {
  Funded: "Escrow funded",
  DocumentSubmitted: "Document hash recorded",
  Rejected: "Shipment rejected",
  Verified: "Shipment verified",
  Paid: "Escrow released to seller",
  Refunded: "Escrow refunded to buyer",
};

export function AuditTrail({ events }: { events: TradeEvent[] }) {
  return (
    <ul className="divide-y divide-line">
      {[...events].reverse().map((e) => (
        <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
          <div className="min-w-0 flex-1 basis-56">
            <div className="text-sm">
              {EVENT_LABEL[e.kind]}
              {e.kind === "DocumentSubmitted" && e.detail && (
                <span className="text-muted"> · {DOC_LABELS[e.detail as keyof typeof DOC_LABELS] ?? e.detail}</span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              {e.actor === "anyone" ? (
                "Anyone (after deadline)"
              ) : (
                <>
                  <RoleDot role={e.actor} /> {ROLE_LABELS[e.actor]}
                </>
              )}
              <span>· {fmtDate(e.at)}</span>
            </div>
          </div>
          <TxLink sig={e.txSig} />
        </li>
      ))}
    </ul>
  );
}
