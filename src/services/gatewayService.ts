import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  deleteDoc,
} from "firebase/firestore";

import { db } from "./firebase";
import type {
  GatewayConfig,
  PaymentGateway,
  PaymentTransaction,
  StoredPaymentMethod,
  GatewayError,
  PayFastPayment,
  StripePayment,
  YocoPayment,
  EFTPayment,
  MobileMoneyPayment,
} from "../types/paymentGateway";

/* =========================================================
   GATEWAY CONFIGURATIONS
   
   These are default configurations. In production,
   load these from secure environment variables or
   Firebase Remote Config.
========================================================= */

const GATEWAY_CONFIGS: Record<PaymentGateway, GatewayConfig> = {
  payfast: {
    id: "payfast",
    name: "PayFast",
    description: "South Africa's most popular payment gateway",
    icon: "card",
    currency: "ZAR",
    minAmount: 10,
    maxAmount: 999999,
    fee: 2.9,
    processingTime: "instant",
    status: "available",
    supported: true,
    priority: 1,
  },
  stripe: {
    id: "stripe",
    name: "Stripe",
    description: "International payments, credit/debit cards",
    icon: "card",
    currency: "ZAR",
    minAmount: 10,
    maxAmount: 999999,
    fee: 2.9,
    processingTime: "instant",
    status: "available",
    supported: true,
    priority: 2,
  },
  yoco: {
    id: "yoco",
    name: "Yoco",
    description: "SA fintech - cards and bank accounts",
    icon: "card",
    currency: "ZAR",
    minAmount: 10,
    maxAmount: 999999,
    fee: 2.5,
    processingTime: "instant",
    status: "available",
    supported: true,
    priority: 3,
  },
  eft: {
    id: "eft",
    name: "EFT / Bank Transfer",
    description: "Direct bank transfer - manual verification",
    icon: "cash",
    currency: "ZAR",
    minAmount: 10,
    maxAmount: 999999,
    fee: 0,
    processingTime: "1-2 days",
    status: "available",
    supported: true,
    priority: 4,
  },
  vodacom_mpesa: {
    id: "vodacom_mpesa",
    name: "Vodacom M-Pesa",
    description: "Mobile money - quick and easy",
    icon: "phone-portrait",
    currency: "ZAR",
    minAmount: 10,
    maxAmount: 40000,
    fee: 0,
    processingTime: "instant",
    status: "available",
    supported: true,
    priority: 5,
  },
  mtn_money: {
    id: "mtn_money",
    name: "MTN Mobile Money",
    description: "MTN Money - pay with your phone",
    icon: "phone-portrait",
    currency: "ZAR",
    minAmount: 10,
    maxAmount: 50000,
    fee: 0,
    processingTime: "instant",
    status: "available",
    supported: true,
    priority: 6,
  },
};

/* =========================================================
   GET AVAILABLE GATEWAYS
   
   Returns all payment gateways available for the user,
   sorted by priority.
========================================================= */

export const getAvailableGateways =
  (): GatewayConfig[] => {
    return Object.values(GATEWAY_CONFIGS)
      .filter((g) => g.supported && g.status === "available")
      .sort((a, b) => a.priority - b.priority);
  };

/* =========================================================
   GET GATEWAY CONFIG
   
   Retrieves configuration for a specific gateway.
========================================================= */

export const getGatewayConfig = (
  gateway: PaymentGateway
): GatewayConfig | null => {
  return GATEWAY_CONFIGS[gateway] || null;
};

/* =========================================================
   INITIATE GATEWAY PAYMENT
   
   Routes payment request to the appropriate gateway.
   This is where integration with real APIs would happen.
========================================================= */

export const initiateGatewayPayment = async ({
  userId,
  paymentRequestId,
  gateway,
  amount,
  description,
  returnUrl,
  metadata,
}: {
  userId: string;
  paymentRequestId: string;
  gateway: PaymentGateway;
  amount: number;
  description: string;
  returnUrl?: string;
  metadata?: Record<string, any>;
}): Promise<PaymentTransaction> => {
  console.log(
    `🔗 Initiating payment with ${gateway}...`,
    {
      userId,
      amount,
      gateway,
    }
  );

  try {
    let gatewayTransactionId = "";
    let status: PaymentTransaction["status"] = "pending";

    // Route to appropriate gateway
    switch (gateway) {
      case "payfast":
        gatewayTransactionId = await initiatePayFast({
          userId,
          amount,
          description,
          returnUrl,
        });
        status = "processing";
        break;

      case "stripe":
        gatewayTransactionId = await initiateStripe({
          userId,
          amount,
          description,
        });
        status = "processing";
        break;

      case "yoco":
        gatewayTransactionId = await initiateYoco({
          userId,
          amount,
          description,
          returnUrl,
        });
        status = "processing";
        break;

      case "eft":
        gatewayTransactionId = await initiateEFT({
          userId,
          amount,
          description,
        });
        status = "pending";
        break;

      case "vodacom_mpesa":
        gatewayTransactionId = await initiateMobileMoneyVodacom(
          {
            userId,
            amount,
            description,
          }
        );
        status = "processing";
        break;

      case "mtn_money":
        gatewayTransactionId = await initiateMobileMoneyMTN({
          userId,
          amount,
          description,
        });
        status = "processing";
        break;

      default:
        throw new Error(`Unsupported gateway: ${gateway}`);
    }

    // Create transaction record in Firestore
    const transactionData = {
      userId,
      paymentRequestId,
      gateway,
      gatewayTransactionId,
      amount,
      currency: "ZAR",
      status,
      metadata: {
        ...metadata,
        returnUrl,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, "paymentTransactions"),
      transactionData
    );

    console.log(
      `✅ Transaction initiated: ${gateway} - ${gatewayTransactionId}`
    );

    return {
      id: docRef.id,
      userId,
      paymentRequestId,
      gateway,
      gatewayTransactionId,
      amount,
      currency: "ZAR",
      status,
      metadata: {
        source: "other",
        ...metadata,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error(`❌ Payment initiation failed:`, error);
    throw error;
  }
};

/* =========================================================
   GATEWAY-SPECIFIC IMPLEMENTATIONS
   
   In production, these would make real API calls to
   each payment gateway. For now, they're simulated.
========================================================= */

async function initiatePayFast({
  userId,
  amount,
  description,
  returnUrl,
}: {
  userId: string;
  amount: number;
  description: string;
  returnUrl?: string;
}): Promise<string> {
  // Simulate PayFast integration
  // Real implementation would:
  // 1. Call PayFast API to create payment link
  // 2. Return payment URL for redirect
  // 3. Set up webhook for confirmation

  console.log("📤 Sending to PayFast...");

  // Mock API call with 1-2 second delay
  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 1000 + 500)
  );

  const transactionId = `PF-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)
    .toUpperCase()}`;

  console.log(`✓ PayFast transaction created: ${transactionId}`);

  return transactionId;
}

async function initiateStripe({
  userId,
  amount,
  description,
}: {
  userId: string;
  amount: number;
  description: string;
}): Promise<string> {
  // Simulate Stripe integration
  console.log("📤 Creating Stripe payment intent...");

  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 1000 + 500)
  );

  const transactionId = `pi_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 12)}`;

  console.log(`✓ Stripe payment intent created: ${transactionId}`);

  return transactionId;
}

async function initiateYoco({
  userId,
  amount,
  description,
  returnUrl,
}: {
  userId: string;
  amount: number;
  description: string;
  returnUrl?: string;
}): Promise<string> {
  // Simulate Yoco integration
  console.log("📤 Creating Yoco checkout...");

  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 1000 + 500)
  );

  const transactionId = `yoco_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  console.log(`✓ Yoco checkout created: ${transactionId}`);

  return transactionId;
}

async function initiateEFT({
  userId,
  amount,
  description,
}: {
  userId: string;
  amount: number;
  description: string;
}): Promise<string> {
  // Simulate EFT/Bank Transfer
  console.log("📤 Generating EFT reference...");

  await new Promise((resolve) =>
    setTimeout(resolve, 500)
  );

  const transactionId = `EFT-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .substring(2, 7)
    .toUpperCase()}`;

  console.log(`✓ EFT reference generated: ${transactionId}`);

  return transactionId;
}

async function initiateMobileMoneyVodacom({
  userId,
  amount,
  description,
}: {
  userId: string;
  amount: number;
  description: string;
}): Promise<string> {
  // Simulate Vodacom M-Pesa integration
  console.log("📤 Initiating Vodacom M-Pesa STK push...");

  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 1000 + 500)
  );

  const transactionId = `MPESA-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)
    .toUpperCase()}`;

  console.log(`✓ M-Pesa STK initiated: ${transactionId}`);

  return transactionId;
}

async function initiateMobileMoneyMTN({
  userId,
  amount,
  description,
}: {
  userId: string;
  amount: number;
  description: string;
}): Promise<string> {
  // Simulate MTN Mobile Money integration
  console.log("📤 Initiating MTN Money USSD...");

  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 1000 + 500)
  );

  const transactionId = `MTN-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)
    .toUpperCase()}`;

  console.log(`✓ MTN Money initiated: ${transactionId}`);

  return transactionId;
}

/* =========================================================
   TRANSACTION TRACKING
========================================================= */

export const getTransaction = async (
  transactionId: string
): Promise<PaymentTransaction | null> => {
  const q = query(
    collection(db, "paymentTransactions"),
    where("__name__", "==", transactionId)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const data = snapshot.docs[0].data();
  return {
    id: transactionId,
    ...(data as Omit<PaymentTransaction, "id">),
  };
};

export const getTransactionsByPaymentRequest = async (
  paymentRequestId: string
): Promise<PaymentTransaction[]> => {
  const q = query(
    collection(db, "paymentTransactions"),
    where("paymentRequestId", "==", paymentRequestId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<PaymentTransaction, "id">),
  }));
};

export const updateTransactionStatus = async (
  transactionId: string,
  status: PaymentTransaction["status"],
  errorMessage?: string
): Promise<void> => {
  await updateDoc(
    doc(db, "paymentTransactions", transactionId),
    {
      status,
      errorMessage: errorMessage || null,
      updatedAt: serverTimestamp(),
      ...(status === "success" && {
        completedAt: serverTimestamp(),
      }),
    }
  );
};

/* =========================================================
   STORED PAYMENT METHODS
========================================================= */

export const getSavedPaymentMethods = async (
  userId: string
): Promise<StoredPaymentMethod[]> => {
  const q = query(
    collection(db, "storedPaymentMethods"),
    where("userId", "==", userId),
    where("isActive", "==", true)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<StoredPaymentMethod, "id">),
    }))
    .sort((a, b) => {
      // Default first, then by most recent
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return (
        new Date(b.lastUsedAt || 0).getTime() -
        new Date(a.lastUsedAt || 0).getTime()
      );
    });
};

export const setDefaultPaymentMethod = async (
  userId: string,
  methodId: string
): Promise<void> => {
  // First, unset all other defaults
  const methods = await getSavedPaymentMethods(userId);
  for (const method of methods) {
    if (method.isDefault) {
      await updateDoc(
        doc(db, "storedPaymentMethods", method.id),
        { isDefault: false }
      );
    }
  }

  // Set new default
  await updateDoc(
    doc(db, "storedPaymentMethods", methodId),
    { isDefault: true }
  );
};

export const deletePaymentMethod = async (
  methodId: string
): Promise<void> => {
  await deleteDoc(
    doc(db, "storedPaymentMethods", methodId)
  );
};

/* =========================================================
   PAYMENT METHOD ORDERING
========================================================= */

export const reorderPaymentMethods = async (
  userId: string,
  orderedIds: string[]
): Promise<void> => {
  const methods = await getSavedPaymentMethods(userId);

  for (let i = 0; i < orderedIds.length; i++) {
    const methodId = orderedIds[i];
    const method = methods.find((m) => m.id === methodId);

    if (method) {
      // Update with priority/order (you could add an 'order' field)
      // For now, we're relying on isDefault + lastUsedAt sorting
    }
  }
};

/* =========================================================
   GATEWAY HEALTH CHECK
========================================================= */

export const checkGatewayHealth = async (
  gateway: PaymentGateway
): Promise<{
  status: "operational" | "degraded" | "down";
  responseTime: number;
}> => {
  const startTime = Date.now();

  try {
    // Simulate health check API call
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 1000 + 200)
    );

    const responseTime = Date.now() - startTime;

    // Simulate occasional slowness
    const status =
      responseTime > 3000
        ? ("degraded" as const)
        : ("operational" as const);

    return { status, responseTime };
  } catch (error) {
    return {
      status: "down",
      responseTime: Date.now() - startTime,
    };
  }
};
