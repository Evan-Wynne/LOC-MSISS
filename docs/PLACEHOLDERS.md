# Placeholders

The app has two modes:
- **Mock mode** (default, no setup): everything is fake data in the browser, except document hashing, which is real SHA-256 in both modes.
- **Chain mode** (after [`SETUP.md`](SETUP.md)): real transactions on Solana devnet. Most placeholders become real, and their UI tags disappear automatically.

Each fake piece is marked in the code with a comment:

```
// PLACEHOLDER[P#]: <what's fake> → REAL: <what replaces it> (see docs/ROADMAP.md §x)
```

List them all with:

```bash
grep -rn "PLACEHOLDER\[" app components lib
```

The number of distinct IDs must equal the number of rows below:

```bash
grep -rho "PLACEHOLDER\[P[0-9]*\]" app components lib | sort -u | wc -l   # → 20
```

In the UI, fake values carry a yellow **MOCK** chip (hover it to see its P# id). Hide all tags for the pitch by setting `NEXT_PUBLIC_SHOW_PLACEHOLDERS=false` (locally in `.env.local`, or in Vercel → Settings → Environment Variables), then redeploy.

| ID | File | Fake in mock mode | Chain mode | Roadmap |
|---|---|---|---|---|
| P1 | `lib/loc.ts` | All state lives in the browser (memory + `localStorage`), separate for each visitor | ✅ real: devnet accounts, cached | §4 |
| P2 | `lib/loc.ts` | `delay()` fakes network latency | ✅ real confirmation | §4 |
| P3 | `lib/loc.ts` | `fakeSig()` makes random base58 "signatures" | ✅ real signatures | §4 |
| P4 | `lib/loc.ts` | `createTrade` only edits local state | ✅ `create_trade` (creates + funds in one instruction) | §2 |
| P5 | `lib/loc.ts` | `fundTrade` is a no-op that returns the create tx | ✅ by design: funding happens inside `create_trade` | §1 |
| P6 | `lib/loc.ts` | `submitDocument`: the SHA-256 is **real**, but it's stored locally | ✅ `submit_document` writes the hash on-chain | §2 |
| P7 | `lib/loc.ts` | `approveShipment` moves numbers locally | ✅ `approve_shipment` (vault → seller) | §2 |
| P8 | `lib/loc.ts` | `rejectShipment` flips a local status | ✅ `reject_shipment` | §2 |
| P9 | `lib/loc.ts` | `refundAfterDeadline` trusts the browser clock | ✅ `refund_after_deadline`, on-chain clock | §2 |
| P10 | `lib/loc.ts` | `getTrades` / `getTrade` / `getDocuments` read local state | ✅ `getProgramAccounts` + decode | §4 |
| P11 | `lib/loc.ts` | `getEvents` (audit trail) is a local event log | ✅ rebuilt from `getSignaturesForAddress(trade)` | §4 |
| P12 | `lib/placeholder-data.ts` | Made-up demo wallet addresses and neutral party names | ⚠️ still one set of demo keys, held by the server, which signs for all three parties | §7 |
| P13 | `lib/placeholder-data.ts` | Starting tUSDC balances | ✅ live token balances | §4 |
| P14 | `lib/placeholder-data.ts` | Seeded aluminium (in progress) and coffee (paid) trades | ✅ no seed data | §4 |
| P15 | `lib/explorer.ts` | Explorer links use fake signatures and addresses, so they 404 | ✅ links resolve | §4 |
| P16 | `app/page.tsx` | "Running on Solana devnet" badge with no program behind it | ✅ links to the program | §6 |
| P17 | `components/ui.tsx` | Deadline countdown runs on the browser clock | ✅ on-chain deadline (refund still needs a click) | §7 |
| P18 | `lib/config.ts` | tUSDC amounts are just numbers | ⚠️ real SPL token, but our own devnet test mint, not Circle USDC | §7 |
| P19 | `app/inspector/page.tsx` | The inspector is one designated demo key; approval is an attestation, not proof of the physical shipment | ⚠️ unchanged: the trust assumption is the MVP's design | §7 |
| P20 | `lib/samples.ts`, `public/samples/` | Sample PDFs for one demo cocoa trade (+ tampered copies), made by `npm run samples` | ⚠️ unchanged (demo convenience; real files work too) | §7 |

**Still fake or partial in chain mode: P12, P18, P19, P20** (plus P5, which is intentional). Those are the "next" items in [`ROADMAP.md`](ROADMAP.md) §7.
