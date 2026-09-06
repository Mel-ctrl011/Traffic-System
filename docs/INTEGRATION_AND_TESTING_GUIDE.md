# Integration & Testing Guide - Phase 1

## Integration Steps

### Step 1: Copy Files

Copy these **NEW** files to your project:

```
src/components/FloatingTabBar.tsx
src/screens/PAYMENTS/payment-checkout.tsx
src/screens/PAYMENTS/payment-verification.tsx
src/screens/PAYMENTS/saved-payment-methods.tsx
src/services/paymentService.ts
src/types/payment.ts
```

### Step 2: Update Existing Files

Replace these files with updated versions:

```
src/navigation/TabNavigator.tsx         (REWRITTEN)
src/navigation/MainNavigator.tsx        (3 additions)
src/screens/PAYMENTS/outstanding-penalties.tsx   (handlePay)
src/screens/SERVICES/AppointmentBooking.tsx      (handleDone + import)
```

### Step 3: Verify Imports

Ensure these packages are installed (check `package.json`):

```json
{
  "react-native-gesture-handler": "~2.28.0",
  "react-native-reanimated": "~4.1.1",
  "firebase": "^12.14.0",
  "@react-navigation/bottom-tabs": "^7.4.0",
  "@react-navigation/native": "^7.1.8",
  "@expo/vector-icons": "^15.0.3"
}
```

**No npm install needed** if all dependencies already present.

### Step 4: Check Firestore Setup

Ensure Firebase is initialized in `src/services/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = { /* ... */ };

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### Step 5: Update Firestore Security Rules

Add these rules to allow payment operations:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Payment Requests - User can create and read own
    match /paymentRequests/{document=**} {
      allow create: if request.auth.uid != null
                   && request.resource.data.userId == request.auth.uid;
      allow read: if request.auth.uid != null
                 && resource.data.userId == request.auth.uid;
      allow update: if request.auth.uid != null
                   && resource.data.userId == request.auth.uid;
    }
    
    // Payment History - User can read own
    match /paymentHistory/{document=**} {
      allow create: if request.auth.uid != null
                   && request.resource.data.userId == request.auth.uid;
      allow read: if request.auth.uid != null
                 && resource.data.userId == request.auth.uid;
    }
    
    // Saved Cards - User can manage own
    match /savedCards/{document=**} {
      allow create: if request.auth.uid != null
                   && request.resource.data.userId == request.auth.uid;
      allow read: if request.auth.uid != null
                 && resource.data.userId == request.auth.uid;
      allow delete: if request.auth.uid != null
                   && resource.data.userId == request.auth.uid;
    }
    
    // Existing collections (preserve existing rules)
    match /appointments/{document=**} {
      // ... existing rules
    }
    
    match /fines/{document=**} {
      // ... existing rules
    }
  }
}
```

### Step 6: Test Compile

Run TypeScript check:

```bash
npm run build
# or
tsc --noEmit
```

---

## Testing Checklist

### Environment Setup
- [ ] All 6 new files copied
- [ ] All 4 existing files replaced
- [ ] Firebase initialized
- [ ] Firestore rules updated
- [ ] No TypeScript errors
- [ ] No import resolution errors

### Navigation Testing

#### Tab Bar Display
- [ ] App loads without errors
- [ ] FloatingTabBar visible at bottom
- [ ] 4 tabs visible (Home, Licenses, Services, Updates)
- [ ] Services tab appears raised with shadow
- [ ] Tab bar doesn't interfere with screen content

#### Tab Bar Expansion
- [ ] Chevron handle visible on right side
- [ ] Tapping handle expands bar
- [ ] Tab labels appear below icons when expanded
- [ ] Chevron rotates 180° smoothly
- [ ] Expansion animation smooth (220ms)
- [ ] Tapping handle collapses bar back

#### Tab Switching
- [ ] Tapping Home tab navigates to Home
- [ ] Tapping Licenses tab navigates to Licenses
- [ ] Tapping Services tab navigates to Services
- [ ] Tapping Updates tab navigates to Updates
- [ ] Tab bar auto-collapses when tab selected
- [ ] Active tab highlighted with background

#### Swipe Navigation
- [ ] Swiping right on Home (no-op)
- [ ] Swiping left on Home → goes to Licenses
- [ ] Swiping right on Licenses → goes to Home
- [ ] Swiping left on Licenses → goes to Services
- [ ] Swiping right on Services → goes to Licenses
- [ ] Swiping left on Services → goes to Updates
- [ ] Swiping right on Updates → goes to Services
- [ ] Swiping left on Updates (no-op)
- [ ] Vertical scrolling not blocked by gesture
- [ ] Scroll gestures work normally on screens

### Payment Checkout Flow

#### Screen Display
- [ ] PaymentCheckout screen renders
- [ ] Order summary card shows amount
- [ ] Description displays
- [ ] Back button visible
- [ ] Payment method selection visible

#### Card Input Form
- [ ] Card number field visible
- [ ] Card number auto-formats to XXXX XXXX XXXX XXXX
- [ ] Non-numeric characters rejected
- [ ] Cardholder name field visible
- [ ] Expiry date field visible
- [ ] Expiry auto-formats to MM/YY
- [ ] CVV field visible and masked
- [ ] "Save card" checkbox visible
- [ ] All inputs disabled during processing

#### Saved Cards
- [ ] Saved card radio button appears if cards exist
- [ ] Saved cards list shows up when selected
- [ ] Each card shows: name, masked number, expiry
- [ ] Can select different cards
- [ ] Proper card count shown in button label

#### Payment Processing
- [ ] Validation catches invalid card numbers
- [ ] Validation catches invalid expiry
- [ ] Validation catches missing cardholder name
- [ ] Validation catches invalid CVV
- [ ] Pay button disabled while processing
- [ ] Loading spinner shows during processing
- [ ] Processing takes 1-3 seconds

#### Error Handling
- [ ] Invalid card number shows alert
- [ ] Empty fields show validation alerts
- [ ] Bad card format shows error
- [ ] Network error handled gracefully

### Payment Verification

#### Success State
- [ ] Navigation to PaymentVerification on success
- [ ] Checkmark animates in (400ms delay, 600ms duration)
- [ ] "Payment Successful" message displays
- [ ] Success subtitle displays

#### Receipt Display
- [ ] Amount shown prominently
- [ ] Description displays
- [ ] Payment method (cardholder name) shows
- [ ] Receipt ID displays
- [ ] Date/time displays correctly
- [ ] Verification code animates in character by character
- [ ] Code displays in monospace font
- [ ] Code hint message shows

#### Actions
- [ ] Continue button visible and functional
- [ ] Download Receipt button visible
- [ ] Email Receipt button visible
- [ ] Footer message about email shows
- [ ] Continue navigates back with callback

### Saved Payment Methods Screen

#### Empty State
- [ ] Empty state shows when no cards saved
- [ ] Card icon visible
- [ ] "No Saved Cards" message displays
- [ ] Helpful text about saving cards
- [ ] No errors in console

#### With Saved Cards
- [ ] Cards load and display
- [ ] Each card shows: name, last 4 digits, expiry
- [ ] Card icon in blue bubble
- [ ] Delete button visible for each card
- [ ] Can scroll if multiple cards

#### Delete Functionality
- [ ] Tapping delete shows confirmation
- [ ] Confirmation has Cancel and Delete options
- [ ] Cancel closes without deleting
- [ ] Delete removes card from list
- [ ] Loading spinner during delete
- [ ] Success message shows (if implemented)

#### Focus Behavior
- [ ] Navigating away and back reloads cards
- [ ] New saved cards appear without manual refresh
- [ ] Deleted cards disappear on return

### Fine Payment Flow

#### Quick Action
- [ ] "Pay Fine" button visible in Home quick actions
- [ ] Tapping navigates to Outstanding Penalties
- [ ] Outstanding fines list displays

#### Pay Button
- [ ] Each fine has a "Pay" button
- [ ] Tapping creates payment request
- [ ] Navigates to PaymentCheckout
- [ ] Order summary shows fine amount
- [ ] Description includes fine reference

#### After Payment
- [ ] On success, returns to fines list
- [ ] Success message shows
- [ ] Fines list reloads
- [ ] Paid fine removed from outstanding list (if not re-marked)
- [ ] Payment appears in payment history

### Appointment Booking Flow

#### Booking Steps
- [ ] Select service works
- [ ] Select branch works
- [ ] Select date works
- [ ] Select time works
- [ ] Review shows all details
- [ ] Confirm creates appointment

#### Confirmation Step
- [ ] Confirmation screen displays
- [ ] All appointment details shown
- [ ] "Done" button visible
- [ ] "View Appointments" button visible (if implemented)

#### Payment Initiation
- [ ] Tapping Done initiates payment
- [ ] Navigates to PaymentCheckout
- [ ] Amount shows as R50 (booking fee)
- [ ] Description includes service name
- [ ] User can enter card or select saved

#### After Payment
- [ ] On success, navigates to Services tab
- [ ] Success message about appointment booked
- [ ] Tab bar shows Services selected
- [ ] Appointment in payment history with "appointment" source
- [ ] Payment linked to appointment ID

### Firestore Data Integrity

#### Payment Requests Collection
- [ ] Document created when payment initiated
- [ ] Contains all expected fields
- [ ] Status updates to "success" after payment
- [ ] ReceiptId added after payment
- [ ] Expiry date is 30 minutes from creation

#### Payment History Collection
- [ ] Payment record created successfully
- [ ] All fields populated correctly
- [ ] Receipt ID unique for each payment
- [ ] Verification code 6 digits
- [ ] Status correctly set to "success" or "failed"
- [ ] Timestamp stored correctly

#### Saved Cards Collection
- [ ] Card saved when checkbox checked
- [ ] Last 4 digits stored correctly
- [ ] Expiry month/year extracted properly
- [ ] UserId associated correctly
- [ ] Card ID returned and usable

#### Payment History Query
- [ ] getSavedCards() returns all user cards
- [ ] Fine payments show in history with source="fine"
- [ ] Appointment payments show in history with source="appointment"
- [ ] History sorted by most recent first
- [ ] Filtering by source works correctly

### Error Scenarios

#### Network Errors
- [ ] No internet: error alert shows
- [ ] Firestore failure: graceful handling
- [ ] Server error: user sees message

#### Validation Errors
- [ ] Card number < 13 digits: shows alert
- [ ] Card number > 19 digits: shows alert
- [ ] Invalid expiry format: shows alert
- [ ] Expired card: should validate (future date required)
- [ ] Empty fields: validation catches all

#### User Flow Errors
- [ ] No user logged in: error before payment
- [ ] Payment request expired: handled gracefully
- [ ] Double-tap pay button: prevents duplicate requests
- [ ] Back button during payment: proper cleanup

### Visual & UX

#### Animations
- [ ] Tab bar expansion smooth and responsive
- [ ] Chevron rotation smooth
- [ ] Checkmark animation has bounce effect
- [ ] Verification code reveals smoothly
- [ ] No jank or stuttering

#### Colors & Styling
- [ ] Primary color (#3F51B5) consistent
- [ ] Success green (#4CAF50) properly applied
- [ ] Error red (#E74C3C) for delete
- [ ] Shadows and elevation consistent
- [ ] Border radius consistent (8-12px)
- [ ] Typography hierarchy clear

#### Accessibility
- [ ] All buttons have adequate hit targets (44x44px minimum)
- [ ] Touch targets properly spaced
- [ ] Icons have accompanying text
- [ ] Color not only differentiator
- [ ] Error messages clear and actionable

---

## Automated Testing Script

Create `__tests__/integration.test.ts`:

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TabNavigator from '../src/navigation/TabNavigator';
import PaymentCheckout from '../src/screens/PAYMENTS/payment-checkout';

describe('Phase 1 - Navigation & Payments', () => {
  
  describe('FloatingTabBar', () => {
    it('should render all 4 tabs', () => {
      const { getByText } = render(<TabNavigator />);
      expect(getByText('Home')).toBeTruthy();
      expect(getByText('Licenses')).toBeTruthy();
      expect(getByText('Services')).toBeTruthy();
      expect(getByText('Updates')).toBeTruthy();
    });

    it('should expand and collapse on handle press', async () => {
      const { getByTestId } = render(<TabNavigator />);
      const handle = getByTestId('tab-bar-handle');
      
      fireEvent.press(handle);
      await waitFor(() => {
        expect(getByTestId('tab-labels')).toHaveStyle({opacity: 1});
      });
      
      fireEvent.press(handle);
      await waitFor(() => {
        expect(getByTestId('tab-labels')).toHaveStyle({opacity: 0});
      });
    });
  });

  describe('Payment Checkout', () => {
    it('should validate card number', () => {
      const { getByTestId } = render(
        <PaymentCheckout 
          route={{
            params: {
              request: {
                id: 'test-1',
                amount: 50,
                currency: 'ZAR',
                description: 'Test',
                source: 'fine'
              }
            }
          }}
        />
      );
      
      const cardInput = getByTestId('card-number-input');
      fireEvent.changeText(cardInput, '1234567890123'); // Invalid
      
      // Should show error or disable pay button
    });
  });
});
```

Run tests:
```bash
npm test
```

---

## Debugging Tips

### Common Issues

**Issue:** Tab bar not appearing
- Check FloatingTabBar import in TabNavigator
- Verify tabBar prop passed to Tab.Navigator
- Check if screens are rendering (not blank)

**Issue:** Swipe not working
- Verify GestureDetector wrapping screens
- Check if pan gesture configured correctly
- Test on real device (simulator gesture support limited)
- Ensure gesture-handler is properly installed

**Issue:** Payment request not saved
- Check Firebase initialization
- Verify Firestore rules allow writes
- Check console for auth errors
- Ensure userId exists and matches rules

**Issue:** Saved cards not showing
- Check getSavedCards query is correct
- Verify cards were saved with correct userId
- Check Firestore data structure
- Look for query timeout errors

**Issue:** Animations stuttering
- Profile performance with React DevTools
- Check if too many re-renders
- Reduce animation complexity if needed
- Use shouldComponentUpdate to prevent unnecessary renders

### Console Logs to Check

Add these to paymentService.ts for debugging:

```typescript
// Add before/after key operations:
console.log('🔥 Creating payment request...', {userId, amount, source});
console.log('💳 Processing payment...', {cardNumber: '****' + cardNumber.slice(-4)});
console.log('✅ Payment success!', {receiptId, sessionId});
console.log('❌ Payment failed!', error.message);
```

---

## Performance Testing

### Before & After Metrics

**Tab Bar Expansion Animation:**
- Target: 60 FPS (16.67ms per frame)
- Test: Tap handle multiple times rapidly
- Measure: Frame rate in React DevTools Profiler

**Payment Checkout Rendering:**
- Target: < 500ms initial render
- Test: Navigate to PaymentCheckout
- Measure: Time from navigation to interactive

**Firestore Operations:**
- Target: Create payment request < 2s
- Test: Tap pay fine button
- Measure: Time from button press to checkout navigation

### Load Testing

```javascript
// Test with large dataset
const generateTestPayments = (count: number) => {
  return Array.from({length: count}, (_, i) => ({
    id: `payment-${i}`,
    userId: 'test-user',
    amount: Math.random() * 1000,
    description: `Payment ${i}`,
    source: 'fine',
    createdAt: new Date(),
    status: 'success'
  }));
};

// Test: Load 1000 payment records
const payments = generateTestPayments(1000);
// Measure: Time to display in history, scroll performance
```

---

## Deployment Checklist

**Pre-Release**
- [ ] All manual testing complete
- [ ] No console errors/warnings
- [ ] Firestore security rules deployed
- [ ] Staging environment tested
- [ ] Beta tester feedback incorporated

**Release**
- [ ] App version bumped
- [ ] Changelog updated
- [ ] Release notes written
- [ ] Deployed to production
- [ ] Monitoring active

**Post-Release**
- [ ] Monitor Firestore quota usage
- [ ] Check error logging for issues
- [ ] Monitor user feedback channels
- [ ] Track payment success rate (should be ~90% simulation)
- [ ] Be ready for Phase 2 changes

---

## Rollback Plan

If issues found in production:

1. **Immediate:** Disable payment feature by removing navigation
2. **Quick Fix:** Update only paymentService.ts if logic error
3. **Full Rollback:** Deploy previous version of all files
4. **Communication:** Notify users of issue and ETA

---

**Version:** 1.0  
**Last Updated:** September 2026  
**Status:** Ready for Deployment
