// Chain mode, server side. Holds the three demo keys (P12), builds and signs
// transactions for the Tradelock program on devnet, and reads state back.
// The buyer pays every fee, so only the buyer wallet needs devnet SOL.
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type AccountMeta,
} from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import bs58 from "bs58";
import type { CreateTradeInput, DocumentType, Trade, TradeDocument, TradeEvent } from "@/lib/types";
import type { LocState } from "@/lib/loc";
import {
  DOC_KEYS,
  IX,
  PROGRAM_ERRORS,
  STATUS,
  TRADE_DISC,
  decodeTrade,
  encodeApproveShipment,
  encodeCreateTrade,
  encodeRefundAfterDeadline,
  encodeRejectShipment,
  encodeSubmitDocument,
  fromBase,
  toBase,
  tradePda,
  vaultPda,
  type TradeAccount,
} from "./codec";

const RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
const conn = new Connection(RPC, "confirmed");

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} isn't set. Run npm run setup (see docs/SETUP.md) and add it to the environment.`);
  return v;
}
const programId = () => new PublicKey(env("NEXT_PUBLIC_PROGRAM_ID"));
const mint = () => new PublicKey(env("NEXT_PUBLIC_USDC_MINT"));
const keypair = (name: string) => Keypair.fromSecretKey(bs58.decode(env(name)));
const keys = () => ({
  buyer: keypair("DEMO_BUYER_KEY"),
  seller: keypair("DEMO_SELLER_KEY"),
  inspector: keypair("DEMO_INSPECTOR_KEY"),
});

// Program string limits are UTF-8 bytes.
function clip(s: string, max: number) {
  let out = "";
  for (const ch of s) {
    if (Buffer.byteLength(out + ch) > max) break;
    out += ch;
  }
  return out;
}

// ---- errors in plain words ---------------------------------------------------------

export function explain(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const logs = ((e as { logs?: string[] })?.logs ?? []).join("\n");
  const all = `${msg}\n${logs}`;
  const custom = all.match(/custom program error: 0x([0-9a-f]+)/i);
  if (custom) {
    const code = parseInt(custom[1], 16);
    if (code >= 6000 && PROGRAM_ERRORS[code - 6000]) return PROGRAM_ERRORS[code - 6000];
    if (code === 1) return "The buyer doesn't have enough tUSDC. Re-run npm run setup to mint more.";
  }
  if (/insufficient (funds|lamports)|no record of a prior credit/i.test(all))
    return `The buyer wallet is out of devnet SOL for fees. Fund ${process.env.NEXT_PUBLIC_DEMO_BUYER ?? "it"} at faucet.solana.com.`;
  if (/program that does not exist|ProgramAccountNotFound|invalid program id/i.test(all))
    return "The Tradelock program isn't deployed at NEXT_PUBLIC_PROGRAM_ID on devnet.";
  if (/429|Too Many Requests/i.test(all)) return "Devnet is rate-limiting us. Wait a few seconds and try again.";
  if (/blockhash not found|block height exceeded/i.test(all)) return "Devnet was slow to confirm. Try again.";
  return msg.split("\n")[0].slice(0, 300);
}

// ---- sending -------------------------------------------------------------------------

async function send(ix: TransactionInstruction, ...signers: Keypair[]) {
  const { buyer } = keys();
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: buyer.publicKey, blockhash, lastValidBlockHeight }).add(ix);
  const all = [buyer, ...signers.filter((s) => !s.publicKey.equals(buyer.publicKey))];
  tx.sign(...all);
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  const res = await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  if (res.value.err) throw new Error(`Transaction failed: ${JSON.stringify(res.value.err)}`);
  return sig;
}

const meta = (pubkey: PublicKey, isSigner = false, isWritable = false): AccountMeta => ({ pubkey, isSigner, isWritable });

async function loadTrade(id: string) {
  const info = await conn.getAccountInfo(new PublicKey(id));
  if (!info) throw new Error("Trade not found on devnet");
  return decodeTrade(info.data);
}

// ---- writes --------------------------------------------------------------------------

export async function createTrade(input: CreateTradeInput) {
  const { buyer, seller, inspector } = keys();
  const pid = programId();
  const tradeId = BigInt(Date.now());
  const trade = tradePda(pid, buyer.publicKey, tradeId);
  const data = encodeCreateTrade({
    tradeId,
    title: clip(input.title, 64),
    goods: clip(input.goods, 128),
    amount: toBase(input.amount),
    deadline: BigInt(Math.floor(input.deadline / 1000)),
    requiredDocs: input.requiredDocs.reduce((m, d) => m | (1 << DOC_KEYS.indexOf(d)), 0),
  });
  const ix = new TransactionInstruction({
    programId: pid,
    data,
    keys: [
      meta(buyer.publicKey, true, true),
      meta(seller.publicKey),
      meta(inspector.publicKey),
      meta(mint()),
      meta(getAssociatedTokenAddressSync(mint(), buyer.publicKey), false, true),
      meta(trade, false, true),
      meta(vaultPda(pid, trade), false, true),
      meta(TOKEN_PROGRAM_ID),
      meta(SystemProgram.programId),
    ],
  });
  const txSig = await send(ix);
  return { tradeId: trade.toBase58(), txSig };
}

export async function submitDocument(a: { tradeId: string; documentType: DocumentType; filename: string; hash: string }) {
  const { seller } = keys();
  if (!/^[0-9a-f]{64}$/.test(a.hash)) throw new Error("Invalid SHA-256 hash");
  const ix = new TransactionInstruction({
    programId: programId(),
    data: encodeSubmitDocument(DOC_KEYS.indexOf(a.documentType), Buffer.from(a.hash, "hex"), clip(a.filename, 32)),
    keys: [meta(seller.publicKey, true), meta(new PublicKey(a.tradeId), false, true)],
  });
  return { documentId: `${a.tradeId}-${a.documentType}`, txSig: await send(ix, seller) };
}

export async function approveShipment({ tradeId }: { tradeId: string }) {
  const { inspector } = keys();
  const pid = programId();
  const trade = new PublicKey(tradeId);
  const t = await loadTrade(tradeId);
  const ix = new TransactionInstruction({
    programId: pid,
    data: encodeApproveShipment(),
    keys: [
      meta(inspector.publicKey, true),
      meta(trade, false, true),
      meta(vaultPda(pid, trade), false, true),
      meta(getAssociatedTokenAddressSync(t.mint, t.seller), false, true),
      meta(TOKEN_PROGRAM_ID),
    ],
  });
  return { txSig: await send(ix, inspector) };
}

export async function rejectShipment({ tradeId }: { tradeId: string }) {
  const { inspector } = keys();
  const ix = new TransactionInstruction({
    programId: programId(),
    data: encodeRejectShipment(),
    keys: [meta(inspector.publicKey, true), meta(new PublicKey(tradeId), false, true)],
  });
  return { txSig: await send(ix, inspector) };
}

export async function refundAfterDeadline({ tradeId }: { tradeId: string }) {
  const { buyer } = keys();
  const pid = programId();
  const trade = new PublicKey(tradeId);
  const t = await loadTrade(tradeId);
  const ix = new TransactionInstruction({
    programId: pid,
    data: encodeRefundAfterDeadline(),
    keys: [
      meta(buyer.publicKey, true),
      meta(trade, false, true),
      meta(vaultPda(pid, trade), false, true),
      meta(getAssociatedTokenAddressSync(t.mint, t.buyer), false, true),
      meta(TOKEN_PROGRAM_ID),
    ],
  });
  return { txSig: await send(ix) };
}

// ---- reads ---------------------------------------------------------------------------

// Audit trail per trade, rebuilt from its transactions. Cached until the
// account's bytes change, so polling doesn't refetch history every 5 seconds.
const eventCache = new Map<string, { key: string; events: TradeEvent[] }>();

const IX_KIND = new Map<string, "create" | "submit" | "approve" | "reject" | "refund">([
  [IX.createTrade.toString("hex"), "create"],
  [IX.submitDocument.toString("hex"), "submit"],
  [IX.approveShipment.toString("hex"), "approve"],
  [IX.rejectShipment.toString("hex"), "reject"],
  [IX.refundAfterDeadline.toString("hex"), "refund"],
]);

async function eventsFor(trade: PublicKey, t: TradeAccount, dataKey: string): Promise<TradeEvent[]> {
  const id = trade.toBase58();
  const hit = eventCache.get(id);
  if (hit?.key === dataKey) return hit.events;

  const pid = programId();
  const sigs = (await conn.getSignaturesForAddress(trade, { limit: 50 })).filter((s) => !s.err).reverse();
  const txs = await conn.getTransactions(sigs.map((s) => s.signature), { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
  const amount = `${fromBase(t.amount).toLocaleString("en-US")} tUSDC`;
  const events: TradeEvent[] = [];
  txs.forEach((tx, i) => {
    if (!tx) return;
    const msg = tx.transaction.message;
    const accounts = msg.staticAccountKeys;
    const at = (tx.blockTime ?? sigs[i].blockTime ?? 0) * 1000;
    const txSig = sigs[i].signature;
    for (const ci of msg.compiledInstructions) {
      if (!accounts[ci.programIdIndex]?.equals(pid)) continue;
      const data = Buffer.from(ci.data);
      const kind = IX_KIND.get(data.subarray(0, 8).toString("hex"));
      const base = { tradeId: id, at, txSig };
      if (kind === "create") events.push({ ...base, id: `${txSig}-f`, kind: "Funded", actor: "buyer" });
      if (kind === "submit") events.push({ ...base, id: `${txSig}-d`, kind: "DocumentSubmitted", actor: "seller", detail: DOC_KEYS[data[8]] });
      if (kind === "reject") events.push({ ...base, id: `${txSig}-r`, kind: "Rejected", actor: "inspector" });
      if (kind === "approve") {
        events.push({ ...base, id: `${txSig}-v`, kind: "Verified", actor: "inspector" });
        events.push({ ...base, id: `${txSig}-p`, kind: "Paid", actor: "inspector", detail: `${amount} released to seller` });
      }
      if (kind === "refund") events.push({ ...base, id: `${txSig}-x`, kind: "Refunded", actor: "anyone", detail: `${amount} returned to buyer` });
    }
  });
  eventCache.set(id, { key: dataKey, events });
  return events;
}

const tokenAmount = (data?: Buffer | null) => (data && data.length >= AccountLayout.span ? fromBase(AccountLayout.decode(data).amount) : 0);

export async function getState(): Promise<LocState> {
  const pid = programId();
  const m = mint();
  const buyer = new PublicKey(env("NEXT_PUBLIC_DEMO_BUYER"));
  const seller = new PublicKey(env("NEXT_PUBLIC_DEMO_SELLER"));
  const buyerAta = getAssociatedTokenAddressSync(m, buyer);
  const sellerAta = getAssociatedTokenAddressSync(m, seller);

  const [programInfo, buyerInfo, mintInfo, buyerTok, sellerTok] = await conn.getMultipleAccountsInfo([pid, buyer, m, buyerAta, sellerAta]);
  const health = {
    rpc: RPC,
    programId: pid.toBase58(),
    programDeployed: !!programInfo?.executable,
    buyerSol: Math.round(((buyerInfo?.lamports ?? 0) / 1e9) * 1000) / 1000,
    buyerUsdc: tokenAmount(buyerTok?.data),
    mint: mintInfo ? m.toBase58() : undefined,
  };
  if (!health.programDeployed) return { trades: [], documents: [], events: [], balances: {}, vaults: {}, health };

  const accounts = await conn.getProgramAccounts(pid, { filters: [{ memcmp: { offset: 0, bytes: bs58.encode(TRADE_DISC) } }] });
  const decoded = accounts.map((a) => ({ pk: a.pubkey, t: decodeTrade(a.account.data), key: a.account.data.toString("base64") }));
  const vaultInfos = decoded.length ? await conn.getMultipleAccountsInfo(decoded.map((d) => vaultPda(pid, d.pk))) : [];

  const trades: Trade[] = [];
  const documents: TradeDocument[] = [];
  const events: TradeEvent[] = [];
  const vaults: Record<string, number> = {};

  for (const [i, { pk, t, key }] of decoded.entries()) {
    const id = pk.toBase58();
    const evs = await eventsFor(pk, t, key);
    events.push(...evs);
    vaults[id] = tokenAmount(vaultInfos[i]?.data);
    const lastSig = (kind: TradeEvent["kind"], detail?: string) =>
      [...evs].reverse().find((e) => e.kind === kind && (detail === undefined || e.detail === detail))?.txSig;
    const status = STATUS[t.status] ?? "Funded";
    trades.push({
      id,
      buyer: t.buyer.toBase58(),
      seller: t.seller.toBase58(),
      inspector: t.inspector.toBase58(),
      title: t.title,
      goods: t.goods,
      amount: fromBase(t.amount),
      deadline: Number(t.deadline) * 1000,
      status,
      requiredDocs: DOC_KEYS.filter((_, b) => t.requiredDocs & (1 << b)),
      createdAt: Number(t.createdAt) * 1000,
      fundTxSig: lastSig("Funded") ?? "",
      approvedAt: t.approvedAt ? Number(t.approvedAt) * 1000 : undefined,
      settleTxSig: status === "Paid" ? lastSig("Paid") : status === "Refunded" ? lastSig("Refunded") : undefined,
    });
    DOC_KEYS.forEach((d, b) => {
      if (!(t.submittedDocs & (1 << b))) return;
      documents.push({
        id: `${id}-${d}`,
        tradeId: id,
        documentType: d,
        filename: t.docNames[b],
        hash: t.docHashes[b].toString("hex"),
        submittedAt: Number(t.docSubmittedAt[b]) * 1000,
        txSig: lastSig("DocumentSubmitted", d),
      });
    });
  }

  trades.sort((a, b) => b.createdAt - a.createdAt);
  return {
    trades,
    documents,
    events,
    vaults,
    balances: { [buyer.toBase58()]: health.buyerUsdc, [seller.toBase58()]: tokenAmount(sellerTok?.data) },
    health,
  };
}
