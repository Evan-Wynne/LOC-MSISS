import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import { ResetDemo } from "@/components/ResetDemo";
import { ChainStatus } from "@/components/ChainStatus";

export const metadata: Metadata = {
  title: "Tradelock: programmable letters of credit on Solana",
  description:
    "The buyer's stablecoin is locked in a Solana escrow and released to the seller when an approved inspector verifies the shipment documents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">
        <Providers>
          <Nav />
          <ChainStatus />
          <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">{children}</main>
          <footer className="mx-auto max-w-6xl border-t border-line px-4 py-6 text-xs text-muted sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <span>Tradelock · BUILD IRL Vol. 1 · Solana devnet</span>
              <ResetDemo />
            </div>
            <p className="mt-2 text-muted/80">Devnet demo with test tokens. Not a legal letter of credit or legal advice.</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
