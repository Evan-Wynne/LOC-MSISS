"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { Role, TradeStatus } from "@/lib/types";
import { explorerAddress, explorerTx, fmtMoney, shortAddr } from "@/lib/explorer";
import { PARTY_NAMES, ROLE_LABELS } from "@/lib/placeholder-data";
import { CHAIN_MODE, UNIT } from "@/lib/config";

// Literal class names so Tailwind picks them up.
export const ROLE_TEXT: Record<Role, string> = { buyer: "text-buyer", seller: "text-seller", inspector: "text-inspector" };
export const ROLE_BG: Record<Role, string> = { buyer: "bg-buyer", seller: "bg-seller", inspector: "bg-inspector" };

// Square badges, tinted by meaning: amber waiting on the seller, blue waiting on
// the inspector, green paid, red rejected, grey refunded.
const STATUS: Record<TradeStatus, { label: string; cls: string }> = {
  Funded: { label: "Funded", cls: "border-warn/45 bg-warn/[0.08] text-[oklch(0.45_0.1_70)]" },
  DocumentsSubmitted: { label: "Documents submitted", cls: "border-info/40 bg-info/[0.07] text-info" },
  Verified: { label: "Verified", cls: "border-money/40 bg-money/[0.08] text-money-ink" },
  Paid: { label: "Paid", cls: "border-money/40 bg-money/[0.08] text-money-ink" },
  Refunded: { label: "Refunded", cls: "border-line-2 text-muted" },
  Rejected: { label: "Rejected", cls: "border-danger/50 bg-danger/10 text-danger" },
};

export function StatusPill({ status, label }: { status: TradeStatus; label?: string }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-[3px] border px-2.5 py-1 text-[13px] font-medium leading-none ${s.cls}`}>
      {label ?? s.label}
    </span>
  );
}

export function RoleDot({ role, className = "" }: { role: Role; className?: string }) {
  return <span className={`inline-block size-1.5 shrink-0 rounded-full ${ROLE_BG[role]} ${className}`} />;
}

export function Party({ role, addr }: { role: Role; addr: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <RoleDot role={role} /> {ROLE_LABELS[role]}
      </div>
      <div className="mt-0.5 truncate text-sm font-medium">{PARTY_NAMES[role]}</div>
      <a href={explorerAddress(addr)} target="_blank" rel="noreferrer" className="font-mono text-xs text-muted hover:text-fg">
        {shortAddr(addr)}
      </a>
    </div>
  );
}

export function Amount({ value, className = "", unitClass = "text-muted" }: { value: number; className?: string; unitClass?: string }) {
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {fmtMoney(value)} <span className={`font-sans font-normal ${unitClass}`} style={{ fontSize: "0.55em" }}>{UNIT}</span>
    </span>
  );
}

export function Hash({ value, n = 8, className = "" }: { value: string; n?: number; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={value}
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className={`group inline-flex min-w-0 items-center gap-1.5 font-mono text-xs text-muted hover:text-fg ${className}`}
    >
      <span className="truncate">{shortAddr(value, n)}</span>
      {copied ? <Check className="size-3 shrink-0 text-money" /> : <Copy className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />}
    </button>
  );
}

export function TxLink({ sig, label = "tx" }: { sig: string; label?: string }) {
  return (
    <a
      href={explorerTx(sig)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-money-ink hover:underline"
    >
      {label ? `${label} ` : ""}{shortAddr(sig, 4)} {CHAIN_MODE && <ExternalLink className="size-3" />}
    </a>
  );
}

// PLACEHOLDER[P17]: mock mode only, the deadline countdown uses the browser clock → REAL: chain mode counts down to the on-chain deadline and refund_after_deadline checks the on-chain clock. In both modes someone still has to click Refund (see docs/ROADMAP.md §7)
export function useCountdown(deadlineMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.ceil((deadlineMs - now) / 1000));
}

export function fmtDuration(secs: number) {
  if (secs >= 86400) return `${Math.floor(secs / 86400)}d ${Math.floor((secs % 86400) / 3600)}h`;
  if (secs >= 3600) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  if (secs >= 60) return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, "0")}s`;
  return `${secs}s`;
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  tone = "fg",
  children,
}: {
  role?: Role;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "fg" | "danger";
  children?: React.ReactNode;
}) {
  const danger = tone === "danger";
  return (
    <div className={`mb-7 border-b-[1.5px] pb-5 ${danger ? "border-danger" : "border-fg"}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className={`font-mono text-xs uppercase tracking-[0.08em] ${danger ? "text-danger" : "text-muted"}`}>{eyebrow}</div>
          <h1 className="mt-2.5 text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">{title}</h1>
        </div>
        {children && <div className="flex shrink-0 flex-wrap items-center gap-3 pb-1">{children}</div>}
      </div>
      {sub && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}

// Section title with a heavy ink rule under it, as in the design's tables.
export function SectionHead({ title, note }: { title: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-[1.5px] border-fg pb-3">
      <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h2>
      {note && <div className="text-[13px] text-muted">{note}</div>}
    </div>
  );
}

// Label-left form row used on the create-trade screen.
export function FormRow({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-line py-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-start sm:gap-6">
      <div className="pt-0 text-sm text-muted sm:pt-[11px]">
        {label}
        {hint && <div className="mt-0.5 text-xs">{hint}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-muted">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card p-10 text-center text-[15px] text-muted">{children}</div>;
}
