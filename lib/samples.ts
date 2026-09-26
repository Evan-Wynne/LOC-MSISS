// Demo shipping documents, generated as plain text so the live demo needs no
// files on disk. Deterministic: the same trade always gives the same bytes,
// so the same SHA-256.
import type { DocumentType, Trade } from "./types";

// PLACEHOLDER[P20]: generated sample documents (plain text), not real trade paperwork → REAL: the seller uploads the actual bill of lading, invoice and inspection certificate (or an electronic bill of lading), see docs/ROADMAP.md §7
type SampleTrade = Pick<Trade, "id" | "title" | "goods" | "amount" | "buyer" | "seller" | "inspector" | "createdAt">;

const REF: Record<DocumentType, string> = {
  BillOfLading: "BL",
  Invoice: "INV",
  InspectionCertificate: "IC",
};

const SLUG: Record<DocumentType, string> = {
  BillOfLading: "bill-of-lading",
  Invoice: "invoice",
  InspectionCertificate: "inspection-cert",
};

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function sampleRef(t: Pick<Trade, "id">, type: DocumentType) {
  const tail = t.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `${REF[type]}-${tail}`;
}

export function sampleFilename(t: Pick<Trade, "id">, type: DocumentType) {
  return `${SLUG[type]}-${sampleRef(t, type).toLowerCase()}.txt`;
}

export function sampleText(t: SampleTrade, type: DocumentType): string {
  const date = new Date(t.createdAt).toISOString().slice(0, 10);
  const head = [
    `SAMPLE DOCUMENT, generated for the Tradelock devnet demo. Not a real trade document.`,
    ``,
  ];
  const common = [
    `Reference:   ${sampleRef(t, type)}`,
    `Trade:       ${t.title}`,
    `Trade ID:    ${t.id}`,
    `Date:        ${date}`,
  ];
  const body: Record<DocumentType, string[]> = {
    BillOfLading: [
      `BILL OF LADING`,
      ...common,
      `Shipper:     ${t.seller}`,
      `Consignee:   ${t.buyer}`,
      `Goods:       ${t.goods}`,
      `Condition:   Shipped on board in apparent good order`,
    ],
    Invoice: [
      `COMMERCIAL INVOICE`,
      ...common,
      `Seller:      ${t.seller}`,
      `Buyer:       ${t.buyer}`,
      `Goods:       ${t.goods}`,
      `Amount:      ${money(t.amount)} tUSDC`,
      `Terms:       Payable from escrow on inspector approval`,
    ],
    InspectionCertificate: [
      `INSPECTION CERTIFICATE`,
      ...common,
      `Inspector:   ${t.inspector}`,
      `Goods:       ${t.goods}`,
      `Result:      Quantity and quality conform to the contract`,
    ],
  };
  return [...head, ...body[type], ``].join("\n");
}

export const sampleBlob = (t: SampleTrade, type: DocumentType) =>
  new Blob([sampleText(t, type)], { type: "text/plain" });

// Changes exactly one character to show that any edit, however small, gives a
// completely different hash: the first digit of the amount on an invoice,
// otherwise the last digit of the date (a back-dated bill of lading).
export function tamper(text: string): { text: string; note: string } {
  const amountLine = text.indexOf("Amount:");
  const dateLine = text.indexOf("Date:");
  let at = -1;
  let where = "";
  if (amountLine >= 0) {
    at = amountLine + text.slice(amountLine).search(/\d/);
    where = "amount";
  } else if (dateLine >= 0) {
    const end = text.indexOf("\n", dateLine);
    const line = text.slice(dateLine, end);
    at = dateLine + line.search(/\d(?=\D*$)/);
    where = "date";
  }
  if (at < 0 || !/\d/.test(text[at])) return { text: text + " ", note: "added one space at the end" };
  const from = text[at];
  const to = String((Number(from) + 1) % 10);
  return {
    text: text.slice(0, at) + to + text.slice(at + 1),
    note: `one character changed in the ${where}: "${from}" → "${to}"`,
  };
}
