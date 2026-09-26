import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Sidebar } from "@/components/Sidebar";
import { ResetDemo } from "@/components/ResetDemo";
import { ChainStatus } from "@/components/ChainStatus";
import { DemoBanner } from "@/components/DemoBanner";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Tradelock: programmable letters of credit on Solana",
  description:
    "The buyer's stablecoin is locked in a Solana escrow and released to the seller when an approved inspector verifies the shipment documents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh">
        <Providers>
          <DemoBanner />
          <ChainStatus />
          <div className="lg:grid lg:min-h-dvh lg:grid-cols-[272px_minmax(0,1fr)]">
            <Sidebar />
            <div className="min-w-0 px-4 sm:px-8 lg:px-10">
              <main className="mx-auto max-w-[1086px] pb-10 pt-8 lg:pt-11">{children}</main>
              <footer className="mx-auto max-w-[1086px] border-t border-line pb-10 pt-[18px] text-xs text-muted">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <span>Devnet demo with test tokens. Not a legal letter of credit or legal advice.</span>
                  <ResetDemo />
                </div>
              </footer>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
