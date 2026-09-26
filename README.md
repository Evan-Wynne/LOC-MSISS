# Tradelock

**Programmable letters of credit on Solana.** The buyer's stablecoin is locked in an on-chain escrow before the goods ship. The seller records SHA-256 fingerprints of the shipping documents on-chain; when an approved inspector signs off, the contract releases the payment to the seller in the same transaction. If nobody proves shipment by the deadline, the buyer can take a refund.

Built at BUILD IRL Vol. 1 (Solana hackathon, Dogpatch Labs, Dublin). Product brief: [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md).

> **Two modes.** Out of the box it runs in **mock mode**: placeholder data in the browser, no setup. After [`docs/SETUP.md`](docs/SETUP.md) (phase 2) it runs in **chain mode**: real transactions against our Anchor escrow on Solana devnet. Anything fake is labelled `PLACEHOLDER[P#]` in the code and tagged in the UI; see [`docs/PLACEHOLDERS.md`](docs/PLACEHOLDERS.md) and [`docs/ROADMAP.md`](docs/ROADMAP.md).
>
> Devnet demo with test tokens. Not a legal letter of credit or legal advice.

## Run locally

Needs Node.js 20+.

```bash
git clone https://github.com/Evan-Wynne/LOC-MSISS && cd LOC-MSISS && npm install && npm run dev
```

Then open http://localhost:3000.

## Demo flow (about a minute)
1. **Buyer** → *New trade*: keep the cocoa defaults (36,000 tUSDC, three required documents). Pick **+2 min** as the deadline if you also want to show a refund. Press **Fund escrow**, and the trade record shows it Funded with a tx link.
2. Switch to **Seller** (top right): the escrowed amount is shown locked. Press **Use sample** on each document (or choose real files; they're hashed in the browser, never uploaded) → **Submit shipment proof**.
3. Switch to **Inspector**: in *Verify a document*, **Try the original** gives ✓ and **Try a tampered copy** gives ✗ (one character changed). Press **Approve shipment**, and the settlement card shows 36,000 tUSDC moving from escrow to the seller.
4. **View trade record**: the timeline (Funded → Documents → Verified → Paid), the audit trail with a tx per step, and balances.
5. Refund path: open a trade created with **+2 min** after its deadline → **Refund to buyer**.

**Reset demo data** in the footer starts again. State is stored in your browser only.

## Deploy to Vercel (free Hobby plan)
1. vercel.com → **Add New… → Project** → import `Evan-Wynne/LOC-MSISS`.
2. Keep the defaults (framework: Next.js) → **Deploy**. Mock mode needs no environment variables.
3. Optional: set `NEXT_PUBLIC_SHOW_PLACEHOLDERS=false` to hide the placeholder tags for the pitch, then redeploy.

## Code map
- `lib/loc.ts`: the only data layer; every page calls these functions (mock mode now, `/api/chain` in chain mode).
- `lib/hash.ts`: SHA-256 in the browser (real in both modes). `lib/samples.ts`: generated sample documents plus the one-character tamper.
- `lib/placeholder-data.ts`: demo wallets, balances and seed trades. `lib/types.ts`: data shapes from the brief.
- `app/`: `/` landing, `/buyer` trades, `/buyer/new` (Screen A), `/seller` (B), `/inspector` (C), `/trade/[id]` (D).
- `components/`: role switcher, settlement card, timeline, document slots, verify drop zone, placeholder tag, toasts.
- Phase 2 adds `program/` (Anchor), `lib/chain/` (server client + Borsh codec), `app/api/chain/` and `scripts/`.
