# Project context: Programmable Letters of Credit (Tradelock)

The team's source-of-truth brief, kept here so teammates' AI tools can read it. BUILD IRL Vol. 1 (Solana hackathon, Dogpatch Labs, Dublin), Saturday 26 September 2026.

## One-liner
Programmable Letters of Credit. Replace the paper-heavy letter-of-credit process with a Solana smart contract that holds the buyer's stablecoin in escrow and releases it to the seller automatically when agreed proof of shipment is verified.

## Problem
International trade involves large payments between buyers and sellers who may not trust each other. Letters of credit solve this, but the process is slow and document-heavy.
- Money is tied up in an intermediary process: banks and document review happen before the seller is paid.
- Verification is slow; the pitch cites 5–10 days because documents are couriered and reviewed. *(Source needed before this goes on a slide.)*
- The seller needs confidence that the buyer has actually committed the money. Escrowed stablecoin makes the funds visibly locked before shipment.
- Document integrity matters: bills of lading, invoices, inspection certificates and similar documents determine whether conditions are met.
- Settlement is disconnected from verification. Someone has to decide the condition is met and then start the payment.

## Solution
1. Buyer and seller agree terms: amount, goods, deadline, required documents.
2. Buyer locks USDC into escrow, held in a Solana smart contract.
3. Seller ships and uploads documents. **Hashes** of the documents are recorded on-chain, giving a tamper-evident record.
4. An approved verifier (shipping line, inspector or oracle) signs off that the shipment condition is satisfied.
5. The contract settles automatically: valid proof → USDC released to the seller; deadline passes without proof → refund to the buyer.
6. Everything leaves an auditable on-chain record.

## Why Solana (the pitch must say this clearly)
Programmable escrow (rules in code, not manual release); fast settlement (seconds); low transaction costs; stablecoin settlement (USDC, dollar-denominated); a public audit trail; no private bank consortium needed.

## Users
- **Buyer:** purchasing goods internationally; wants payment released only when conditions are met.
- **Seller:** shipping goods; wants proof the buyer committed funds, and automatic release.
- **Inspector / verifier:** a designated party confirming the shipment condition.
- *Future:* banks and trade-finance providers as regulated intermediaries or verifiers; logistics providers and shipping lines providing verification directly.

## Honest trust assumption (the UI and deck must say this, not hide it)
The blockchain cannot know whether physical goods shipped. In the MVP a designated verifier signs an on-chain approval. The contract verifies that *the authorised verifier approved*; it does not observe the physical shipment. Roadmap: shipping-line data, logistics systems, inspection companies, electronic bills of lading, oracle infrastructure.

## Regulatory / legal framing (be careful)
- Never claim stablecoins have replaced letters of credit, or that the MVP is legally equivalent to one.
- The GENIUS Act (July 2025) created a US federal framework for payment stablecoins. It did not specifically authorise crypto for trade. Frame it as: regulatory clarity makes stablecoin trade settlement increasingly viable.
- The UK Electronic Trade Documents Act 2023 is an example of legal recognition for electronic trade documents.
- Not legal advice. The app footer says: *"Devnet demo with test tokens. Not a legal letter of credit or legal advice."*

## MVP scope (priority order)
Must have:
1. Buyer creates a trade / letter of credit.
2. Buyer deposits test USDC into escrow.
3. Seller sees the funds are locked.
4. Seller submits shipment documents, with their hashes recorded on-chain.
5. Inspector approves the shipment, and the contract releases the escrowed USDC to the seller.
6. Buyer, Seller and Inspector views show each state transition, with Solana Explorer links.

Nice to have, cut in this order: deadline + refund; multiple required documents; a document-verification UI; multisig verifier approval; a Token-2022 / transfer-hook compliance demo.

## Screens (one laptop, role switcher at the top: Buyer / Seller / Inspector)
- **A. Create Trade (Buyer)**, `/buyer/new`: trade title, seller, goods, amount (USDC), shipment deadline, required documents, inspector wallet. Button: **Fund escrow**. Shows the tx link.
- **B. Shipment (Seller)**, `/seller`: trade, escrowed amount, goods, deadline, required documents, shipment status. Upload bill of lading, invoice and inspection certificate; submit shipment proof. Shows document hashes and status.
- **C. Verification (Inspector)**, `/inspector`: trade details, seller, goods, required documents, hashes, escrow balance, deadline. **Approve shipment** / **Reject**. Makes clear the verifier is the bridge between the physical shipment and the blockchain.
- **D. Settlement (Buyer / Seller)**, `/trade/[id]`: status, escrow amount, verification status, settlement tx and Explorer link. "Shipment verified → USDC released to seller", or "Deadline reached → funds refundable to buyer".

## Data shapes (names kept in `lib/types.ts` and `lib/loc.ts`)
```ts
type Trade = { id: string; buyer: string; seller: string; inspector: string; goods: string; amount: number; deadline: number;
  status: "Funded" | "DocumentsSubmitted" | "Verified" | "Paid" | "Refunded"; };
type TradeDocument = { id: string; tradeId: string; documentType: "BillOfLading" | "Invoice" | "InspectionCertificate";
  filename: string; hash: string; submittedAt: number; };
type Verification = { tradeId: string; inspector: string; approved: boolean; approvedAt?: number; txSig?: string; };

createTrade(input): Promise<{ tradeId: string; txSig: string }>
fundTrade(tradeId): Promise<{ txSig: string }>
submitDocument(tradeId, document): Promise<{ documentId: string; txSig: string }>
approveShipment(tradeId): Promise<{ txSig: string }>
refundAfterDeadline(tradeId): Promise<{ txSig: string }>
getTrades(): Promise<Trade[]>
getDocuments(tradeId): Promise<TradeDocument[]>
getTrade(tradeId): Promise<Trade>
```
Extensions in this repo: `Trade` gains `title`, `requiredDocs`, `createdAt`, `fundTxSig`, `approvedAt`, `settleTxSig` and a `"Rejected"` status; plus `rejectShipment`, `getEvents` and `getVerification`. `fundTrade` is a no-op that returns the create tx, because `create_trade` funds the escrow in the same instruction (placeholder P5).

## 3-minute demo script
1. Problem (20s).
2. Solution (20s).
3. Live demo (~90s): Buyer creates a trade → deposits test USDC → switch to Seller, funds shown locked → submit documents → switch to Inspector → approve → seller receives USDC → open the Explorer tx → show the immutable trade record.
4. Why Solana (30s).
5. Business + next (20s): automated logistics verification, e-trade-document integrations, oracles/attesters, bank and inspector integrations, compliance.

## Deck rules (the app copy follows them too)
No invented statistics, users, partners or regulatory approvals; no claim of legal equivalence to an LC; if it isn't built, say "next"; label assumptions; distinguish the verifier's approval from physical-world verification; only sourced market figures.
