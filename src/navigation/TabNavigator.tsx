import React, { useCallback } from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import HomeScreen from "../screens/HomeScreen";
import LicensesScreen from "../screens/LicensesScreen";
import ServicesScreen from "../screens/ServicesScreen";
import NewsScreen from "../screens/NewsScreen";

import FloatingTabBar from "../components/FloatingTabBar";

const Tab = createBottomTabNavigator();

/* =========================================================
   TAB ORDER

   Used for left/right swipe navigation between tabs. Kept
   in one place so the gesture wrapper and the tab bar stay
   in sync with whatever tabs actually exist below.
========================================================= */

const TAB_ORDER = ["Home", "Licenses", "Services", "Updates"];

const SWIPE_DISTANCE_THRESHOLD = 45;
const SWIPE_VELOCITY_THRESHOLD = 500;

/* =========================================================
   SWIPEABLE SCREEN WRAPPER

   Wraps a tab's screen so a horizontal swipe moves to the
   previous/next tab, while still letting vertical scrolling
   inside the screen work normally.
========================================================= */

function withTabSwipe(ScreenComponent: React.ComponentType<any>) {
  return function SwipeableScreen(props: any) {
    const navigation = useNavigation<any>();

    const goToAdjacentTab = useCallback(
      (direction: 1 | -1) => {
        const currentName = props.route?.name;
        const currentIndex = TAB_ORDER.indexOf(currentName);

        if (currentIndex === -1) return;

        const nextIndex = currentIndex + direction;

        if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) {
          return;
        }

        navigation.navigate(TAB_ORDER[nextIndex]);
      },
      [navigation, props.route?.name]
    );

    const panGesture = Gesture.Pan()
      .activeOffsetX([-20, 20])
      .failOffsetY([-15, 15])
      .onEnd((event) => {
        const swipedFarEnough =
          Math.abs(event.translationX) >
            SWIPE_DISTANCE_THRESHOLD ||
          Math.abs(event.velocityX) >
            SWIPE_VELOCITY_THRESHOLD;

        if (!swipedFarEnough) return;

        if (event.translationX < 0) {
          goToAdjacentTab(1);
        } else {
          goToAdjacentTab(-1);
        }
      })
      .runOnJS(true);

    return (
      <GestureDetector gesture={panGesture}>
        <View style={{ flex: 1 }}>
          <ScreenComponent {...props} />
        </View>
      </GestureDetector>
    );
  };
}

const SwipeableHomeScreen = withTabSwipe(HomeScreen);
const SwipeableLicensesScreen = withTabSwipe(LicensesScreen);
const SwipeableServicesScreen = withTabSwipe(ServicesScreen);
const SwipeableNewsScreen = withTabSwipe(NewsScreen);

/* =========================================================
   NAVIGATOR
========================================================= */

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={SwipeableHomeScreen} />
      <Tab.Screen
        name="Licenses"
        component={SwipeableLicensesScreen}
      />
      <Tab.Screen
        name="Services"
        component={SwipeableServicesScreen}
      />
      <Tab.Screen name="Updates" component={SwipeableNewsScreen} />
    </Tab.Navigator>
  );
}
