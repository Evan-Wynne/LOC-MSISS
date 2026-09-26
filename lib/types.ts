// Data shapes shared by the UI and the data layer (docs/PROJECT_CONTEXT.md, "Data shapes").
// The doc's names are kept; extra fields the UI needs are marked "ext".

export type Role = "buyer" | "seller" | "inspector";

export type DocumentType = "BillOfLading" | "Invoice" | "InspectionCertificate";

// "Verified" happens inside approve_shipment together with payment, so it shows
// as a timeline step, not a resting state. "Rejected" is an ext status (on-chain 4).
export type TradeStatus = "Funded" | "DocumentsSubmitted" | "Verified" | "Paid" | "Refunded" | "Rejected";

export type Trade = {
  id: string;
  buyer: string;
  seller: string;
  inspector: string;
  goods: string;
  amount: number;
  deadline: number; // ms since epoch
  status: TradeStatus;
  // ext
  title: string;
  requiredDocs: DocumentType[];
  createdAt: number;
  fundTxSig: string;
  approvedAt?: number;
  settleTxSig?: string;
};

export type TradeDocument = {
  id: string;
  tradeId: string;
  documentType: DocumentType;
  filename: string;
  hash: string; // SHA-256, hex
  submittedAt: number;
  txSig?: string; // ext
};

export type Verification = {
  tradeId: string;
  inspector: string;
  approved: boolean;
  approvedAt?: number;
  txSig?: string;
};

export type TradeEventKind = "Funded" | "DocumentSubmitted" | "Rejected" | "Verified" | "Paid" | "Refunded";

export type TradeEvent = {
  id: string;
  tradeId: string;
  kind: TradeEventKind;
  at: number;
  txSig: string;
  actor: Role | "anyone";
  detail?: string;
};

export type CreateTradeInput = {
  title: string;
  goods: string;
  amount: number;
  deadline: number;
  requiredDocs: DocumentType[];
  seller: string;
  inspector: string;
};

export type SubmitDocumentInput = {
  documentType: DocumentType;
  filename: string;
  hash: string;
};

export type Settlement = {
  kind: "released" | "refunded";
  tradeId: string;
  title: string;
  amount: number;
  to: string;
  txSig: string;
};

export const DOC_TYPES: DocumentType[] = ["BillOfLading", "Invoice", "InspectionCertificate"];

export const DOC_LABELS: Record<DocumentType, string> = {
  BillOfLading: "Bill of lading",
  Invoice: "Commercial invoice",
  InspectionCertificate: "Inspection certificate",
};
