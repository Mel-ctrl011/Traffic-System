import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase";
import {
  addMethod as addFirebasePaymentMethod,
  listMethods as listFirebasePaymentMethods,
} from "../paymentMethods/firebaseAdapter";

import type {
  CardDetails,
  PaymentMethod,
  PaymentRecord,
  PaymentRequest,
  PaymentSession,
  PaymentSource,
  PaymentStatus,
  SavedCard,
} from "../types/payment";

/* =========================================================
   CREATE PAYMENT REQUEST

   Initiates a new payment request for a fine, appointment,
   or other transaction. Stores in Firestore with expiry.
========================================================= */

export const createPaymentRequest = async ({
  userId,
  amount,
  description,
  source,
  sourceId,
}: {
  userId: string;
  amount: number;
  description: string;
  source: PaymentSource;
  sourceId?: string;
}): Promise<PaymentRequest> => {
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + 30 * 60 * 1000
  );

  const requestData = {
    userId,
    amount,
    currency: "ZAR",
    description,
    source,
    sourceId,
    status: "pending" as PaymentStatus,
    createdAt: serverTimestamp(),
    expiresAt: expiresAt.toISOString(),
  };

  const docRef = await addDoc(
    collection(db, "paymentRequests"),
    requestData
  );

  return {
    id: docRef.id,
    amount,
    currency: "ZAR",
    description,
    source,
    sourceId,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
};

/* =========================================================
   PROCESS PAYMENT

   Simulates card processing:
   - Validates card details
   - Simulates a 2-3 second "processing" delay
   - Returns success ~90% of the time
   - Creates payment record in Firestore
========================================================= */

export const processPayment = async ({
  userId,
  requestId,
  cardDetails,
  saveCard,
}: {
  userId: string;
  requestId: string;
  cardDetails: CardDetails;
  saveCard?: boolean;
}): Promise<PaymentSession> => {
  // Validate card number (basic Luhn check)
  const isMaskedSavedCard = /^\*{4}\d{4}$/.test(cardDetails.cardNumber);
  if (!isMaskedSavedCard && !isValidCardNumber(cardDetails.cardNumber)) {
    throw new Error("Invalid card number");
  }

  // Get the payment request
  const requestDoc = await doc(
    db,
    "paymentRequests",
    requestId
  );
  const requestQuery = query(
    collection(db, "paymentRequests"),
    where("__name__", "==", requestId)
  );
  const requestSnapshot = await getDocs(requestQuery);

  if (requestSnapshot.empty) {
    throw new Error("Payment request not found");
  }

  const request = requestSnapshot.docs[0].data();

  // Simulate processing delay
  await new Promise((resolve) =>
    setTimeout(resolve, Math.random() * 2000 + 1000)
  );

  // Simulate success (90% success rate)
  const success = Math.random() < 0.9;

  if (!success) {
    throw new Error(
      "Payment declined. Please check your card details."
    );
  }

  // Generate receipt and verification code
  const receiptId = generateReceiptId();
  const verificationCode = generateVerificationCode();

  // Create payment record
  const paymentRecord = {
    userId,
    requestId,
    amount: request.amount,
    currency: request.currency,
    description: request.description,
    source: request.source,
    sourceId: request.sourceId,
    method: "card" as PaymentMethod,
    status: "success" as PaymentStatus,
    cardUsed: `${cardDetails.cardholderName} (${cardDetails.cardNumber.slice(
      -4
    )})`,
    receiptId,
    verificationCode,
    paidAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  const recordRef = await addDoc(
    collection(db, "paymentHistory"),
    paymentRecord
  );

  // Save card if requested
  if (saveCard) {
    const cardId = await saveCardDetails(
      userId,
      cardDetails
    );

    // Link payment to saved card
    await updateDoc(doc(db, "paymentHistory", recordRef.id), {
      savedCardId: cardId,
    });
  }

  // Update payment request status
  await updateDoc(
    doc(db, "paymentRequests", requestId),
    {
      status: "success",
      receiptId,
      completedAt: serverTimestamp(),
    }
  );

  return {
    sessionId: recordRef.id,
    request: {
      id: requestId,
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      source: request.source,
      sourceId: request.sourceId,
      createdAt: request.createdAt.toDate?.().toISOString() || new Date().toISOString(),
      expiresAt: request.expiresAt,
    },
    status: "success",
    cardDetails,
    verificationCode,
    completedAt: new Date().toISOString(),
    receiptId,
  };
};

/* =========================================================
   SAVE CARD DETAILS

   Stores a credit card for future use. In a real app,
   this would tokenize the card via a payment gateway.
========================================================= */

export const saveCardDetails = async (
  userId: string,
  cardDetails: CardDetails
): Promise<string> => {
  const [month, year] = cardDetails.expiryDate
    .split("/")
    .map(Number);

  const savedMethod = await addFirebasePaymentMethod(userId, {
    type: "card",
    cardholderName: cardDetails.cardholderName,
    cardNumber: cardDetails.cardNumber,
    expiryMonth: month,
    expiryYear: 2000 + year,
    isDefault: false,
  });

  return savedMethod.id;
};

/* =========================================================
   GET SAVED CARDS

   Retrieves all saved payment methods for a user.
========================================================= */

export const getSavedCards = async (
  userId: string
): Promise<SavedCard[]> => {
  const methods = await listFirebasePaymentMethods(userId);

  return methods
    .filter(
      (method): method is typeof method & {
        type: "card";
        lastFour: string;
        expiryMonth: number;
        expiryYear: number;
      } =>
        method.type === "card" &&
        !!method.lastFour &&
        !!method.expiryMonth &&
        !!method.expiryYear
    )
    .map((method) => ({
      id: method.id,
      cardNumber: `****${method.lastFour}`,
      cardholderName: method.label,
      expiryDate: `${String(method.expiryMonth).padStart(2, "0")}/${String(
        method.expiryYear
      ).slice(-2)}`,
      cvv: "***",
      lastFourDigits: method.lastFour,
      expiryMonth: method.expiryMonth,
      expiryYear: method.expiryYear,
      isDefault: method.isDefault,
      createdAt: method.createdAt,
    }));
};

/* =========================================================
   DELETE SAVED CARD

   Removes a saved payment method.
========================================================= */

export const deleteSavedCard = async (
  cardId: string
): Promise<void> => {
  await deleteDoc(doc(db, "savedCards", cardId));
};

/* =========================================================
   GET PAYMENT HISTORY

   Retrieves all payments for a user, optionally filtered
   by source (fines, appointments, etc).
========================================================= */

export const getPaymentHistory = async (
  userId: string,
  source?: PaymentSource
): Promise<PaymentRecord[]> => {
  let q;

  if (source) {
    q = query(
      collection(db, "paymentHistory"),
      where("userId", "==", userId),
      where("source", "==", source)
    );
  } else {
    q = query(
      collection(db, "paymentHistory"),
      where("userId", "==", userId)
    );
  }

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<PaymentRecord, "id">),
    }))
    .sort(
      (a, b) =>
        new Date(b.paidAt).getTime() -
        new Date(a.paidAt).getTime()
    );
};

/* =========================================================
   GET PAYMENT RECORD

   Retrieves details of a single payment.
========================================================= */

export const getPaymentRecord = async (
  paymentId: string
): Promise<PaymentRecord | null> => {
  const docSnap = await getDocs(
    query(
      collection(db, "paymentHistory"),
      where("__name__", "==", paymentId)
    )
  );

  if (docSnap.empty) return null;

  const data = docSnap.docs[0].data();
  return {
    id: paymentId,
    ...(data as Omit<PaymentRecord, "id">),
  };
};

/* =========================================================
   HELPERS
========================================================= */

/**
 * Basic Luhn algorithm validation for card numbers.
 * This is for mocking only; real validation happens server-side.
 */
function isValidCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, "");

  if (!/^\d{13,19}$/.test(cleaned)) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

function generateReceiptId(): string {
  return `RCP-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)
    .toUpperCase()}`;
}

function generateVerificationCode(): string {
  return Math.random()
    .toString()
    .substring(2, 8)
    .padEnd(6, "0");
}
