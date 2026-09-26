"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, RotateCcw } from "lucide-react";
import type { DocumentType, Role } from "@/lib/types";
import { DOC_LABELS, DOC_TYPES } from "@/lib/types";
import { SAMPLES, fetchSample, sampleName, sampleUrl } from "@/lib/samples";
import { sha256Hex } from "@/lib/hash";
import { resetDemo } from "@/lib/loc";
import { CHAIN_MODE } from "@/lib/config";
import { PageHeader, SectionHead } from "@/components/ui";
import { useApp } from "@/components/Providers";

const WHAT: Record<DocumentType, string> = {
  BillOfLading: "Carrier's receipt: 200 bags of cocoa shipped on board at Tema.",
  Invoice: "Seller's bill for 36,000.00 tUSDC, the amount locked in escrow.",
  InspectionCertificate: "Independent check that quantity and quality conform.",
};

type Step = { role: Role | null; text: React.ReactNode; href?: string; cta?: string };

const SCRIPTS: { title: string; time: string; steps: Step[] }[] = [
  {
    title: "Happy path: lock, prove, release",
    time: "60 s",
    steps: [
      { role: "buyer", text: <>Keep the cocoa defaults (36,000 tUSDC, three documents) and press <b>Fund escrow</b>.</>, href: "/buyer/new", cta: "New trade" },
      { role: "seller", text: <>Upload the three PDFs below (or press <b>Use sample</b> on each), then <b>Submit shipment proof</b>.</>, href: "/seller", cta: "Seller" },
      { role: "inspector", text: <>Drop <b>commercial-invoice.pdf</b> on <i>Verify a document</i>: ✓ match. Press <b>Approve shipment</b>.</>, href: "/inspector", cta: "Inspector" },
      { role: null, text: <>The settlement card shows 36,000 tUSDC moving from escrow to the seller. Open the <b>trade record</b> for the full ledger.</> },
    ],
  },
  {
    title: "Tamper check",
    time: "15 s",
    steps: [
      { role: "inspector", text: <>Drop <b>commercial-invoice-TAMPERED.pdf</b> (total edited to 38,000). The hash doesn&apos;t match: ✗.</>, href: "/inspector", cta: "Inspector" },
    ],
  },
  {
    title: "Reject and resubmit",
    time: "30 s",
    steps: [
      { role: "seller", text: <>On a new trade, upload <b>inspection-certificate-TAMPERED.pdf</b> (180 bags instead of 200) with the other two.</>, href: "/seller", cta: "Seller" },
      { role: "inspector", text: <>Drop the original certificate: no match. Press <b>Reject</b>. Funds stay in escrow.</>, href: "/inspector", cta: "Inspector" },
      { role: "seller", text: <>Press <b>Replace</b> on the certificate, upload the correct one and resubmit.</>, href: "/seller", cta: "Seller" },
    ],
  },
  {
    title: "Refund after deadline",
    time: "2 min",
    steps: [
      { role: "buyer", text: <>Create a trade with the <b>+2 min</b> deadline and don&apos;t ship. When it passes, open the trade and press <b>Refund to buyer</b>.</>, href: "/buyer/new", cta: "New trade" },
    ],
  },
];

export default function DemoKit() {
  const { setRole } = useApp();
  const router = useRouter();
  const [hashes, setHashes] = useState<Record<string, string>>({});

  // Fingerprints computed in the browser, exactly as the app does on upload.
  useEffect(() => {
    let live = true;
    Promise.all(
      DOC_TYPES.flatMap((d) => [false, true].map(async (t) => [sampleName(d, t), await sha256Hex(await fetchSample(d, t))] as const)),
    )
      .then((pairs) => live && setHashes(Object.fromEntries(pairs)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const go = (role: Role | null, href?: string) => {
    if (role) setRole(role);
    if (href) router.push(href);
  };

  return (
    <div>
      <PageHeader eyebrow="Demo kit · everything you need to present" title="Run the demo">
        {!CHAIN_MODE && (
          <button onClick={() => resetDemo()} className="btn btn-ghost">
            <RotateCcw className="size-4" /> Reset demo data
          </button>
        )}
      </PageHeader>

      <section>
        <SectionHead title="Sample documents" note="PDFs for the cocoa trade. Only their SHA-256 hash goes on-chain." />
        <ul>
          {DOC_TYPES.map((d) => (
            <li key={d} className="grid gap-x-6 gap-y-2 border-b border-line py-4 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-center">
              <div>
                <div className="text-[15px] font-medium">{DOC_LABELS[d]}</div>
                <div className="text-[13px] text-muted">{WHAT[d]}</div>
              </div>
              <div className="min-w-0 space-y-1 font-mono text-xs">
                <div className="truncate">
                  <span className="text-muted">original </span>
                  {hashes[sampleName(d)] ? `${hashes[sampleName(d)].slice(0, 16)}…` : "…"}
                </div>
                <div className="truncate text-danger">
                  <span className="text-muted">tampered </span>
                  {hashes[sampleName(d, true)] ? `${hashes[sampleName(d, true)].slice(0, 16)}…` : "…"}
                  <span className="font-sans text-muted"> · {SAMPLES[d].tamperNote}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={sampleUrl(d)} download className="btn btn-ghost btn-sm">
                  <Download className="size-3.5" /> Original
                </a>
                <a href={sampleUrl(d, true)} download className="btn btn-danger btn-sm">
                  <Download className="size-3.5" /> Tampered
                </a>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] text-muted">
          Tip: download all six before presenting, so you can drag them straight onto the Seller and Inspector screens.
        </p>
      </section>

      <section className="mt-10">
        <SectionHead title="Script" note="Switch roles with “Viewing as” in the sidebar." />
        <div className="mt-5 grid items-start gap-5 md:grid-cols-2">
          {SCRIPTS.map((sc, i) => (
            <div key={sc.title} className={`card p-5 sm:p-6 ${i === 0 ? "border-[1.5px] border-fg md:col-span-2" : ""}`}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-[17px] font-semibold">{sc.title}</div>
                <span className="font-mono text-xs text-muted">{sc.time}</span>
              </div>
              <ol className="mt-3">
                {sc.steps.map((st, j) => (
                  <li key={j} className="flex flex-wrap items-start gap-x-4 gap-y-2 border-t border-line py-3 first:border-t-0">
                    <span className="w-5 pt-0.5 font-mono text-[13px] text-muted">{j + 1}</span>
                    <span className="w-20 pt-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">{st.role ?? "result"}</span>
                    <span className="min-w-0 flex-1 basis-60 text-[15px] leading-relaxed">{st.text}</span>
                    {st.href && (
                      <button onClick={() => go(st.role, st.href)} className="inline-flex items-center gap-1 pt-0.5 text-sm font-medium text-money-ink hover:underline">
                        {st.cta} <ArrowRight className="size-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-[4px] bg-fg px-6 py-6 text-bg sm:px-8">
        <div className="eyebrow text-bg/60">The one-line pitch</div>
        <p className="mt-2 max-w-3xl text-[19px] leading-snug">
          The buyer&apos;s stablecoin is locked on Solana before the goods ship. When an approved inspector verifies the
          documents, the contract pays the seller in the same transaction. No proof by the deadline? The buyer gets a refund.
        </p>
        <Link href="/buyer/new" onClick={() => setRole("buyer")} className="btn btn-money mt-5">
          Start the demo <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}
