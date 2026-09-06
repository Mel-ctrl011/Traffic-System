/* =========================================================
   Add / Edit Payment Method Screen

   Two-step flow inside one screen (state-driven):
     1. Type tiles (Card / Google Pay / Apple Pay / Bank)
     2. Per-type form

   Edit reuses the same screen with an `existing` param to
   pre-fill and skip step 1.
========================================================= */

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "../context/AuthContext";
import {
  addMethod,
  listMethods,
  updateMethod,
} from "./storage";
import type {
  AddMethodInput,
  MethodType,
  UnifiedPaymentMethod,
} from "./types";
import { MAX_METHODS, METHOD_LABEL } from "./types";
import {
  METHOD_BG,
  METHOD_COLOR,
  METHOD_ICON,
} from "./icons";

interface RouteParams {
  existing?: UnifiedPaymentMethod;
}

const TYPES: { type: MethodType; iconColor: string }[] = [
  { type: "card", iconColor: METHOD_COLOR.card },
  { type: "google_pay", iconColor: METHOD_COLOR.google_pay },
  { type: "apple_pay", iconColor: METHOD_COLOR.apple_pay },
  { type: "bank", iconColor: METHOD_COLOR.bank },
];

export function AddPaymentMethodScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params as RouteParams | undefined) ?? {};
  const { user } = useAuth();

  const editing = params.existing;
  const isEdit = !!editing;

  const [step, setStep] = useState<"type" | "form">(
    isEdit ? "form" : "type"
  );
  const [chosenType, setChosenType] = useState<MethodType>(
    editing?.type ?? "card"
  );

  const [saving, setSaving] = useState(false);

  /* --------- card fields --------- */
  const [cardholderName, setCardholderName] = useState(
    isEdit && editing!.type === "card"
      ? editing!.label
      : user?.fullName ?? ""
  );
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState(
    isEdit && editing!.type === "card"
      ? `${String(editing!.expiryMonth).padStart(2, "0")}/${String(
          editing!.expiryYear
        ).slice(-2)}`
      : ""
  );
  const [cvv, setCvv] = useState("");

  /* --------- bank fields --------- */
  const [bankName, setBankName] = useState(
    isEdit && editing!.type === "bank" ? editing!.bankName ?? "" : ""
  );
  const [accountHolder, setAccountHolder] = useState(
    isEdit && editing!.type === "bank" ? editing!.label.split(" (")[0] : user?.fullName ?? ""
  );
  const [accountNumber, setAccountNumber] = useState("");
  const [branchCode, setBranchCode] = useState(
    isEdit && editing!.type === "bank"
      ? editing!.branchCode ?? ""
      : ""
  );

  /* --------- wallet fields --------- */
  const [walletEmail, setWalletEmail] = useState(
    isEdit && (editing!.type === "google_pay" || editing!.type === "apple_pay")
      ? editing!.walletEmail ?? ""
      : ""
  );

  const atMax = useMemo(async () => {
    if (isEdit) return false;
    const userId =
      user?.idNumber || (await AsyncStorage.getItem("userId"));
    if (!userId) return false;
    const existing = await listMethods(userId);
    return existing.length >= MAX_METHODS;
  }, [user, isEdit]);

  const resolveUserId = async (): Promise<string | null> => {
    return (
      user?.idNumber || (await AsyncStorage.getItem("userId"))
    );
  };

  const onPickType = async (type: MethodType) => {
    if (!isEdit) {
      const limit = await atMax;
      if (limit) {
        Alert.alert(
          "Maximum reached",
          `You can store up to ${MAX_METHODS} payment methods. Delete one to add another.`
        );
        return;
      }
    }
    setChosenType(type);
    setStep("form");
  };

  const handleCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 19);
    const grouped = cleaned.replace(/(.{4})/g, "$1 ").trim();
    setCardNumber(grouped);
  };

  const handleExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length < 3) {
      setExpiry(cleaned);
    } else {
      setExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
    }
  };

  const luhnValid = (num: string): boolean => {
    const cleaned = num.replace(/\s/g, "");
    if (!/^\d{13,19}$/.test(cleaned)) return false;
    let sum = 0;
    let isEven = false;
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let d = parseInt(cleaned[i], 10);
      if (isEven) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  };

  const onSave = async () => {
    const userId = await resolveUserId();
    if (!userId) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && editing) {
        // Edit — only update label, expiry (cards), or holder/email.
        // Card number and account number are NOT re-entered on edit.
        if (editing.type === "card") {
          const [mm, yy] = (expiry || "").split("/");
          await updateMethod(userId, editing.id, {
            label: cardholderName.trim(),
            expiryMonth: mm ? parseInt(mm, 10) : editing.expiryMonth,
            expiryYear: yy
              ? 2000 + parseInt(yy, 10)
              : editing.expiryYear,
          });
        } else if (editing.type === "bank") {
          await updateMethod(userId, editing.id, {
            label: `${accountHolder.trim()} (${bankName.trim()})`,
            bankName: bankName.trim(),
            branchCode: branchCode.trim(),
          });
        } else {
          await updateMethod(userId, editing.id, {
            label: walletEmail.trim(),
            walletEmail: walletEmail.trim(),
          });
        }
        navigation.goBack();
        return;
      }

      // Add
      let input: AddMethodInput;

      if (chosenType === "card") {
        if (!cardholderName.trim()) {
          Alert.alert("Cardholder name required");
          return;
        }
        if (!luhnValid(cardNumber)) {
          Alert.alert("Invalid card number");
          return;
        }
        const [mm, yy] = expiry.split("/");
        if (!mm || !yy || +mm < 1 || +mm > 12) {
          Alert.alert("Invalid expiry date (MM/YY)");
          return;
        }
        const fullYear = 2000 + parseInt(yy, 10);
        const expDate = new Date(fullYear, parseInt(mm, 10), 0);
        if (expDate < new Date()) {
          Alert.alert("Card is expired");
          return;
        }
        if (cvv.length < 3) {
          Alert.alert("Invalid CVV");
          return;
        }
        input = {
          type: "card",
          cardholderName: cardholderName.trim(),
          cardNumber: cardNumber.replace(/\s/g, ""),
          expiryMonth: parseInt(mm, 10),
          expiryYear: fullYear,
        };
      } else if (chosenType === "bank") {
        if (!accountHolder.trim() || !bankName.trim()) {
          Alert.alert("Account holder and bank name required");
          return;
        }
        if (accountNumber.replace(/\D/g, "").length < 6) {
          Alert.alert("Invalid account number");
          return;
        }
        if (!branchCode.trim()) {
          Alert.alert("Branch code required");
          return;
        }
        input = {
          type: "bank",
          accountHolder: accountHolder.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.replace(/\s/g, ""),
          branchCode: branchCode.trim(),
        };
      } else {
        if (!/^\S+@\S+\.\S+$/.test(walletEmail.trim())) {
          Alert.alert("Invalid email address");
          return;
        }
        input = {
          type: chosenType,
          walletEmail: walletEmail.trim(),
        };
      }

      await addMethod(userId, input);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     RENDER — TYPE PICKER
  ========================================================= */

  if (step === "type" && !isEdit) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>PAYMENT METHODS</Text>
          <Text style={styles.title}>Choose a method</Text>
          <Text style={styles.subtitle}>
            Pick the type you'd like to add.
          </Text>
        </View>

        <View style={styles.tilesGrid}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.type}
              style={styles.tile}
              activeOpacity={0.8}
              onPress={() => onPickType(t.type)}
            >
              <View
                style={[
                  styles.tileIcon,
                  { backgroundColor: METHOD_BG[t.type] },
                ]}
              >
                <Ionicons
                  name={METHOD_ICON[t.type] as any}
                  size={28}
                  color={t.iconColor}
                />
              </View>
              <Text style={styles.tileLabel}>
                {METHOD_LABEL[t.type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  /* =========================================================
     RENDER — FORM
  ========================================================= */

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>
          {isEdit ? "EDIT" : "ADD"} PAYMENT METHOD
        </Text>
        <View style={styles.titleRow}>
          <Ionicons
            name={METHOD_ICON[chosenType] as any}
            size={20}
            color={METHOD_COLOR[chosenType]}
          />
          <Text style={styles.title}>
            {isEdit ? "Edit details" : METHOD_LABEL[chosenType]}
          </Text>
        </View>
      </View>

      {chosenType === "card" && (
        <View style={styles.section}>
          <Field
            label="CARDHOLDER NAME"
            value={cardholderName}
            onChangeText={setCardholderName}
            placeholder="John Doe"
            autoCapitalize="words"
          />
          <Field
            label="CARD NUMBER"
            value={cardNumber}
            onChangeText={handleCardNumber}
            placeholder="4242 4242 4242 4242"
            keyboardType="number-pad"
            maxLength={23}
          />
          <View style={styles.rowSplit}>
            <View style={styles.flex1}>
              <Field
                label="EXPIRY (MM/YY)"
                value={expiry}
                onChangeText={handleExpiry}
                placeholder="04/27"
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
            <View style={styles.gap} />
            <View style={styles.flex1}>
              <Field
                label="CVV"
                value={cvv}
                onChangeText={setCvv}
                placeholder="123"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>
        </View>
      )}

      {chosenType === "bank" && (
        <View style={styles.section}>
          <Field
            label="BANK NAME"
            value={bankName}
            onChangeText={setBankName}
            placeholder="Capitec"
          />
          <Field
            label="ACCOUNT HOLDER"
            value={accountHolder}
            onChangeText={setAccountHolder}
            placeholder="John Doe"
            autoCapitalize="words"
          />
          <Field
            label="ACCOUNT NUMBER"
            value={accountNumber}
            onChangeText={(t) =>
              setAccountNumber(t.replace(/\D/g, ""))
            }
            placeholder="1234567890"
            keyboardType="number-pad"
          />
          <Field
            label="BRANCH CODE"
            value={branchCode}
            onChangeText={(t) =>
              setBranchCode(t.replace(/\D/g, ""))
            }
            placeholder="470010"
            keyboardType="number-pad"
          />
        </View>
      )}

      {(chosenType === "google_pay" || chosenType === "apple_pay") && (
        <View style={styles.section}>
          <Field
            label="EMAIL LINKED TO WALLET"
            value={walletEmail}
            onChangeText={setWalletEmail}
            placeholder="you@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#3F51B5"
            />
            <Text style={styles.infoText}>
              We'll use this email to identify the wallet at checkout. We never store payment credentials.
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.saveButton,
          saving && styles.saveButtonDisabled,
        ]}
        onPress={onSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>
            {isEdit ? "Save changes" : "Add method"}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Your payment methods are stored securely on this device. See FIREBASE_MIGRATION.md for the cloud path.
      </Text>
    </ScrollView>
  );
}

/* =========================================================
   Reusable field
========================================================= */

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  keyboardType?: any;
  maxLength?: number;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
}

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  secureTextEntry,
  autoCapitalize,
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.fieldInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9AA3AD"
      keyboardType={keyboardType}
      maxLength={maxLength}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerBlock: {
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#777",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#003366",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  tilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    shadowColor: "#0B1730",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tileIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: "#777",
    marginBottom: 6,
  },
  fieldInput: {
    height: 46,
    borderWidth: 1,
    borderColor: "#E1E7EF",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#17212B",
    backgroundColor: "#FBFCFD",
  },
  rowSplit: {
    flexDirection: "row",
  },
  flex1: {
    flex: 1,
  },
  gap: {
    width: 12,
  },
  saveButton: {
    backgroundColor: "#003366",
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  disclaimer: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 16,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EEF0FB",
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#3F51B5",
    lineHeight: 17,
  },
});
