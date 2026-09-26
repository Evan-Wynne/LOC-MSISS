import { CHAIN_MODE } from "./config";

// PLACEHOLDER[P15]: in mock mode these links point at fake signatures/addresses and 404 → REAL: chain mode passes real devnet signatures and accounts, so the links resolve (see docs/ROADMAP.md §4)
// Mock-mode signatures and addresses don't exist on-chain, so they aren't linked.
export const explorerTx = (sig: string) =>
  CHAIN_MODE ? `https://explorer.solana.com/tx/${sig}?cluster=devnet` : undefined;

export const explorerAddress = (addr: string) =>
  CHAIN_MODE ? `https://explorer.solana.com/address/${addr}?cluster=devnet` : undefined;

export const shortAddr = (addr: string, n = 4) =>
  addr.length <= n * 2 + 1 ? addr : `${addr.slice(0, n)}…${addr.slice(-n)}`;

export const fmtAmount = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 2 });

export const fmtDate = (ms: number) =>
  new Date(ms).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" });

// Money always shows two decimals, e.g. 48,500.00.
export const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Short human reference for a trade (LC-0041, LC-0042…), by creation order.
export const tradeRef = (trades: { id: string; createdAt: number }[], id: string) => {
  const i = [...trades].sort((a, b) => a.createdAt - b.createdAt).findIndex((t) => t.id === id);
  return `LC-${String(41 + Math.max(0, i)).padStart(4, "0")}`;
};
