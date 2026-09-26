"use client";

import { RotateCcw } from "lucide-react";
import { resetDemo } from "@/lib/loc";
import { CHAIN_MODE, PROGRAM_ID } from "@/lib/config";
import { explorerAddress, shortAddr } from "@/lib/explorer";

export function ResetDemo() {
  if (CHAIN_MODE)
    return (
      <a href={explorerAddress(PROGRAM_ID)} target="_blank" rel="noreferrer" className="font-mono hover:text-fg">
        program {shortAddr(PROGRAM_ID)}
      </a>
    );
  return (
    <button onClick={() => resetDemo()} className="inline-flex items-center gap-1.5 hover:text-fg">
      <RotateCcw className="size-3" /> Reset demo data
    </button>
  );
}
