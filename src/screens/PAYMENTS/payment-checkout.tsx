import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  CardDetails,
  PaymentMethod,
  PaymentRequest,
  SavedCard,
} from "../../types/payment";
import {
  getSavedCards,
  processPayment,
} from "../../services/paymentService";
import { useAuth } from "../../context/AuthContext";
import type { UnifiedPaymentMethod } from "../../paymentMethods/types";
import {
  listMethods as listPaymentMethods,
} from "../../paymentMethods/firebaseAdapter";

interface CheckoutRouteParams {
  request: PaymentRequest;
  onSuccess: (sessionId: string) => void;
}

export default function PaymentCheckoutScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const params = route.params as CheckoutRouteParams | undefined;
  const { user } = useAuth();

  const request = params?.request;
  const onSuccess = params?.onSuccess;

  // Guard: if no request was passed, the screen was opened incorrectly
  if (!request || !request.id) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          backgroundColor: "#F5F5F7",
        }}
      >
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color="#C62828"
        />
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#222",
            marginTop: 12,
            marginBottom: 6,
          }}
        >
          Payment Request Missing
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: "#666",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          We couldn't load the payment details.
          Please go back and try again.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            backgroundColor: "#3F51B5",
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "700",
            }}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethod>("card");
  const [savedMethods, setSavedMethods] = useState<UnifiedPaymentMethod[]>(
    []
  );
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(
    null
  );

  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(true);

  // Load saved payment methods
  useEffect(() => {
    const loadMethods = async () => {
      const resolvedUserId =
        user?.idNumber ||
        (await AsyncStorage.getItem("userId"));

      if (!resolvedUserId) {
        setLoadingMethods(false);
        return;
      }

      try {
        setLoadingMethods(true);
        const methods = await listPaymentMethods(resolvedUserId);
        setSavedMethods(methods);
        if (methods.length > 0) {
          // Pre-select the default method, or first if none
          const defaultMethod = methods.find((m) => m.isDefault);
          setSelectedMethodId(defaultMethod?.id ?? methods[0]?.id ?? null);
        }
      } catch (error) {
        console.error("Failed to load saved methods:", error);
      } finally {
        setLoadingMethods(false);
      }
    };

    loadMethods();
  }, [user?.idNumber]);

  const handleCardNumberChange = (text: string) => {
    // Format: XXXX XXXX XXXX XXXX
    const cleaned = text.replace(/\D/g, "");
    const formatted = cleaned
      .replace(/(\d{4})/g, "$1 ")
      .trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (text: string) => {
    // Format: MM/YY
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      const formatted =
        cleaned.substring(0, 2) +
        "/" +
        cleaned.substring(2, 4);
      setExpiryDate(formatted);
    } else {
      setExpiryDate(cleaned);
    }
  };

  const validateCardDetails = (): boolean => {
    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 13) {
      Alert.alert("Invalid Card Number");
      return false;
    }

    if (!cardholderName.trim()) {
      Alert.alert("Cardholder Name Required");
      return false;
    }

    if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
      Alert.alert("Invalid Expiry Date");
      return false;
    }

    if (!cvv || cvv.length < 3) {
      Alert.alert("Invalid CVV");
      return false;
    }

    return true;
  };

  const handlePayment = async () => {
    const resolvedUserId =
      user?.idNumber ||
      (await AsyncStorage.getItem("userId"));

    if (!resolvedUserId) {
      Alert.alert("User not authenticated");
      return;
    }

    try {
      setLoading(true);

      let cardDetails: CardDetails;

      if (selectedMethod === "saved" && selectedMethodId) {
        const method = savedMethods.find(
          (m) => m.id === selectedMethodId
        );
        if (!method) {
          throw new Error("Payment method not found");
        }

        // Mock card details from saved method (card only)
        if (method.type === "card") {
          cardDetails = {
            cardNumber: `****${method.lastFour}`,
            cardholderName: method.label,
            expiryDate: `${String(method.expiryMonth).padStart(
              2,
              "0"
            )}/${String(method.expiryYear).slice(-2)}`,
            cvv: "***",
          };
        } else {
          // For non-card methods, we still need to pass something to processPayment
          // but it will ignore non-card details in the current implementation
          cardDetails = {
            cardNumber: "00000000000000",
            cardholderName: method.label,
            expiryDate: "01/25",
            cvv: "000",
          };
        }
      } else {
        if (!validateCardDetails()) {
          setLoading(false);
          return;
        }

        cardDetails = {
          cardNumber: cardNumber.replace(/\s/g, ""),
          cardholderName: cardholderName.trim(),
          expiryDate: expiryDate,
          cvv: cvv,
        };
      }

      const session = await processPayment({
        userId: resolvedUserId,
        requestId: request.id,
        cardDetails,
        saveCard:
          selectedMethod === "card" && saveCard,
      });

      // Navigate to verification screen
      navigation.navigate("PaymentVerification", {
        session,
        onSuccess,
      });
    } catch (error: any) {
      Alert.alert(
        "Payment Failed",
        error.message ||
          "An error occurred processing your payment."
      );
      console.error("Payment error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#3F51B5"
          />
        </TouchableOpacity>
        <Text style={styles.title}>Payment Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ORDER SUMMARY */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Amount Due</Text>
        <Text style={styles.summaryAmount}>
          R {request.amount.toFixed(2)}
        </Text>
        <Text style={styles.summaryDescription}>
          {request.description}
        </Text>
      </View>

      {/* PAYMENT METHOD SELECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>

        <TouchableOpacity
          style={[
            styles.methodButton,
            selectedMethod === "card" &&
              styles.methodButtonActive,
          ]}
          onPress={() => setSelectedMethod("card")}
        >
          <Ionicons
            name={
              selectedMethod === "card"
                ? "radio-button-on"
                : "radio-button-off"
            }
            size={20}
            color={
              selectedMethod === "card"
                ? "#3F51B5"
                : "#C0C0C0"
            }
          />
          <Text style={styles.methodLabel}>Credit/Debit Card</Text>
        </TouchableOpacity>

        {!loadingMethods && savedMethods.length > 0 && (
          <>
            <TouchableOpacity
              style={[
                styles.methodButton,
                selectedMethod === "saved" &&
                  styles.methodButtonActive,
              ]}
              onPress={() => setSelectedMethod("saved")}
            >
              <Ionicons
                name={
                  selectedMethod === "saved"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color={
                  selectedMethod === "saved"
                    ? "#3F51B5"
                    : "#C0C0C0"
                }
              />
              <Text style={styles.methodLabel}>
                Saved Methods ({savedMethods.length})
              </Text>
            </TouchableOpacity>

            {selectedMethod === "saved" && (
              <View style={styles.savedMethodsContainer}>
                {savedMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.methodOption,
                      selectedMethodId === method.id &&
                        styles.methodOptionSelected,
                    ]}
                    onPress={() => setSelectedMethodId(method.id)}
                    disabled={loadingMethods}
                  >
                    <View style={styles.methodIconContainer}>
                      <Ionicons
                        name={
                          method.type === "card"
                            ? "card"
                            : method.type === "google_pay"
                              ? "logo-google"
                              : method.type === "apple_pay"
                                ? "logo-apple"
                                : "business"
                        } as any
                        size={20}
                        color="#3F51B5"
                      />
                    </View>
                    <View style={styles.methodDetails}>
                      <Text style={styles.methodName}>
                        {method.label}
                      </Text>
                      {method.type === "card" && method.lastFour && (
                        <Text style={styles.methodLastFour}>
                          •••• {method.lastFour}
                        </Text>
                      )}
                      {method.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Ionicons
                            name="checkmark-circle"
                            size={12}
                            color="#4CAF50"
                          />
                          <Text style={styles.defaultBadgeText}>
                            Default
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {/* CARD INPUT FORM (only for new card) */}
      {selectedMethod === "card" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Details</Text>

          <TextInput
            style={styles.input}
            placeholder="Card Number"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={cardNumber}
            onChangeText={handleCardNumberChange}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Cardholder Name"
            placeholderTextColor="#999"
            value={cardholderName}
            onChangeText={setCardholderName}
            editable={!loading}
          />

          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="MM/YY"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={5}
              value={expiryDate}
              onChangeText={handleExpiryChange}
              editable={!loading}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="CVV"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={4}
              value={cvv}
              onChangeText={setCvv}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setSaveCard(!saveCard)}
              disabled={loading}
            >
              <Ionicons
                name={
                  saveCard
                    ? "checkbox"
                    : "checkbox-outline"
                }
                size={20}
                color="#3F51B5"
              />
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>
              Save this method for future payments
            </Text>
          </View>
        </View>
      )}

      {/* PAY BUTTON */}
      <TouchableOpacity
        style={[
          styles.payButton,
          loading && styles.payButtonDisabled,
        ]}
        onPress={handlePayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />
        ) : (
          <>
            <Ionicons
              name="lock-closed"
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.payButtonText}>
              Pay R {request.amount.toFixed(2)}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* SECURITY INFO */}
      <View style={styles.securityInfo}>
        <Ionicons
          name="shield-checkmark"
          size={14}
          color="#4CAF50"
        />
        <Text style={styles.securityText}>
          Your payment is secure and encrypted
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  summaryLabel: {
    fontSize: 12,
    color: "#777",
  },

  summaryAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: "#003366",
  },

  summaryDescription: {
    fontSize: 12,
    color: "#666",
  },

  methodButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  methodButtonActive: {
    backgroundColor: "#EEF0FB",
  },

  methodLabel: {
    fontSize: 13,
    color: "#666",
  },

  savedMethodsContainer: {
    marginTop: 12,
  },

  methodOption: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  methodOptionSelected: {
    backgroundColor: "#EEF0FB",
  },

  methodIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  methodDetails: {
    flex: 1,
  },

  methodName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },

  methodLastFour: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },

  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },

  defaultBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4CAF50",
    textTransform: "uppercase",
  },

  rowInputs: {
    flexDirection: "row",
  },

  halfInput: {
    flex: 1,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E1E7EF",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#17212B",
    backgroundColor: "#FBFCFD",
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#3F51B5",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxLabel: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },

  payButton: {
    backgroundColor: "#003366",
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  payButtonDisabled: {
    opacity: 0.6,
  },

  payButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  securityInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  securityText: {
    fontSize: 12,
    color: "#666",
  },
});