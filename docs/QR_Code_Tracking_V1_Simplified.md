# QR Code Tracking - V1 Simplified Guide
## E-Press Dry Cleaning Business - MVP Version

---

## Table of Contents
1. [Overview](#overview)
2. [V1 Simplified Approach](#v1-simplified-approach)
3. [Order-Level QR System](#order-level-qr-system)
4. [Simplified Workflow](#simplified-workflow)
5. [Handling Count Discrepancies](#handling-count-discrepancies)
6. [App Features for V1](#app-features-for-v1)
7. [Implementation Checklist](#implementation-checklist)

---

## Overview

### What's Different in V1?

This simplified version focuses on getting your QR tracking system up and running **quickly** with minimal complexity.

| Feature | Full Version | V1 Simplified |
|---------|--------------|---------------|
| **QR Codes** | Order + Each item | Order only |
| **Scan Points** | 7 checkpoints | 4 checkpoints |
| **Staff Roles** | Receptionist + Cleaner + QC | Cleaner does everything |
| **Item Tracking** | Per-item status | Bag-level status |
| **Tags** | Multiple tags per order | 1 tag per order bag |
| **Implementation** | 4-6 weeks | 1-2 weeks |

**Goal:** Get a working tracking system running fast, then improve later based on real-world feedback.

---

## V1 Simplified Approach

### Core Principle

> **Track the ORDER BAG as a single unit**  
> Customer confirms item count → Cleaner confirms count → Process bag → Deliver

**Benefits:**
- ✅ Faster to implement
- ✅ Easier staff training
- ✅ Less scanning = faster processing
- ✅ Lower initial cost (fewer tags/scanners)

**Trade-offs:**
- ⚠️ Can't track individual items separately
- ⚠️ If one item goes missing, harder to pinpoint when
- ⚠️ Entire bag moves together (can't split orders)

**When to upgrade to Full Version:**
- After processing 500+ orders successfully
- When you have multiple locations
- When customer base grows significantly
- After you've validated the business model

---

## Order-Level QR System

### Single QR Code per Order

Each order gets **ONE** QR code that stays with the bag throughout the entire process.

```
┌─────────────────────────────────────┐
│  ORDER BAG                          │
│                                     │
│  [LARGE QR CODE]                    │
│                                     │
│  Order ID: ORD-20260111-001         │
│  Customer: John Doe                 │
│  Phone: +241 XX XX XX XX            │
│  Total Items: 5                     │
│  Service: Dry Clean + Iron          │
│                                     │
│  ITEMS LIST:                        │
│  ✓ 2 Shirts (white)                 │
│  ✓ 1 Pants (black)                  │
│  ✓ 1 Coverall (blue)                │
│  ✓ 1 Dress (red)                    │
│                                     │
│  Customer Notes:                    │
│  "Stain on white shirt collar"     │
│                                     │
│  Pickup: 2026-01-11 10:30           │
│  Expected Delivery: 2026-01-12 18:00│
└─────────────────────────────────────┘
```

**Physical Tag:** A laminated card or durable plastic tag attached to the outside of the transparent bag.

---

### QR Code Contains

```javascript
{
  order_id: "ORD-20260111-001",
  customer_id: "CUST-12345",
  customer_name: "John Doe",
  customer_phone: "+241XXXXXXXX",
  total_items: 5,
  item_list: [
    { category: "shirt", color: "white", quantity: 2 },
    { category: "pants", color: "black", quantity: 1 },
    { category: "coverall", color: "blue", quantity: 1 },
    { category: "dress", color: "red", quantity: 1 }
  ],
  customer_order_comment: "Need by Friday evening",
  customer_item_comment: "Stain on white shirt collar",
  service_type: "dry_clean_and_iron",
  priority: "standard", // or "express"
  pickup_time: "2026-01-11T10:30:00Z",
  expected_delivery: "2026-01-12T18:00:00Z",
  count_confirmed_by_customer: true,
  customer_signature_url: "https://..."
}
```

---

## Simplified Workflow

### 4 Scan Checkpoints Only

| # | Checkpoint | Who | Where | Status Update |
|---|------------|-----|-------|---------------|
| **1** | **Pickup** | Courier | Customer location | "Picked Up" |
| **2** | **Reception** | Cleaner | Cleaning center | "Received - Cleaning" |
| **3** | **Ready** | Cleaner | Cleaning center | "Ready for Delivery" |
| **4** | **Delivery** | Courier | Customer location | "Delivered" |

---

### Step-by-Step Process

### 🔵 **Step 1: Customer Order (App)**

**Customer actions:**
1. Creates order in app
2. Selects items from categories (shirts, pants, jackets, etc.)
3. **Adds item count per category:**
   - Example: 2 shirts, 1 pants, 1 jacket = **4 items total**
4. **Can add comments in two places:**
   - **Order Comment:** General notes (e.g., "Need by Friday for wedding")
   - **Item Comment:** Specific item notes (e.g., "Red wine stain on blue shirt sleeve")
5. Takes photos (optional but recommended)
6. Confirms total item count
7. Schedules pickup time

**System generates:**
- Order ID with QR code
- Digital receipt displayed in the app (accessible in order details)
- Order broadcast to all available couriers in the system

**Smart Courier Assignment:**
- All active couriers receive the order notification
- First courier to accept takes charge of the pickup
- Accepted courier automatically receives the digital receipt and order details
- System updates order status to "Assigned to Courier"


---

### 🔵 **Step 2: Courier Pickup**

**Location:** Customer's home/office  
**Actor:** Pickup Courier  
**Time:** ~5 minutes

#### Process:

1. **Courier arrives with:**
   - Pre-printed QR tag for the order (printed at base before leaving, or automatically sent to courier when they accept the order)
   - Digital receipt and order details (automatically delivered in courier app when order is accepted)
   - Transparent plastic bag
   - Smartphone with integrated scanner in the courier interface

2. **With customer:**
   - **Count items together with customer**
   - Customer confirms: "Yes, I have 4 items"
   - Place all items in transparent bag
   - Attach QR tag to outside of bag
   - **Scan QR code** using integrated scanner in courier interface → System updates: "Picked Up"
   - Customer signs on courier's phone confirming count
   - **Take photo of bagged items (REQUIRED)** - Photos provide visual proof of items at pickup

3. **Important count confirmation screen in app:**
```
┌────────────────────────────────────┐
│  Order: ORD-20260111-001           │
│                                    │
│  Expected Items: 4                 │
│  Customer Confirms: [YES] [NO]     │
│                                    │
│  If NO, enter actual count: [ ]   │
│                                    │
│  [Customer Signature Pad]          │
│  [CONFIRM PICKUP]                  │
└────────────────────────────────────┘
```

4. **If count doesn't match:**
   - Courier updates actual count in app
   - System sends alert to admin
   - Customer acknowledges the discrepancy with signature
   - Proceed with actual count

---

### 🔵 **Step 3: Delivery to Cleaning Center**

**Location:** Cleaning center  
**Actor:** Courier  
**Time:** ~2 minutes

1. Courier places order bags in "Incoming Orders" area
2. **Doesn't need to scan** - will be scanned by cleaner at reception

---

### 🔵 **Step 4: Reception & Processing**

**Location:** Cleaning center  
**Actor:** Cleaner (same person does reception + cleaning)  
**Time:** ~10 minutes

#### Reception Process:

1. **Cleaner picks up order bag from incoming area**

2. **Scans QR code** → System shows:
```
┌────────────────────────────────────────┐
│  ORDER DETAILS                         │
│  ORD-20260111-001                      │
│                                        │
│  Customer: John Doe                    │
│  Expected Items: 4                     │
│  Confirmed at Pickup: 4 ✓              │
│                                        │
│  ITEM BREAKDOWN:                       │
│  • 2 Shirts (white)                    │
│  • 1 Pants (black)                     │
│  • 1 Coverall (blue)                   │
│                                        │
│  CUSTOMER COMMENTS:                    │
│  Order: "Need by Friday"               │
│  Items: "Stain on white shirt collar" │
│                                        │
│  Service: Dry Clean + Iron             │
│  Priority: Standard (24h)              │
│                                        │
│  [COUNT ITEMS NOW]                     │
└────────────────────────────────────────┘
```

3. **Cleaner opens bag and counts items physically**

4. **Enters actual count in app:**
```
┌────────────────────────────────────┐
│  VERIFY ITEM COUNT                 │
│                                    │
│  Expected: 4 items                 │
│  Actual count: [ 4 ] ✓             │
│                                    │
│  Count matches? [YES] [NO]         │
│                                    │
│  If NO, explain discrepancy:       │
│  [                              ]  │
│                                    │
│  [CONFIRM & START PROCESSING]      │
└────────────────────────────────────┘
```

5. **System updates status:** "Received at Base - In Cleaning"

6. **QR tag stays attached to bag** - no need to remove or detach

7. Cleaner processes the order (washing/dry cleaning/ironing)

8. During processing, cleaner can update status via quick scan:
   - Scan QR → Tap status button → Select status → Done
   - Status options: "In Washing", "In Drying", "In Ironing", "Quality Check"

---

### 🔵 **Step 5: Completion**

**Actor:** Cleaner  
**Time:** ~5 minutes

1. **After cleaning is done:**
   - Fold/hang items neatly
   - Place back in same bag (or new protective bag)
   - Keep QR tag attached

2. **Scan QR code** → Update status: "Ready for Delivery"

3. Place in "Ready for Pickup" area organized by delivery route

---

### 🔵 **Step 6: Delivery Courier Pickup**

**Location:** Cleaning center  
**Actor:** Delivery Courier  
**Time:** ~2 minutes

**Smart Delivery Assignment:**
1. When cleaner marks order as "Ready for Delivery", system broadcasts the delivery request to all available couriers
2. Couriers receive notification with delivery details (customer location, items, delivery time window)
3. First courier to accept the delivery takes charge of the order
4. **Courier scans order bag QR code** when collecting from cleaning center
5. System updates: "Out for Delivery" 
6. App shows optimized delivery route and customer addresses for all accepted deliveries

---

### 🔵 **Step 7: Customer Delivery**

**Location:** Customer's location  
**Actor:** Delivery Courier  
**Time:** ~5 minutes

1. **Scan QR code** at customer location

2. **Customer verifies items:**
```
┌────────────────────────────────────┐
│  DELIVERY CONFIRMATION             │
│                                    │
│  Order: ORD-20260111-001           │
│  Customer: John Doe                │
│                                    │
│  Expected Items: 4                 │
│  Please count items: [ 4 ] ✓       │
│                                    │
│  Items match? [YES] [NO]           │
│                                    │
│  Quality satisfied? [YES] [NO]     │
│                                    │
│  If issues, describe:              │
│  [                              ]  │
│                                    │
│  [Customer Signature]              │
│  [COMPLETE DELIVERY]               │
└────────────────────────────────────┘
```

3. Customer signs confirming receipt

4. System updates: "Delivered"

5. **If customer reports missing items:**
   - Courier documents complaint immediately
   - System sends urgent alert to manager
   - Follow emergency procedure (see below)

---

## Handling Count Discrepancies

This is **critical** - you need clear procedures for when counts don't match.

---

### Scenario 1: Count Mismatch at Pickup

**Problem:** Customer ordered 5 items but only has 4 ready.

**Solution:**
```
┌────────────────────────────────────────┐
│  COUNT DISCREPANCY AT PICKUP           │
│                                        │
│  Expected: 5 items                     │
│  Customer has: 4 items                 │
│                                        │
│  OPTIONS:                              │
│  [1] Proceed with 4 items (Update)     │
│  [2] Customer will add 5th item now    │
│  [3] Cancel order                      │
│                                        │
│  If Option 1 selected:                 │
│  • System updates order to 4 items     │
│  • Adjusts price if needed             │
│  • Customer signs confirming 4 items   │
│  • Proceed normally                    │
└────────────────────────────────────────┘
```

**Key:** Customer signature acknowledges the actual count, protecting you legally.

---

### Scenario 2: Count Mismatch at Reception (Cleaning Center)

**Problem:** Pickup courier confirmed 4 items, but cleaner only counts 3 items in bag.

> [!CAUTION]
> **This is a CRITICAL situation** - an item was lost during transport.

**Immediate Actions:**

1. **System automatically alerts:**
   - Courier who picked up the order
   - Manager/Admin
   - Creates incident report

2. **Cleaner's screen shows:**
```
┌────────────────────────────────────────┐
│  ⚠️ COUNT DISCREPANCY ALERT ⚠️          │
│                                        │
│  Order: ORD-20260111-001               │
│                                        │
│  Picked up: 4 items ✓                  │
│  Received: 3 items ✗                   │
│                                        │
│  MISSING: 1 item                       │
│                                        │
│  REQUIRED ACTIONS:                     │
│  ✓ Photo the bag contents NOW          │
│  ✓ List what you see:                  │
│    [                                ]  │
│                                        │
│  ✓ Contact courier immediately         │
│    [CALL COURIER]                      │
│                                        │
│  ✓ Check vehicle/other bags            │
│                                        │
│  DO NOT PROCESS until resolved         │
│  [SUPERVISOR OVERRIDE NEEDED]          │
└────────────────────────────────────────┘
```

3. **Resolution steps:**

**Option A: Item found in courier's vehicle**
- Courier brings missing item
- Cleaner re-counts and confirms
- System updates: "Discrepancy Resolved - Proceeding"
- Document the incident for training

**Option B: Item found in another order's bag** (mixed up)
- Separate the items correctly
- Re-scan both orders with correct counts
- Document incident
- Retrain courier on separation procedures

**Option C: Item truly missing**
- Manager calls customer immediately
- Explain situation honestly
- Offer options:
  1. Proceed with remaining items + compensation/discount
  2. Cancel entire order
  3. Courier returns to customer to verify
- Customer decides and signs acknowledgment
- Update order in system
- Create incident report

**Database tracking:**
```javascript
// Discrepancy record
{
  discrepancy_id: "DISC-001",
  order_id: "ORD-20260111-001",
  type: "count_mismatch_at_reception",
  expected_count: 4,
  actual_count: 3,
  variance: -1,
  reported_by: "cleaner_user_id",
  reported_at: timestamp,
  courier_id: "courier_user_id",
  resolution: "item_found_in_vehicle", // or "customer_approved_3_items" or "order_cancelled"
  resolved_at: timestamp,
  resolved_by: "manager_user_id",
  customer_contacted: true,
  customer_response: "Approved proceeding with 3 items",
  compensation_offered: "10% discount",
  notes: "Item was in courier's vehicle trunk"
}
```

---

### Scenario 3: Count Mismatch at Delivery

**Problem:** Order should have 4 items, customer counts only 3.

> [!CAUTION]
> **Item lost during cleaning process**

**Immediate Actions:**

1. **Courier's app shows:**
```
┌────────────────────────────────────────┐
│  ⚠️ CUSTOMER REPORTS MISSING ITEM ⚠️    │
│                                        │
│  Order: ORD-20260111-001               │
│  Expected: 4 items                     │
│  Customer counts: 3 items              │
│                                        │
│  REQUIRED ACTIONS:                     │
│  ✓ Stay with customer                  │
│  ✓ Photo what customer received        │
│  ✓ Ask: What specific item is missing? │
│    [                                ]  │
│                                        │
│  ✓ Check if item is still in vehicle   │
│  ✓ Contact cleaning center NOW         │
│    [CALL CENTER]                       │
│                                        │
│  Customer options while investigating: │
│  [1] Wait for resolution (15 mins)     │
│  [2] Take current items, resolve later │
│                                        │
│  [ESCALATE TO MANAGER]                 │
└────────────────────────────────────────┘
```

2. **Cleaning center checks:**
   - Search Ready for Delivery area
   - Check if item is still being processed
   - Review security cameras if available
   - Check other orders processed same day (might be mixed)

3. **Resolution options:**

**If found at cleaning center:**
- Rush item to completion
- Express delivery to customer (free)
- Apologize + small compensation
- Update system: "Partial delivery - Completed"

**If not found:**
- Manager speaks with customer directly
- Offer:
  1. **Full refund** for missing item
  2. **Replacement** if possible (buy similar item)
  3. **Compensation** (significant discount or free services)
- Customer decides
- Get written acknowledgment
- Update system with resolution
- Create detailed incident report

---

### Count Confirmation Best Practices

#### At Pickup (Courier):
1. ✅ **Always count with customer present**
2. ✅ **Take photo of items before bagging** (if customer agrees)
3. ✅ **Customer must sign/confirm count** on phone
4. ✅ **If count changes, update system immediately**
5. ✅ **One order = one bag** (don't mix orders)

#### At Reception (Cleaner):
1. ✅ **Count immediately upon scanning QR**
2. ✅ **Compare with pickup count shown in app**
3. ✅ **If mismatch, STOP and investigate before processing**
4. ✅ **Take photo if discrepancy exists**
5. ✅ **Don't assume courier was wrong** - investigate thoroughly

#### At Delivery (Courier):
1. ✅ **Ask customer to count items before signing**
2. ✅ **Don't rush customer**
3. ✅ **If customer reports issue, don't leave until documented**
4. ✅ **Take photo of delivered items**
5. ✅ **Get signature confirming receipt**

---

### System Safeguards

**Automated checks:**

```javascript
// System validation logic
function validateCount(checkpoint, order) {
  const expectedCount = order.confirmed_count;
  const actualCount = checkpoint.actual_count;
  
  if (actualCount !== expectedCount) {
    // Trigger alert
    sendAlert({
      type: 'COUNT_MISMATCH',
      severity: 'HIGH',
      order_id: order.id,
      expected: expectedCount,
      actual: actualCount,
      checkpoint: checkpoint.name,
      staff_id: checkpoint.staff_id,
      timestamp: now(),
      requires_resolution: true,
      customer_notification: checkpoint.name === 'delivery' ? true : false
    });
    
    // Block progression until resolved
    order.status = 'ON_HOLD_DISCREPANCY';
    order.requires_manager_approval = true;
    
    return false;
  }
  
  return true;
}
```

**Manager dashboard shows:**
- All active discrepancies
- Time since discrepancy reported
- Which staff member reported
- Current status of investigation
- Customer contact status

---

## App Features for V1

### Customer App - Simplified

#### Order Creation Screen:
```
┌────────────────────────────────────┐
│  📦 New Order                      │
│                                    │
│  SELECT ITEMS:                     │
│  ┌──────────────────────────────┐ │
│  │ Shirts           [  2  ] ⊕ ⊖ │ │
│  │ Pants            [  1  ] ⊕ ⊖ │ │
│  │ Dresses          [  1  ] ⊕ ⊖ │ │
│  │ Suits            [  0  ] ⊕ ⊖ │ │
│  │ Coveralls        [  0  ] ⊕ ⊖ │ │
│  │ Officer Uniforms [  0  ] ⊕ ⊖ │ │
│  │ Other            [  0  ] ⊕ ⊖ │ │
│  └──────────────────────────────┘ │
│                                    │
│  TOTAL ITEMS: 4                    │
│                                    │
│  💬 COMMENTS (Optional):           │
│  ┌────────────────────────────────┐│
│  │ Order Comment:                 ││
│  │ [Need by Friday evening     ]  ││
│  │                                ││
│  │ Item Notes:                    ││
│  │ [Stain on white shirt collar]  ││
│  └────────────────────────────────┘│
│                                    │
│  📸 Add Photos (Optional)          │
│  [+ Add Photo]                     │
│                                    │
│  🚚 Service Type:                  │
│  ⚪ Standard (24h) - $10           │
│  ⚪ Express (12h) - $15            │
│                                    │
│  📅 Pickup Time:                   │
│  [Select Date/Time ▼]              │
│                                    │
│  [CONFIRM ORDER]                   │
└────────────────────────────────────┘
```

#### Order Tracking Screen:
```
┌────────────────────────────────────┐
│  📍 Track Order #ORD-001           │
│                                    │
│  ● Picked Up ✓                     │
│  │ Jan 11, 10:30 AM                │
│  │                                 │
│  ● Received at Center ✓            │
│  │ Jan 11, 11:15 AM                │
│  │ Count verified: 4 items ✓       │
│  │                                 │
│  ● Processing... 🔄                 │
│  │ Current: In Dry Cleaning        │
│  │ Est. completion: 4:00 PM        │
│  │                                 │
│  ○ Ready for Delivery               │
│  │ (Pending)                       │
│  │                                 │
│  ○ Delivered                        │
│  │ (Pending)                       │
│                                    │
│  ℹ️ Item Count: 4                   │
│  ℹ️ Service: Dry Clean + Iron       │
│                                    │
│  [CONTACT SUPPORT]                 │
│  [VIEW RECEIPT]                    │
└────────────────────────────────────┘
```

---

### Courier App - Simplified

**Key features:**
1. **QR Scanner** - One tap to scan
2. **Count Confirmation** - Simple number input
3. **Customer Signature** - Touch screen signature
4. **Photo Capture** - Quick camera access
5. **Status Updates** - One-tap status change
6. **Discrepancy Reporting** - Red alert button

**Main Screen:**
```
┌────────────────────────────────────┐
│  🚗 My Deliveries                  │
│                                    │
│  PICKUPS (3):                      │
│  ┌──────────────────────────────┐ │
│  │ 10:30 - John Doe              │ │
│  │ 123 Main St (4 items)         │ │
│  │ [SCAN QR] [NAVIGATE]          │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 11:00 - Jane Smith            │ │
│  │ 456 Oak Ave (2 items)         │ │
│  │ [SCAN QR] [NAVIGATE]          │ │
│  └──────────────────────────────┘ │
│                                    │
│  DELIVERIES (5):                   │
│  ┌──────────────────────────────┐ │
│  │ 6:00 PM - Mike Johnson        │ │
│  │ 789 Pine Rd (3 items)         │ │
│  │ [SCAN QR] [NAVIGATE]          │ │
│  └──────────────────────────────┘ │
│                                    │
│  [VIEW OPTIMIZED ROUTE]            │
└────────────────────────────────────┘
```

---

### Cleaner App - Simplified

**Key features:**
1. **QR Scanner** with count verification
2. **Quick Status Updates** - Tap to change status
3. **View Order Details** - See customer comments
4. **Discrepancy Handling** - Guided workflow
5. **Ready Queue** - See what's ready for delivery

**Main Screen:**
```
┌────────────────────────────────────┐
│  🧺 Cleaning Center                │
│                                    │
│  📥 INCOMING (3 orders)             │
│  [SCAN NEW ORDER]                  │
│                                    │
│  🔄 IN PROCESS (8 orders):          │
│  ┌──────────────────────────────┐ │
│  │ ORD-001 • John Doe            │ │
│  │ Status: Dry Cleaning          │ │
│  │ 4 items • Due: 6:00 PM        │ │
│  │ [SCAN] [UPDATE STATUS]        │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ ORD-002 • Jane Smith          │ │
│  │ Status: Ironing               │ │
│  │ 2 items • Due: 8:00 PM        │ │
│  │ [SCAN] [UPDATE STATUS]        │ │
│  └──────────────────────────────┘ │
│                                    │
│  ✅ READY (2 orders)                │
│                                    │
│  ⚠️ ALERTS (0)                      │
│                                    │
│  [DAILY REPORT]                    │
└────────────────────────────────────┘
```

**When scanning an order:**
```
┌────────────────────────────────────┐
│  ORDER DETAILS - ORD-001           │
│                                    │
│  Customer: John Doe                │
│  Phone: +241 XX XX XX XX           │
│  Items: 4 (verified ✓)             │
│                                    │
│  BREAKDOWN:                        │
│  • 2 Shirts (white)                │
│  • 1 Pants (black)                 │
│  • 1 Coverall (blue)               │
│                                    │
│  📝 COMMENTS:                       │
│  Order: "Need by Friday evening"   │
│  Items: "Stain on white shirt      │
│          collar - use stain        │
│          remover"                  │
│                                    │
│  Current Status: Dry Cleaning      │
│                                    │
│  UPDATE STATUS:                    │
│  [In Washing] [In Drying]          │
│  [In Ironing] [Quality Check]      │
│  [Ready]                           │
│                                    │
│  [CLOSE]                           │
└────────────────────────────────────┘
```

---

## Implementation Checklist

### Week 1: Preparation

**Day 1-2: Planning**
- [ ] Review this guide with team
- [ ] Decide on QR tag type (laminated paper vs plastic)
- [ ] Order supplies:
  - [ ] QR code printer (thermal or regular)
  - [ ] Transparent plastic bags (various sizes)
  - [ ] Smartphone holders/scanners (2-3 units)
  - [ ] Backup power banks
- [ ] Design QR code layout and test print

**Day 3-4: System Setup**
- [ ] Update app to generate order-level QR codes
- [ ] Add count confirmation screens
- [ ] Add discrepancy handling workflows
- [ ] Add customer comment fields (order + item)
- [ ] Test QR scanning on all devices
- [ ] Create user manuals (1-page guides)

**Day 5-7: Training**
- [ ] Train couriers on:
  - [ ] Count confirmation with customers
  - [ ] Proper QR scanning
  - [ ] Bag labeling
  - [ ] Discrepancy reporting
- [ ] Train cleaner on:
  - [ ] Reception scanning
  - [ ] Count verification
  - [ ] Status updates
  - [ ] Handling mismatches
- [ ] Role-play different scenarios
- [ ] Practice with 5 mock orders

---

### Week 2: Pilot Launch

**Day 8-10: Soft Launch**
- [ ] Run with 10 real orders per day
- [ ] Manager observes all checkpoints
- [ ] Document any issues
- [ ] Gather staff feedback
- [ ] Refine procedures as needed

**Day 11-14: Full Launch**
- [ ] Process all orders through QR system
- [ ] Monitor for discrepancies
- [ ] Track scan compliance rate (target: 100%)
- [ ] Daily team debrief
- [ ] Customer feedback collection

---

### After Launch: Monitoring

**Daily:**
- [ ] Check scan compliance (all orders scanned at all 4 checkpoints)
- [ ] Review any discrepancy reports
- [ ] Track average processing time
- [ ] Customer satisfaction score

**Weekly:**
- [ ] Count discrepancy rate
- [ ] On-time delivery rate
- [ ] Staff feedback session
- [ ] System improvement ideas

**Monthly:**
- [ ] Evaluate if ready for full version upgrade
- [ ] Cost-benefit analysis
- [ ] Customer retention metrics
- [ ] Lost item rate

---

## Success Metrics for V1

Track these to know if system is working:

| Metric | Target | Red Flag |
|--------|--------|----------|
| **Scan compliance** | 100% | < 95% |
| **Count discrepancies** | < 2% | > 5% |
| **Lost items** | 0% | > 0.5% |
| **Customer complaints** | < 3% | > 10% |
| **On-time delivery** | > 95% | < 85% |
| **Average processing time** | < 24h | > 36h |

---

## When to Upgrade to Full Version

Consider upgrading when you meet **3 or more** of these criteria:

✅ Processing 50+ orders per day consistently  
✅ Zero lost items for 3 months straight  
✅ Multiple cleaning locations  
✅ Offering specialized services (wedding dresses, leather, etc.)  
✅ Want to track individual item journey for premium customers  
✅ Need to split orders (partial delivery)  
✅ Experiencing growth of 20%+ month-over-month  

---

## Quick Reference: What to Do When...

### ❓ Customer says "I think I have 5 items" but isn't sure
**→** Count together, customer confirms final count with signature

### ❓ Cleaner finds 3 items but system says 4
**→** STOP. Alert courier + manager. Don't process until resolved.

### ❓ Customer complains item was damaged during cleaning
**→** Check pickup photos. Document damage. Offer compensation. Add to training.

### ❓ QR code won't scan (damaged/wet)
**→** Manual order ID entry in app. Report issue. Replace tag.

### ❓ Power/internet outage at cleaning center
**→** Switch to offline mode (if implemented) or paper backup log. Sync when back online.

### ❓ Courier's phone dies mid-route
**→** Use backup power bank. Call center for order details if needed. Complete deliveries.

### ❓ Customer not home during delivery
**→** Call customer. Reschedule or leave with neighbor (if customer approves). Document.

---

## Cost Estimate for V1

### One-Time Costs:
| Item | Quantity | Unit Cost | Total |
|------|----------|-----------|-------|
| Thermal printer | 1 | $200 | $200 |
| QR tags (1000 pcs) | 1 | $50 | $50 |
| Plastic bags (500) | 1 | $30 | $30 |
| Smartphone scanners | 2 | $150 | $300 |
| Power banks | 3 | $20 | $60 |
| Training materials | - | $50 | $50 |
| **TOTAL** | | | **$690** |

### Monthly Costs:
- QR tags: ~$15 (assuming 300 orders/month)
- Plastic bags: ~$20
- **Total: ~$35/month**

---

## Final Tips for Success

> [!TIP]
> **Start small, iterate fast**
> 
> - Launch with 10 orders/day
> - Perfect the process
> - Then scale up

**Critical success factors:**

1. **Customer signatures at pickup**  
   → Protects you legally if count disputed later

2. **Photo everything**  
   → Photos at pickup + delivery = proof

3. **Immediate discrepancy handling**  
   → Don't delay, address issues instantly

4. **Staff buy-in**  
   → Explain WHY tracking matters, not just HOW

5. **Customer communication**  
   → Over-communicate status, especially if delays

---

## Next Steps

1. ✅ **Read this guide thoroughly**
2. ✅ **Share with your team**
3. ✅ **Order supplies** (printer, tags, bags)
4. ✅ **Update app** with count confirmation features
5. ✅ **Train staff** (half-day session)
6. ✅ **Run 5 test orders** with friends/family
7. ✅ **Launch with 10 real orders**
8. ✅ **Monitor and improve daily**
9. ✅ **Scale to full volume after 1 week**

**Remember:** This is Version 1. It doesn't need to be perfect. It needs to be **working and reliable**.

After 3-6 months of successful operation, you can upgrade to the full version with individual item tracking.

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-11  
**Related:** [QR_Code_Tracking_Management_Guide.md](file:///c:/Users/user/OneDrive/Documents/e-press/docs/QR_Code_Tracking_Management_Guide.md) (Full Version)

---

*Good luck with your launch! Track everything, communicate clearly, and your customers will trust you with their clothes.* 🚀
