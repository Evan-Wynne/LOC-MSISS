// PLACEHOLDER[P15]: in mock mode these links point at fake signatures/addresses and 404 → REAL: chain mode passes real devnet signatures and accounts, so the links resolve (see docs/ROADMAP.md §4)
export const explorerTx = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

export const explorerAddress = (addr: string) =>
  `https://explorer.solana.com/address/${addr}?cluster=devnet`;

export const shortAddr = (addr: string, n = 4) =>
  addr.length <= n * 2 + 1 ? addr : `${addr.slice(0, n)}…${addr.slice(-n)}`;

export const fmtAmount = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 2 });

export const fmtDate = (ms: number) =>
  new Date(ms).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" });
