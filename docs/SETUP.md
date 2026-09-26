# Chain mode setup (devnet, free, about 15 minutes)

Without this the app runs in **mock mode** (nothing touches Solana). These steps
switch it to **chain mode**: a real escrow program on Solana devnet, a real
test-USDC token and real transactions you can open in Solana Explorer.

Everything is free: devnet SOL from a faucet, Solana Playground in the browser,
Vercel Hobby. You don't need the Solana CLI or a Phantom wallet.

---

## Step 1: deploy the program in Solana Playground (about 5 min)

1. Open **https://beta.solpg.io** in Chrome or Brave.
2. Click **Create a new project** → name it `tradelock` → choose **Anchor (Rust)** → **Create**.
3. In the file tree, open `src/lib.rs`. Select everything in it and delete it.
4. Open [`program/src/lib.rs`](../program/src/lib.rs) from this repo on GitHub → **Raw** → copy all → paste it into Playground's `lib.rs`.
5. Bottom-left, click **Not connected** → **Continue** to create a Playground wallet. Save the keypair file if it offers.
6. Check the bottom bar says **devnet**. If not: ⚙ Settings → Endpoint → **devnet**.
7. Get devnet SOL for deploying (it needs about 3 SOL):
   - In the Playground terminal (bottom), type `solana airdrop 2` and press Enter. Repeat once.
   - If it says rate-limited: copy your Playground wallet address (click the wallet, bottom-left), open **https://faucet.solana.com**, paste it, choose **devnet**, request **5 SOL**.
8. Left sidebar → **Build & Deploy** (hammer and wrench icon) → **Build**. Wait for "Build successful". Playground puts the program's own ID into `declare_id!`.
9. Click **Deploy** and wait about 30–60 seconds for "Deployment successful".
10. Copy the **Program ID** shown in the Build & Deploy panel.

> Playground builds with Anchor 0.29 or 0.30; the program is checked against both.

## Step 2: run the setup script on your Mac (about 3 min)

In your `tradelock` folder:

```bash
git pull
npm install
npm run setup -- PASTE_THE_PROGRAM_ID_HERE
```

It creates three demo wallets in `.env.local`, checks the program, then:

- **If it asks for devnet SOL:** open **https://faucet.solana.com**, paste the **buyer address** it prints, choose devnet, request 2–5 SOL. Then run `npm run setup` again (no ID needed the second time).
- Then it creates the tUSDC test token and mints 100,000 tUSDC to the buyer.

When it says **Chain mode is ready**, test it locally:

```bash
npm run dev -- -p 3001
```

Open http://localhost:3001. The top strip now says **Solana devnet**, the MOCK chips are gone, and every tx link opens a real transaction in Explorer. Run the Demo kit's happy path once.

## Step 3: put it on Vercel (about 3 min)

1. Vercel → **loc-msiss** → **Settings** → **Environment Variables**.
2. Open `.env.local` in your `tradelock` folder, copy **all** of it, and paste it into the **Key** field. Vercel splits it into separate variables.
3. Leave all environments ticked → **Save**.
4. **Deployments** → the latest one → **⋯** → **Redeploy**. `NEXT_PUBLIC_*` values are only read at build time, so this step is required.

To go back to mock mode, delete `NEXT_PUBLIC_PROGRAM_ID` in Vercel and redeploy.

---

## If something goes wrong

A yellow bar at the top of the app says what's missing:

| Message | Fix |
|---|---|
| Program isn't deployed | The Program ID in `.env.local` / Vercel doesn't match Playground's. Re-run `npm run setup -- <ID>` |
| Buyer wallet has 0 SOL | Fund the buyer address at faucet.solana.com (devnet) |
| No test USDC mint / 0 tUSDC | Run `npm run setup` again |
| Devnet is rate-limiting us | Wait 10 seconds and retry; the public devnet RPC is shared |

## How it fits together

- `program/src/lib.rs`: the Anchor escrow program (`create_trade`, `submit_document`, `approve_shipment`, `reject_shipment`, `refund_after_deadline`).
- `lib/chain/codec.ts`: hand-written Borsh encoding; `npm run check:layout` proves it matches the Rust byte for byte (needs Rust).
- `lib/chain/server.ts` + `app/api/chain/route.ts`: the server signs with the three demo keys (the buyer pays all fees) and reads state back from devnet.
- `scripts/setup-demo.mjs`: keys, SOL, tUSDC mint, token accounts.

The demo keys are **devnet-only**. Anyone who can open the site can press the buttons, which is fine for a devnet demo (placeholder P12; real wallets are phase 3).
