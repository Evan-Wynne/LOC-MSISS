"use client";

import type { Trade } from "@/lib/types";
import { fmtAmount } from "@/lib/explorer";
import { UNIT } from "@/lib/config";
import { StatusPill } from "./ui";

export function TradePicker({ trades, value, onChange }: { trades: Trade[]; value?: string; onChange: (id: string) => void }) {
  return (
    <div className="no-scrollbar -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {trades.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`flex w-60 shrink-0 flex-col items-start gap-1.5 rounded-xl px-3.5 py-3 text-left ring-1 transition-colors ${
                active ? "bg-panel-2 ring-fg/30" : "bg-panel ring-line hover:ring-line-2"
              }`}
            >
              <span className="w-full truncate text-sm font-medium">{t.title}</span>
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-xs tabular-nums text-muted">
                  {fmtAmount(t.amount)} {UNIT}
                </span>
                <StatusPill status={t.status} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
