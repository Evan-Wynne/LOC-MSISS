"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, Fingerprint, Loader2, Sparkles, Upload } from "lucide-react";
import type { DocumentType, Trade, TradeDocument } from "@/lib/types";
import { DOC_LABELS } from "@/lib/types";
import { sha256Hex } from "@/lib/hash";
import { sampleBlob, sampleFilename } from "@/lib/samples";
import { fmtDate } from "@/lib/explorer";
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
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
      <div className="flex min-w-0 flex-1 basis-60 items-start gap-3">
        <div
          className={`grid size-9 shrink-0 place-items-center rounded-lg ring-1 ${
            staged ? "bg-fg/5 ring-line-2" : recorded ? "bg-money/10 ring-money/25" : "bg-panel-2 ring-line"
          }`}
        >
          {recorded && !staged ? <CheckCircle2 className="size-4 text-money" /> : <FileText className="size-4 text-muted" />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{DOC_LABELS[type]}</div>
          {staged ? (
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1 text-fg/90">
                <Fingerprint className="size-3" /> Hashed locally
              </span>
              <Hash value={staged.hash} />
              <span className="truncate">{staged.filename}</span>
              {staged.sample && <PlaceholderTag id="P20" />}
            </div>
          ) : recorded ? (
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span className="text-money">Recorded on-chain</span>
              <Hash value={recorded.hash} />
              {recorded.txSig && <TxLink sig={recorded.txSig} />}
              <span>· {fmtDate(recorded.submittedAt)}</span>
            </div>
          ) : (
            <div className="mt-0.5 text-xs text-muted">Not provided yet</div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
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
            <button type="button" onClick={() => input.current?.click()} className="btn btn-ghost btn-sm">
              <Upload className="size-3.5" /> Choose file
            </button>
            <button
              type="button"
              onClick={() => stage(sampleBlob(trade, type), sampleFilename(trade, type), true)}
              className="btn btn-ghost btn-sm"
            >
              <Sparkles className="size-3.5" /> Use sample
            </button>
          </>
        ) : staged ? (
          <button type="button" onClick={() => onStage(undefined)} className="text-xs text-muted hover:text-fg">
            Remove
          </button>
        ) : recorded && !locked ? (
          <button type="button" onClick={() => setReplacing(true)} className="text-xs text-muted hover:text-fg">
            Replace
          </button>
        ) : null}
      </div>
    </li>
  );
}
