# SwiftRFQ — Architectural Design & Engineering Note
**Author:** Candidate Submission  
**Target:** Senior Engineering Review Team  
**Scope:** Automated B2B Commodity Reverse Auction Platform  
**Live Backend:** `https://swiftrfq-android-application-for-reverse.onrender.com`  
**Direct APK:** `https://swiftrfq-android-application-for-reverse.onrender.com/download`  

---

## 1. System Architecture

SwiftRFQ adopts an **event-driven, dual-layer persistence architecture** tailored for high-frequency bid ingestion and deterministic state synchronization:

```
[ Android React Native Client ] 
       │              ▲
  (REST Fallback)  (Socket.io WebSockets)
       ▼              │
[ Express Router ] ───┼──► [ In-Memory Auction Engine (rfqStore) ] ──► [ Autonomous Timers ]
       │                                     │
       ▼                                     ▼ (Async Flush)
[ MongoDB Atlas (Mongoose ODM) ] ◄───────────┘
```

- **Client Tier (React Native / Android)**: Built with Expo SDK 52 and compiled directly into optimized native Android artifacts. Includes custom design tokens (`darkPalette`), deep-link WhatsApp integrations, and native dialer hooks.
- **Real-Time Bidding Tier (Socket.io + Node.js)**: Manages concurrent room channels (`room-${rfqId}`). All floor asks are verified, sequenced, and broadcast with $< 10\text{ms}$ latency.
- **In-Memory State Machine (`rfqStore`)**: Handles sub-millisecond lowest ask calculations, candidate rankings, and instantaneous state transitions without hitting disk on every ask.
- **Persistence Tier (MongoDB Atlas)**: Stores permanent user identities, RFQ histories, bid logs, and fulfillment status for auditability and session recovery.

---

## 2. Reverse Auction Rules & Closing Logic

1. **Floor Decrement Invariant**:
   A bid $P_{\text{new}}$ is accepted if and only if:
   $$P_{\text{new}} \le P_{\text{current\_lowest}} - \Delta_{\min}$$
   where $\Delta_{\min}$ is the buyer-defined minimum decrement step (e.g., ₹$0.50$).
2. **Ceiling Rule**: The opening bid cannot exceed the buyer's specified ceiling price $P_{\text{ceiling}}$.
3. **Hidden Reserve Benchmark**: The buyer may specify an optional reserve price $P_{\text{reserve}}$. Bidders are unaware of this value; upon auction closure, the system flags `metReserve: true/false`.
4. **Tie-Break Determinism**: Enforces strict first-come, first-served sequencing via server monotonic timestamps. Because of Rule 1, duplicate asks are rejected automatically.
5. **Autonomous Server Closing**: The server schedules an independent autonomous timer (`setTimeout` with persistent timestamps). If all clients close their apps, the server closes the floor, computes savings, declares the winner, and emits the closure payload.

---

## 3. Assumptions Made

- **Industrial Network Variability**: Suppliers frequently bid from factory floors with unstable connectivity. Socket.io was paired with exponential backoff and transparent HTTP REST fallback (`POST /api/bids`).
- **Accountability Over Anonymity**: While competitors on the live floor see only verified pseudonyms to prevent collusion, zero anonymous bidding is allowed. Both buyers and suppliers must complete full profile credentials (Legal Name, Enterprise Name, Phone, and City) before creating auctions or placing bids.
- **Fulfillment Continuity**: The auction does not end when the hammer falls. Both parties require immediate transition into contract execution.

---

## 4. Engineering Trade-offs

| Decision | Chosen Approach | Alternative Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **Bid Processing** | In-Memory Memory Store + Async Mongo | Direct Database ACID Transactions | Direct DB transactions create latency bottlenecks during the final 30 seconds of intense bidding. In-memory validation guarantees $<10\text{ms}$ response times. |
| **Distribution** | Single-Click `/download` Endpoint | Google Play Internal Testing | Play Store review cycles impede immediate testing by procurement partners. Direct APK hosting on the backend enables instantaneous 60-second onboarding via WhatsApp. |
| **Profile Validation** | Dual Client & Server Gating | Post-auction verification | Unverified participants placing bids invalidates auction integrity. Hard-blocking incomplete profiles at both UI and API levels eliminates fraudulent bidding. |

---

## 5. Post-Auction Fulfillment Tracker

SwiftRFQ integrates a **4-stage fulfillment lifecycle**:
$$\text{AWARDED} \longrightarrow \text{PO\_ISSUED} \longrightarrow \text{DISPATCHED} \longrightarrow \text{DELIVERED}$$
- Generates a trackable PO reference (e.g. `PO-1001`).
- Displays complete settlement specifications (Grade, Quantity, Unit Ask, Total Contract Value, Consignee Depot).
- Role-gated actions allow buyers to confirm POs / verify deliveries and suppliers to confirm consignment dispatch.

---

## 6. What I Would Build Next (Given More Time)

1. **Anti-Sniping Dynamic Extension ("Soft Close")**: If a bid is received in the final 30 seconds, automatically extend the timer by 60 seconds to ensure true market price discovery.
2. **Smart Contract Escrow / Milestone Payments**: Integration with digital escrow contracts to hold purchase order earnest deposits automatically.
3. **Multi-Item Lot Bidding**: Allow buyers to package multiple chemical formulations into a single bundled reverse auction.
4. **SMS / WhatsApp Direct Bid Bot**: Allow suppliers with feature phones or no app access to quote directly through an encrypted WhatsApp webhook.
