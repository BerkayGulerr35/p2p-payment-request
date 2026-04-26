# Feature Specification: P2P Payment Request

**Feature Branch**: `001-p2p-payment-requests`
**Created**: 2026-04-27
**Status**: Draft
**Input**: User description: "P2P Payment Request — a peer-to-peer payment request feature where a registered user can ask another registered user for money. Core flow: sender creates a request to a registered recipient with amount in USD and an optional memo; recipient pays or declines; sender can cancel while pending; requests auto-expire 7 days after creation. Statuses: pending, paid, declined, cancelled, expired. Money stored as integer cents (BIGINT), USD only, between $0.01 and $1,000,000.00. Magic-link auth (mockable in demo). RLS at the DB layer: users see only their requests; only recipient pays/declines; only sender cancels. Public read-only summary URL per request. Idempotent pay via a payment_events table."

## User Scenarios & Testing

### User Story 1 - Send a payment request (Priority: P1)

A registered user wants to ask another registered user for money. They open the app, fill in the recipient's email, the amount, and an optional short note. The system creates a request that the recipient can see on their dashboard.

**Why this priority**: This is the core value of the product. Without the ability to send a request, no other feature has meaning. Without User Story 1, there is no MVP.

**Independent Test**: User A logs in, fills out the request form for User B with a valid amount, and submits. Confirm that User B sees the new request in their incoming list with status "pending".

**Acceptance Scenarios**:

1. **Given** User A is logged in and User B is registered, **When** User A submits a request to User B's email for $50.00 with memo "Lunch", **Then** the system creates a pending request and shows it in User A's outgoing list and User B's incoming list.
2. **Given** User A is logged in, **When** User A submits a request to an email that is not registered, **Then** the system rejects the request with a clear "recipient not found" message and creates no record.
3. **Given** User A is logged in, **When** User A submits an amount of $0.00 or above $1,000,000.00 or with more than 2 decimal places, **Then** the system rejects the request with a clear validation error and creates no record.
4. **Given** User A is logged in, **When** User A submits a request to their own email, **Then** the system rejects with a clear "you cannot request from yourself" error.

---

### User Story 2 - Pay or decline an incoming request (Priority: P1)

A user receives a payment request from another user. They open their incoming requests, view the detail, and either pay it (simulated) or decline it. The status changes immediately and the original sender sees the update.

**Why this priority**: A request that cannot be acted on is just a notification. Pay and decline complete the core loop and are essential to the MVP.

**Independent Test**: With a pre-seeded pending request, User B logs in, opens the detail, clicks "Pay", waits for the simulated 2–3 second loading, and confirms the status updates to "paid" for both User A and User B.

**Acceptance Scenarios**:

1. **Given** a pending request where User B is the recipient, **When** User B clicks "Pay" and the loading completes, **Then** the request status is "paid" and exactly one payment event is recorded.
2. **Given** a pending request where User B is the recipient, **When** User B clicks "Decline", **Then** the request status is "declined" and User A sees the change.
3. **Given** a request that is already paid, declined, expired, or cancelled, **When** User B tries to pay or decline again, **Then** the system blocks the action with a clear message and the status does not change.
4. **Given** a pending request, **When** User B accidentally clicks "Pay" twice in quick succession, **Then** the request transitions to "paid" exactly once and no duplicate payment event is recorded.
5. **Given** a pending request where User B is NOT the recipient, **When** User B tries to pay or decline it (e.g., via a guessed URL), **Then** the action is blocked at the database layer regardless of the UI.

---

### User Story 3 - Cancel an outgoing pending request (Priority: P2)

A user changes their mind about a request they sent. They open the request detail and cancel it before the recipient acts on it. The recipient can no longer pay or decline.

**Why this priority**: This protects the sender from a request they sent in error. Important but not blocking — without it, the sender can still wait for the 7-day expiry.

**Independent Test**: User A creates a pending request. User A opens the detail and clicks "Cancel". Confirm the status becomes "cancelled" and User B can no longer pay or decline it.

**Acceptance Scenarios**:

1. **Given** a pending request where User A is the sender, **When** User A clicks "Cancel", **Then** the status becomes "cancelled" and the recipient view reflects this immediately.
2. **Given** a request that is no longer pending, **When** User A tries to cancel, **Then** the action is blocked with a clear message.
3. **Given** a pending request where User A is NOT the sender, **When** User A tries to cancel via any path, **Then** the action is blocked at the database layer.

---

### User Story 4 - Auto-expire pending requests after 7 days (Priority: P2)

A request that nobody acts on for seven days is automatically marked as expired. Both sender and recipient see this status change, and the request can no longer be paid, declined, or cancelled.

**Why this priority**: Closes the loop on abandoned requests so dashboards do not fill with stale items. Important for hygiene but not part of the live core flow.

**Independent Test**: Create a request with a backdated created-at value (older than 7 days). Run the expiry job. Confirm the status becomes "expired" and any subsequent pay/decline/cancel attempt is rejected.

**Acceptance Scenarios**:

1. **Given** a pending request whose expiry timestamp has passed, **When** the expiry job runs, **Then** the request status becomes "expired".
2. **Given** an expired request, **When** the recipient or sender tries to pay, decline, or cancel, **Then** the action is blocked at the database layer.

---

### User Story 5 - Public shareable read-only link (Priority: P3)

The sender wants to share a request with the recipient through any channel (e.g., a chat app). They copy a public URL that shows a read-only summary of the request. Anyone with the URL can view the summary without logging in, but cannot perform any action.

**Why this priority**: Improves shareability and looks polished in a demo, but the core flow already works through the dashboard. Lower priority.

**Independent Test**: For an existing pending request, retrieve its public URL and open it in an incognito browser (no auth). Confirm the page shows the amount, memo, status, and sender display name only — no list view, no edit, no pay/decline buttons.

**Acceptance Scenarios**:

1. **Given** any request, **When** an unauthenticated visitor opens its public URL, **Then** the page renders a read-only summary (amount, memo, status, sender display name) and no action controls.
2. **Given** an unauthenticated visitor, **When** they try to navigate to a list URL or modify a request via any path, **Then** the system blocks the action.
3. **Given** the public URL of a request, **When** a visitor inspects the URL, **Then** the identifier is unguessable (not a sequential numeric ID).

---

### User Story 6 - Dashboard with filter and search (Priority: P3)

A user with many requests wants to find a specific one quickly. They filter by status (e.g., only pending) and search by counterparty display name or memo content.

**Why this priority**: Improves the experience as data grows, but with a few requests the basic list is enough. Nice to have.

**Independent Test**: Seed 10+ requests with varied statuses and counterparties. As a logged-in user, apply a status filter and a search term. Confirm only matching items appear.

**Acceptance Scenarios**:

1. **Given** a dashboard with 10+ requests, **When** the user filters by "pending", **Then** only pending requests are shown in both incoming and outgoing lists.
2. **Given** a dashboard with multiple requests, **When** the user searches "Lunch", **Then** only requests whose memo or counterparty display name contains "Lunch" are shown.

---

### Edge Cases

- The recipient email is given with mixed case (e.g., `User@Example.com` vs `user@example.com`) — lookup is case-insensitive.
- The user submits the request form twice in quick succession (double-click) — only one request is created.
- A network error happens after a payment is recorded but before the UI updates — the next page load shows the correct "paid" status; no duplicate payment event exists.
- The displayed countdown reaches zero before the expiry job runs — the UI shows "Expired" visually, but the server status remains "pending" until the job runs; any action attempted in this window is still rejected by the server-side rules (since attempt fails the "pending+expiry not yet passed" check).
- The user pastes an amount with thousand-separator commas (e.g., `1,000.00`) — the UI normalizes or rejects with a clear message; the server only accepts a clean numeric value.
- The user pastes a memo longer than 280 characters — the UI prevents submission with a length warning; the server enforces the limit too.
- Two users trigger pay and cancel on the same pending request at almost the same time — only one transition wins; the loser sees a clear "request is no longer pending" error.

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow a logged-in user to create a payment request by entering a recipient email, an amount in USD, and an optional memo of at most 280 characters.
- **FR-002**: System MUST verify the recipient is a registered user; if not, MUST reject creation with a clear "recipient not found" message and persist no record.
- **FR-003**: System MUST validate amounts are between $0.01 and a configurable maximum (default $1,000,000.00) and have at most 2 decimal places.
- **FR-004**: System MUST store amounts as integer cents in BIGINT columns and never as floating-point numbers.
- **FR-005**: System MUST create new requests with status `pending` and an expiry timestamp set to 7 days after creation time.
- **FR-006**: System MUST allow only the recipient to pay or decline a request, and only while the request is in `pending` status.
- **FR-007**: System MUST allow only the sender to cancel a request, and only while the request is in `pending` status.
- **FR-008**: System MUST automatically transition pending requests to `expired` once their expiry timestamp has passed, within 1 hour of crossing the threshold.
- **FR-009**: System MUST guarantee that the pay action is idempotent: re-clicking pay or replaying the request MUST never produce more than one payment event for the same request.
- **FR-010**: System MUST enforce all access rules (read scope, who-can-do-what) at the database layer via Row-Level Security policies, not only in application code.
- **FR-011**: System MUST simulate payment processing with a visible 2–3 second loading state before confirming the status change.
- **FR-012**: System MUST display a dashboard with two sections — outgoing requests (where the user is sender) and incoming requests (where the user is recipient).
- **FR-013**: System MUST allow filtering the dashboard by status (`pending`, `paid`, `declined`, `expired`, `cancelled`).
- **FR-014**: System MUST allow searching the dashboard by counterparty display name or memo content (case-insensitive substring match).
- **FR-015**: System MUST show a request detail view with all fields, current status, and a live countdown to expiry while the request is pending.
- **FR-016**: System MUST expose a public, read-only summary URL per request that any unauthenticated visitor can view (showing amount, memo, status, sender display name only — no action controls and no list endpoint).
- **FR-017**: System MUST authenticate users via magic link in production; in development/demo mode, MUST also support an instant-login shortcut for two seeded users (e.g., Alice and Bob) so the recording does not require an inbox click-through.
- **FR-018**: System MUST treat email lookups for the recipient as case-insensitive; the `users.email` column MUST enforce case-insensitive uniqueness.
- **FR-019**: System MUST reject self-requests (where sender equals recipient) at submission time.
- **FR-020**: System MUST be responsive across mobile and desktop screen sizes without layout breakage.
- **FR-021**: System MUST identify each request publicly by an unguessable identifier (e.g., UUID v4) — sequential numeric IDs MUST NOT be used in the public URL.

### Key Entities

- **User**: A registered person who can act as sender, recipient, or both. Holds a unique case-insensitive email and a display name. Authentication is handled by the platform's magic link flow.
- **Payment Request**: A single ask for money. Holds a sender, a recipient, an amount in cents, an optional memo, a status (`pending` | `paid` | `declined` | `cancelled` | `expired`), a created-at timestamp, an expires-at timestamp, and a public unguessable identifier.
- **Payment Event**: An immutable record of a state transition on a request — created when the recipient pays or declines, when the sender cancels, or when the request expires. Carries the actor, the new status, and a unique key per (request, event_type) so duplicates are rejected by the database.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A logged-in user can submit a complete payment request (email, amount, memo) in under 30 seconds from landing on the dashboard.
- **SC-002**: A recipient can find and pay a pending request from their dashboard in under 15 seconds.
- **SC-003**: 100% of pay actions result in exactly one recorded payment event, even when the user double-clicks or refreshes mid-action.
- **SC-004**: 100% of pending requests older than 7 days transition to `expired` within 1 hour of crossing the threshold.
- **SC-005**: An unauthenticated visitor with the public URL of a request can view its summary, but cannot list, modify, pay, decline, or cancel any request — verified by automated tests.
- **SC-006**: 100% of attempts to pay, decline, or cancel a non-pending request are blocked at the database layer, even when the application or UI is bypassed.
- **SC-007**: 100% of stored amounts pass a check that the value is an integer (cents), is non-null, and is within the configured min/max bounds.
- **SC-008**: Across the full E2E suite, every primary user journey (create, pay, decline, cancel, expiry, public link, filter, search) is exercised on both mobile and desktop viewports without layout breaks.
- **SC-009**: A first-time viewer of the deployed app can complete the full sender→recipient happy path (create, pay) without reading documentation, in under 2 minutes.

## Assumptions

- Recipients must be registered users in MVP — sending to unknown emails fails validation. Invite-by-email flow is out of scope.
- Single currency is USD only. No currency selector and no FX conversion.
- The pay action is a simulation only — no real payment processor is integrated. The product visibly shows a 2–3 second processing state and records a payment event in the database.
- Email is matched case-insensitively at lookup; display names are stored as entered.
- Magic-link login is the production authentication path; for the demo recording, a dev-mode "instant login as Alice/Bob" shortcut is acceptable to avoid the inbox round-trip on camera. The dev shortcut MUST NOT be reachable in production environments.
- Notifications (email, push) are out of scope for MVP — visual indication on the dashboard is the only signal.
- Editing a request after creation is out of scope — only cancel is supported.
- Storage of amounts as integer cents is non-negotiable across all layers (form input → API → DB → reporting).
- Background expiry job runs at least every hour (e.g., via `pg_cron`); finer cadence is acceptable but not required.
- Public URL identifiers are UUID v4 or equivalently unguessable tokens — sequential or short-numeric identifiers are NOT acceptable for the public route.
- Two seeded demo users (Alice and Bob) are present in the development environment for the recorded walkthrough.
