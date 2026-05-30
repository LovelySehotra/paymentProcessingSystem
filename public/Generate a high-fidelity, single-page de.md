Generate a high-fidelity, single-page developer dashboard to test a Domain-Driven payment processing system. The dashboard should use HTML, Vanilla CSS, and modern Javascript (ES6+). Focus on a premium, dark-mode glassmorphism theme (reminiscent of Stripe's developer dashboard) with smooth transition animations and clean typography (e.g., using Google Font 'Outfit' or 'Inter'). Do not use raw framework placeholders; ensure the dashboard is fully functional out-of-the-box.

### Dashboard Key Modules & Panels

1. **Header & Connection Panel**
   - Display a status indicator showing the backend API health status.
   - Text inputs for:
     * `Base API URL` (defaulting to `http://localhost:1209/api`)
     * `Webhook Secret` (for signing simulated webhooks locally)

2. **Payment Creation Terminal (POST /api/payments)**
   - Input fields:
     * `Amount` (Number, validated > 0)
     * `Currency` (Text input, preset to "USD", "EUR", "GBP" with 3-character capital validation)
     * `Idempotency Key` (Text field, include a "Generate UUID" button next to it for ease of use)
   - Action Button: `Submit Payment` (with loading spinner state).
   - Display raw response payload directly below in a formatted, copyable code block.

3. **Active Payments Registry (GET /api/payments/:id & POST /api/payments/:id/retry)**
   - A live grid/list displaying payment records stored during the session.
   - Each item should display:
     * Payment ID, Amount, Currency, and Idempotency Key.
     * Dynamic status badges with matching colors:
       - `PENDING` (yellow pulse)
       - `PROCESSING` (blue spin/pulse)
       - `SUCCESS` (solid neon green)
       - `FAILED` (solid crimson red)
       - `RETRYING` (orange alert pulse)
     * Quick-action buttons:
       - `Refresh Status` (triggers `GET /api/payments/:id`)
       - `Manual Retry` (triggers `POST /api/payments/:id/retry`, disabled unless status is FAILED)
   - Enable an optional "Auto-Poll" checkbox (polls GET endpoint every 2 seconds for non-terminal statuses).

4. **Gateway Webhook Dispatcher Simulator (POST /api/webhooks)**
   - A utility to test webhook status overrides and signature verification.
   - Form inputs:
     * `Payment ID` (automatically pre-filled when clicking a payment in the Registry)
     * `External Reference ID` (defaults to a randomized UUID)
     * `Status Override` (Dropdown: `SUCCESS` or `FAILED`)
     * `Failure Reason` (Text input, visible only if Status is FAILED)
   - Signature logic:
     * The utility must sign the webhook body using the `Webhook Secret` key.
     * Implement client-side HMAC-SHA256 signature computation (using CryptoJS from CDN or Web Crypto API) to generate the `X-Gateway-Signature` header automatically.
   - Action Button: `Dispatch Webhook` to send request to `/api/webhooks`.
   - Show raw status response (`200 OK` or `401 Unauthorized` with signature error details).

5. **API & System Log Viewer**
   - A scrolling panel at the bottom displaying timestamped client requests, headers sent, payload signatures, and responses received.
   - Color code requests (green for POST, blue for GET, orange for webhooks, red for HTTP errors).
   - Clear Log button.

### Styling & Visual Polish
- Colors: Dark charcoal background (`#0b0f19`), deep slate panels (`#161d30`) with semi-transparent backdrops (`backdrop-filter: blur(12px)`), neon green highlights (`#10b981`), bright blue (`#3b82f6`), and warning crimson (`#ef4444`).
- Card layout: CSS Grid / Flexbox layout with responsive breakpoints.
- Interactive feedback: Adding micro-animations on hover states for action buttons, slide-in logs, and smooth border transitions.
