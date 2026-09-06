/* =========================================================
   PaymentMethodsList

   The reusable list view. Used by:
     - PaymentMethodManagementScreen (full screen)
     - PaymentsScreen methods tab (embedded)
     - Any future surface

   Internally owns the load / add / edit / delete / set-default
   state. Receives an onAdd and onEdit callback so the host
   can decide navigation (push a new screen, open a sheet,
   etc.).
========================================================= */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "../context/AuthContext";
import type { UnifiedPaymentMethod } from "./types";
import { MAX_METHODS } from "./types";
import {
  deleteMethod,
  listMethods,
  setDefault,
} from "./storage";
import { PaymentMethodRow } from "./PaymentMethodRow";

export interface PaymentMethodsListProps {
  /** Optional header shown above the list. */
  showHeader?: boolean;

  /** Hook for "add" — host decides how to present the add UI. */
  onAdd?: () => void;

  /** Hook for "edit" — host receives the method to prefill. */
  onEdit?: (method: UnifiedPaymentMethod) => void;
}

export const PaymentMethodsList: React.FC<
  PaymentMethodsListProps
> = ({ showHeader = true, onAdd, onEdit }) => {
  const { user } = useAuth();
  const [methods, setMethods] = useState<UnifiedPaymentMethod[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<
    string | null
  >(null);

  const userId = user?.idNumber;

  const load = useCallback(async () => {
    const resolved =
      userId || (await AsyncStorage.getItem("userId"));
    if (!resolved) {
      setMethods([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const list = await listMethods(resolved);
      setMethods(list);
    } catch (e) {
      console.error("load methods", e);
      Alert.alert("Error", "Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isAtLimit = methods.length >= MAX_METHODS;

  const confirmDelete = (
    method: UnifiedPaymentMethod
  ) => {
    Alert.alert(
      "Delete payment method",
      `Remove "${method.label}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const resolved =
              userId || (await AsyncStorage.getItem("userId"));
            if (!resolved) return;
            try {
              setDeleting(method.id);
              await deleteMethod(resolved, method.id);
              await load();
            } catch (e) {
              console.error("delete", e);
              Alert.alert("Error", "Failed to delete method");
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (id: string) => {
    const resolved =
      userId || (await AsyncStorage.getItem("userId"));
    if (!resolved) return;
    try {
      setSettingDefault(id);
      await setDefault(resolved, id);
      await load();
    } catch (e) {
      console.error("set default", e);
      Alert.alert("Error", "Failed to set default");
    } finally {
      setSettingDefault(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3F51B5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.flex1}>
              <Text style={styles.title}>Payment Methods</Text>
              <Text style={styles.subtitle}>
                Manage your saved methods
              </Text>
            </View>
            {onAdd && (
              <TouchableOpacity
                style={[
                  styles.addButton,
                  isAtLimit && styles.addButtonDisabled,
                ]}
                onPress={onAdd}
                disabled={isAtLimit}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.addButtonText}>
                  Add
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.counter}>
            {methods.length} of {MAX_METHODS} methods
          </Text>
        </View>
      )}

      {isAtLimit && (
        <View style={styles.limitBanner}>
          <Ionicons
            name="information-circle"
            size={20}
            color="#856404"
          />
          <Text style={styles.limitBannerText}>
            You've reached the maximum of {MAX_METHODS} payment methods. Delete one to add another.
          </Text>
        </View>
      )}

      {methods.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="card"
            size={48}
            color="#C0C0C0"
          />
          <Text style={styles.emptyTitle}>
            No Payment Methods
          </Text>
          <Text style={styles.emptySubtitle}>
            Add a method to use it for future payments.
          </Text>
          {onAdd && !isAtLimit && (
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={onAdd}
              activeOpacity={0.8}
            >
              <Ionicons
                name="add"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.emptyCtaText}>
                Add payment method
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {methods.map((m) => (
            <PaymentMethodRow
              key={m.id}
              method={m}
              onDelete={() => confirmDelete(m)}
              onEdit={
                onEdit ? () => onEdit(m) : undefined
              }
              onSetDefault={() => handleSetDefault(m.id)}
              deleting={deleting === m.id}
              settingDefault={settingDefault === m.id}
            />
          ))}

          <View style={styles.infoCard}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color="#4CAF50"
            />
            <Text style={styles.infoText}>
              Stored locally on this device. We never store full card numbers.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  flex1: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
  },
  counter: {
    fontSize: 12,
    color: "#3F51B5",
    fontWeight: "600",
    marginTop: 6,
  },
  addButton: {
    backgroundColor: "#003366",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  limitBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3CD",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE69C",
  },
  limitBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#856404",
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyCta: {
    backgroundColor: "#003366",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emptyCtaText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 8,
    alignItems: "flex-start",
    shadowColor: "#0B1730",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
    lineHeight: 18,
  },
});
