// Generates the demo shipping documents in public/samples/ (npm run samples).
// Plain hand-built PDFs with no timestamps, so the bytes and SHA-256 never change.
// Each document also has a TAMPERED copy with one value edited.
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const OUT = new URL("../public/samples/", import.meta.url);
mkdirSync(OUT, { recursive: true });

// Colours from the app theme (0-1 RGB).
const INK = "0.13 0.12 0.11";
const MUTED = "0.42 0.41 0.39";
const GREEN = "0.05 0.46 0.31";
const LINE = "0.85 0.84 0.81";
const RED = "0.62 0.16 0.14";

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

function page({ kind, ref, rows, stamp, tampered }) {
  const c = [];
  const text = (x, y, size, font, color, s) => c.push(`BT /${font} ${size} Tf ${color} rg ${x} ${y} Td (${esc(s)}) Tj ET`);
  const rule = (y, color = LINE, w = 0.8) => c.push(`${color} RG ${w} w 56 ${y} m 539 ${y} l S`);

  // Header band
  c.push(`${INK} rg 0 792 595 50 re f`);
  text(56, 812, 13, "FB", "0.98 0.97 0.95", "TRADELOCK");
  text(150, 812, 9, "FM", "0.98 0.97 0.95", "PROGRAMMABLE LETTERS OF CREDIT  -  SOLANA DEVNET DEMO");
  c.push(`0.96 0.88 0.55 rg 450 804 89 18 re f`);
  text(460, 810, 8, "FM", "0.3 0.24 0.1", "SAMPLE DOCUMENT");

  text(56, 740, 9, "FM", MUTED, `REF  ${ref}`);
  text(56, 712, 24, "FB", INK, kind);
  rule(698, INK, 1.5);

  let y = 670;
  for (const [k, v] of rows) {
    text(56, y, 9, "FM", MUTED, k.toUpperCase());
    const lines = Array.isArray(v) ? v : [v];
    lines.forEach((l, i) => text(200, y - i * 15, 11, "F", INK, l));
    y -= 15 * lines.length + 14;
    rule(y + 6);
    y -= 12;
  }

  // Stamp box
  const sy = y - 70;
  c.push(`${stamp.color} RG 1.5 w 56 ${sy} 483 64 re S`);
  text(72, sy + 38, 12, "FB", stamp.color, stamp.title);
  text(72, sy + 18, 9, "F", MUTED, stamp.sub);

  // Footer
  rule(92);
  text(56, 74, 8, "F", MUTED, "Generated for the Tradelock demo. Not a real trade document. Only this file's SHA-256 fingerprint");
  text(56, 62, 8, "F", MUTED, "is recorded on-chain; the file itself never leaves the browser.");
  if (tampered) text(56, 44, 8, "FM", RED, "(this copy has been altered after signing: its hash will not match)");
  return c.join("\n");
}

function pdf(content) {
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F 4 0 R /FB 5 0 R /FM 6 0 R >> >> /Contents 7 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offs = [];
  objs.forEach((o, i) => {
    offs.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  out += offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

// The demo trade: matches the defaults on the Create trade screen.
const docs = [
  {
    file: "bill-of-lading",
    kind: "BILL OF LADING",
    ref: "BL-TMA-240917",
    rows: [
      ["Shipper", ["Demo seller", "Tema, Ghana"]],
      ["Consignee", ["Demo buyer", "Dublin, Ireland"]],
      ["Vessel / voyage", "MV Atlantic Meridian  /  V.114N"],
      ["Port of loading", "Tema, Ghana"],
      ["Port of discharge", "Dublin, Ireland"],
      ["Goods", ["200 bags x 60 kg fermented and dried cocoa beans", "Gross weight 12,000 kg  -  1 x 20ft container MSKU 402119-3"]],
      ["Shipped on board", "18 September 2026"],
    ],
    tamper: [6, "Shipped on board", "28 September 2026"],
    stamp: { color: INK, title: "SHIPPED ON BOARD - CLEAN", sub: "Received in apparent good order and condition. Signed for the carrier, Tema." },
  },
  {
    file: "commercial-invoice",
    kind: "COMMERCIAL INVOICE",
    ref: "INV-2026-0918",
    rows: [
      ["Seller", ["Demo seller", "Tema, Ghana"]],
      ["Buyer", ["Demo buyer", "Dublin, Ireland"]],
      ["Description", "200 bags x 60 kg fermented and dried cocoa beans"],
      ["Incoterm", "FOB Tema"],
      ["Unit price", "180.00 tUSDC per bag"],
      ["Total due", "36,000.00 tUSDC"],
      ["Payment", ["From Tradelock escrow on inspector approval", "(programmable letter of credit)"]],
    ],
    tamper: [5, "Total due", "38,000.00 tUSDC"],
    stamp: { color: GREEN, title: "TOTAL  36,000.00 tUSDC", sub: "Matches the amount locked in escrow for this trade." },
  },
  {
    file: "inspection-certificate",
    kind: "INSPECTION CERTIFICATE",
    ref: "IC-7731",
    rows: [
      ["Inspector", "Demo inspector  (independent verifier)"],
      ["Place / date", "Tema port warehouse  /  17 September 2026"],
      ["Goods", "Fermented and dried cocoa beans"],
      ["Quantity found", "200 bags x 60 kg  (12,000 kg)"],
      ["Moisture", "7.1 %  (limit 7.5 %)"],
      ["Grade", "Grade I, well fermented, free of live insects"],
      ["Result", "Quantity and quality conform to the contract"],
    ],
    tamper: [3, "Quantity found", "180 bags x 60 kg  (10,800 kg)"],
    stamp: { color: GREEN, title: "CONFORMS - APPROVED FOR SHIPMENT", sub: "Seal no. HI-55120 applied to container MSKU 402119-3." },
  },
];

const manifest = [];
for (const d of docs) {
  const orig = pdf(page({ ...d, tampered: false }));
  const rows = d.rows.map((r, i) => (i === d.tamper[0] ? [d.tamper[1], d.tamper[2]] : r));
  const bad = pdf(page({ ...d, rows, tampered: true }));
  for (const [name, buf] of [[`${d.file}.pdf`, orig], [`${d.file}-TAMPERED.pdf`, bad]]) {
    writeFileSync(new URL(name, OUT), buf);
    manifest.push(`${createHash("sha256").update(buf).digest("hex")}  ${name}`);
  }
}
console.log(manifest.join("\n"));
