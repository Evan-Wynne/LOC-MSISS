import type { Trade } from "./types";
import { isOpen } from "./loc";

// How each role's trade list is ordered (shared by the sidebar and the pages,
// so the highlighted trade and the one on screen always agree).
export const sellerOrder = (trades: Trade[]) =>
  [...trades].sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || b.createdAt - a.createdAt);

const RANK: Record<string, number> = { DocumentsSubmitted: 0, Funded: 1, Rejected: 2, Paid: 3, Verified: 3, Refunded: 4 };
export const inspectorOrder = (trades: Trade[]) =>
  [...trades].sort((a, b) => RANK[a.status] - RANK[b.status] || b.createdAt - a.createdAt);

// "Green coffee, 320 bags" → "Green coffee"
export const shortTitle = (t: Trade) => t.title.split(",")[0].trim();
