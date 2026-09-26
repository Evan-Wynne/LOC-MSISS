# Roadmap

| Phase | What | Status |
|---|---|---|
| 1 | UI demo on placeholder data (mock mode) | ✅ done |
| 2 | "90-minute plan": Anchor SPL-token escrow on devnet, with the app wired to it (chain mode) | next |
| 3 | Real wallets, multisig or oracle verifier, Circle USDC, Token-2022 compliance | next (say "next" in the deck) |

Section numbers match the `PLACEHOLDER[...]` comments in the code. Everything here is free: Solana **devnet** (free test SOL), Solana Playground, faucet.solana.com, Vercel Hobby and GitHub. No paid RPCs, APIs or cards.

## §1 Key decisions
- **Stablecoin: our own devnet test-USDC mint ("tUSDC", 6 decimals)**, created by the setup script, on the classic SPL Token program (not Token-2022, which is a phase-3 stretch). The UI labels it "tUSDC (test USDC on devnet)" (P18).
- **Fallback:** if `anchor_spl` blocks us in Playground for more than ~15 minutes, drop to a native SOL escrow (the pattern proven in `Evan-Wynne/CBC_Hack`), label amounts SOL, and add a placeholder for it.
- **Build and deploy in Solana Playground**, targeting Anchor 0.29 and 0.30. Compile-checked on the host with `cargo test` against both.
- **No Anchor TypeScript client.** `lib/chain/codec.ts` hand-encodes instructions and decodes accounts with Borsh, proven byte for byte against the Rust program (`npm run check:layout`). No IDL or version-mismatch risk.
- **Demo keys, server-side signing.** Three throwaway devnet keypairs (buyer, seller, inspector) live in env vars and are used only inside `app/api/chain/route.ts`. The **buyer pays all fees and rent**, so only one wallet needs faucet SOL; the seller and inspector still sign their own instructions for authorisation. Anyone who can reach the site can press the buttons, which is fine on devnet (P12).
- **Document hashes on-chain, files never uploaded.** SHA-256 runs in the browser in both modes.
- **`createTrade` creates and funds in one instruction.** `fundTrade()` stays in the API as a no-op that returns the create tx (P5).

## §2 Program (`program/src/lib.rs`)
- `Trade` PDA `[b"trade", buyer, trade_id.to_le_bytes()]`:
  - parties and terms: `buyer, seller, inspector, mint: Pubkey`, `trade_id: u64`, `amount: u64`, `deadline: i64`, `created_at: i64`, `status: u8`
  - documents: `required_docs: u8` (bitmask: 1 = BillOfLading, 2 = Invoice, 4 = InspectionCertificate), `submitted_docs: u8`, `doc_hashes: [[u8; 32]; 3]`, `doc_submitted_at: [i64; 3]`, `doc_names: [String; 3]` (`max_len` 32 bytes each)
  - settlement and text: `approved_at: i64`, `bump: u8`, `vault_bump: u8`, `title: String` (64), `goods: String` (128)
  - `#[derive(InitSpace)]` + `#[max_len]`. If InitSpace won't derive for `[String; 3]`, fall back to `[[u8; 32]; 3]` (zero-padded); the host test decides.
- `vault`: SPL token account PDA `[b"vault", trade]`, `token::mint = mint`, `token::authority = trade`.
- Status `u8`: 0 Funded, 1 DocumentsSubmitted, 2 Paid, 3 Refunded, 4 Rejected. "Verified" happens inside `approve_shipment` together with payment, so the UI shows it as a timeline step.
- Instructions:
  - `create_trade(trade_id, title, goods, amount, deadline, required_docs)`: accounts buyer (signer, mut), seller, inspector (unchecked, stored), mint, buyer_token (mut), trade (init), vault (init), token_program, system_program. Transfers `amount` buyer_token → vault. Status Funded.
  - `submit_document(doc_type: u8, hash: [u8; 32], name: String)`: seller signs (`has_one = seller`), payer = buyer. Status must be Funded, DocumentsSubmitted or Rejected, and `now <= deadline`. Once `submitted & required == required`, status becomes DocumentsSubmitted.
  - `approve_shipment()`: inspector signs (`has_one = inspector`), status DocumentsSubmitted. Transfers vault → seller_token with the trade-PDA signer seeds. Status Paid, `approved_at = now`.
  - `reject_shipment()`: inspector. Status Rejected; the seller may resubmit.
  - `refund_after_deadline()`: any signer. `now > deadline` and status not Paid/Refunded. Transfers vault → buyer_token. Status Refunded.
- Errors (6000+, in this order): `Unauthorized`, `InvalidStatus`, `DeadlineNotReached`, `DeadlinePassed`, `InvalidDocType`, `MissingDocuments`, `TextTooLong`, `MathOverflow`.
- Security checks: token accounts' mint equals `trade.mint`; the owner of `seller_token` equals `trade.seller`; the owner of `buyer_token` equals `trade.buyer`. No `init_if_needed` (the setup script pre-creates the token accounts). Use `ctx.bumps.<name>` (valid in 0.29 and 0.30). String limits are **bytes**; the server clips by UTF-8 bytes.

## §3 Host checks (Rust is installed on Evan's Mac)
- `program/Cargo.toml` pins `anchor-lang` and `anchor-spl` at `=0.29.0`; `cargo test` must pass. Then the same in a scratch copy at `=0.30.1`.
- `program/tests/layout.rs` prints instruction and account bytes; `scripts/check-layout.ts` compares them with `lib/chain/codec.ts`. Run: `npm run check:layout`.

## §4 App wiring
- `lib/config.ts`: chain mode is on when `NEXT_PUBLIC_PROGRAM_ID` is set.
- `lib/loc.ts`: the same functions; in chain mode they call `/api/chain` and refresh state (polled every 5s).
- `app/api/chain/route.ts` → `lib/chain/server.ts` (`runtime = "nodejs"`, `dynamic = "force-dynamic"`, `maxDuration = 30`):
  - loads `DEMO_BUYER_KEY`, `DEMO_SELLER_KEY`, `DEMO_INSPECTOR_KEY`; `send()` with the buyer as fee payer
  - `explain()` maps errors to plain words (program missing, buyer out of SOL, deadline passed, missing documents, Anchor 6000+ codes)
  - `getState()`: Trade accounts via `getProgramAccounts` + memcmp discriminator filter; documents derived from each account; tUSDC balances for buyer, seller and every vault; `health` (program deployed, buyer SOL, buyer tUSDC, mint)
  - audit trail: `getSignaturesForAddress(trade)` → match instruction discriminators → events with real signatures
- `lib/chain/codec.ts`: `Writer`/`Reader`/`ixDisc`/`accDisc` from the old repo, plus `bytes32`, the LOC encoders/decoders and `PROGRAM_ERRORS`.
- `components/ChainStatus.tsx`: the banner for a missing program, an empty buyer wallet, a missing mint or an unreachable RPC.
- Placeholders in `REAL_IN_CHAIN_MODE` (`components/PlaceholderTag.tsx`) hide themselves.
- Dependencies: add `@solana/spl-token` (`@solana/web3.js` and `bs58` are already installed).

## §5 Setup script (`npm run setup -- <PROGRAM_ID>`, idempotent)
1. Generate the buyer, seller and inspector keys into `.env.local` (kept on re-runs).
2. Check the program exists on devnet.
3. If the buyer has under 0.3 SOL, try an airdrop; otherwise print the faucet.solana.com steps and "re-run this script after funding".
4. Once funded: create the tUSDC mint (buyer is mint authority) → `NEXT_PUBLIC_USDC_MINT`; create token accounts for buyer and seller; mint 100,000 tUSDC to the buyer.
5. Print the Vercel env-var list, including all three secret keys (each party signs server-side).

## §6 Stop points
- **STOP 1 (Evan): deploy in Playground.** beta.solpg.io → new Anchor project → paste `program/src/lib.rs` → connect the Playground wallet → devnet → `solana airdrop 2` a couple of times, or use faucet.solana.com (about 2–4 devnet SOL, free) → Build (again if `declare_id!` still says `111…`) → Deploy → send Claude the Program ID.
- **STOP 2:** Claude runs `npm run setup -- <ID>` on this Mac. **Evan** funds the printed buyer address at faucet.solana.com (free, devnet; it has a CAPTCHA). Claude re-runs setup to create the mint and token accounts.
- **STOP 3:** Claude runs create → submit → approve (and the refund path) against devnet in the browser; Evan checks the Explorer links.
- **STOP 4 (Evan):** Vercel → Settings → Environment Variables → paste `.env.local` → Redeploy. `NEXT_PUBLIC_*` values are baked in at build time.

## §7 Next (not built)
- **P12:** Phantom via wallet-adapter, so each party signs in the browser instead of the server holding demo keys.
- **P19:** multisig verifier approval; shipping-line data, logistics systems, inspection companies, electronic bills of lading and oracle attestations instead of one designated key.
- **P18:** Circle's devnet USDC, then mainnet USDC.
- **P17:** an automatic refund crank when the deadline passes; today someone has to click.
- **P20:** real document uploads with integrations for electronic trade documents.
- Token-2022 transfer-hook compliance demo; bank and trade-finance integrations.
