/* =========================================================
   PAYMENT TYPES
========================================================= */

export type PaymentMethod = "card" | "eft" | "mobile" | "saved";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "success"
  | "failed"
  | "cancelled";

export type PaymentSource = "fine" | "appointment" | "other";

/* =========================================================
   CARD
========================================================= */

export interface CardDetails {
  cardNumber: string;
  cardholderName: string;
  expiryDate: string;
  cvv: string;
}

export interface SavedCard extends CardDetails {
  id: string;
  lastFourDigits: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault?: boolean;
  createdAt: string;
}

/* =========================================================
   PAYMENT REQUEST / SESSION
========================================================= */

export interface PaymentRequest {
  id: string;
  amount: number;
  currency: string;
  description: string;
  source: PaymentSource;
  sourceId?: string;
  method?: PaymentMethod;
  createdAt: string;
  expiresAt: string;
}

export interface PaymentSession {
  sessionId: string;
  request: PaymentRequest;
  status: PaymentStatus;
  cardDetails?: CardDetails;
  savedCardId?: string;
  verificationCode?: string;
  completedAt?: string;
  receiptId?: string;
}

/* =========================================================
   PAYMENT HISTORY
========================================================= */

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  description: string;
  source: PaymentSource;
  sourceId?: string;
  method: PaymentMethod;
  status: PaymentStatus;
  cardUsed: string;
  receiptId?: string;
  paidAt: string;
  createdAt: string;
}

/* =========================================================
   CHECKOUT STATE
========================================================= */

export interface CheckoutState {
  request: PaymentRequest | null;
  selectedMethod: PaymentMethod | null;
  savedCardId: string | null;
  cardDetails: CardDetails | null;
  loading: boolean;
  error: string | null;
}
