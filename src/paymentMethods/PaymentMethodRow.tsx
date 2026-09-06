/* =========================================================
   PaymentMethodRow

   The single, reusable cell that every list (management,
   embedded tab, checkout) renders. This is what makes the
   "consistent throughout all checkout pages" requirement
   possible — there is only one row layout.
========================================================= */

import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { METHOD_LABEL, type UnifiedPaymentMethod } from "./types";
import {
  METHOD_BG,
  METHOD_COLOR,
  METHOD_ICON,
} from "./icons";

export interface PaymentMethodRowProps {
  method: UnifiedPaymentMethod;

  /** Right-side action buttons. Pass empty array for a read-only row. */
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
  deleting?: boolean;
  settingDefault?: boolean;

  /** Selection mode (checkout). Renders a radio instead of action buttons. */
  selected?: boolean;
  onSelect?: () => void;

  /** Hide the action row (e.g. when at MAX and "add" is the only action). */
  hideActions?: boolean;
}

function secondaryLine(method: UnifiedPaymentMethod): string {
  switch (method.type) {
    case "card":
      if (method.expiryMonth && method.expiryYear) {
        const mm = String(method.expiryMonth).padStart(2, "0");
        const yy = String(method.expiryYear).slice(-2);
        return `Card · Expires ${mm}/${yy}`;
      }
      return "Card";
    case "bank":
      return `Bank · ${method.bankName ?? ""} ••${
        method.accountNumberLast4 ?? ""
      }`;
    case "google_pay":
      return "Google Pay";
    case "apple_pay":
      return "Apple Pay";
  }
}

export const PaymentMethodRow: React.FC<PaymentMethodRowProps> = ({
  method,
  onEdit,
  onDelete,
  onSetDefault,
  deleting,
  settingDefault,
  selected,
  onSelect,
  hideActions,
}) => {
  const isSelectable = !!onSelect;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.info}
        activeOpacity={0.7}
        onPress={isSelectable ? onSelect : undefined}
        disabled={!isSelectable}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: METHOD_BG[method.type] },
          ]}
        >
          <Ionicons
            name={METHOD_ICON[method.type] as any}
            size={22}
            color={METHOD_COLOR[method.type]}
          />
        </View>

        <View style={styles.details}>
          <Text style={styles.label} numberOfLines={1}>
            {method.label}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText} numberOfLines={1}>
              {secondaryLine(method)}
            </Text>

            {method.lastFour && (
              <Text style={styles.lastFour}>
                •••• {method.lastFour}
              </Text>
            )}
          </View>

          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Ionicons
                name="checkmark-circle"
                size={12}
                color="#2E7D32"
              />
              <Text style={styles.defaultBadgeText}>
                Default
              </Text>
            </View>
          )}
        </View>

        {isSelectable ? (
          <Ionicons
            name={
              selected ? "radio-button-on" : "radio-button-off"
            }
            size={20}
            color={selected ? METHOD_COLOR.card : "#C0C0C0"}
          />
        ) : null}
      </TouchableOpacity>

      {!hideActions && !isSelectable && (
        <View style={styles.actions}>
          {onSetDefault && !method.isDefault && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSetDefault}
              disabled={settingDefault}
              hitSlop={6}
            >
              {settingDefault ? (
                <ActivityIndicator size="small" />
              ) : (
                <Ionicons
                  name="star-outline"
                  size={20}
                  color="#3F51B5"
                />
              )}
            </TouchableOpacity>
          )}

          {onEdit && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onEdit}
              hitSlop={6}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color="#3F51B5"
              />
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onDelete}
              disabled={deleting}
              hitSlop={6}
            >
              {deleting ? (
                <ActivityIndicator
                  size="small"
                  color="#E74C3C"
                />
              ) : (
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color="#E74C3C"
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0B1730",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  info: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: "#999",
  },
  lastFour: {
    fontSize: 12,
    color: "#666",
    fontFamily: "Courier New",
  },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E7D32",
    textTransform: "uppercase",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  actionButton: {
    padding: 6,
  },
});
