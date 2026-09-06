import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import type {
  GatewayConfig,
  PaymentGateway,
} from "../../types/paymentGateway";
import {
  getAvailableGateways,
  checkGatewayHealth,
} from "../../services/gatewayService";

interface GatewaySelectionRouteParams {
  amount: number;
  description: string;
  onSelect: (gateway: PaymentGateway) => void;
}

export default function GatewaySelectionScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const params =
    route.params as GatewaySelectionRouteParams;

  const { amount, description, onSelect } = params;

  const [gateways, setGateways] = useState<GatewayConfig[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [selectedGateway, setSelectedGateway] =
    useState<PaymentGateway | null>(null);
  const [healthStatus, setHealthStatus] = useState<
    Record<PaymentGateway, boolean>
  >({} as any);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    try {
      setLoading(true);
      const available = getAvailableGateways();
      setGateways(available);

      // Check health of each gateway
      const health: Record<PaymentGateway, boolean> = {} as any;
      for (const gateway of available) {
        const result =
          await checkGatewayHealth(gateway.id);
        health[gateway.id] =
          result.status === "operational";
      }
      setHealthStatus(health);

      // Pre-select first gateway
      if (available.length > 0) {
        setSelectedGateway(available[0].id);
      }
    } catch (error) {
      console.error("Failed to load gateways:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedGateway) {
      onSelect(selectedGateway);
      navigation.navigate("PaymentCheckout", {
        gateway: selectedGateway,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color="#3F51B5"
        />
        <Text style={styles.loadingText}>
          Loading payment methods...
        </Text>
      </View>
    );
  }

  const selectedGatewayConfig = gateways.find(
    (g) => g.id === selectedGateway
  );
  const isHealthy =
    selectedGateway &&
    healthStatus[selectedGateway];

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
        <Text style={styles.title}>
          Choose Payment Method
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* AMOUNT SUMMARY */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Amount</Text>
        <Text style={styles.summaryAmount}>
          R {amount.toFixed(2)}
        </Text>
        <Text style={styles.summaryDescription}>
          {description}
        </Text>
      </View>

      {/* GATEWAYS LIST */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Available Methods
        </Text>

        {gateways.map((gateway) => {
          const isSelected = selectedGateway === gateway.id;
          const isHealthy = healthStatus[gateway.id];
          const feeAmount =
            (amount * gateway.fee) / 100;

          return (
            <TouchableOpacity
              key={gateway.id}
              style={[
                styles.gatewayCard,
                isSelected &&
                  styles.gatewayCardSelected,
              ]}
              onPress={() => setSelectedGateway(gateway.id)}
              disabled={!isHealthy}
            >
              <View style={styles.gatewayContent}>
                {/* ICON + NAME */}
                <View style={styles.gatewayHeader}>
                  <View
                    style={[
                      styles.gatewayIcon,
                      !isHealthy &&
                        styles.gatewayIconDisabled,
                    ]}
                  >
                    <Ionicons
                      name={
                        gateway.icon as any
                      }
                      size={24}
                      color={
                        isHealthy
                          ? "#3F51B5"
                          : "#CCC"
                      }
                    />
                  </View>

                  <View style={styles.gatewayInfo}>
                    <Text style={styles.gatewayName}>
                      {gateway.name}
                    </Text>
                    <Text
                      style={styles.gatewayDescription}
                    >
                      {gateway.description}
                    </Text>
                  </View>

                  {/* HEALTH STATUS */}
                  {isHealthy ? (
                    <View
                      style={styles.healthBadge}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4CAF50"
                      />
                    </View>
                  ) : (
                    <View
                      style={
                        styles.healthBadgeUnavailable
                      }
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color="#E74C3C"
                      />
                    </View>
                  )}
                </View>

                {/* DETAILS */}
                {isSelected && (
                  <View style={styles.detailsContainer}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        Processing:
                      </Text>
                      <Text style={styles.detailValue}>
                        {gateway.processingTime}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        Fee:
                      </Text>
                      <Text style={styles.detailValue}>
                        {gateway.fee > 0
                          ? `${gateway.fee}% (R${feeAmount.toFixed(
                              2
                            )})`
                          : "Free"}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        Limits:
                      </Text>
                      <Text style={styles.detailValue}>
                        R{gateway.minAmount} - R
                        {gateway.maxAmount}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* RADIO BUTTON */}
              <View style={styles.radioContainer}>
                <Ionicons
                  name={
                    isSelected
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={24}
                  color={
                    isSelected && isHealthy
                      ? "#3F51B5"
                      : "#C0C0C0"
                  }
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* DETAILS TOGGLE */}
      <View style={styles.toggleSection}>
        <Text style={styles.toggleLabel}>
          Show payment details
        </Text>
        <Switch
          value={showDetails}
          onValueChange={setShowDetails}
          trackColor={{ false: "#D0D0D0", true: "#81C784" }}
          thumbColor={showDetails ? "#4CAF50" : "#F0F0F0"}
        />
      </View>

      {/* SELECTED GATEWAY INFO */}
      {selectedGatewayConfig && showDetails && (
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons
              name="information-circle"
              size={18}
              color="#2196F3"
            />
            <Text style={styles.infoTitle}>
              {selectedGatewayConfig.name}
            </Text>
          </View>

          <Text style={styles.infoDescription}>
            {selectedGatewayConfig.description}
          </Text>

          {selectedGatewayConfig.fee > 0 && (
            <View style={styles.warningBox}>
              <Ionicons
                name="alert-circle"
                size={16}
                color="#FF9800"
              />
              <Text style={styles.warningText}>
                A {selectedGatewayConfig.fee}% payment
                fee (R
                {(
                  (amount *
                    selectedGatewayConfig.fee) /
                  100
                ).toFixed(2)}) will be added to your
                total.
              </Text>
            </View>
          )}

          {!isHealthy && (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert"
                size={16}
                color="#E74C3C"
              />
              <Text style={styles.errorText}>
                This payment method is currently
                unavailable. Please try another.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* CONTINUE BUTTON */}
      <TouchableOpacity
        style={[
          styles.continueButton,
          !selectedGateway &&
            styles.continueButtonDisabled,
        ]}
        onPress={handleSelect}
        disabled={!selectedGateway || !isHealthy}
      >
        <Ionicons
          name="arrow-forward"
          size={18}
          color="#FFFFFF"
        />
        <Text style={styles.continueButtonText}>
          Continue to Payment
        </Text>
      </TouchableOpacity>

      {/* SECURITY NOTE */}
      <View style={styles.securityNote}>
        <Ionicons
          name="shield-checkmark"
          size={14}
          color="#4CAF50"
        />
        <Text style={styles.securityText}>
          All transactions are secure and encrypted
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
    paddingVertical: 12,
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,

    shadowColor: "#0B1730",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    marginBottom: 4,
  },

  summaryAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#3F51B5",
    marginBottom: 8,
  },

  summaryDescription: {
    fontSize: 13,
    color: "#999",
  },

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },

  gatewayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",

    shadowColor: "#0B1730",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  gatewayCardSelected: {
    borderColor: "#3F51B5",
    backgroundColor: "#EEF0FB",
  },

  gatewayContent: {
    flex: 1,
  },

  gatewayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },

  gatewayIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#EEF0FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  gatewayIconDisabled: {
    backgroundColor: "#F5F5F5",
  },

  gatewayInfo: {
    flex: 1,
  },

  gatewayName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
    marginBottom: 2,
  },

  gatewayDescription: {
    fontSize: 12,
    color: "#999",
  },

  healthBadge: {
    marginLeft: 8,
  },

  healthBadgeUnavailable: {
    marginLeft: 8,
    opacity: 0.6,
  },

  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  detailLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },

  detailValue: {
    fontSize: 12,
    color: "#333",
    fontWeight: "700",
  },

  radioContainer: {
    paddingLeft: 12,
  },

  toggleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },

  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  infoCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },

  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E3A8A",
  },

  infoDescription: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 8,
  },

  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF8E6",
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    gap: 8,
  },

  warningText: {
    fontSize: 12,
    color: "#A16207",
    flex: 1,
    lineHeight: 18,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3F2",
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    gap: 8,
  },

  errorText: {
    fontSize: 12,
    color: "#B42318",
    flex: 1,
    lineHeight: 18,
  },

  continueButton: {
    backgroundColor: "#3F51B5",
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 8,
  },

  continueButtonDisabled: {
    opacity: 0.5,
  },

  continueButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },

  securityText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
  },
});
