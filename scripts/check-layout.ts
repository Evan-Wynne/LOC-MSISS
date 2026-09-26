// npm run check:layout: builds program/tests/layout.rs, then checks that
// lib/chain/codec.ts produces exactly the same bytes as the Rust program.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { PublicKey } from "@solana/web3.js";
import {
  decodeTrade,
  encodeApproveShipment,
  encodeCreateTrade,
  encodeRefundAfterDeadline,
  encodeRejectShipment,
  encodeSubmitDocument,
  encodeTrade,
} from "../lib/chain/codec.ts";

execSync("cargo test --quiet --test layout", { cwd: "program", stdio: "inherit" });
const rust = JSON.parse(readFileSync("program/target/layout.json", "utf8"));

const key = (n: number) => new PublicKey(new Uint8Array(32).fill(n));
const TITLE = "Cocoa beans, 200 bags";
const GOODS = "200 bags × 60 kg cocoa, FOB Tema";
const trade = {
  buyer: key(1),
  seller: key(2),
  inspector: key(3),
  mint: key(4),
  tradeId: 1_790_000_000_123n,
  amount: 36_000_000_000n,
  deadline: 1_790_600_000n,
  createdAt: 1_790_000_000n,
  status: 1,
  requiredDocs: 0b111,
  submittedDocs: 0b101,
  docHashes: [Buffer.alloc(32, 0x11), Buffer.alloc(32), Buffer.alloc(32, 0x33)],
  docSubmittedAt: [1_790_000_100n, 0n, 1_790_000_300n],
  docNames: ["bill-of-lading.pdf", "", ""],
  approvedAt: 0n,
  bump: 254,
  vaultBump: 253,
  title: TITLE,
  goods: GOODS,
};

const ts: Record<string, string> = {
  createTrade: encodeCreateTrade({ tradeId: 1_790_000_000_123n, title: TITLE, goods: GOODS, amount: 36_000_000_000n, deadline: 1_790_600_000n, requiredDocs: 0b111 }).toString("hex"),
  submitDocument: encodeSubmitDocument(1, Buffer.alloc(32, 0xab), "commercial-invoice.pdf").toString("hex"),
  approveShipment: encodeApproveShipment().toString("hex"),
  rejectShipment: encodeRejectShipment().toString("hex"),
  refundAfterDeadline: encodeRefundAfterDeadline().toString("hex"),
  trade: encodeTrade(trade).toString("hex"),
};

let ok = true;
for (const [k, v] of Object.entries(ts)) {
  const same = v === rust[k];
  ok &&= same;
  console.log(`${same ? "✓" : "✗"} ${k}${same ? "" : `\n  rust ${rust[k]}\n  ts   ${v}`}`);
}
const back = decodeTrade(Buffer.from(rust.trade, "hex"));
const round = back.title === TITLE && back.goods === GOODS && back.docNames[0] === "bill-of-lading.pdf" && back.seller.equals(key(2));
ok &&= round;
console.log(`${round ? "✓" : "✗"} decodeTrade round-trip`);
console.log(`  Trade account space: ${rust.tradeSpace} bytes`);
if (!ok) process.exit(1);
console.log("Layout matches the Rust program.");
