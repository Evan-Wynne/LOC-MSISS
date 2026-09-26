// Hand-written Borsh encoding for the Tradelock program (program/src/lib.rs).
// No Anchor client or IDL: npm run check:layout proves these bytes match the
// Rust program exactly. Server-only (uses node:crypto).
import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

export const DOC_KEYS = ["BillOfLading", "Invoice", "InspectionCertificate"] as const;
export const STATUS = ["Funded", "DocumentsSubmitted", "Paid", "Refunded", "Rejected"] as const;
export const DECIMALS = 6;

const sha = (s: string) => createHash("sha256").update(s).digest();
export const ixDisc = (name: string) => sha(`global:${name}`).subarray(0, 8);
export const accDisc = (name: string) => sha(`account:${name}`).subarray(0, 8);
export const TRADE_DISC = accDisc("Trade");

export const IX = {
  createTrade: ixDisc("create_trade"),
  submitDocument: ixDisc("submit_document"),
  approveShipment: ixDisc("approve_shipment"),
  rejectShipment: ixDisc("reject_shipment"),
  refundAfterDeadline: ixDisc("refund_after_deadline"),
};

// Anchor custom errors start at 6000, in declaration order.
export const PROGRAM_ERRORS = [
  "Only the designated party can do this",
  "The trade isn't in the right state for this",
  "The deadline hasn't passed yet",
  "The deadline has passed",
  "That document type isn't required for this trade",
  "Not every required document has been submitted",
  "Text is too long",
  "Invalid amount",
];

export class Writer {
  private parts: Buffer[] = [];
  raw(b: Uint8Array) {
    this.parts.push(Buffer.from(b));
    return this;
  }
  u8(n: number) {
    return this.raw(Uint8Array.of(n));
  }
  u32(n: number) {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n);
    return this.raw(b);
  }
  u64(n: bigint) {
    const b = Buffer.alloc(8);
    b.writeBigUInt64LE(n);
    return this.raw(b);
  }
  i64(n: bigint) {
    const b = Buffer.alloc(8);
    b.writeBigInt64LE(n);
    return this.raw(b);
  }
  str(s: string) {
    const b = Buffer.from(s, "utf8");
    return this.u32(b.length).raw(b);
  }
  bytes32(b: Uint8Array) {
    if (b.length !== 32) throw new Error("expected 32 bytes");
    return this.raw(b);
  }
  done() {
    return Buffer.concat(this.parts);
  }
}

export class Reader {
  o = 0;
  b: Buffer;
  constructor(b: Buffer) {
    this.b = b;
  }
  u8() {
    return this.b[this.o++];
  }
  u64() {
    const v = this.b.readBigUInt64LE(this.o);
    this.o += 8;
    return v;
  }
  i64() {
    const v = this.b.readBigInt64LE(this.o);
    this.o += 8;
    return v;
  }
  bytes(n: number) {
    const v = this.b.subarray(this.o, this.o + n);
    this.o += n;
    return v;
  }
  key() {
    return new PublicKey(this.bytes(32));
  }
  str() {
    const n = this.b.readUInt32LE(this.o);
    this.o += 4;
    return this.bytes(n).toString("utf8");
  }
}

// ---- instructions --------------------------------------------------------------

export type CreateTradeArgs = {
  tradeId: bigint;
  title: string;
  goods: string;
  amount: bigint; // base units
  deadline: bigint; // unix seconds
  requiredDocs: number; // bitmask
};

export const encodeCreateTrade = (a: CreateTradeArgs) =>
  new Writer().raw(IX.createTrade).u64(a.tradeId).str(a.title).str(a.goods).u64(a.amount).i64(a.deadline).u8(a.requiredDocs).done();

export const encodeSubmitDocument = (docType: number, hash: Uint8Array, name: string) =>
  new Writer().raw(IX.submitDocument).u8(docType).bytes32(hash).str(name).done();

export const encodeApproveShipment = () => Buffer.from(IX.approveShipment);
export const encodeRejectShipment = () => Buffer.from(IX.rejectShipment);
export const encodeRefundAfterDeadline = () => Buffer.from(IX.refundAfterDeadline);

// ---- Trade account ---------------------------------------------------------------

export type TradeAccount = {
  buyer: PublicKey;
  seller: PublicKey;
  inspector: PublicKey;
  mint: PublicKey;
  tradeId: bigint;
  amount: bigint;
  deadline: bigint;
  createdAt: bigint;
  status: number;
  requiredDocs: number;
  submittedDocs: number;
  docHashes: Buffer[];
  docSubmittedAt: bigint[];
  docNames: string[];
  approvedAt: bigint;
  bump: number;
  vaultBump: number;
  title: string;
  goods: string;
};

const unpad = (b: Buffer) => {
  const end = b.indexOf(0);
  return b.subarray(0, end < 0 ? b.length : end).toString("utf8");
};

export function decodeTrade(data: Buffer): TradeAccount {
  if (!data.subarray(0, 8).equals(TRADE_DISC)) throw new Error("not a Trade account");
  const r = new Reader(data);
  r.o = 8;
  const t = {
    buyer: r.key(),
    seller: r.key(),
    inspector: r.key(),
    mint: r.key(),
    tradeId: r.u64(),
    amount: r.u64(),
    deadline: r.i64(),
    createdAt: r.i64(),
    status: r.u8(),
    requiredDocs: r.u8(),
    submittedDocs: r.u8(),
    docHashes: [0, 1, 2].map(() => Buffer.from(r.bytes(32))),
    docSubmittedAt: [0, 1, 2].map(() => r.i64()),
    docNames: [0, 1, 2].map(() => unpad(Buffer.from(r.bytes(32)))),
    approvedAt: r.i64(),
    bump: r.u8(),
    vaultBump: r.u8(),
    title: r.str(),
    goods: r.str(),
  };
  return t;
}

// Only used by the layout check: the account bytes as the program writes them.
export function encodeTrade(t: TradeAccount) {
  const w = new Writer().raw(TRADE_DISC);
  for (const k of [t.buyer, t.seller, t.inspector, t.mint]) w.raw(k.toBytes());
  w.u64(t.tradeId).u64(t.amount).i64(t.deadline).i64(t.createdAt).u8(t.status).u8(t.requiredDocs).u8(t.submittedDocs);
  t.docHashes.forEach((h) => w.bytes32(h));
  t.docSubmittedAt.forEach((s) => w.i64(s));
  t.docNames.forEach((n) => {
    const b = Buffer.alloc(32);
    Buffer.from(n, "utf8").copy(b);
    w.raw(b);
  });
  return w.i64(t.approvedAt).u8(t.bump).u8(t.vaultBump).str(t.title).str(t.goods).done();
}

// ---- PDAs ------------------------------------------------------------------------

export function tradePda(programId: PublicKey, buyer: PublicKey, tradeId: bigint) {
  const id = Buffer.alloc(8);
  id.writeBigUInt64LE(tradeId);
  return PublicKey.findProgramAddressSync([Buffer.from("trade"), buyer.toBuffer(), id], programId)[0];
}

export const vaultPda = (programId: PublicKey, trade: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("vault"), trade.toBuffer()], programId)[0];

export const toBase = (amount: number) => BigInt(Math.round(amount * 10 ** DECIMALS));
export const fromBase = (n: bigint) => Number(n) / 10 ** DECIMALS;
