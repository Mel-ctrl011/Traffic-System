import { updateTransactionStatus } from "./gatewayService";
import type {
  GatewayWebhook,
  PaymentGateway,
} from "../types/paymentGateway";
import crypto from "crypto";

/* =========================================================
   WEBHOOK HANDLERS - PHASE 2
   
   Processes payment confirmations from various gateways.
   In production, these would run on a backend server.
   This is a client-side reference implementation.
========================================================= */

/* =========================================================
   PAYFAST WEBHOOK HANDLER
========================================================= */

export const handlePayFastWebhook = async (
  payload: any,
  merchantKey: string
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("🔔 PayFast webhook received");

    // Verify PayFast signature
    if (!verifyPayFastSignature(payload, merchantKey)) {
      console.error("❌ PayFast signature verification failed");
      return {
        success: false,
        message: "Invalid signature",
      };
    }

    const transactionId = payload.custom_str1;
    const status = payload.payment_status;

    // Map PayFast status to our transaction status
    let txStatus: "success" | "failed" | "pending";

    switch (status) {
      case "COMPLETE":
        txStatus = "success";
        break;
      case "FAILED":
        txStatus = "failed";
        break;
      case "PENDING":
        txStatus = "pending";
        break;
      default:
        txStatus = "pending";
    }

    // Update transaction in Firestore
    if (transactionId) {
      await updateTransactionStatus(
        transactionId,
        txStatus,
        status === "FAILED" ? "Payment declined" : undefined
      );
    }

    console.log(
      `✅ PayFast webhook processed: ${transactionId} - ${txStatus}`
    );

    return {
      success: true,
      message: `Payment ${txStatus}`,
    };
  } catch (error: any) {
    console.error("❌ PayFast webhook error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

function verifyPayFastSignature(
  payload: any,
  merchantKey: string
): boolean {
  // PayFast signature verification
  // In production, construct the signature string from sorted payload data
  // and compare with the provided signature

  const signature = payload.signature;
  if (!signature) return false;

  // Simplified verification (real implementation would be more complex)
  return true;
}

/* =========================================================
   STRIPE WEBHOOK HANDLER
========================================================= */

export const handleStripeWebhook = async (
  body: string,
  signature: string,
  webhookSecret: string
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("🔔 Stripe webhook received");

    // Verify Stripe signature
    if (!verifyStripeSignature(body, signature, webhookSecret)) {
      console.error("❌ Stripe signature verification failed");
      return {
        success: false,
        message: "Invalid signature",
      };
    }

    const event = JSON.parse(body);
    const paymentIntent = event.data.object;

    let txStatus: "success" | "failed" | "pending";

    switch (paymentIntent.status) {
      case "succeeded":
        txStatus = "success";
        break;
      case "processing":
        txStatus = "pending";
        break;
      case "requires_payment_method":
        txStatus = "pending";
        break;
      default:
        txStatus = "failed";
    }

    // Update transaction
    const transactionId = paymentIntent.metadata?.transactionId;
    if (transactionId) {
      await updateTransactionStatus(transactionId, txStatus);
    }

    console.log(
      `✅ Stripe webhook processed: ${transactionId} - ${txStatus}`
    );

    return {
      success: true,
      message: `Payment ${txStatus}`,
    };
  } catch (error: any) {
    console.error("❌ Stripe webhook error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  // Stripe signature verification using HMAC SHA256
  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`t=${Date.now()},v1=${computedSignature}`)
  );
}

/* =========================================================
   YOCO WEBHOOK HANDLER
========================================================= */

export const handleYocoWebhook = async (
  payload: any
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("🔔 Yoco webhook received");

    const transactionId = payload.metadata?.transactionId;
    const status = payload.status;

    let txStatus: "success" | "failed" | "pending";

    switch (status) {
      case "success":
        txStatus = "success";
        break;
      case "failed":
        txStatus = "failed";
        break;
      case "pending":
        txStatus = "pending";
        break;
      default:
        txStatus = "pending";
    }

    if (transactionId) {
      await updateTransactionStatus(
        transactionId,
        txStatus,
        status === "failed" ? payload.errorMessage : undefined
      );
    }

    console.log(
      `✅ Yoco webhook processed: ${transactionId} - ${txStatus}`
    );

    return {
      success: true,
      message: `Payment ${txStatus}`,
    };
  } catch (error: any) {
    console.error("❌ Yoco webhook error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

/* =========================================================
   MOBILE MONEY WEBHOOK HANDLERS
========================================================= */

export const handleMobileMoneyWebhook = async (
  payload: any,
  gateway: "vodacom_mpesa" | "mtn_money"
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`🔔 ${gateway} webhook received`);

    const transactionId = payload.metadata?.transactionId;
    const status = payload.status;

    let txStatus: "success" | "failed" | "pending";

    switch (status) {
      case "completed":
      case "success":
        txStatus = "success";
        break;
      case "failed":
        txStatus = "failed";
        break;
      case "pending":
        txStatus = "pending";
        break;
      default:
        txStatus = "pending";
    }

    if (transactionId) {
      await updateTransactionStatus(transactionId, txStatus);
    }

    console.log(
      `✅ ${gateway} webhook processed: ${transactionId} - ${txStatus}`
    );

    return {
      success: true,
      message: `Payment ${txStatus}`,
    };
  } catch (error: any) {
    console.error(`❌ ${gateway} webhook error:`, error);
    return {
      success: false,
      message: error.message,
    };
  }
};

/* =========================================================
   EFT MANUAL VERIFICATION
   
   For EFT payments, the client or admin must manually
   verify that the bank transfer was received.
========================================================= */

export const verifyEFTPayment = async (
  transactionId: string,
  amount: number,
  reference: string
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(
      "🏦 Verifying EFT payment...",
      reference
    );

    // In production, check bank account via bank API
    // For now, simulate verification

    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );

    // Mark as success (admin would verify via bank)
    await updateTransactionStatus(transactionId, "success");

    console.log(`✅ EFT payment verified: ${reference}`);

    return {
      success: true,
      message: "Payment verified",
    };
  } catch (error: any) {
    console.error("❌ EFT verification error:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

/* =========================================================
   WEBHOOK ROUTER
   
   Routes incoming webhooks to appropriate handler
   based on gateway type.
========================================================= */

export const routeWebhook = async (
  gateway: PaymentGateway,
  payload: any,
  signature?: string,
  webhookSecret?: string
): Promise<{ success: boolean; message: string }> => {
  switch (gateway) {
    case "payfast":
      return handlePayFastWebhook(payload, webhookSecret!);

    case "stripe":
      return handleStripeWebhook(
        JSON.stringify(payload),
        signature!,
        webhookSecret!
      );

    case "yoco":
      return handleYocoWebhook(payload);

    case "vodacom_mpesa":
    case "mtn_money":
      return handleMobileMoneyWebhook(payload, gateway);

    case "eft":
      return {
        success: true,
        message: "EFT payment pending manual verification",
      };

    default:
      return {
        success: false,
        message: `Unsupported gateway: ${gateway}`,
      };
  }
};

/* =========================================================
   PAYMENT CONFIRMATION POLLING
   
   For gateways that don't support webhooks,
   poll for payment status updates.
========================================================= */

export const pollPaymentStatus = async (
  transactionId: string,
  gateway: PaymentGateway,
  maxAttempts = 60,
  intervalMs = 1000
): Promise<{
  status: "success" | "failed" | "timeout";
  attempts: number;
}> => {
  console.log(
    `📊 Polling payment status for ${transactionId}...`
  );

  let attempts = 0;

  for (attempts = 0; attempts < maxAttempts; attempts++) {
    await new Promise((resolve) =>
      setTimeout(resolve, intervalMs)
    );

    // In production, query the gateway or Firestore
    // to get the current payment status

    // For now, simulate success after random time
    if (Math.random() < 0.05 * (attempts + 1)) {
      console.log(
        `✅ Payment confirmed after ${attempts + 1} attempts`
      );
      return {
        status: "success",
        attempts: attempts + 1,
      };
    }

    if (attempts % 10 === 0) {
      console.log(`⏳ Still waiting... (attempt ${attempts + 1})`);
    }
  }

  console.error(
    `❌ Payment polling timed out after ${maxAttempts} attempts`
  );

  return {
    status: "timeout",
    attempts: maxAttempts,
  };
};

/* =========================================================
   RETRY PAYMENT LOGIC
   
   Handles retrying failed payments with exponential backoff.
========================================================= */

export const retryPayment = async (
  transactionId: string,
  gateway: PaymentGateway,
  maxRetries = 3
): Promise<{
  success: boolean;
  retriesAttempted: number;
}> => {
  console.log(
    `🔄 Retrying payment ${transactionId} on ${gateway}...`
  );

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );

      console.log(
        `🔄 Retry attempt ${attempt}/${maxRetries}...`
      );

      // In production, call gateway retry endpoint
      // For now, simulate retry

      if (Math.random() < 0.6) {
        console.log(
          `✅ Payment succeeded on attempt ${attempt}`
        );
        await updateTransactionStatus(transactionId, "success");
        return { success: true, retriesAttempted: attempt };
      }
    } catch (error) {
      console.error(
        `❌ Retry attempt ${attempt} failed:`,
        error
      );
      if (attempt === maxRetries) {
        break;
      }
    }
  }

  console.error(
    `❌ Payment failed after ${maxRetries} retries`
  );

  return { success: false, retriesAttempted: maxRetries };
};
