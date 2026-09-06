import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

/* =========================================================
   CONFIG

   Maps each tab route name to the icon it should render.
========================================================= */

const TAB_ICONS: Record<
  string,
  keyof typeof Ionicons.glyphMap
> = {
  Home: "home",
  Licenses: "card",
  Services: "apps",
  Updates: "newspaper",
};

const COLLAPSED_HEIGHT = 60;
const EXPANDED_HEIGHT = 72;

/* =========================================================
   FLOATING TAB BAR

   A pill-shaped, floating tab bar that normally shows just
   icons (collapsed) and can expand to reveal text labels
   beneath each icon. Tapping the handle on the right toggles
   between the two states; tapping a tab always navigates,
   and re-collapses the bar if it was expanded.
========================================================= */

export default function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expanded, progress]);

  const barHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_HEIGHT, EXPANDED_HEIGHT],
  });

  const handleRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(insets.bottom, 14) },
      ]}
    >
      <Animated.View style={[styles.bar, { height: barHeight }]}>
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;

            const label =
              (options.tabBarLabel as string) ??
              (options.title as string) ??
              route.name;

            const icon =
              TAB_ICONS[route.name] ?? "ellipse";

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }

              if (expanded) {
                setExpanded(false);
              }
            };

            return (
              <TabButton
                key={route.key}
                icon={icon}
                label={label}
                focused={focused}
                expanded={expanded}
                progress={progress}
                onPress={onPress}
              />
            );
          })}
        </View>
      </Animated.View>

      {/* EXPAND / COLLAPSE HANDLE */}

      <Pressable
        style={styles.handle}
        hitSlop={10}
        onPress={() => setExpanded((prev) => !prev)}
      >
        <Animated.View
          style={{ transform: [{ rotate: handleRotate }] }}
        >
          <Ionicons
            name="chevron-up"
            size={14}
            color="#8E8E93"
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

/* =========================================================
   TAB BUTTON
========================================================= */

function TabButton({
  icon,
  label,
  focused,
  expanded,
  progress,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
  expanded: boolean;
  progress: Animated.Value;
  onPress: () => void;
}) {
  const labelOpacity = progress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 1],
  });

  const labelTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 0],
  });

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabButton}
      hitSlop={6}
    >
      <View
        style={[
          styles.iconBubble,
          focused && styles.iconBubbleActive,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            focused
              ? "#3F51B5"
              : "#8E8E93"
          }
        />
      </View>

      {expanded && (
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            focused && styles.tabLabelActive,
            {
              opacity: labelOpacity,
              transform: [
                { translateY: labelTranslate },
              ],
            },
          ]}
        >
          {label}
        </Animated.Text>
      )}
    </Pressable>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },

  bar: {
    flexDirection: "row",
    alignItems: "center",
    width: "88%",
    maxWidth: 420,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,

    shadowColor: "#0B1730",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  tabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },

  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },

  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  iconBubbleActive: {
    backgroundColor: "#EEF0FB",
  },

  tabLabel: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "700",
    color: "#8E8E93",
  },

  tabLabelActive: {
    color: "#3F51B5",
  },

  handle: {
    marginTop: -6,
    width: 34,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#0B1730",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
