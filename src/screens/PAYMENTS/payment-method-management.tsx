/* =========================================================
   Payment Method Management — thin wrapper

   The list / add / edit / delete UI is owned by the
   paymentMethods module. This screen just bridges the
   navigation calls.
========================================================= */

import React from "react";
import { useNavigation } from "@react-navigation/native";
import { PaymentMethodsList } from "../../paymentMethods";

export default function PaymentMethodManagementScreen() {
  const navigation = useNavigation<any>();

  return (
    <PaymentMethodsList
      onAdd={() => navigation.navigate("AddPaymentMethod")}
      onEdit={(method) =>
        navigation.navigate("AddPaymentMethod", {
          existing: method,
        })
      }
    />
  );
}
