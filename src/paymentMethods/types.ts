/* =========================================================
   UNIFIED PAYMENT METHOD TYPES

   The single source of truth for "a way the user can pay".
   Replaces the two old concepts:
     - SavedCard      (paymentService.ts)
     - StoredPaymentMethod (gatewayService.ts)

   Storage is local AsyncStorage for now. See
   FIREBASE_MIGRATION.md for the cloud path.
========================================================= */

export type MethodType =
  | "card"
  | "google_pay"
  | "apple_pay"
  | "bank";

export interface UnifiedPaymentMethod {
  id: string;
  userId: string;
  type: MethodType;

  /**
   * Canonical display string. Either the cardholder name
   * ("John Doe") or a synthetic label for wallets / bank
   * ("Capitec ••1234", "john@gmail.com"). The list row
   * renders this verbatim, so consumers don't have to
   * re-derive it.
   */
  label: string;

  isDefault: boolean;
  createdAt: string;
  lastUsedAt?: string;

  /* --------- card --------- */
  cardNumber?: string;
  lastFour?: string;
  expiryMonth?: number;
  expiryYear?: number;

  /* --------- bank --------- */
  bankName?: string;
  accountNumberLast4?: string;
  branchCode?: string;

  /* --------- wallets --------- */
  walletEmail?: string;
}

/* =========================================================
   INPUTS — what the add/edit form passes to storage
========================================================= */

export type AddMethodInput =
  | {
      type: "card";
      cardholderName: string;
      cardNumber: string;
      expiryMonth: number;
      expiryYear: number;
      isDefault?: boolean;
    }
  | {
      type: "google_pay" | "apple_pay";
      walletEmail: string;
      isDefault?: boolean;
    }
  | {
      type: "bank";
      accountHolder: string;
      bankName: string;
      accountNumber: string;
      branchCode: string;
      isDefault?: boolean;
    };

export type UpdateMethodInput = Partial<Omit<
  UnifiedPaymentMethod,
  "id" | "userId" | "type" | "createdAt"
>>;

/* =========================================================
   HELPERS
========================================================= */

export const METHOD_LABEL: Record<MethodType, string> = {
  card: "Credit / Debit Card",
  google_pay: "Google Pay",
  apple_pay: "Apple Pay",
  bank: "Bank Transfer",
};

export const MAX_METHODS = 5;
