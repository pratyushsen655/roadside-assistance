# RescueMe – Roadside Assistance Platform

## Table of Contents
1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Repository Structure](#repository-structure)
4. [Backend Setup](#backend-setup)
5. [Customer Mobile App (React Native)](#customer-mobile-app-react-native)
6. [Mechanic Mobile App (React Native)](#mechanic-mobile-app-react-native)
7. [Admin Dashboard (React)](#admin-dashboard-react)
8. [Environment Variables](#environment-variables)
9. [Running the Full Stack Locally](#running-the-full-stack-locally)
10. [Testing](#testing)
11. [Deployment Guide](#deployment-guide)
12. [Contributing](#contributing)
13. [License](#license)

---

## Project Overview
**RescueMe** is a full‑stack, on‑demand roadside‑assistance platform that connects customers in need of vehicle breakdown help with nearby mechanics. It includes:
- **Backend** – Node.js, Express, MongoDB, Socket.io, JWT/OTP authentication, Razorpay payments, Firebase Cloud Messaging.
- **Customer App** – React Native (Expo) with OTP login, location tracking, request creation, real‑time tracking, and payment flow.
- **Mechanic App** – React Native (Expo) for mechanics to receive requests, accept/reject, view navigation, and manage earnings.
- **Admin Dashboard** – React (Vite) UI for admins to monitor analytics, manage users/mechanics, manually assign jobs, and view payment logs.

---

## Prerequisites
| Tool | Minimum Version |
|------|-----------------|
| **Node.js** | 20.x (LTS) |
| **npm** | 10.x |
| **MongoDB** | 6.x (local or Atlas) |
| **Expo CLI** | `npm i -g expo-cli` |
| **Git** | any recent version |
| **Razorpay Test Keys** | (Sign‑up at https://razorpay.com) |
| **Google Maps API Key** | (Enable Maps SDK for Android/iOS) |
| **Firebase Project** | (FCM credentials) |

Make sure `git` is installed and you have internet access for package installation.

---

## Repository Structure
```
my app/
├─ backend/                # Express API + Socket.io
│   ├─ config/            # DB connection
│   ├─ controllers/        # All route handlers
│   ├─ middleware/        # Auth, error handling
│   ├─ models/            # Mongoose schemas
│   ├─ routes/            # API routes
│   ├─ services/          # SMS, FCM, Maps, Razorpay, AI, Pricing
│   ├─ sockets/           # Socket.io handler
│   ├─ .env.example       # Sample env variables (see below)
│   └─ server.js          # Entry point
│
├─ customer-app/           # Expo React Native app (customers)
│   ├─ src/               # Screens, contexts, utils
│   └─ app.json
│
├─ mechanic-app/           # Expo React Native app (mechanics)
│   ├─ src/               # Screens, contexts, utils
│   └─ app.json
│
├─ admin-panel/            # React admin dashboard (Vite)
│   ├─ src/               # Components, pages, routing
│   └─ index.html
│
├─ README.md               # THIS FILE
└─ .gitignore
```

---

## Backend Setup
1. **Navigate to backend folder**
   ```bash
   cd "c:/Users/praty/OneDrive/Desktop/my app/backend"
   ```
2. **Create a `.env` file** – copy `.env.example` and fill in real values (see *Environment Variables* section).
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Run development server**
   ```bash
   npm run dev   # starts on http://localhost:5000
   ```
   The server will automatically connect to MongoDB, initialise Socket.io and expose the API under `/api`.

---

## Customer Mobile App (React Native)
1. **Navigate to the app folder**
   ```bash
   cd "c:/Users/praty/OneDrive/Desktop/my app/customer-app"
   ```
2. **Install dependencies**
   ```bash
   npm install   # installs expo & react‑native libs
   ```
3. **Configure environment** – copy the `.env.example` inside `customer-app/` (if present) or create a `.env` with:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:5000/api
   EXPO_PUBLIC_SOCKET_URL=http://localhost:5000
   ```
   Adjust the URLs if you run the backend on another host.
4. **Start the Expo development server**
   ```bash
   npx expo start
   ```
   - Choose *Run on Android device/emulator*, *iOS simulator*, or *Web*.
   - The app will request location permission and OTP login.

---

## Mechanic Mobile App (React Native)
1. **Navigate to the mechanic app folder**
   ```bash
   cd "c:/Users/praty/OneDrive/Desktop/my app/mechanic-app"
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Environment variables** – create a `.env` similar to the customer app:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:5000/api
   EXPO_PUBLIC_SOCKET_URL=http://localhost:5000
   ```
4. **Run the app**
   ```bash
   npx expo start
   ```
   Log in with a registered mechanic phone number (OTP flow) and you’ll see the live request feed.

---

## Admin Dashboard (React)
1. **Navigate to the admin panel folder**
   ```bash
   cd "c:/Users/praty/OneDrive/Desktop/my app/admin-panel"
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Environment variables** – copy the example (if any) or create a `.env` with:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=ws://localhost:5000   # Socket.io uses ws protocol
   ```
4. **Start the dev server**
   ```bash
   npm run dev   # Vite dev server on http://localhost:5173
   ```
   The dashboard loads a simulated admin token automatically (see *Admin Authentication* below). In production replace with real OTP login.

---

## Environment Variables
### Backend (`backend/.env`)
| Variable | Description | Example |
|----------|-------------|---------|
| **MONGODB_URI** | MongoDB connection string. Use Atlas or local instance. | `mongodb+srv://user:pass@cluster0.mongodb.net/rescueme?retryWrites=true&w=majority` |
| **JWT_SECRET** | Secret used to sign JWTs. Keep this private. | `super_secret_jwt_key_12345` |
| **JWT_EXPIRY** | JWT expiration (e.g., `7d`). | `7d` |
| **PORT** | Port for Express server. | `5000` |
| **RAZORPAY_KEY_ID** | Razorpay test key id. | `rzp_test_XXXXXXXXXXXXXXXX` |
| **RAZORPAY_KEY_SECRET** | Razorpay test secret. | `your_razorpay_secret` |
| **FIREBASE_SERVICE_ACCOUNT** | Base64‑encoded Firebase service‑account JSON (for FCM). | `eyJ...` |
| **TWILIO_ACCOUNT_SID** | Twilio account SID for SMS OTP (optional, mock fallback works). |
| **TWILIO_AUTH_TOKEN** | Twilio auth token. |
| **TWILIO_PHONE_NUMBER** | Phone number used to send OTPs. |
| **GOOGLE_MAPS_API_KEY** | Server‑side key for distance & route calculations. |
| **OTP_EXPIRY_MINUTES** | OTP validity period. | `10` |
| **CORS_ORIGIN** | Allowed origin for front‑ends (e.g., `http://localhost:5173`). |

### Front‑end apps (`customer-app/.env`, `mechanic-app/.env`, `admin-panel/.env`)
| Variable | Description | Example |
|----------|-------------|---------|
| **EXPO_PUBLIC_API_URL** | Base URL for backend API. | `http://localhost:5000/api` |
| **EXPO_PUBLIC_SOCKET_URL** | Socket.io endpoint. | `http://localhost:5000` |
| **VITE_API_URL** | Same as above for admin panel (Vite). |
| **VITE_SOCKET_URL** | Socket.io URL (ws protocol). |

---

## Running the Full Stack Locally
```bash
# 1. Start MongoDB (local) or ensure Atlas is reachable
# 2. Backend
cd "c:/Users/praty/OneDrive/Desktop/my app/backend"
cp .env.example .env   # edit with real values
npm install
npm run dev &

# 3. Customer app
cd "c:/Users/praty/OneDrive/Desktop/my app/customer-app"
npm install
npx expo start   # scan QR with Expo Go or run emulator

# 4. Mechanic app
cd "c:/Users/praty/OneDrive/Desktop/my app/mechanic-app"
npm install
npx expo start

# 5. Admin dashboard
cd "c:/Users/praty/OneDrive/Desktop/my app/admin-panel"
npm install
npm run dev   # opens http://localhost:5173
```
Open the admin dashboard, click **Launch Admin Dashboard** to simulate login, then you can manage users, mechanics, and live requests.

---

## Testing
- **Backend** – Use `npm test` (Jest) if tests are added. API can be inspected with Postman.
- **Mobile apps** – Run on Expo Go or simulators. Use the OTP flow for login; test with mock SMS service (works without real Twilio).
- **Admin panel** – UI tests can be performed manually; automated tests can be added with Cypress.

---

## Deployment Guide
1. **Backend** – Deploy to Railway (or another Node‑compatible platform). Create a Railway project, connect this repository, and let Railway detect the Node app. The `Procfile` (`web: npm run start`) tells Railway how to run the server.
2. **MongoDB** – Provision a free MongoDB Atlas cluster, whitelist the Railway internal IPs, and copy the connection URI.
3. **Redis** – Provision a Redis Cloud instance (free tier) and obtain its URL.
4. **Environment Variables** – In the Railway dashboard, add the variables listed in the *Environment Variables* section of this README (e.g., `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `RAZORPAY_KEY_ID`, etc.).
5. **Deploy** – Railway will automatically run `npm install` and start the server using the Procfile. After a successful deployment, the app will be reachable at the generated Railway URL.
6. **Custom Domain (optional)** – Add a custom domain in Railway settings and configure DNS as instructed.

### Environment Variables (set in Railway)
| Variable | Description |
|----------|-------------|
| **MONGODB_URI** | MongoDB Atlas connection string |
| **REDIS_URL** | Redis Cloud connection URL |
| **JWT_SECRET** | Secret for signing JWTs |
| **JWT_EXPIRY** | JWT expiration, e.g., `7d` |
| **RAZORPAY_KEY_ID** | Razorpay test key ID |
| **RAZORPAY_KEY_SECRET** | Razorpay test secret |
| **FIREBASE_SERVICE_ACCOUNT** | Base64‑encoded Firebase service‑account JSON |
| **TWILIO_ACCOUNT_SID** | (Optional) Twilio SID |
| **TWILIO_AUTH_TOKEN** | (Optional) Twilio auth token |
| **TWILIO_PHONE_NUMBER** | (Optional) Twilio phone number |
| **GOOGLE_MAPS_API_KEY** | Server‑side Google Maps API key |
| **PORT** | Port Railway will use (optional, default 5000) |
| **CORS_ORIGIN** | Allowed origins for front‑ends |
| **STRIPE_SECRET_KEY** | (Optional) Stripe test secret |
| **STRIPE_WEBHOOK_SECRET** | (Optional) Stripe webhook secret |

### Deploy to Railway – Step‑by‑Step
1. Sign up at https://railway.app and create a new project.
2. Connect your GitHub repository (or push the repo to Railway via the CLI `railway init`).
3. Railway will detect the `package.json` in `backend/` – ensure the root `package.json` contains only backend scripts or move backend files to the repository root (or set the `src` in `railway.json`).
4. Add a `railway.json` file (already included) to specify the start command if needed.
5. In the **Variables** tab, add all required env vars (see table above).
6. Add the MongoDB Atlas and Redis plugins via the **Plugins** tab (or use external services) and set their autogenerated env vars (`MONGODB_URI`, `REDIS_URL`).
7. Click **Deploy** – Railway will build and launch your backend.
8. Update the mobile apps’ `.env` files (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SOCKET_URL`) to point to the Railway URL, e.g., `https://my-app.up.railway.app/api`.
9. Test the endpoints via Postman or the apps.

2. **MongoDB** – Use MongoDB Atlas (free tier) and whitelist the host IP.
3. **Customer & Mechanic Apps** – Build bundles with `expo build` (or `eas build`) for Android/iOS and publish to Play Store / App Store.
4. **Admin Dashboard** – Build with `npm run build` (Vite) and serve static files via any CDN or your own server.
5. **Domain & SSL** – Use a custom domain and enable HTTPS (let’s encrypt). Update API URLs accordingly.
6. **Monitoring** – Enable logging (winston), health checks, and consider using PM2 for process management.

---

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome-feature`).
3. Follow the coding style – ESLint + Prettier for JS/TS, airbnb config for React.
4. Write unit/integration tests for new code.
5. Submit a pull request with a clear description.

---

## License
This project is licensed under the **MIT License**. See `LICENSE` for details.

---

*Happy coding! 🚀*
