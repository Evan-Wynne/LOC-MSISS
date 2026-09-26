// npm run setup -- <PROGRAM_ID>
// One-time devnet setup for chain mode. Safe to re-run: it keeps existing keys
// and only does the steps that are still missing.
//  1. demo keys for buyer, seller, inspector → .env.local
//  2. checks the program is deployed
//  3. gets devnet SOL for the buyer (airdrop, or tells you to use the faucet)
//  4. creates the tUSDC test mint + token accounts, mints 100,000 tUSDC to the buyer
//  5. prints the values to paste into Vercel
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import bs58 from "bs58";

const FILE = ".env.local";
const RPC = "https://api.devnet.solana.com";
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

const env = {};
if (existsSync(FILE))
  for (const line of readFileSync(FILE, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
const save = () => writeFileSync(FILE, Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");

const programArg = process.argv[2] || env.NEXT_PUBLIC_PROGRAM_ID;
if (!programArg) {
  console.log(`Usage: ${bold("npm run setup -- <PROGRAM_ID>")}  (the Program ID from Solana Playground)`);
  process.exit(1);
}
env.NEXT_PUBLIC_PROGRAM_ID = new PublicKey(programArg).toBase58();
env.NEXT_PUBLIC_RPC_URL ||= RPC;

// 1. keys
const kp = {};
for (const role of ["BUYER", "SELLER", "INSPECTOR"]) {
  if (!env[`DEMO_${role}_KEY`]) env[`DEMO_${role}_KEY`] = bs58.encode(Keypair.generate().secretKey);
  kp[role] = Keypair.fromSecretKey(bs58.decode(env[`DEMO_${role}_KEY`]));
  env[`NEXT_PUBLIC_DEMO_${role}`] = kp[role].publicKey.toBase58();
}
env.NEXT_PUBLIC_SHOW_PLACEHOLDERS ||= "false";
save();
console.log(green("✓"), "Demo keys in .env.local (buyer, seller, inspector)");

const conn = new Connection(env.NEXT_PUBLIC_RPC_URL, "confirmed");
const buyer = kp.BUYER;

// 2. program
const prog = await conn.getAccountInfo(new PublicKey(env.NEXT_PUBLIC_PROGRAM_ID));
if (!prog?.executable) {
  console.log(yellow("!"), `No program at ${env.NEXT_PUBLIC_PROGRAM_ID} on devnet yet. Deploy it in Solana Playground first (docs/SETUP.md, step 1).`);
  process.exit(1);
}
console.log(green("✓"), "Program is deployed on devnet");

// 3. SOL for fees
let sol = (await conn.getBalance(buyer.publicKey)) / LAMPORTS_PER_SOL;
if (sol < 0.3) {
  try {
    console.log("  Requesting a devnet airdrop for the buyer…");
    const sig = await conn.requestAirdrop(buyer.publicKey, LAMPORTS_PER_SOL);
    await conn.confirmTransaction(sig, "confirmed");
    sol = (await conn.getBalance(buyer.publicKey)) / LAMPORTS_PER_SOL;
  } catch {}
}
if (sol < 0.3) {
  console.log(yellow("!"), "The buyer wallet needs devnet SOL for fees (free):");
  console.log(`    1. Open ${bold("https://faucet.solana.com")}`);
  console.log(`    2. Paste ${bold(buyer.publicKey.toBase58())}, pick Devnet, request 2-5 SOL`);
  console.log(`    3. Run ${bold("npm run setup")} again`);
  process.exit(0);
}
console.log(green("✓"), `Buyer has ${sol.toFixed(2)} devnet SOL`);

// 4. tUSDC
let mint = env.NEXT_PUBLIC_USDC_MINT && (await conn.getAccountInfo(new PublicKey(env.NEXT_PUBLIC_USDC_MINT))) ? new PublicKey(env.NEXT_PUBLIC_USDC_MINT) : null;
if (!mint) {
  mint = await createMint(conn, buyer, buyer.publicKey, null, 6);
  env.NEXT_PUBLIC_USDC_MINT = mint.toBase58();
  save();
  console.log(green("✓"), `Created the tUSDC test mint ${mint.toBase58()}`);
} else console.log(green("✓"), `tUSDC mint ${mint.toBase58()}`);

const buyerAta = await getOrCreateAssociatedTokenAccount(conn, buyer, mint, buyer.publicKey);
await getOrCreateAssociatedTokenAccount(conn, buyer, mint, kp.SELLER.publicKey);
console.log(green("✓"), "Token accounts for buyer and seller");
const have = Number(buyerAta.amount) / 1e6;
if (have < 50_000) {
  await mintTo(conn, buyer, mint, buyerAta.address, buyer, 100_000n * 1_000_000n);
  console.log(green("✓"), "Minted 100,000 tUSDC to the buyer");
} else console.log(green("✓"), `Buyer holds ${have.toLocaleString("en-US")} tUSDC`);

// 5. done
console.log(`\n${bold("Chain mode is ready.")} Restart ${bold("npm run dev")} to use it locally.`);
console.log(`\nFor Vercel, add these under Settings → Environment Variables, then Redeploy:\n`);
console.log(readFileSync(FILE, "utf8"));
console.log(yellow("The DEMO_*_KEY values are devnet-only demo keys. Never reuse them on mainnet."));
