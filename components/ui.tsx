"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { Role, TradeStatus } from "@/lib/types";
import { explorerAddress, explorerTx, fmtAmount, shortAddr } from "@/lib/explorer";
import { PARTY_NAMES, ROLE_LABELS } from "@/lib/placeholder-data";
import { UNIT } from "@/lib/config";

// Literal class names so Tailwind picks them up.
export const ROLE_TEXT: Record<Role, string> = { buyer: "text-buyer", seller: "text-seller", inspector: "text-inspector" };
export const ROLE_BG: Record<Role, string> = { buyer: "bg-buyer", seller: "bg-seller", inspector: "bg-inspector" };

const STATUS: Record<TradeStatus, { label: string; cls: string }> = {
  Funded: { label: "Funded", cls: "bg-money/10 text-money ring-money/25" },
  DocumentsSubmitted: { label: "Awaiting inspection", cls: "bg-inspector/10 text-inspector ring-inspector/25" },
  Verified: { label: "Verified", cls: "bg-money/10 text-money ring-money/25" },
  Paid: { label: "Paid", cls: "bg-fg/5 text-fg ring-line-2" },
  Refunded: { label: "Refunded", cls: "bg-buyer/10 text-buyer ring-buyer/25" },
  Rejected: { label: "Rejected", cls: "bg-danger/10 text-danger ring-danger/25" },
};

export function StatusPill({ status }: { status: TradeStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${s.cls}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
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
    <span className={`tabular-nums ${className}`}>
      {fmtAmount(value)} <span className={`font-normal ${unitClass}`} style={{ fontSize: "0.55em" }}>{UNIT}</span>
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
      className="inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-fg"
    >
      {label} {shortAddr(sig, 4)} <ExternalLink className="size-3" />
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
  role,
  eyebrow,
  title,
  sub,
  children,
}: {
  role?: Role;
  eyebrow: string;
  title: string;
  sub?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className={`eyebrow flex items-center gap-2 ${role ? ROLE_TEXT[role] : "text-muted"}`}>
          {role && <RoleDot role={role} />}
          {eyebrow}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[34px]">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {children}
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
  return <div className="card p-10 text-center text-sm text-muted">{children}</div>;
}
