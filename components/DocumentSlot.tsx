"use client";

import { useRef, useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import type { DocumentType, Trade, TradeDocument } from "@/lib/types";
import { DOC_LABELS } from "@/lib/types";
import { sha256Hex } from "@/lib/hash";
import { sampleBlob, sampleFilename } from "@/lib/samples";
import { Hash, TxLink } from "./ui";
import { PlaceholderTag } from "./PlaceholderTag";

export type Staged = { filename: string; hash: string; sample: boolean };

// One row per required document: pick a file (or generate a sample), hash it
// locally, and show whether its hash is already recorded for this trade.
export function DocumentSlot({
  trade,
  type,
  recorded,
  staged,
  onStage,
  locked,
}: {
  trade: Trade;
  type: DocumentType;
  recorded?: TradeDocument;
  staged?: Staged;
  onStage: (s: Staged | undefined) => void;
  locked: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [hashing, setHashing] = useState(false);
  const [replacing, setReplacing] = useState(false);

  async function stage(blob: Blob, filename: string, sample: boolean) {
    setHashing(true);
    try {
      const hash = await sha256Hex(blob);
      onStage({ filename, hash, sample });
      setReplacing(false);
    } finally {
      setHashing(false);
    }
  }

  const showPicker = !locked && (!recorded || replacing) && !staged;

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-line py-4 md:grid-cols-[200px_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:gap-x-6">
      <div className="text-[15px] font-medium">{DOC_LABELS[type]}</div>

      <div className="order-3 col-span-2 min-w-0 truncate text-sm text-muted md:order-none md:col-span-1">
        {staged ? (
          <span className="inline-flex items-center gap-2">
            <span className="truncate">{staged.filename}</span>
            {staged.sample && <PlaceholderTag id="P20" />}
          </span>
        ) : recorded ? (
          recorded.filename
        ) : (
          "—"
        )}
      </div>

      <div className="order-4 col-span-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 md:order-none md:col-span-1">
        {staged ? (
          <>
            <Hash value={staged.hash} n={10} className="!text-fg" />
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Fingerprint className="size-3" /> hashed locally, not yet on-chain
            </span>
          </>
        ) : recorded ? (
          <>
            <Hash value={recorded.hash} n={10} className="!text-fg" />
            {recorded.txSig && <TxLink sig={recorded.txSig} />}
          </>
        ) : (
          <span className="text-sm text-muted">Waiting for file</span>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3">
        <input
          ref={input}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) stage(f, f.name, false);
            e.target.value = "";
          }}
        />
        {hashing ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <Loader2 className="size-3.5 animate-spin" /> Hashing…
          </span>
        ) : showPicker ? (
          <>
            <button
              type="button"
              onClick={() => stage(sampleBlob(trade, type), sampleFilename(trade, type), true)}
              className="text-[13px] text-muted underline-offset-2 hover:text-fg hover:underline"
            >
              Use sample
            </button>
            <button type="button" onClick={() => input.current?.click()} className="btn btn-ghost btn-sm">
              Upload file
            </button>
          </>
        ) : staged ? (
          <button type="button" onClick={() => onStage(undefined)} className="text-[13px] text-muted hover:text-fg">
            Remove
          </button>
        ) : recorded ? (
          <span className="inline-flex items-center gap-2 text-[13px]">
            <span className="font-semibold text-money-ink">✓ Hashed</span>
            {!locked && (
              <button type="button" onClick={() => setReplacing(true)} className="text-muted hover:text-fg">
                Replace
              </button>
            )}
          </span>
        ) : null}
      </div>
    </li>
  );
}
