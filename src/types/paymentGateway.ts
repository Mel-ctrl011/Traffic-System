/* =========================================================
   PAYMENT GATEWAY TYPES - PHASE 2
========================================================= */

export type PaymentGateway =
  | "payfast"
  | "stripe"
  | "yoco"
  | "eft"
  | "vodacom_mpesa"
  | "mtn_money";

export type GatewayStatus =
  | "available"
  | "unavailable"
  | "maintenance"
  | "disabled";

/* =========================================================
   GATEWAY CONFIGURATION
========================================================= */

export interface GatewayConfig {
  id: PaymentGateway;
  name: string;
  description: string;
  icon: string;
  currency: string;
  minAmount: number;
  maxAmount: number;
  fee: number; // percentage
  processingTime: string; // "instant" | "1-2 hours" | "1-2 days"
  status: GatewayStatus;
  supported: boolean;
  priority: number; // for sorting
}

/* =========================================================
   PAYFAST
========================================================= */

export interface PayFastConfig extends GatewayConfig {
  id: "payfast";
  merchantId: string;
  merchantKey: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export interface PayFastPayment {
  reference: string;
  amount: number;
  description: string;
  payerEmail: string;
  payerName: string;
  payerPhone?: string;
  itemName: string;
  itemDescription: string;
  customStr1?: string;
  customStr2?: string;
  customStr3?: string;
  customInt1?: number;
  customInt2?: number;
  customInt3?: number;
}

export interface PayFastResponse {
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: string;
  item_name: string;
  item_description: string;
  amount_gross: string;
  amount_fee: string;
  amount_net: string;
  custom_str1?: string;
  custom_str2?: string;
  custom_str3?: string;
  custom_int1?: string;
  custom_int2?: string;
  custom_int3?: string;
  name_first: string;
  name_last: string;
  email_address: string;
  merchant_id: string;
  signature: string;
}

/* =========================================================
   STRIPE
========================================================= */

export interface StripeConfig extends GatewayConfig {
  id: "stripe";
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
}

export interface StripePayment {
  amount: number;
  currency: string;
  description: string;
  paymentMethodId?: string;
  cardToken?: string;
  receiptEmail?: string;
  statementDescriptor?: string;
}

export interface StripePaymentIntent {
  id: string;
  clientSecret: string;
  status: "requires_payment_method" | "processing" | "succeeded" | "canceled";
  amount: number;
  currency: string;
}

/* =========================================================
   YOCO
========================================================= */

export interface YocoConfig extends GatewayConfig {
  id: "yoco";
  apiKey: string;
  publicKey: string;
  webhookSecret: string;
}

export interface YocoPayment {
  amount: number;
  currency: string;
  description: string;
  reference: string;
  redirectUrl?: string;
  metadata?: Record<string, any>;
}

export interface YocoCheckout {
  id: string;
  redirectUrl: string;
  createdAt: string;
  expiresAt: string;
}

/* =========================================================
   EFT / BANK TRANSFER
========================================================= */

export interface EFTConfig extends GatewayConfig {
  id: "eft";
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branchCode: string;
  reference: string;
}

export interface EFTPayment {
  reference: string;
  amount: number;
  description: string;
  bankDetails: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    branchCode: string;
  };
}

export interface EFTVerification {
  reference: string;
  amount: number;
  status: "pending" | "confirmed" | "failed";
  depositDate?: string;
  confirmationCode?: string;
}

/* =========================================================
   MOBILE MONEY (Vodacom M-Pesa, MTN)
========================================================= */

export interface MobileMoneyConfig extends GatewayConfig {
  id: "vodacom_mpesa" | "mtn_money";
  apiKey: string;
  apiSecret: string;
  shortCode: string;
  webhookSecret: string;
}

export interface MobileMoneyPayment {
  phoneNumber: string;
  amount: number;
  description: string;
  reference: string;
}

export interface MobileMoneySTK {
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

/* =========================================================
   TRANSACTION TRACKING
========================================================= */

export interface PaymentTransaction {
  id: string;
  userId: string;
  paymentRequestId: string;
  gateway: PaymentGateway;
  gatewayTransactionId: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "success" | "failed" | "cancelled";
  errorMessage?: string;
  errorCode?: string;
  metadata: {
    source: "fine" | "appointment" | "other";
    sourceId?: string;
    returnUrl?: string;
    webhookProcessed?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/* =========================================================
   PAYMENT METHOD STORAGE (Enhanced)
========================================================= */

export interface StoredPaymentMethod {
  id: string;
  userId: string;
  gateway: PaymentGateway;
  type: "card" | "bank" | "wallet" | "eft";

  // Card specific
  cardNumber?: string;
  lastFourDigits?: string;
  cardholderName?: string;
  expiryMonth?: number;
  expiryYear?: number;

  // Bank account specific
  accountNumber?: string;
  branchCode?: string;
  bankName?: string;
  accountHolder?: string;

  // Wallet specific
  walletId?: string;
  phoneNumber?: string;

  // General
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

/* =========================================================
   GATEWAY RESPONSE WEBHOOK
========================================================= */

export interface GatewayWebhook {
  gateway: PaymentGateway;
  transactionId: string;
  status: "success" | "failed" | "pending";
  amount: number;
  currency: string;
  timestamp: string;
  signature: string;
  payload: Record<string, any>;
}

/* =========================================================
   GATEWAY ERROR HANDLING
========================================================= */

export class GatewayError extends Error {
  constructor(
    public gateway: PaymentGateway,
    public code: string,
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

/* =========================================================
   PAYMENT RATE LIMITS
========================================================= */

export interface RateLimit {
  gateway: PaymentGateway;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

/* =========================================================
   GATEWAY HEALTH CHECK
========================================================= */

export interface GatewayHealthStatus {
  gateway: PaymentGateway;
  status: "operational" | "degraded" | "down";
  lastChecked: string;
  responseTime: number; // ms
  errorRate: number; // percentage
}
