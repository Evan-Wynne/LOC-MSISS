// Data layer. The UI only talks to the functions exported here.
// Names and signatures follow docs/PROJECT_CONTEXT.md ("Data shapes").
//
// Two modes (lib/config.ts):
//  - mock mode (default): placeholder data kept in the browser.
//  - chain mode (NEXT_PUBLIC_PROGRAM_ID set): every call goes to /api/chain,
//    which signs and reads real transactions on Solana devnet.

import type {
  CreateTradeInput,
  SubmitDocumentInput,
  Trade,
  TradeDocument,
  TradeEvent,
  Verification,
} from "./types";
import { DOC_LABELS } from "./types";
import {
  DEMO_WALLETS,
  SEED_BALANCES,
  SEED_DOCUMENTS,
  SEED_EVENTS,
  SEED_TRADES,
  SEED_VAULTS,
} from "./placeholder-data";
import { CHAIN_MODE, UNIT } from "./config";
import { fmtAmount } from "./explorer";

export type Health = {
  rpc: string;
  programId: string;
  programDeployed: boolean;
  buyerSol: number;
  buyerUsdc: number;
  mint?: string;
};

export type LocState = {
  trades: Trade[];
  documents: TradeDocument[];
  events: TradeEvent[];
  balances: Record<string, number>; // wallet → tUSDC
  vaults: Record<string, number>; // tradeId → tUSDC held in escrow
  health?: Health;
  error?: string;
  ready?: boolean;
};

const STORAGE_KEY = "tradelock-demo-v1";

const seedState = (): LocState => ({
  trades: structuredClone(SEED_TRADES),
  documents: structuredClone(SEED_DOCUMENTS),
  events: structuredClone(SEED_EVENTS),
  balances: { ...SEED_BALANCES },
  vaults: { ...SEED_VAULTS },
});

// PLACEHOLDER[P1]: mock-mode state lives in the browser (memory + localStorage), separate for each visitor → REAL: chain mode keeps only a cache of devnet state, refreshed from /api/chain (see docs/ROADMAP.md §4)
let state: LocState | null = null;
const listeners = new Set<() => void>();

function load(): LocState {
  if (state) return state;
  if (CHAIN_MODE) return (state = { trades: [], documents: [], events: [], balances: {}, vaults: {} });
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return (state = JSON.parse(raw) as LocState);
    } catch {}
  }
  return (state = seedState());
}

function save(next: LocState) {
  state = next;
  if (!CHAIN_MODE) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }
  listeners.forEach((l) => l());
}

// ---- chain mode ---------------------------------------------------------------

async function api<T>(action: string, args?: unknown): Promise<T> {
  const res = await fetch("/api/chain", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, args }),
  });
  const json = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok || json.error) throw new Error(json.error || res.statusText);
  return json as T;
}

export async function refresh() {
  if (!CHAIN_MODE) return;
  try {
    const s = await api<LocState>("state");
    save({ ...s, ready: true });
  } catch (e) {
    save({ ...load(), ready: true, error: (e as Error).message });
  }
}

let polling: ReturnType<typeof setInterval> | null = null;
export function startPolling() {
  if (!CHAIN_MODE || polling) return;
  refresh();
  polling = setInterval(refresh, 5000);
}

async function chainCall<T>(action: string, args: unknown): Promise<T> {
  const out = await api<T>(action, args);
  await refresh();
  return out;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function resetDemo() {
  if (CHAIN_MODE) return;
  save(seedState());
}

// ---- mock helpers -------------------------------------------------------------

// PLACEHOLDER[P2]: mock mode only, fake network latency → REAL: chain mode waits for devnet confirmation (see docs/ROADMAP.md §4)
const delay = (ms = 700) => new Promise((r) => setTimeout(r, ms));

// PLACEHOLDER[P3]: mock mode only, a random base58 string posing as a tx signature → REAL: chain mode returns the real signature (see docs/ROADMAP.md §4)
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function fakeSig() {
  let s = "";
  for (let i = 0; i < 88; i++) s += B58[Math.floor(Math.random() * B58.length)];
  return s;
}

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

// Program string limits are UTF-8 bytes; trim without splitting a character.
export function clipBytes(s: string, maxBytes: number) {
  const enc = new TextEncoder();
  let out = "";
  for (const ch of s) {
    if (enc.encode(out + ch).length > maxBytes) break;
    out += ch;
  }
  return out;
}

function mustTrade(s: LocState, tradeId: string) {
  const t = s.trades.find((x) => x.id === tradeId);
  if (!t) throw new Error("Trade not found");
  return t;
}

const event = (e: Omit<TradeEvent, "id">): TradeEvent => ({ id: uid("evt"), ...e });

export const isOpen = (t: Trade) => t.status === "Funded" || t.status === "DocumentsSubmitted" || t.status === "Rejected";

// ---- writes -------------------------------------------------------------------

// PLACEHOLDER[P4]: mock mode only, createTrade edits local state → REAL: chain mode sends create_trade, which creates the Trade account and moves tUSDC from the buyer into the vault in one instruction (see docs/ROADMAP.md §2)
export async function createTrade(input: CreateTradeInput): Promise<{ tradeId: string; txSig: string }> {
  if (CHAIN_MODE) return chainCall("createTrade", input);
  await delay();
  const s = load();
  const buyer = DEMO_WALLETS.buyer;
  if (!(input.amount > 0)) throw new Error("Amount must be more than 0");
  if ((s.balances[buyer] ?? 0) < input.amount) throw new Error(`Buyer has less than ${fmtAmount(input.amount)} ${UNIT}`);
  if (input.deadline <= Date.now()) throw new Error("Deadline must be in the future");
  if (input.requiredDocs.length === 0) throw new Error("Pick at least one required document");
  const txSig = fakeSig();
  const trade: Trade = {
    id: uid("trd"),
    buyer,
    seller: input.seller,
    inspector: input.inspector,
    title: clipBytes(input.title, 64),
    goods: clipBytes(input.goods, 128),
    amount: input.amount,
    deadline: input.deadline,
    requiredDocs: input.requiredDocs,
    status: "Funded",
    createdAt: Date.now(),
    fundTxSig: txSig,
  };
  save({
    ...s,
    trades: [trade, ...s.trades],
    events: [...s.events, event({ tradeId: trade.id, kind: "Funded", at: trade.createdAt, txSig, actor: "buyer" })],
    balances: { ...s.balances, [buyer]: (s.balances[buyer] ?? 0) - input.amount },
    vaults: { ...s.vaults, [trade.id]: input.amount },
  });
  return { tradeId: trade.id, txSig };
}

// PLACEHOLDER[P5]: fundTrade is a no-op in both modes, by design. create_trade already funds the escrow in the same instruction, so this just returns the create tx → REAL: stays like this (see docs/ROADMAP.md §1)
export async function fundTrade(tradeId: string): Promise<{ txSig: string }> {
  return { txSig: mustTrade(load(), tradeId).fundTxSig };
}

// PLACEHOLDER[P6]: mock mode only, the SHA-256 hash is real (computed in the browser) but it's recorded in local state, not on-chain → REAL: chain mode sends submit_document, which writes the hash into the Trade account (see docs/ROADMAP.md §2)
export async function submitDocument(
  tradeId: string,
  document: SubmitDocumentInput,
): Promise<{ documentId: string; txSig: string }> {
  if (CHAIN_MODE) return chainCall("submitDocument", { tradeId, ...document });
  await delay(600);
  const s = load();
  const trade = mustTrade(s, tradeId);
  if (!isOpen(trade)) throw new Error(`Trade is already ${trade.status}`);
  if (Date.now() > trade.deadline) throw new Error("Deadline has passed; documents can no longer be submitted");
  if (!trade.requiredDocs.includes(document.documentType)) throw new Error("That document isn't required for this trade");
  if (!/^[0-9a-f]{64}$/.test(document.hash)) throw new Error("Invalid SHA-256 hash");
  const txSig = fakeSig();
  const doc: TradeDocument = {
    id: uid("doc"),
    tradeId,
    documentType: document.documentType,
    filename: clipBytes(document.filename, 32),
    hash: document.hash,
    submittedAt: Date.now(),
    txSig,
  };
  // One slot per document type, like the on-chain account: a resubmission replaces it.
  const documents = [...s.documents.filter((d) => !(d.tradeId === tradeId && d.documentType === doc.documentType)), doc];
  const have = new Set(documents.filter((d) => d.tradeId === tradeId).map((d) => d.documentType));
  const complete = trade.requiredDocs.every((r) => have.has(r));
  save({
    ...s,
    documents,
    trades: s.trades.map((t) => (t.id === tradeId && complete ? { ...t, status: "DocumentsSubmitted" } : t)),
    events: [
      ...s.events,
      event({ tradeId, kind: "DocumentSubmitted", at: doc.submittedAt, txSig, actor: "seller", detail: doc.documentType }),
    ],
  });
  return { documentId: doc.id, txSig };
}

// PLACEHOLDER[P7]: mock mode only, approveShipment moves numbers locally → REAL: chain mode sends approve_shipment, signed by the inspector, which transfers the vault's tUSDC to the seller (see docs/ROADMAP.md §2)
export async function approveShipment(tradeId: string): Promise<{ txSig: string }> {
  if (CHAIN_MODE) return chainCall("approveShipment", { tradeId });
  await delay(900);
  const s = load();
  const trade = mustTrade(s, tradeId);
  if (trade.status !== "DocumentsSubmitted") throw new Error("All required documents must be submitted first");
  const txSig = fakeSig();
  const now = Date.now();
  const amount = s.vaults[tradeId] ?? 0;
  save({
    ...s,
    trades: s.trades.map((t) => (t.id === tradeId ? { ...t, status: "Paid", approvedAt: now, settleTxSig: txSig } : t)),
    events: [
      ...s.events,
      event({ tradeId, kind: "Verified", at: now, txSig, actor: "inspector" }),
      event({ tradeId, kind: "Paid", at: now, txSig, actor: "inspector", detail: `${fmtAmount(amount)} ${UNIT} released to seller` }),
    ],
    balances: { ...s.balances, [trade.seller]: (s.balances[trade.seller] ?? 0) + amount },
    vaults: { ...s.vaults, [tradeId]: 0 },
  });
  return { txSig };
}

// PLACEHOLDER[P8]: mock mode only, rejectShipment flips a local status → REAL: chain mode sends reject_shipment, signed by the inspector; the seller can then resubmit (see docs/ROADMAP.md §2)
export async function rejectShipment(tradeId: string): Promise<{ txSig: string }> {
  if (CHAIN_MODE) return chainCall("rejectShipment", { tradeId });
  await delay();
  const s = load();
  const trade = mustTrade(s, tradeId);
  if (trade.status !== "DocumentsSubmitted") throw new Error("Only submitted shipments can be rejected");
  const txSig = fakeSig();
  save({
    ...s,
    trades: s.trades.map((t) => (t.id === tradeId ? { ...t, status: "Rejected" } : t)),
    events: [...s.events, event({ tradeId, kind: "Rejected", at: Date.now(), txSig, actor: "inspector" })],
  });
  return { txSig };
}

// PLACEHOLDER[P9]: mock mode only, refundAfterDeadline trusts the browser clock → REAL: chain mode sends refund_after_deadline, checked against the on-chain clock (see docs/ROADMAP.md §2)
export async function refundAfterDeadline(tradeId: string): Promise<{ txSig: string }> {
  if (CHAIN_MODE) return chainCall("refundAfterDeadline", { tradeId });
  await delay(900);
  const s = load();
  const trade = mustTrade(s, tradeId);
  if (!isOpen(trade)) throw new Error(`Trade is already ${trade.status}`);
  if (Date.now() <= trade.deadline) throw new Error("The deadline hasn't passed yet");
  const txSig = fakeSig();
  const amount = s.vaults[tradeId] ?? 0;
  save({
    ...s,
    trades: s.trades.map((t) => (t.id === tradeId ? { ...t, status: "Refunded", settleTxSig: txSig } : t)),
    events: [
      ...s.events,
      event({ tradeId, kind: "Refunded", at: Date.now(), txSig, actor: "anyone", detail: `${fmtAmount(amount)} ${UNIT} returned to buyer` }),
    ],
    balances: { ...s.balances, [trade.buyer]: (s.balances[trade.buyer] ?? 0) + amount },
    vaults: { ...s.vaults, [tradeId]: 0 },
  });
  return { txSig };
}

// ---- reads --------------------------------------------------------------------

// PLACEHOLDER[P10]: mock mode only, reads local state → REAL: chain mode decodes Trade accounts from getProgramAccounts; documents come from the hashes stored in each account (see docs/ROADMAP.md §4)
export async function getTrades(): Promise<Trade[]> {
  return load().trades;
}

export async function getTrade(tradeId: string): Promise<Trade> {
  return mustTrade(load(), tradeId);
}

export async function getDocuments(tradeId: string): Promise<TradeDocument[]> {
  return docsOf(load(), tradeId);
}

export async function getVerification(tradeId: string): Promise<Verification> {
  const t = mustTrade(load(), tradeId);
  return { tradeId, inspector: t.inspector, approved: t.status === "Paid", approvedAt: t.approvedAt, txSig: t.approvedAt ? t.settleTxSig : undefined };
}

// PLACEHOLDER[P11]: mock mode only, the audit trail is a local event log → REAL: chain mode rebuilds it from getSignaturesForAddress(trade) by matching instruction discriminators (see docs/ROADMAP.md §4)
export async function getEvents(tradeId: string): Promise<TradeEvent[]> {
  return eventsOf(load(), tradeId);
}

// ---- synchronous selectors for React (see lib/use-loc.ts) ----------------------

export function snapshot(): LocState {
  return load();
}

export const docsOf = (s: LocState, tradeId: string) =>
  s.documents
    .filter((d) => d.tradeId === tradeId)
    .sort((a, b) => DOC_ORDER[a.documentType] - DOC_ORDER[b.documentType]);

export const eventsOf = (s: LocState, tradeId: string) =>
  s.events.filter((e) => e.tradeId === tradeId).sort((a, b) => a.at - b.at);

const DOC_ORDER = Object.fromEntries(Object.keys(DOC_LABELS).map((k, i) => [k, i])) as Record<string, number>;
