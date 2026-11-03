# AAU 4 Kilo Museum Ticketing Platform
### Zoological Natural History Museum · Addis Ababa University (Arat Kilo Campus)

Official bilingual (English & Amharic) digital ticketing, payment, and gate admission platform for the **Zoological Natural History Museum** at **Addis Ababa University (AAU) — 4 Kilo (Arat Kilo) Campus**.

Live Production Web: [https://museum-ticketing.vercel.app](https://museum-ticketing.vercel.app)

---

## 🏛 System Overview

The platform provides a dual-channel ticketing infrastructure (digital online booking alongside the physical counter) with end-to-end payment processing, signed cryptographic QR tickets, and offline-capable gate scanning.

| Component | Path | Technology & Architecture |
| :--- | :--- | :--- |
| **REST API** | `backend/` | Node.js 20+, Express, ESM, Zod validation, JWT authentication. **Dual-Mode Database**: SQLite for local dev/testing; **Neon Serverless PostgreSQL** for production. |
| **Web Portal** | `web/` | React 18, Vite, React Router 6, bilingual i18n (`EN` / `አማ`). Visitor booking, live ticket stubs, digital receipts, Cashier handover, Manager & Admin dashboards. |
| **Mobile App** | `mobile/` | React Native, **Expo SDK 54**, Expo SQLite, Camera QR scanner, Ed25519 signature checks, offline admission queue, Manager/Admin mobile dashboard. |

---

## 🚀 Key Features

* **Visitor Self-Service**:
  - Book individual or school/group visits with real-time category pricing (Student, Adult, Foreign Resident, Non-Resident).
  - Instant online checkout via **Chapa** (Telebirr, CBE Birr, Debit/Credit Cards).
  - Phone and email verification using **AfroMessage SMS Gateway** (`+2519...`) and SMTP.
  - Digital admission pass with signed, tamper-proof **QR code** and official university temporary receipt (`TMP-XXXXXXXX`).
* **Gate Operations & Cashier**:
  - High-speed camera QR code scanner (works fully offline from encrypted device cache).
  - Headcount attendance tracking (defaults to booked quantity; records actual arrivals).
  - **End-of-Shift Handover to Finance**: Computes gross revenue minus shortfall refunds to issue formal handover vouchers (`SET-XXXXXX`) to AAU Finance.
* **Management & Administration**:
  - Live revenue KPIs, daily visitors, gate scan activity, and status mix breakdown.
  - One-tap approval/rejection of school group visit requests.
  - CSV report exports for university audits and fiscal year accounting.
  - Date closures management and category price configuration.
* **Automated Cron Jobs (Vercel Serverless)**:
  - Nightly no-show expiration job (`/api/cron/no-show` at 03:00 UTC / 06:00 AM Addis Ababa time).
  - Automatic refund reconciliation (`/api/cron/reconcile-refunds` every 15 minutes).

---

## 🛠 Quick Start (Local Development)

### Prerequisites
* Node.js ≥ 20.x
* npm ≥ 9.x

### 1. Backend API

```bash
cd backend
cp .env.example .env
npm install
npm test            # Runs all 16 automated tests (SQLite in-memory)
npm run dev         # Starts API on http://localhost:4000
```

### 2. Web Application

```bash
cd web
npm install
npm run dev         # Starts Web App on http://localhost:5173
```

### 3. Mobile Application

```bash
cd mobile
npm install
npm test            # Runs mobile test suite
npx expo start      # Open in Expo Go (Android/iOS)
```

---

## 🔑 Default Seed Accounts

All accounts share the default password: **`admin1234`**

| Role | Email | Permissions |
| :--- | :--- | :--- |
| **Platform Admin** | `admin@museum.test` | System settings, staff accounts, audit logs, reports, full access. |
| **Museum Manager** | `manager@museum.test` | Dashboard, group approvals, date closures, summary reports. |
| **Front Cashier** | `cashier@museum.test` | Gate scanner, visitor check-in, end-of-shift transfer to Finance. |
| **Demo Visitor** | `visitor@museum.test` | Book tickets, view digital QR passes, request shortfall refunds. |

---

## ⚙️ Environment Configuration

### Backend (`backend/.env` / Vercel Environment Variables)

```ini
# Server
PORT=4000
NODE_ENV=production
PUBLIC_API_URL=https://museum-ticketing.vercel.app
WEB_URL=https://museum-ticketing.vercel.app
JWT_SECRET=your-strong-random-jwt-secret

# Database (Neon PostgreSQL in production; SQLite when unset)
DATABASE_URL=postgresql://user:password@ep-xyz.eu-central-1.aws.neon.tech/neondb?sslmode=require

# Chapa Payment Gateway (Ethiopia)
CHAPA_SECRET_KEY=CHASECK_TEST-xxxxxxxxxxxxxxxx
CHAPA_PUBLIC_KEY=CHAPUBK_TEST-xxxxxxxxxxxxxxxx
CHAPA_WEBHOOK_SECRET=your-webhook-secret-string

# AfroMessage SMS Gateway (Ethiopia)
SMS_API_URL=https://api.afromessage.com/api/send
SMS_API_KEY=your-afromessage-jwt-token
SMS_SENDER_ID=AAU_MUSEUM

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=585
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="AAU Science Museum <no-reply@aau.edu.et>"

# Scheduled Cron Security
CRON_SECRET=your-cron-secret-key
```

### Web (`web/.env`)

```ini
VITE_API_URL=https://museum-ticketing.vercel.app
```

### Mobile (`mobile/.env`)

```ini
EXPO_PUBLIC_API_URL=https://museum-ticketing.vercel.app
```

---

## 📱 Building the Mobile Standalone APK (EAS Build)

To compile the standalone Android APK using EAS:

```bash
cd mobile
eas build --platform android --profile preview --non-interactive
```

The resulting build is distributed as an installable `.apk` file ready for physical device deployment.

---

## 🧪 Testing

```bash
# Backend test suite (16 tests, dual-mode DB validation, security checks)
cd backend && npm test

# Mobile test suite (7 tests, Ed25519 offline QR ticket verification)
cd mobile && npm test

# Web production bundle
cd web && npm run build
```

---

## 📜 License & Affiliation

Developed for the **Zoological Natural History Museum**, College of Natural & Computational Sciences, **Addis Ababa University (AAU) — Arat Kilo Campus**.
