// Demo shipping documents: real PDFs in public/samples/ (made by scripts/make-samples.mjs).
// "Use sample", "Try the original" and the Demo kit downloads are the same bytes,
// so a hash recorded by the seller matches the file the inspector checks.
import type { DocumentType } from "./types";

// PLACEHOLDER[P20]: sample PDFs for one demo cocoa trade, not real trade paperwork → REAL: the seller uploads the actual bill of lading, invoice and inspection certificate (or an electronic bill of lading), see docs/ROADMAP.md §7
export const SAMPLES: Record<DocumentType, { file: string; tamperNote: string }> = {
  BillOfLading: { file: "bill-of-lading.pdf", tamperNote: "shipped-on-board date changed from 18 to 28 September" },
  Invoice: { file: "commercial-invoice.pdf", tamperNote: "total changed from 36,000.00 to 38,000.00" },
  InspectionCertificate: { file: "inspection-certificate.pdf", tamperNote: "quantity changed from 200 to 180 bags" },
};

export const sampleUrl = (type: DocumentType, tampered = false) =>
  `/samples/${tampered ? SAMPLES[type].file.replace(".pdf", "-TAMPERED.pdf") : SAMPLES[type].file}`;

export const sampleName = (type: DocumentType, tampered = false) => sampleUrl(type, tampered).slice("/samples/".length);

export async function fetchSample(type: DocumentType, tampered = false): Promise<Blob> {
  const res = await fetch(sampleUrl(type, tampered));
  if (!res.ok) throw new Error(`Couldn't load the sample ${sampleName(type, tampered)}`);
  return res.blob();
}
