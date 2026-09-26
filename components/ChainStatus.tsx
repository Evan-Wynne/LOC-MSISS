"use client";

import { AlertTriangle } from "lucide-react";
import { CHAIN_MODE } from "@/lib/config";
import { useLoc } from "@/lib/use-loc";
import { DEMO_WALLETS } from "@/lib/placeholder-data";

// Chain mode only: explains in plain words what's wrong when devnet isn't usable yet.
export function ChainStatus() {
  const s = useLoc();
  if (!CHAIN_MODE || !s) return null;
  const h = s.health;
  let msg: React.ReactNode = null;
  if (s.error) msg = <>Can&apos;t reach Solana devnet: {s.error}</>;
  else if (h && !h.programDeployed)
    msg = <>Program <code className="font-mono">{h.programId}</code> isn&apos;t deployed on devnet. Check <code>NEXT_PUBLIC_PROGRAM_ID</code>.</>;
  else if (h && h.buyerSol < 0.05)
    msg = (
      <>
        The buyer wallet has {h.buyerSol} SOL for fees. Fund{" "}
        <code className="select-all font-mono">{DEMO_WALLETS.buyer}</code> at{" "}
        <a className="underline" href="https://faucet.solana.com" target="_blank" rel="noreferrer">faucet.solana.com</a> (devnet, free).
      </>
    );
  else if (h && !h.mint)
    msg = <>No test USDC mint configured. Run <code className="font-mono">npm run setup -- {h.programId}</code> again (see docs/SETUP.md).</>;
  else if (h && h.buyerUsdc <= 0)
    msg = <>The buyer wallet has 0 tUSDC. Re-run <code className="font-mono">npm run setup</code> to mint test USDC.</>;
  if (!msg) return null;
  return (
    <div className="border-b border-warn/40 bg-warn/10 px-4 py-2.5 text-sm text-fg sm:px-7">
      <div className="flex items-start gap-2 break-all">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div>{msg}</div>
      </div>
    </div>
  );
}
