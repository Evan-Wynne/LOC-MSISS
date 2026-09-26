"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ExternalLink, LockKeyhole, X } from "lucide-react";
import type { Settlement } from "@/lib/types";
import { explorerTx, fmtAmount, fmtMoney, shortAddr } from "@/lib/explorer";
import { PARTY_NAMES } from "@/lib/placeholder-data";
import { UNIT } from "@/lib/config";
import { PlaceholderTag } from "./PlaceholderTag";
import { RoleDot } from "./ui";

export function SettlementCard({ settlement, onClose }: { settlement: Settlement | null; onClose: () => void }) {
  useEffect(() => {
    if (!settlement) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settlement, onClose]);

  return (
    <AnimatePresence>
      {settlement && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="card relative w-full max-w-md p-6 shadow-xl shadow-fg/15"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute right-4 top-4 text-muted hover:text-fg" aria-label="Close">
              <X className="size-4" />
            </button>
            <Body s={settlement} />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <span className="inline-flex flex-wrap items-center gap-2">
                <a
                  href={explorerTx(settlement.txSig)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-muted hover:text-fg"
                >
                  Solana Explorer · {shortAddr(settlement.txSig, 5)} <ExternalLink className="size-3" />
                </a>
                <PlaceholderTag id="P15" />
              </span>
              <Link href={`/trade/${settlement.tradeId}`} onClick={onClose} className="btn btn-ghost btn-sm">
                View trade record <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Body({ s }: { s: Settlement }) {
  const released = s.kind === "released";
  const to = released ? "seller" : "buyer";
  return (
    <div>
      <div className={`eyebrow ${released ? "text-money-ink" : "text-muted"}`}>
        {released ? "Shipment verified" : "Deadline reached"}
      </div>
      <div className="mt-2 font-mono text-3xl font-medium tabular-nums">
        {fmtMoney(s.amount)} <span className="font-sans text-lg font-normal text-muted">{UNIT}</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {released ? "Released from escrow to the seller" : "Refunded from escrow to the buyer"} in one transaction.
        <span className="block truncate text-fg/80">{s.title}</span>
      </p>

      <div className="mt-6 flex items-center gap-2">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[4px] border border-line bg-panel-2 px-3.5 py-3"
        >
          <LockKeyhole className="size-4 shrink-0 text-muted" />
          <div className="min-w-0">
            <div className="text-sm font-medium">Escrow vault</div>
            <div className="font-mono text-xs text-danger/90 tabular-nums">−{fmtAmount(s.amount)}</div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}>
          <ArrowRight className={`size-4 ${released ? "text-money-ink" : "text-fg"}`} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[4px] border border-line bg-panel-2 px-3.5 py-3"
        >
          <RoleDot role={to} className="size-2" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{PARTY_NAMES[to]}</div>
            <div className={`font-mono text-xs tabular-nums ${released ? "text-money-ink" : "text-fg"}`}>+{fmtAmount(s.amount)}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
