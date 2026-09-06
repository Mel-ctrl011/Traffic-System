/* =========================================================
   Add / Edit Payment Method — screen wrapper

   Thin wrapper that just re-exports the module screen so
   the navigator can import a screen from the screens/
   folder. Everything lives in src/paymentMethods/.
========================================================= */

import React from "react";
import { AddPaymentMethodScreen } from "../../paymentMethods";

export default function AddPaymentMethodScreenWrapper() {
  return <AddPaymentMethodScreen />;
}
