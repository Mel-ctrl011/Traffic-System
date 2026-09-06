import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import PaymentHistoryScreen from "./payment-history";
import { PaymentMethodsList } from "../../paymentMethods";

/* =========================================================
   TABS
========================================================= */

type Tab = "history" | "methods";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "history", label: "History", icon: "receipt-outline" },
  { id: "methods", label: "Payment Methods", icon: "card-outline" },
];

/* =========================================================
   SCREEN
========================================================= */

export default function PaymentsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("history");

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* ---- Tab bar ---- */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabButton,
                isActive && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon as any}
                size={15}
                color={isActive ? "#0B4F8A" : "#66737F"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ---- Content ---- */}
      <View style={styles.content}>
        {activeTab === "history" ? (
          <PaymentHistoryScreen hideBack />
        ) : (
          <PaymentMethodsList
            showHeader={false}
            onAdd={() => {
              // Embedded tab is read-only; send user to the management screen
              alert(
                "Use the 'Payment Methods' screen from the main menu to add/edit methods."
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F5F7",
  },

  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D9E0E6",
  },

  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    gap: 7,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#0B4F8A",
  },

  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#66737F",
  },

  tabLabelActive: {
    color: "#0B4F8A",
    fontWeight: "700",
  },

  content: {
    flex: 1,
  },
});