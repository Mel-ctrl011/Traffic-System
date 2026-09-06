/* =========================================================
   paymentMethods barrel

   Consumers should import from this file, not directly
   from storage.ts / firebaseAdapter.ts. That way the
   "swap to Firestore" step is one line.
========================================================= */

export * from "./types";
export * from "./icons";

export * as methods from "./firebaseAdapter";

export { PaymentMethodRow } from "./PaymentMethodRow";
export { PaymentMethodsList } from "./PaymentMethodsList";
export { AddPaymentMethodScreen } from "./AddPaymentMethodScreen";
