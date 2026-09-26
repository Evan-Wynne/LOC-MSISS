import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CircleDollarSign,
  Eye,
  FileCheck2,
  Gauge,
  Landmark,
  LockKeyhole,
  Ship,
  Stamp,
  Zap,
} from "lucide-react";
import { PlaceholderTag } from "@/components/PlaceholderTag";
import { CHAIN_MODE, PROGRAM_ID } from "@/lib/config";
import { explorerAddress } from "@/lib/explorer";

const steps = [
  { icon: LockKeyhole, title: "Fund", who: "Buyer", dot: "bg-buyer", body: "Agree the terms and lock the payment in test USDC in an on-chain escrow. The seller can see it's there before shipping." },
  { icon: Ship, title: "Ship", who: "Seller", dot: "bg-seller", body: "Ship the goods and submit the documents. Only their SHA-256 fingerprints go on-chain: a tamper-evident record." },
  { icon: Stamp, title: "Verify", who: "Inspector", dot: "bg-inspector", body: "The designated verifier checks the shipment and signs an on-chain approval." },
  { icon: Banknote, title: "Release", who: "Program", dot: "bg-money", body: "The contract pays the seller in the same transaction. No proof by the deadline? The buyer can take a refund." },
];

const why = [
  { icon: FileCheck2, title: "Programmable escrow", body: "The release rules are code, not a manual payment instruction. Nobody has to remember to pay." },
  { icon: Zap, title: "Settles in seconds", body: "Approval and payment are one transaction, confirmed in seconds rather than after a courier and a review queue." },
  { icon: Gauge, title: "Low transaction costs", body: "Network fees are a fraction of a cent per transaction, so anchoring every document on-chain is cheap." },
  { icon: CircleDollarSign, title: "Stablecoin settlement", body: "Dollar-denominated USDC, so neither side takes crypto price risk. This demo uses a devnet test token." },
  { icon: Eye, title: "Public audit trail", body: "Funding, every document hash, the approval and the payout are all visible on Solana Explorer." },
  { icon: Landmark, title: "No bank consortium needed", body: "A neutral program holds the funds, so the parties don't need a shared private ledger to trust the escrow." },
];

const previewRows = [
  { label: "Escrow funded", who: "Buyer", dot: "bg-buyer", ref: "tx 4sGj…w3Tf", done: true },
  { label: "Bill of lading", who: "Seller", dot: "bg-seller", ref: "fcf33ee3…8a0c", done: true },
  { label: "Commercial invoice", who: "Seller", dot: "bg-seller", ref: "530acaf3…1ca8", done: true },
  { label: "Inspection certificate", who: "Seller", dot: "bg-seller", ref: "a0d2f8a2…3c39", done: true },
  { label: "Inspector approval", who: "Inspector", dot: "bg-inspector", ref: "pending", done: false },
];

// Static illustration of a trade mid-flow (not live data).
function HeroPreview() {
  return (
    <div aria-hidden className="pointer-events-none hidden select-none lg:block">
      <div className="card overflow-hidden shadow-lg shadow-fg/10">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="eyebrow text-muted">Letter of credit</span>
          <span className="inline-flex items-center rounded-[3px] border border-info/40 bg-info/[0.07] px-2.5 py-1 text-[13px] font-medium leading-none text-info">
            Documents submitted
          </span>
        </div>
        <div className="px-5 pt-5">
          <div className="text-sm text-muted">Cocoa beans, 200 bags · FOB Tema</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-medium tabular-nums text-money-ink">36,000</span>
            <span className="text-sm text-muted">tUSDC locked in escrow</span>
          </div>
        </div>
        <ul className="mt-5 divide-y divide-line border-t border-line">
          {previewRows.map((r) => (
            <li key={r.label} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-full ring-1 ${
                  r.done ? "bg-money text-white ring-money" : "ring-fg/40"
                }`}
              >
                {r.done ? <span className="text-[10px] font-bold">✓</span> : <span className="size-1.5 animate-pulse rounded-full bg-fg" />}
              </span>
              <span className="flex-1">{r.label}</span>
              <span className="hidden items-center gap-1.5 text-xs text-muted xl:inline-flex">
                <span className={`size-1.5 rounded-full ${r.dot}`} /> {r.who}
              </span>
              <span className="w-28 text-right font-mono text-xs text-muted">{r.ref}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t border-line bg-panel-2/50 px-5 py-4">
          <span className="text-xs text-muted">Approval releases the escrow to the seller in one transaction.</span>
          <span className="btn btn-money btn-sm">Approve shipment</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div>
      <section className="grid items-center gap-12 pb-16 pt-6 sm:pt-14 lg:grid-cols-[1.1fr_1fr]">
        <div>
        <div className="flex flex-wrap items-center gap-2">
          {/* PLACEHOLDER[P16]: mock mode only, the badge says "devnet" with no program behind it → REAL: chain mode links it to the deployed program on Solana Explorer (see docs/ROADMAP.md §6) */}
          <a
            href={CHAIN_MODE ? explorerAddress(PROGRAM_ID) : undefined}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-[3px] border border-line bg-panel px-3 py-1 font-mono text-[11px] uppercase tracking-[0.06em] text-muted hover:text-fg"
          >
            <span className="size-1.5 rounded-full bg-money" /> {CHAIN_MODE ? "Running on Solana devnet · test tokens only" : "Solana escrow · test tokens only"}
          </a>
          <PlaceholderTag id="P16" />
        </div>
        <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Letters of credit that settle themselves.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          The buyer&apos;s stablecoin is locked in a Solana escrow before the goods ship. When an approved inspector
          verifies the shipping documents, the contract pays the seller automatically. If nobody proves shipment by the
          deadline, the buyer gets a refund.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/buyer/new" className="btn btn-primary">
            Start the demo <ArrowRight className="size-4" />
          </Link>
          <Link href="/demo" className="btn btn-ghost">
            Demo kit &amp; sample files
          </Link>
          <Link href={CHAIN_MODE ? "/buyer" : "/trade/trd_seed_coffee"} className="btn btn-ghost">
            {CHAIN_MODE ? "See all trades" : "See a settled trade"}
          </Link>
        </div>
        </div>
        <HeroPreview />
      </section>

      <section id="how" className="scroll-mt-24">
        <div className="eyebrow text-muted">How it works</div>
        <ol className="mt-4 grid gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, who, dot, body }, i) => (
            <li key={title} className="bg-panel p-6">
              <div className="flex items-center justify-between">
                <div className="grid size-9 place-items-center rounded-[4px] bg-panel-2 ring-1 ring-line">
                  <Icon className="size-4" />
                </div>
                <span className="font-mono text-xs text-muted">0{i + 1}</span>
              </div>
              <div className="mt-5 text-lg font-semibold">{title}</div>
              <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted">
                <span className={`size-1.5 rounded-full ${dot}`} /> {who}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="card p-6 sm:p-7">
          <div className="eyebrow text-muted">The honest part</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">What the chain can and can&apos;t know</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            A blockchain can&apos;t see a container leave a port. In this MVP a designated verifier (a shipping line,
            inspection company or oracle) signs an on-chain approval. The contract checks that{" "}
            <span className="text-fg">the authorised verifier approved</span>. It doesn&apos;t observe the physical
            shipment.
          </p>
          <ul className="mt-4 grid gap-2 text-sm">
            <li className="flex gap-2">
              <span className="text-money-ink">✓</span>
              <span>
                <span className="text-fg">Enforced by code:</span> <span className="text-muted">the funds are locked, only the named inspector can release them, and the refund is only possible after the deadline.</span>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-money-ink">✓</span>
              <span>
                <span className="text-fg">Tamper-evident:</span> <span className="text-muted">document hashes on-chain, so changing one character is detectable.</span>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-warn">→</span>
              <span>
                <span className="text-fg">Next:</span> <span className="text-muted">shipping-line data, electronic bills of lading, inspection companies and oracle attestations.</span>
              </span>
            </li>
          </ul>
        </div>
        <div className="card p-6 sm:p-7">
          <div className="eyebrow text-muted">Where this fits</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">A programmable complement to the paper process</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Letters of credit protect both sides of an international trade, but the process is document-heavy, and
            the seller is only paid after the documents are couriered and reviewed. Tradelock keeps the idea (pay on
            proof of shipment) and makes the escrow and release programmable.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Regulatory clarity is improving: the US GENIUS Act (July 2025) set up a federal framework for payment
            stablecoins, and the UK Electronic Trade Documents Act 2023 recognises electronic trade documents. That
            makes stablecoin trade settlement increasingly viable. It doesn&apos;t make this demo a legal letter of
            credit.
          </p>
        </div>
      </section>

      <section className="mt-16">
        <div className="eyebrow text-muted">Why Solana</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Why this belongs on Solana</h2>
        <div className="mt-6 grid gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {why.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-panel p-6">
              <Icon className="size-4 text-money-ink" />
              <div className="mt-4 font-medium">{title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 flex flex-wrap items-center justify-between gap-4 rounded-[4px] border border-line bg-panel px-6 py-6 sm:px-7">
        <div>
          <div className="font-medium">Run the whole flow in about a minute</div>
          <p className="mt-1 text-sm text-muted">Switch between Buyer, Seller and Inspector with the “Viewing as” control.</p>
        </div>
        <Link href="/buyer/new" className="btn btn-money">
          Create a trade <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}
