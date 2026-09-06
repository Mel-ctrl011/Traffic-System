# Firebase Setup for Simulated Checkout

The app now uses Firestore for payment requests, payment history, and saved payment methods. Checkout is still a simulation: it validates the entered card format, waits briefly, and randomly approves or declines the transaction. It does not charge a bank card or move money.

## Firebase Collections

The app uses these collections:

- `paymentRequests/{requestId}` - pending and completed checkout requests.
- `paymentHistory/{paymentId}` - successful simulated payments.
- `paymentMethods/{userId}/methods/{methodId}` - saved cards, wallets, and bank methods.

Saved card documents contain only display-safe data such as the cardholder name, last four digits, and expiry date. Full card numbers and CVVs must not be stored in Firestore.

## Firestore Rules

Deploy rules that match the paths used by the app. The payment service currently identifies a citizen by the app's `userId` value, normally the citizen ID number. If production Firebase Authentication is enabled, replace that value with the authenticated Firebase UID or add a trusted mapping between the UID and citizen record.

Example rules for the current simulated flow:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /paymentRequests/{requestId} {
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow read, update: if request.auth != null
        && resource.data.userId == request.auth.uid;
    }

    match /paymentHistory/{paymentId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow update, delete: if false;
    }

    match /paymentMethods/{userId}/methods/{methodId} {
      allow read, write: if request.auth != null
        && userId == request.auth.uid;
    }
  }
}
```

Do not deploy these rules unchanged if the app continues using citizen ID numbers as `userId`; the authentication identity and data identity must agree first. In that case, use a trusted server-side mapping rather than allowing arbitrary clients to choose another user's ID.

## What Is Complete

- Firestore CRUD for saved payment methods.
- Firebase-backed checkout method loading.
- Payment request creation and status updates.
- Simulated payment history and receipt generation.
- Masked saved-card reuse during simulated checkout.
- No new raw card-number storage in the Firebase payment-method path.

## Steps to Run the Simulated Checkout

1. Configure Firebase in `src/services/firebase.ts` and enable Firestore.
2. Enable the authentication provider used by the app.
3. Make the Firestore rules identity match the app's authenticated user identity.
4. Deploy the rules.
5. Sign in with a test user whose Firebase identity can read and write the payment paths.
6. Create a fine or appointment that starts a payment request.
7. Enter a valid test card number, cardholder name, future expiry, and 3-4 digit CVV.
8. Submit checkout and verify the new documents in `paymentRequests` and `paymentHistory`.
9. Select **Save this card**, start another checkout, and verify the masked card appears from `paymentMethods/{userId}/methods`.
10. Test adding, selecting, setting a default, editing, and deleting a payment method.

The simulated processor has an intentional random approval rate, so a declined payment is expected occasionally. A decline does not represent a bank response.

## Current Simulation Limits

- No real payment gateway is connected.
- No real authorization, capture, refund, reversal, or settlement occurs.
- Card validation is client-side and only suitable for development/testing.
- The generated receipt is an application record, not a bank receipt.
- Production payments require a provider such as Stripe, PayFast, or PayGate, server-side verification, webhooks, tokenized payment details, and provider-specific security review.

## Verification

Run:

```text
npx tsc --noEmit
```

Then test the complete flow in the app and inspect Firestore for the three payment collections above.
