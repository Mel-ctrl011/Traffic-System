/* =========================================================
   PAYMENT METHOD STORAGE — AsyncStorage adapter

   Pure data layer, no React / Firestore imports.
   The exported signatures match firebaseAdapter.ts so the
   two are swappable.

   When migrating to Firestore, point the `paymentMethods`
   barrel at firebaseAdapter.ts and the screens don't change.
========================================================= */

import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  AddMethodInput,
  UnifiedPaymentMethod,
  UpdateMethodInput,
} from "./types";

const KEY_PREFIX = "@paymentMethods:";

const key = (userId: string) => `${KEY_PREFIX}${userId}`;

/**
 * Tiny RFC4122-ish UUID. Sufficient for local IDs; Firestore
 * doc ids will replace these on migration.
 */
function uuid(): string {
  return "m-" + Math.random().toString(36).slice(2, 10) +
    "-" + Date.now().toString(36);
}

function labelFor(input: AddMethodInput): string {
  switch (input.type) {
    case "card":
      return input.cardholderName.trim();
    case "google_pay":
    case "apple_pay":
      return input.walletEmail.trim();
    case "bank":
      return `${input.accountHolder.trim()} (${input.bankName.trim()})`;
  }
}

function lastFour(num: string): string {
  return num.replace(/\s+/g, "").slice(-4);
}

function toStoredMethod(
  userId: string,
  input: AddMethodInput
): UnifiedPaymentMethod {
  const base: UnifiedPaymentMethod = {
    id: uuid(),
    userId,
    type: input.type,
    label: labelFor(input),
    isDefault: !!input.isDefault,
    createdAt: new Date().toISOString(),
  };

  switch (input.type) {
    case "card":
      return {
        ...base,
        cardNumber: input.cardNumber.replace(/\s+/g, ""),
        lastFour: lastFour(input.cardNumber),
        expiryMonth: input.expiryMonth,
        expiryYear: input.expiryYear,
      };
    case "bank":
      return {
        ...base,
        bankName: input.bankName.trim(),
        accountNumberLast4: lastFour(input.accountNumber),
        branchCode: input.branchCode.trim(),
      };
    case "google_pay":
    case "apple_pay":
      return {
        ...base,
        walletEmail: input.walletEmail.trim(),
      };
  }
}

async function readAll(
  userId: string
): Promise<UnifiedPaymentMethod[]> {
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(
  userId: string,
  methods: UnifiedPaymentMethod[]
): Promise<void> {
  await AsyncStorage.setItem(
    key(userId),
    JSON.stringify(methods)
  );
}

/* =========================================================
   PUBLIC API — matches firebaseAdapter.ts signatures
========================================================= */

export async function listMethods(
  userId: string
): Promise<UnifiedPaymentMethod[]> {
  const all = await readAll(userId);
  return all
    .filter((m) => m && m.id)
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }
      const aT = a.lastUsedAt || a.createdAt;
      const bT = b.lastUsedAt || b.createdAt;
      return bT.localeCompare(aT);
    });
}

export async function addMethod(
  userId: string,
  input: AddMethodInput
): Promise<UnifiedPaymentMethod> {
  const all = await readAll(userId);
  const stored = toStoredMethod(userId, input);

  // Adding a default clears other defaults
  if (stored.isDefault) {
    for (const m of all) m.isDefault = false;
  } else if (all.length === 0) {
    // First method is automatically the default
    stored.isDefault = true;
  }

  all.push(stored);
  await writeAll(userId, all);
  return stored;
}

export async function updateMethod(
  userId: string,
  methodId: string,
  patch: UpdateMethodInput
): Promise<void> {
  const all = await readAll(userId);
  const idx = all.findIndex((m) => m.id === methodId);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...patch };
  await writeAll(userId, all);
}

export async function deleteMethod(
  userId: string,
  methodId: string
): Promise<void> {
  const all = await readAll(userId);
  const remaining = all.filter((m) => m.id !== methodId);

  // If we deleted the default, promote the most recent method
  if (
    remaining.length > 0 &&
    !remaining.some((m) => m.isDefault)
  ) {
    remaining[0].isDefault = true;
  }

  await writeAll(userId, remaining);
}

export async function setDefault(
  userId: string,
  methodId: string
): Promise<void> {
  const all = await readAll(userId);
  for (const m of all) m.isDefault = m.id === methodId;
  await writeAll(userId, all);
}
