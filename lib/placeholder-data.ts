import type { Role, Trade, TradeDocument, TradeEvent } from "./types";

// PLACEHOLDER[P12]: one set of demo wallets for everyone. Mock mode: made-up addresses. Chain mode: throwaway devnet keys held by the server, which signs for all three parties → REAL: each party connects their own wallet (Phantom via wallet-adapter) and signs in the browser (see docs/ROADMAP.md §7)
export const DEMO_WALLETS: Record<Role, string> = {
  buyer: process.env.NEXT_PUBLIC_DEMO_BUYER || "BqwcVx1cU7iSurLdzHXpgbGqMK51RbAfiWeQ5bfc1YR8",
  seller: process.env.NEXT_PUBLIC_DEMO_SELLER || "9pQsGxiQo5Vv5sQVtGr2QDYDZnsW1KTv4KVPxpFPLKsN",
  inspector: process.env.NEXT_PUBLIC_DEMO_INSPECTOR || "6b4BaaY5VD5eEZxEsLm8h2WN9cfvThGp9TSPMMAAUqgF",
};

export const ROLE_LABELS: Record<Role, string> = {
  buyer: "Buyer",
  seller: "Seller",
  inspector: "Inspector",
};

// Neutral labels: these are demo wallets, not real companies.
export const PARTY_NAMES: Record<Role, string> = {
  buyer: "Demo buyer",
  seller: "Demo seller",
  inspector: "Demo inspector",
};

export function roleOf(addr: string): Role | null {
  return (Object.keys(DEMO_WALLETS) as Role[]).find((r) => DEMO_WALLETS[r] === addr) ?? null;
}

// PLACEHOLDER[P13]: mock-mode starting balances in tUSDC (chain mode reads live token balances from devnet)
export const SEED_BALANCES: Record<string, number> = {
  [DEMO_WALLETS.buyer]: 115_500,
  [DEMO_WALLETS.seller]: 48_000,
  [DEMO_WALLETS.inspector]: 0,
};

const t = (iso: string) => Date.parse(iso);

// PLACEHOLDER[P14]: mock-mode seed trades, documents and events (chain mode reads Trade accounts and their transactions from devnet; no seed data)
export const SEED_TRADES: Trade[] = [
  {
    id: "trd_seed_alu",
    title: "Aluminium extrusions, 2 × 40ft",
    goods: "Two 40ft containers of 6063-T5 aluminium extrusion profiles, CIF Dublin",
    amount: 86_500,
    buyer: DEMO_WALLETS.buyer,
    seller: DEMO_WALLETS.seller,
    inspector: DEMO_WALLETS.inspector,
    deadline: t("2026-10-10T17:00:00Z"),
    status: "Funded",
    requiredDocs: ["BillOfLading", "Invoice", "InspectionCertificate"],
    createdAt: t("2026-09-25T09:00:00Z"),
    fundTxSig: "SDk88WRGAyA7B8s3XAp6EqptgoBxzmwiZRAsDS5XjBYQuzqQT6qW3tiqJXPrp7WpSrjrFe6smGTqjRFcxCCC49oX",
  },
  {
    id: "trd_seed_coffee",
    title: "Green coffee, 320 bags",
    goods: "320 bags × 60 kg washed arabica green coffee, FOB Cartagena",
    amount: 48_000,
    buyer: DEMO_WALLETS.buyer,
    seller: DEMO_WALLETS.seller,
    inspector: DEMO_WALLETS.inspector,
    deadline: t("2026-10-02T17:00:00Z"),
    status: "Paid",
    requiredDocs: ["BillOfLading", "Invoice", "InspectionCertificate"],
    createdAt: t("2026-09-18T10:00:00Z"),
    fundTxSig: "E7d57hU1gWsEdJCpEDG9yKSek1yhzQKXGsmw35h9WfJ8ACq85sjvzjHiGCMuovExw836FZYmtLNs2MEbiPuRhmHv",
    approvedAt: t("2026-09-22T09:30:00Z"),
    settleTxSig: "jdW4SXRDpAdZk1SyXWHthLp2q8E3r9kG8k4FpYJZzfjuhyfHy8DdpsvsfBXLKGUVLTxb6myPR83L3f45UxozThxg",
  },
];

// Hashes are the real SHA-256 of lib/samples.ts output for these trades, so
// "Verify a document" on the Inspector screen matches them.
export const SEED_DOCUMENTS: TradeDocument[] = [
  {
    id: "doc_seed_alu_bl",
    tradeId: "trd_seed_alu",
    documentType: "BillOfLading",
    filename: "bill-of-lading-bl-eedalu.txt",
    hash: "66d3853c08420a1e3d60fbf0419e2062f17c05084a63c504da1d02402d595b90",
    submittedAt: t("2026-09-26T08:40:00Z"),
    txSig: "4iTfCWVeJqZTLECk8pQz6rq9Le272G2JnWmySQKrX3ZCca3rnLGbmsRLTSnrWkNqAnpnahejPy7EuJi5SNycVb9B",
  },
  {
    id: "doc_seed_coffee_bl",
    tradeId: "trd_seed_coffee",
    documentType: "BillOfLading",
    filename: "bill-of-lading-bl-coffee.txt",
    hash: "1c8109ed3b14d5575e9b5a64dfbb052d5ff3979c72d781b364428a8898899fc2",
    submittedAt: t("2026-09-21T14:05:00Z"),
    txSig: "vSGjdJ9z12Avz8fM5CX8Ro4pkidnjTZJKPtDmXF8Z6qfEJA1iSCmNpUHFA1DX2PZzcyCB8x64aD3JsrJ9Zc9xEu4",
  },
  {
    id: "doc_seed_coffee_inv",
    tradeId: "trd_seed_coffee",
    documentType: "Invoice",
    filename: "invoice-inv-coffee.txt",
    hash: "827bd323f2f9c0ed7bc13671eb35b8638cdacade7fd65b33a5de7cbea4b02219",
    submittedAt: t("2026-09-21T14:06:00Z"),
    txSig: "FN6RByiFH9fez4kze9QUstgaUdwMYPTAposHbHEEFqR7k3LhVkD8FjtmrSzs1V4Vk6xrYT2teW8faje1yXhSENqQ",
  },
  {
    id: "doc_seed_coffee_ic",
    tradeId: "trd_seed_coffee",
    documentType: "InspectionCertificate",
    filename: "inspection-cert-ic-coffee.txt",
    hash: "4e260fe88a0d68258d2f4d5d3f0c3f7a532c1b9d1e5c1cb5d60fe9f348538213",
    submittedAt: t("2026-09-21T14:07:00Z"),
    txSig: "MwjLbW66r14pAtDV2ZQJxL9UEe4MSdPeWDGqtAeuYUrgXRyZxkE7shin6smqusWJQ9NQf99jKBgJtZAZ2PvcRJ6T",
  },
];

export const SEED_EVENTS: TradeEvent[] = [
  ...SEED_TRADES.map<TradeEvent>((tr) => ({
    id: `evt_${tr.id}_funded`,
    tradeId: tr.id,
    kind: "Funded",
    at: tr.createdAt,
    txSig: tr.fundTxSig,
    actor: "buyer",
  })),
  ...SEED_DOCUMENTS.map<TradeEvent>((d) => ({
    id: `evt_${d.id}`,
    tradeId: d.tradeId,
    kind: "DocumentSubmitted",
    at: d.submittedAt,
    txSig: d.txSig!,
    actor: "seller",
    detail: d.documentType,
  })),
  {
    id: "evt_coffee_verified",
    tradeId: "trd_seed_coffee",
    kind: "Verified",
    at: t("2026-09-22T09:30:00Z"),
    txSig: "jdW4SXRDpAdZk1SyXWHthLp2q8E3r9kG8k4FpYJZzfjuhyfHy8DdpsvsfBXLKGUVLTxb6myPR83L3f45UxozThxg",
    actor: "inspector",
  },
  {
    id: "evt_coffee_paid",
    tradeId: "trd_seed_coffee",
    kind: "Paid",
    at: t("2026-09-22T09:30:00Z"),
    txSig: "jdW4SXRDpAdZk1SyXWHthLp2q8E3r9kG8k4FpYJZzfjuhyfHy8DdpsvsfBXLKGUVLTxb6myPR83L3f45UxozThxg",
    actor: "inspector",
    detail: "48,000 tUSDC released to seller",
  },
];

export const SEED_VAULTS: Record<string, number> = {
  trd_seed_alu: 86_500,
  trd_seed_coffee: 0,
};
