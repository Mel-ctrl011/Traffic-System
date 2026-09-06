/* =========================================================
  PAYMENT METHOD STORAGE — Firestore adapter

  Payment methods are stored below each user's document.
  Card numbers are never written; only the last four digits
  are retained for display in the simulated checkout.
========================================================= */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

import { db } from "../services/firebase";

import type {
  AddMethodInput,
  UnifiedPaymentMethod,
  UpdateMethodInput,
} from "./types";

const methodsCollection = (userId: string) =>
  collection(db, "paymentMethods", userId, "methods");

function asIsoDate(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function lastFour(value: string): string {
  return value.replace(/\s+/g, "").slice(-4);
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

function toStoredMethod(
  userId: string,
  input: AddMethodInput,
): Omit<UnifiedPaymentMethod, "id"> {
  const base = {
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
      return { ...base, walletEmail: input.walletEmail.trim() };
  }
}

export async function listMethods(
  userId: string
): Promise<UnifiedPaymentMethod[]> {
  const snapshot = await getDocs(methodsCollection(userId));
  return snapshot.docs
    .map((methodDoc) => {
      const data = methodDoc.data() as Omit<UnifiedPaymentMethod, "id">;
      return {
        ...data,
        id: methodDoc.id,
        createdAt: asIsoDate(data.createdAt),
        lastUsedAt: data.lastUsedAt
          ? asIsoDate(data.lastUsedAt)
          : undefined,
      };
    })
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      const aTime = a.lastUsedAt || a.createdAt;
      const bTime = b.lastUsedAt || b.createdAt;
      return bTime.localeCompare(aTime);
    });
}

export async function addMethod(
  userId: string,
  input: AddMethodInput
): Promise<UnifiedPaymentMethod> {
  const methods = await listMethods(userId);
  const stored = toStoredMethod(userId, input);

  if (stored.isDefault) {
    await Promise.all(
      methods.map((method) =>
        updateDoc(doc(methodsCollection(userId), method.id), {
          isDefault: false,
        }),
      ),
    );
  } else if (methods.length === 0) {
    stored.isDefault = true;
  }

  const methodDoc = await addDoc(methodsCollection(userId), stored);
  return { ...stored, id: methodDoc.id };
}

export async function updateMethod(
  userId: string,
  methodId: string,
  patch: UpdateMethodInput
): Promise<void> {
  const safePatch = { ...patch };
  if (safePatch.cardNumber) {
    safePatch.lastFour = lastFour(safePatch.cardNumber);
    delete safePatch.cardNumber;
  }
  await updateDoc(doc(methodsCollection(userId), methodId), safePatch);
}

export async function deleteMethod(
  userId: string,
  methodId: string
): Promise<void> {
  const methods = await listMethods(userId);
  const deleted = methods.find((method) => method.id === methodId);
  await deleteDoc(doc(methodsCollection(userId), methodId));

  if (deleted?.isDefault) {
    const replacement = methods.find((method) => method.id !== methodId);
    if (replacement) {
      await updateDoc(doc(methodsCollection(userId), replacement.id), {
        isDefault: true,
      });
    }
  }
}

export async function setDefault(
  userId: string,
  methodId: string
): Promise<void> {
  const methods = await listMethods(userId);
  await Promise.all(
    methods.map((method) =>
      updateDoc(doc(methodsCollection(userId), method.id), {
        isDefault: method.id === methodId,
      }),
    ),
  );
}
