/* =========================================================
   ICON + COLOUR LOOKUP

   Single source of truth so the row, the add screen, and
   the checkout screen all show the same icon for a given
   method type.

   Icons are Ionicons names from @expo/vector-icons — same
   icon family the rest of the app already uses.
========================================================= */

import type { MethodType } from "./types";

export const METHOD_ICON: Record<MethodType, string> = {
  card: "card",
  google_pay: "logo-google",
  apple_pay: "logo-apple",
  bank: "business",
};

export const METHOD_COLOR: Record<MethodType, string> = {
  card: "#3F51B5",
  google_pay: "#4285F4",
  apple_pay: "#000000",
  bank: "#0B4F8A",
};

export const METHOD_BG: Record<MethodType, string> = {
  card: "#EEF0FB",
  google_pay: "#E8F0FE",
  apple_pay: "#F0F0F0",
  bank: "#EAF3FA",
};
