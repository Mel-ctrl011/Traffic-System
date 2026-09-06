# Architecture & File Structure - Phase 1

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SCREENS LAYER                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  HomeScreen ──┐                  OutstandingPenalties ──┐   │
│               │                                          │    │
│  Services ────├──► FloatingTabBar (Navigation)         │    │
│               │                                          │    │
│  Updates ─────┘                                          │    │
│                                                           │    │
│                                                  AppointmentBooking
│                                                           │    │
└─────────────────────────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              PAYMENT FLOW SCREENS                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Outstanding Fines / Appointment Confirmation               │
│           ▼                                                   │
│  PaymentCheckout (card selection + input)                   │
│           ▼                                                   │
│  PaymentService.processPayment()                            │
│           ▼                                                   │
│  PaymentVerification (receipt + success)                    │
│           ▼                                                   │
│  Return to Source (Home/Services) with callback             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│           SERVICES LAYER (Business Logic)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  paymentService.ts                                           │
│  ├─ createPaymentRequest()      [Firestore Write]          │
│  ├─ processPayment()             [Validation + Simulation]  │
│  ├─ saveCardDetails()            [Firestore Write]          │
│  ├─ getSavedCards()              [Firestore Read]           │
│  ├─ deleteSavedCard()            [Firestore Delete]         │
│  ├─ getPaymentHistory()          [Firestore Query]          │
│  └─ getPaymentRecord()           [Firestore Read]           │
│                                                               │
│  appointmentService.ts (existing)                           │
│  └─ createAppointment()          [Firestore Write]          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 FIRESTORE DATABASE                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Collections:                                                │
│  ├─ paymentRequests              (NEW)                       │
│  ├─ paymentHistory               (NEW)                       │
│  ├─ savedCards                   (NEW)                       │
│  ├─ appointments                 (existing)                  │
│  └─ fines                        (existing)                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Updated Navigation Structure

```
Root Navigator (Stack)
│
├─ Tabs Navigator (Bottom Tab with FloatingTabBar)
│  │
│  ├─ Home Tab (SwipeableHomeScreen)
│  │  └─ Home Screen
│  │
│  ├─ Licenses Tab (SwipeableLicensesScreen)
│  │  └─ Licenses Screen
│  │
│  ├─ Services Tab (SwipeableServicesScreen)
│  │  └─ Services Screen
│  │
│  └─ Updates Tab (SwipeableNewsScreen)
│     └─ News Screen
│
└─ Stack Screens (Modal/Sheet)
   │
   ├─ AppointmentBooking
   │  └─ (Multi-step flow with payment at end)
   │
   ├─ OutstandingPenalties
   │  └─ (List with Pay button triggering payment)
   │
   ├─ PaymentCheckout ◄──────── NEW
   │  ├─ Payment method selection
   │  ├─ Card input form
   │  └─ Processing state
   │
   ├─ PaymentVerification ◄──── NEW
   │  ├─ Success animation
   │  ├─ Receipt display
   │  └─ Verification code
   │
   └─ SavedPaymentMethods ◄───── NEW
      ├─ Card list
      ├─ Delete confirmation
      └─ Empty state
```

---

## Component Hierarchy

```
App
├─ RootNavigator
│  ├─ MainNavigator
│  │  ├─ TabNavigator
│  │  │  ├─ GestureDetector (Pan gesture)
│  │  │  │  ├─ SwipeableHomeScreen
│  │  │  │  ├─ SwipeableLicensesScreen
│  │  │  │  ├─ SwipeableServicesScreen
│  │  │  │  └─ SwipeableNewsScreen
│  │  │  │
│  │  │  └─ FloatingTabBar ◄───────────── NEW
│  │  │     ├─ Animated.View (bar height)
│  │  │     ├─ TabButton × 4
│  │  │     │  └─ Animated.Text (label)
│  │  │     └─ Handle (chevron)
│  │  │
│  │  ├─ PaymentCheckout ◄─────────────── NEW
│  │  │  ├─ Order Summary Card
│  │  │  ├─ Method Selection
│  │  │  ├─ Card Input Form
│  │  │  │  └─ TextInput × 4
│  │  │  ├─ Saved Cards Dropdown
│  │  │  └─ Pay Button
│  │  │
│  │  ├─ PaymentVerification ◄─────────── NEW
│  │  │  ├─ Checkmark Animation
│  │  │  ├─ Receipt Card
│  │  │  │  ├─ Amount Display
│  │  │  │  ├─ Details Grid
│  │  │  │  └─ Verification Code
│  │  │  └─ Action Buttons
│  │  │
│  │  └─ SavedPaymentMethods ◄─────────── NEW
│  │     ├─ Header
│  │     ├─ Card List
│  │     │  ├─ CardItem × N
│  │     │  │  ├─ Card Info
│  │     │  │  └─ Delete Button
│  │     │  └─ Empty State
│  │     └─ Security Info
│  │
│  └─ Other existing screens...
```

---

## Data Flow Diagrams

### Fine Payment Flow

```
User Taps "Pay Fine"
        ↓
Outstanding Penalties Screen
        ↓
handlePay(fine) ──────────────────┐
                                  │
                    createPaymentRequest({
                      userId,
                      amount: fine.outstandingAmount,
                      source: "fine",
                      sourceId: fine.id
                    })
                                  ↓
                        Firestore paymentRequests
                        (stored with 30min expiry)
                                  ↓
navigate("PaymentCheckout", {
  request,
  onSuccess: async (sessionId) => {
    await loadFines()
    navigate("Home") // or stay in list
  }
})
                                  ↓
                        PaymentCheckout Screen
                        (user enters card details)
                                  ↓
                        processPayment({
                          userId,
                          requestId,
                          cardDetails
                        })
                                  ↓
                   Luhn Validation → 1-3s Delay
                        ↓
                   90% Success Rate
                        ↓
                   Create Payment Record
                        ↓
          Firestore paymentHistory + Update Request
                        ↓
                        PaymentVerification Screen
                        (Receipt + Code Animation)
                                  ↓
                        onSuccess Callback
                                  ↓
                        loadFines() [Refresh]
                                  ↓
                        Return to Outstanding Fines
```

### Appointment Payment Flow

```
User Completes Appointment Steps
(Service → Branch → Date → Time → Review)
        ↓
handleConfirm()
        ↓
createAppointment({
  userId,
  booking: {service, branch, date, time}
})
        ↓
Appointment stored in Firestore
        ↓
navigates to confirmation screen (ConfirmationStep)
        ↓
User taps "Done" button
        ↓
handleDone()
        ↓
createPaymentRequest({
  userId,
  amount: 50,  // R50 booking fee
  source: "appointment",
  sourceId: appointmentId
})
        ↓
navigate("PaymentCheckout", {
  request,
  onSuccess: () => {
    navigate("Tabs", {screen: "Services"})
  }
})
        ↓
[Same as fine flow from here...]
        ↓
After Payment Success:
  navigate back to Services tab
  Show "Appointment booked and paid"
```

### Saved Card Lifecycle

```
First Payment
        ↓
User enters card details in PaymentCheckout
        ↓
Check "Save this card" checkbox
        ↓
processPayment({
  cardDetails,
  saveCard: true
})
        ↓
Inside processPayment():
  saveCardDetails(userId, cardDetails)
        ↓
  Firestore savedCards collection:
  {
    userId,
    cardNumber,
    lastFourDigits,
    expiryMonth/Year,
    isDefault: false,
    createdAt
  }
        ↓
  Returns cardId
        ↓
  Link to paymentHistory record
        ↓
Payment Complete
        
Next Payment
        ↓
PaymentCheckout Screen loads
        ↓
getSavedCards(userId)
        ↓
Firestore savedCards query
        ↓
Display saved cards in dropdown
        ↓
User selects "Saved Cards"
        ↓
Choose card from list
        ↓
processPayment({
  selectedCardId,
  cardDetails: {lastFourDigits, ...}
})
        ↓
Payment processes without re-entering full details
```

---

## File Structure (Complete)

```
Traffic-System-main/
│
├── src/
│   │
│   ├── components/
│   │   ├── FloatingTabBar.tsx ◄───────────────── NEW
│   │   ├── BookingProgress.tsx (existing)
│   │   ├── BranchStep.tsx (existing)
│   │   ├── ConfirmationStep.tsx (existing)
│   │   ├── DateStep.tsx (existing)
│   │   ├── DriverLicenseCard.tsx (existing)
│   │   ├── GenerateTestFinesButton.tsx (existing)
│   │   ├── ReviewStep.tsx (existing)
│   │   ├── SeedCitizensButton.tsx (existing)
│   │   ├── ServiceStep.tsx (existing)
│   │   └── TimeStep.tsx (existing)
│   │
│   ├── navigation/
│   │   ├── AuthNavigator.tsx (existing)
│   │   ├── MainNavigator.tsx ◄─────────────── MODIFIED
│   │   ├── ProtectedRoute.tsx (existing)
│   │   ├── RootNavigator.tsx (existing)
│   │   └── TabNavigator.tsx ◄─────────────── REWRITTEN
│   │
│   ├── screens/
│   │   ├── HomeScreen.tsx (existing)
│   │   ├── LicensesScreen.tsx (existing)
│   │   ├── NewsScreen.tsx (existing)
│   │   ├── PaymentsScreen.tsx (existing - not used in tabs)
│   │   ├── ServicesScreen.tsx (existing)
│   │   │
│   │   ├── HOME/
│   │   │   └── [various home sub-screens]
│   │   │
│   │   ├── LICENSES/
│   │   │   └── [various license sub-screens]
│   │   │
│   │   ├── PAYMENTS/
│   │   │   ├── payment-checkout.tsx ◄─────── NEW
│   │   │   ├── payment-verification.tsx ◄─── NEW
│   │   │   ├── saved-payment-methods.tsx ◄── NEW
│   │   │   ├── outstanding-penalties.tsx ◄─ MODIFIED
│   │   │   ├── speed-camera-tickets.tsx (existing)
│   │   │   ├── fines-overview.tsx (existing)
│   │   │   ├── vehicle-payments.tsx (existing)
│   │   │   ├── card-payments.tsx (existing)
│   │   │   └── [other payment screens...]
│   │   │
│   │   └── SERVICES/
│   │       ├── AppointmentBooking.tsx ◄───── MODIFIED
│   │       ├── MyAppointments.tsx (existing)
│   │       ├── AppointmentHistory.tsx (existing)
│   │       └── [other service screens...]
│   │
│   ├── services/
│   │   ├── appointmentService.ts (existing)
│   │   ├── applicationService.ts (existing)
│   │   ├── authService.ts (existing)
│   │   ├── firebase.ts (existing)
│   │   └── paymentService.ts ◄───────────── NEW
│   │
│   ├── types/
│   │   ├── appointment.ts (existing)
│   │   └── payment.ts ◄─────────────────── NEW
│   │
│   ├── context/
│   │   └── AuthContext.tsx (existing)
│   │
│   ├── utils/
│   │   └── [utilities]
│   │
│   └── App.tsx (existing)
│
├── package.json (existing - no changes)
├── app.json (existing)
├── tsconfig.json (existing)
└── README.md (existing)
```

---

## Modified File Details

### TabNavigator.tsx
**Before:** 166 lines  
**After:** ~120 lines (net reduction due to removal of payment tab)  
**Changes:**
- Removed `<Tab.Screen name="Payments" />`
- Added FloatingTabBar import
- Added gesture-based swipe navigation
- Created `withTabSwipe()` HOC
- Each screen now wrapped in GestureDetector

### MainNavigator.tsx
**Before:** 320 lines  
**After:** ~340 lines  
**Changes:**
- Added 3 payment screen imports
- Added 3 new Stack.Screen entries
- No changes to existing screens

### Outstanding Penalties (payment-overview.tsx)
**Before:** ~595 lines  
**After:** ~630 lines  
**Changes:**
- `handlePay()` completely rewritten
- Now async with payment request creation
- Creates Firestore document
- Navigates to PaymentCheckout
- Implements onSuccess callback

### AppointmentBooking.tsx
**Before:** ~741 lines  
**After:** ~780 lines  
**Changes:**
- Added Alert import
- `handleDone()` rewritten
- Now async with payment initiation
- Creates Firestore payment request for R50
- Dynamic navigation back to Services tab

---

## Dependencies (No Changes)

```json
{
  "react-native-gesture-handler": "~2.28.0",     // For swipe gestures
  "react-native-reanimated": "~4.1.1",           // For animations
  "firebase": "^12.14.0",                        // For Firestore
  "@react-navigation/bottom-tabs": "^7.4.0",     // Tab navigation
  "@react-navigation/native": "^7.1.8",          // Navigation core
  "@expo/vector-icons": "^15.0.3"                // Ionicons
}
```

All required dependencies already exist in `package.json`. No npm install needed.

---

## Component Size Comparison

| Component | Lines | Size |
|-----------|-------|------|
| FloatingTabBar.tsx | 298 | NEW |
| PaymentCheckout.tsx | 426 | NEW |
| PaymentVerification.tsx | 385 | NEW |
| SavedPaymentMethods.tsx | 378 | NEW |
| PaymentService.ts | 356 | NEW |
| PaymentTypes.ts | 74 | NEW |
| TabNavigator.tsx | 120 | -46 lines |
| MainNavigator.tsx | +60 | 3 screens |
| Outstanding Penalties | +35 | handlePay update |
| AppointmentBooking.tsx | +39 | handleDone update |
| **Total New Code** | ~2,071 | |
| **Total Modified** | ~134 | |

---

## Performance Considerations

### Optimizations Implemented
1. **Lazy Component Loading:** Payment screens not loaded until needed
2. **Firestore Indexing:** Query optimization for payment history
3. **Animation Performance:** Using react-native-reanimated for 60fps animations
4. **Card Caching:** SavedCards fetched once per screen focus
5. **Gesture Debouncing:** Built into pan gesture handler

### Potential Bottlenecks
1. **First Firestore Payment:** May take 1-2s on first app run
2. **Saved Cards List:** Large number of cards (100+) may impact scroll
3. **Payment History:** Unbounded query could be slow if user has 1000+ payments

### Recommendations for Production
1. Add pagination to payment history (limit 20 per page)
2. Implement card caching with TTL
3. Use Firestore collection groups for better indexing
4. Consider Cloud Functions for payment processing

---

**Document Version:** 1.0  
**Date:** September 2026  
**Ready for Integration Testing**
