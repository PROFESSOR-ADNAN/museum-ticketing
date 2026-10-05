# Science Museum Ticketing & Booking Platform

Online booking, **Chapa** payment and **QR ticket checks** for the CNCS Science Museum — three apps on one REST API:

| Part          | Folder     | Stack                                                                                           |
| ------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| REST API      | `backend/` | Node 20+, Express, **SQLite** (better-sqlite3), JWT, Zod · routes → controllers → services → db |
| Web app       | `web/`     | React 18 + Vite                                                                                 |
| Mobile app    | `mobile/`  | React Native, **Expo SDK 54**, local SQLite cache for offline use                               |
| Documentation | `docs/`    | 15 documents as Markdown, Word and PDF — start at `docs/README.md`                              |

The cash counter is **not replaced**: this adds a second, digital track (SRS in `docs/00-source-material/`). Amharic and English everywhere.

## 1. Run the backend and web app (about 5 minutes)

```bash
cd backend
cp .env.example .env            # for a first look you can leave the Chapa keys empty ONLY if you use the simulator (step 4)
npm install && npm run seed && npm run dev          # API on http://localhost:4000   (database file: backend/data/museum.sqlite)
# in a second terminal
cd web && cp .env.example .env && npm install && npm run dev        # http://localhost:5173
```

No database server is needed — SQLite is a single file that the API creates on first start.

**Demo accounts** (password `Passw0rd!`): `visitor@museum.test` · `cashier@museum.test` · `manager@museum.test` · `admin@museum.test`.

## 2. Connect Chapa (real payment gateway)

1. In the Chapa dashboard (Settings → API) copy your **test** secret key (`CHASECK_TEST-…`).
2. Make the API reachable from the internet over https (Chapa must call your webhook and send customers back): `cloudflared tunnel --url http://localhost:4000` (or `ngrok http 4000`). Copy the https address.
3. Edit `backend/.env`:
   ```
   CHAPA_SECRET_KEY=CHASECK_TEST-...        CHAPA_WEBHOOK_SECRET=<any long random string>
   PUBLIC_API_URL=https://<your-tunnel-address>     TRUST_PROXY=1
   ```
4. `npm run chapa:check` → confirms the key and prints the **webhook URL** to enter in Chapa (Settings → Webhooks) together with the same secret string. Restart the API.
   Full guide, test numbers and troubleshooting: `docs/14-chapa-setup-and-testing.md`.

**No keys yet?** `npm run chapa:simulator` (in `backend/`) starts a local imitation of Chapa for demos and tests: set `CHAPA_BASE_URL=http://127.0.0.1:4010/v1`, `CHAPA_SECRET_KEY=CHASECK_TEST-simulator`, `CHAPA_WEBHOOK_SECRET=simulator-webhook-secret`. It is not Chapa — never use it in production.

## 3. Try the whole flow

1. Visitor → **Book a visit** (pick _today_) → **Confirm** → **Pay now** → pay on Chapa's page → back to the booking: **Pending**, with the **receipt and QR code**.
2. Cashier → **Scan ticket** → scan the QR (camera / USB scanner) or type the reference → green **PAID** → enter how many arrived → **Record attendance**. Scan again → **ALREADY USED**.
3. Visitor → **Refund unattended tickets** (if fewer came). Cashier → **Transfer to Finance** → Transfer Receipt.
4. Manager → dashboard, reports, **Download data (CSV)**. Admin → refunds needing attention, **Download database backup**.

## 4. Mobile app (Expo Go, SDK 54)

```bash
cd mobile && npm install && cp .env.example .env     # set EXPO_PUBLIC_API_URL to an address the PHONE can reach
npm run start:clear                                  # scan the QR with Expo Go (Android) or the Camera app (iPhone)
```

A tunnel (`npm run start:tunnel`) only carries the app's code — **the API needs its own reachable address** (use the same https tunnel as for Chapa). Everything about this, the offline mode and troubleshooting: `docs/15-mobile-app-guide.md`.

## 5. Docker alternative

```bash
cp backend/.env.example backend/.env && docker compose up --build && docker compose exec api node src/seed.js
```

## 6. What is verified, and what is not

- **Verified here:** 13 backend tests (incl. a full end-to-end flow on SQLite against a Chapa _simulator_), 3 mobile tests, 17 offline-sync checks against the real API, web production build, Android + iOS Metro bundles, and a browser walkthrough (book → pay → QR → scan → admit → rescan).
- **Not verified here (please run these first):** real **Chapa** calls with your test keys (I had no keys or access); the **mobile app on a real phone** in Expo Go; a real camera scan in the browser; real SMS/email; a backup restore drill. Steps are in `docs/08-test-plan-and-report.md`.
- **Open decisions** for the museum/Finance (fiscal-year date, who bears Chapa's fee, unrequested shortfalls, settlement account): `docs/02-requirements-baseline.md` §6.

## 7. Where things are

```
backend/src/{routes,controllers,services,db,middleware,utils,i18n}    API (routes only wire; controllers validate; services hold the rules)
backend/src/db/migrations/                                            SQL schema + reporting views (applied automatically)
backend/test/  (npm test)  ·  backend/test/support/fakeChapa.js       tests and the Chapa simulator
web/src/{pages,components}   ·   mobile/src/{screens,offline.js,ticket.js,db.js}
docs/                                                                 deliverables (word/ and pdf/ copies inside)
```
