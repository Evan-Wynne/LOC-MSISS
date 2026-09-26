"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { CircleCheck, CircleX, FileSearch, Loader2 } from "lucide-react";
import type { DocumentType, Trade, TradeDocument } from "@/lib/types";
import { DOC_LABELS } from "@/lib/types";
import { sha256Hex } from "@/lib/hash";
import { sampleText, tamper } from "@/lib/samples";

type Result = {
  name: string;
  hash: string;
  match?: TradeDocument;
  note?: string;
};

// Re-hashes a file in the browser and compares it with the hashes recorded for
// this trade. Edit one character and the hash no longer matches.
export function VerifyDropZone({ trade, docs }: { trade: Trade; docs: TradeDocument[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [sampleType, setSampleType] = useState<DocumentType>(docs[0]?.documentType ?? trade.requiredDocs[0]);

  async function check(data: Blob | string, name: string, note?: string) {
    setBusy(true);
    try {
      const hash = await sha256Hex(data);
      setRes({ name, hash, note, match: docs.find((d) => d.hash === hash) });
    } finally {
      setBusy(false);
    }
  }

  const original = () => sampleText(trade, sampleType);

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) check(f, f.name);
        }}
        onClick={() => input.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center transition-colors ${
          over ? "border-fg/50 bg-panel-2" : "border-line-2 hover:border-fg/30 hover:bg-panel-2/60"
        }`}
      >
        {busy ? <Loader2 className="size-5 animate-spin text-muted" /> : <FileSearch className="size-5 text-muted" />}
        <div className="text-sm font-medium">Drop a document to verify it</div>
        <div className="text-xs text-muted">It&apos;s hashed in your browser and compared with the recorded hashes. Nothing is uploaded.</div>
        <input
          ref={input}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) check(f, f.name);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>No file handy?</span>
        <select
          value={sampleType}
          onChange={(e) => setSampleType(e.target.value as DocumentType)}
          className="rounded-md border border-line bg-panel-2 px-2 py-1.5 text-xs text-fg outline-none"
          aria-label="Sample document type"
        >
          {trade.requiredDocs.map((d) => (
            <option key={d} value={d}>
              Sample {DOC_LABELS[d].toLowerCase()}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => check(original(), `Sample ${DOC_LABELS[sampleType].toLowerCase()}`)} className="btn btn-ghost btn-sm">
          Try the original
        </button>
        <button
          type="button"
          onClick={() => {
            const t = tamper(original());
            check(t.text, `Tampered ${DOC_LABELS[sampleType].toLowerCase()}`, t.note);
          }}
          className="btn btn-ghost btn-sm"
        >
          Try a tampered copy
        </button>
      </div>

      {res && (
        <motion.div
          key={res.hash + res.name}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 rounded-xl px-4 py-3.5 ring-1 ${res.match ? "bg-money/[0.07] ring-money/30" : "bg-danger/[0.07] ring-danger/30"}`}
        >
          <div className={`flex items-center gap-2 text-sm font-medium ${res.match ? "text-money" : "text-danger"}`}>
            {res.match ? <CircleCheck className="size-4" /> : <CircleX className="size-4" />}
            {res.match
              ? `Matches the on-chain hash of the ${DOC_LABELS[res.match.documentType].toLowerCase()}`
              : "Doesn't match: tampered or wrong file"}
          </div>
          <div className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed text-muted">
            <div className="truncate">
              <span className="text-fg/70">{res.name}</span>
              {res.note && <span className="font-sans"> · {res.note}</span>}
            </div>
            <div className="break-all">
              sha256 <span className={res.match ? "text-money" : "text-danger"}>{res.hash}</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
