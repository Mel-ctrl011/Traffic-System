/* =========================================================
   Saved Payment Methods — thin wrapper

   This screen used to own its own data layer + UI. It now
   delegates to the paymentMethods module so card / wallet /
   bank methods are all managed the same way.
========================================================= */

import React from "react";
import { useNavigation } from "@react-navigation/native";
import { PaymentMethodsList } from "../../paymentMethods";

export default function SavedPaymentMethodsScreen() {
  const navigation = useNavigation<any>();

  return (
    <PaymentMethodsList
      showHeader={false}
      onAdd={() => navigation.navigate("AddPaymentMethod")}
      onEdit={(method) =>
        navigation.navigate("AddPaymentMethod", {
          existing: method,
        })
      }
    />
  );
}
