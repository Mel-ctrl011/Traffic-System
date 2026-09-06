import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  withDelay,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import type { PaymentSession } from "../../types/payment";

interface VerificationRouteParams {
  session: PaymentSession;
  onSuccess?: (sessionId: string) => void;
}

export default function PaymentVerificationScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const params = route.params as VerificationRouteParams | undefined;

  // Guard: prevent crash if session is undefined
  if (!params?.session) {
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
          Session Error
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: "#666",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          Payment session not found. Please try again.
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

  const { session, onSuccess } = params;

  const [displayCode, setDisplayCode] = useState("");
  const [codeIndex, setCodeIndex] = useState(0);

  // Animated values
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  // Animate check mark
  useEffect(() => {
    checkOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.elastic(1.2)) })
    );
    checkScale.value = withDelay(
      400,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.elastic(1.2)),
      })
    );
  }, [checkOpacity, checkScale]);

  // Animate verification code reveal
  useEffect(() => {
    if (!session.verificationCode) return;

    const interval = setInterval(() => {
      setCodeIndex((prev) => {
        if (prev < session.verificationCode!.length) {
          const newIndex = prev + 1;
          setDisplayCode(
            session.verificationCode!.substring(0, newIndex)
          );
          return newIndex;
        }
        return prev;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [session.verificationCode]);

  const handleContinue = () => {
    if (onSuccess) {
      onSuccess(session.sessionId);
    } else {
      navigation.goBack();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* CHECKMARK ANIMATION */}
      <View style={styles.checkmarkContainer}>
        <Animated.View
          style={[styles.checkmark, checkAnimStyle]}
        >
          <Ionicons
            name="checkmark-circle"
            size={80}
            color="#4CAF50"
          />
        </Animated.View>
      </View>

      {/* SUCCESS MESSAGE */}
      <Text style={styles.successTitle}>Payment Successful</Text>
      <Text style={styles.successSubtitle}>
        Your payment has been processed
      </Text>

      {/* RECEIPT CARD */}
      <View style={styles.receiptCard}>
        {/* AMOUNT */}
        <View style={styles.receiptSection}>
          <Text style={styles.receiptLabel}>Amount Paid</Text>
          <Text style={styles.receiptAmount}>
            R {session.request.amount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.receiptDivider} />

        {/* DETAILS */}
        <View style={styles.receiptDetailsGrid}>
          <View style={styles.receiptDetail}>
            <Text style={styles.receiptDetailLabel}>
              Description
            </Text>
            <Text style={styles.receiptDetailValue}>
              {session.request.description}
            </Text>
          </View>

          <View style={styles.receiptDetail}>
            <Text style={styles.receiptDetailLabel}>
              Payment Method
            </Text>
            <Text style={styles.receiptDetailValue}>
              {session.cardDetails?.cardholderName}
            </Text>
          </View>

          {session.receiptId && (
            <View style={styles.receiptDetail}>
              <Text style={styles.receiptDetailLabel}>
                Receipt ID
              </Text>
              <Text style={styles.receiptDetailValue}>
                {session.receiptId}
              </Text>
            </View>
          )}

          <View style={styles.receiptDetail}>
            <Text style={styles.receiptDetailLabel}>
              Date & Time
            </Text>
            <Text style={styles.receiptDetailValue}>
              {new Date(
                session.completedAt || ""
              ).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.receiptDivider} />

        {/* VERIFICATION CODE */}
        <View style={styles.verificationSection}>
          <Text style={styles.verificationLabel}>
            Verification Code
          </Text>
          <View style={styles.codeContainer}>
            <Text style={styles.verificationCode}>
              {displayCode}
              {codeIndex < (session.verificationCode?.length || 0) && (
                <Text style={styles.codeCursor}>|</Text>
              )}
            </Text>
          </View>
          <Text style={styles.verificationHint}>
            Keep this code for your records
          </Text>
        </View>
      </View>

      {/* ACTIONS */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleContinue}
        >
          <Text style={styles.primaryButtonText}>
            {onSuccess ? "Continue" : "Back"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton}>
          <Ionicons
            name="download"
            size={18}
            color="#3F51B5"
          />
          <Text style={styles.secondaryButtonText}>
            Download Receipt
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton}>
          <Ionicons name="mail" size={18} color="#3F51B5" />
          <Text style={styles.secondaryButtonText}>
            Email Receipt
          </Text>
        </TouchableOpacity>
      </View>

      {/* FOOTER NOTE */}
      <View style={styles.footerNote}>
        <Ionicons
          name="information-circle"
          size={16}
          color="#999"
        />
        <Text style={styles.footerText}>
          A confirmation email has been sent to your registered
          email address
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
    paddingHorizontal: 16,
    paddingVertical: 24,
  },

  checkmarkContainer: {
    alignItems: "center",
    marginBottom: 24,
    minHeight: 100,
    justifyContent: "center",
  },

  checkmark: {
    shadowColor: "#4CAF50",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 4,
  },

  successSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },

  receiptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,

    shadowColor: "#0B1730",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  receiptSection: {
    alignItems: "center",
    paddingVertical: 12,
  },

  receiptLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#999",
    marginBottom: 4,
  },

  receiptAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#4CAF50",
  },

  receiptDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },

  receiptDetailsGrid: {
    gap: 12,
  },

  receiptDetail: {
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F7",
    paddingBottom: 12,
  },

  receiptDetailLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  receiptDetailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },

  verificationSection: {
    alignItems: "center",
    paddingTop: 12,
  },

  verificationLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  codeContainer: {
    backgroundColor: "#F5F5F7",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    minWidth: 180,
    alignItems: "center",
  },

  verificationCode: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3F51B5",
    fontFamily: "Courier New",
    letterSpacing: 2,
  },

  codeCursor: {
    fontSize: 20,
    color: "#3F51B5",
    opacity: 0.5,
    marginLeft: -2,
  },

  verificationHint: {
    fontSize: 11,
    color: "#999",
    fontStyle: "italic",
  },

  actionsContainer: {
    gap: 10,
    marginBottom: 20,
  },

  primaryButton: {
    backgroundColor: "#3F51B5",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3F51B5",
  },

  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },

  footerText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
});
