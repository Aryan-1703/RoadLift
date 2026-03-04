# 🚀 RoadLift — Pre-Launch Checklist
> Generated from full codebase audit. Work top-to-bottom — items are ordered by dependency (earlier items unblock later ones).
> Legend: 🔴 Blocker (app breaks without this) · 🟡 Important (bugs/bad UX) · 🟢 Nice to have

---

## 1. 🔴 CRITICAL BUGS — Fix First

- [ ] **`ActiveJobScreen.tsx` is a binary/corrupted file** — the driver's active job screen is completely missing. This needs to be rebuilt. Without it `DriverFlowScreen` crashes when a job is accepted.
- [ ] **`AuthContext.tsx` is a binary/corrupted file** — the entire auth system (login state, token storage, user session) is unreadable. Verify the file opens correctly and all exports (`useAuth`, `AuthProvider`, `user`, `isLoading`) work. If corrupted, rebuild from scratch.
- [ ] **`config.ts` has a hardcoded local IP** (`172.20.10.2:3000`) — every user's API calls will fail because they're pointing at your laptop. Move to an environment variable before any real device testing.
- [ ] **`app.use(cors())` allows all origins** in `server.js` — in production this lets any website call your API. Restrict to your app's domain and Expo dev URLs.
- [ ] **`sequelize.sync({ alter: true })` is running in production** in `server.js` — this will silently modify your live database schema on every server restart and can destroy data. Replace with proper migrations before deploying.
- [ ] **Stripe publishable key is hardcoded** in `App.tsx` — move to `app.json` extra or an env variable. Test keys in dev, live keys in prod.
- [ ] **`accident` service is missing from `constants.ts`** — it exists in the Job model ENUM and the backend accepts it, but the frontend `SERVICES` array only has 5 services (no `accident`). Customers can't request it.
- [ ] **`PaymentContext` not mounted in `App.tsx`** — the `PaymentProvider` we built is never added to the provider tree, so `usePayment()` will throw in `PaymentScreen`.

---

## 2. 🔴 BACKEND — Missing Routes & Logic

- [ ] **Socket auth is never verified** — `socket.js` creates the server but the `auth: { token }` sent by the frontend is never checked server-side. A bad actor can connect and receive job/location events. Add socket middleware to verify the JWT on connection.
- [ ] **`join-room` is never called by the frontend socket client** — `socket.ts` connects but never emits `join-room` with `{ userId, role }`. Drivers never join the `"drivers"` room so `io.to("drivers")` broadcasts nothing. This needs to be called once after login in `AuthContext`.
- [ ] **Driver location broadcasting has no auth check** — the `driver-location-update` socket event is accepted from any connected socket. A malicious client can spoof another driver's location. Verify `socket.data.userId` matches the driver on the job before relaying.
- [ ] **`completeJob` in `driverService` only accepts `accepted` → `completed`** — it now also checks `in_progress` and `arrived` (our fix), but the `in_progress` → `completed` path has no test. Verify the status machine works end-to-end: `pending` → `accepted` → `arrived` → `in_progress` → `completed`.
- [ ] **No input validation anywhere on the backend** — no Joi, Zod, or express-validator. A customer can send `serviceType: "nuclear-option"` or `pickupLatitude: "hello"` and the server will crash or insert garbage. Add validation middleware to at minimum: `POST /api/jobs`, `POST /api/auth/register`, `POST /api/auth/login`.
- [ ] **Rate limiter uses in-memory `Map`** — it works on one server but resets on restart and doesn't work with multiple instances. More critically, it's not actually applied to any routes in `server.js` — the import exists in `RateLimiter.js` but `app.use(rateLimiter(...))` is never called. Apply it to auth routes at minimum.
- [ ] **No token refresh mechanism** — when the JWT expires the user gets a `401` with no way to recover except logging out and back in. Add a refresh token flow or extend JWT expiry to something reasonable (7–30 days for mobile).
- [ ] **Push notification title is hardcoded** as `"🚨 New Tow Job!"` for all service types in `sendPushNotification.js`. A battery boost job shows "New Tow Job". Use `jobDetails.serviceType` to set the correct title.
- [ ] **`driver.model.js` exists but is unused** — you migrated to a unified `User` model but the old driver model file is still there. This is confusing and could cause issues if Sequelize tries to sync it. Delete or clearly mark it as deprecated.
- [ ] **No `error` handling middleware in `server.js`** — unhandled promise rejections and thrown errors return HTML error pages instead of JSON. Add a global `app.use((err, req, res, next) => ...)` handler at the bottom of `server.js`.

---

## 3. 🔴 PAYMENT FLOW — End to End

- [ ] **Verify the Stripe Payment Sheet flow works on a real device** — `PaymentScreen` calls `initPaymentSheet` + `presentPaymentSheet` from `@stripe/stripe-react-native`. This requires real hardware (not simulator) and a live Stripe test key. Test the full cycle: create payment intent → present sheet → webhook confirms → job marked paid.
- [ ] **Stripe webhook is never registered in `server.js`** — `paymentController` exists but there's no `POST /api/payments/webhook` route mounted anywhere. Stripe `payment_intent.succeeded` events are silently dropped. Wire up the webhook route and handler.
- [ ] **`PaymentScreen` in the repo uses `useStripe()` directly** — it's separate from the `PaymentContext` we built. Decide which one to use and delete the other. Right now there are two different payment screens competing.
- [ ] **Driver payout via Stripe Connect is only partially wired** — `StripeOnboardingScreen` opens the Connect URL correctly, but there's no logic to actually transfer funds to the driver after a job is paid. Implement the Stripe Connect payout/transfer after `payment_intent.succeeded`.

---

## 4. 🟡 FRONTEND — Screens & UX Gaps

- [ ] **`registerForPushNotifications()` is never called** — the function is built in `utils/notifications.ts` but nothing calls it after login. Call it in `AuthContext` (after a successful login) and then `POST /api/driver/store-push-token` with the result. Without this, drivers get zero push notifications for new jobs.
- [ ] **`LiveTrackingScreen` — driver location not sent** — the customer tracking screen listens for `driver-location-updated` socket events, and the backend relays them correctly. But the driver side (in `ActiveJobScreen`) never emits `driver-location-update`. The driver needs to start a `Location.watchPositionAsync` and emit their coordinates every few seconds.
- [ ] **`JobCompletionScreen` uses `SafeAreaView` from `react-native`** (deprecated) instead of `react-native-safe-area-context`. This causes layout issues on newer iPhones with notches.
- [ ] **No loading/empty state on `DriverDashboardScreen`** when `availableJobs` is empty and driver is online — the screen just shows nothing. Add a "No jobs nearby" empty state.
- [ ] **`JobHistoryScreen` exists but `JobHistory` tab is never accessible from the customer home screen** — there's no button in `LocationSelectionScreen` or `JobFlowScreen` to navigate to history. Add an entry point.
- [ ] **No error boundary anywhere in the app** — if any screen throws an unhandled error, the whole app crashes with a white screen. Add a React `ErrorBoundary` component wrapping `RootNavigator`.
- [ ] **`api.ts` still has mock fallback interceptors** — `/payment/charge`, `/jobs/complete`, `/users/sessions`, and others return fake success responses when the real endpoint 404s. These need to be removed before production or they'll mask real failures silently.
- [ ] **`ManageVehiclesScreen`** — verify it connects to `GET/POST /api/vehicles` correctly. The route exists and `vehicleService` is implemented, but the vehicle data is never linked to jobs at creation time (no `vehicleId` sent in `requestService()`).
- [ ] **No "forgot password" flow** — `LoginScreen` has no recovery path. Users who forget their password are permanently locked out. Implement a reset-by-email flow or clearly communicate this limitation before launch.
- [ ] **`PreferencesScreen` notification toggles are mocked** — they update local state but `PUT /api/users/preferences` either returns mock data or hits a stub. Verify the preferences endpoint persists to the DB.

---

## 5. 🟡 SECURITY

- [ ] **Remove mock fallbacks from `api.ts` interceptor** before production — specifically the `/payment/charge` mock that returns `{ success: true }` on any failure. This could make a failed payment look successful to the customer.
- [ ] **JWT secret must be a strong random value in `.env`** — verify `process.env.JWT_SECRET` is set to a long random string in your production environment, not a default or a word.
- [ ] **Add `helmet` middleware to `server.js`** — sets secure HTTP headers (XSS protection, no sniff, etc.) with one line: `app.use(require('helmet')())`.
- [ ] **Stripe webhook signature verification** — when you add the webhook route, use `stripe.webhooks.constructEvent` with the `STRIPE_WEBHOOK_SECRET` to verify the payload came from Stripe, not a spoofed request.
- [ ] **User can only cancel their own jobs** — `cancelJob` checks `job.userId !== userId` which is correct. But verify the same ownership check exists for the review endpoint (`submitReview` checks role but `req.role` comes from `req.role = user.role` which is correct).
- [ ] **OTP codes for phone/email change** — `EditProfileScreen` has a full OTP UI but verify the backend actually generates, stores, and expires OTP codes. If `userController` (binary file) is corrupted, this flow may be broken.

---

## 6. 🟡 DATABASE & DEPLOYMENT

- [ ] **Run the `pickupAddress` migration** — `ALTER TABLE "Jobs" ADD COLUMN "pickupAddress" VARCHAR(500);` — this was added to the model in our fixes but the column doesn't exist in the live DB yet.
- [ ] **Replace `sequelize.sync({ alter: true })` with real migrations** — create a `migrations/` folder and use `sequelize-cli` or just raw SQL migration scripts. `sync({ alter: true })` has destroyed production databases before.
- [ ] **Add a PostGIS spatial index** on `pickupLocation` — `CREATE INDEX jobs_pickup_location_idx ON "Jobs" USING GIST ("pickupLocation");` — without this, every `getAvailableJobs` call does a full table scan.
- [ ] **Set up a `.env.example` file** — document every required env variable (`DB_*`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_MAPS_API_KEY`, `PORT`) so any new developer or deployment environment knows what's needed.
- [ ] **Add a process manager** — `server.js` runs as a raw Node process. Use `pm2` or your host's process supervisor so the server auto-restarts on crash.
- [ ] **Configure `CORS` properly** — replace `app.use(cors())` with `app.use(cors({ origin: ['https://yourproductiondomain.com', 'exp://...'] }))`.

---

## 7. 🟢 BEFORE APP STORE SUBMISSION

- [ ] **Complete `app.json`** — verify `bundleIdentifier` (iOS) and `package` (Android) are set, splash screen, icon (1024×1024), and all metadata are production-ready.
- [ ] **EAS Build tested** — run `eas build --platform ios --profile preview` and `eas build --platform android` at least once to catch any native dependency issues before submitting.
- [ ] **Background location permission** — `LiveTrackingScreen` uses foreground location only. For drivers, you'll need `expo-task-manager` + `expo-location` background task to keep broadcasting when the app is minimized.
- [ ] **iOS `NSLocationWhenInUseUsageDescription`** and **`NSLocationAlwaysUsageDescription`** must be in `app.json` `infoPlist` or Apple will reject the build.
- [ ] **Privacy policy & Terms of Service** — `TermsScreen` exists as a static screen. You need a real hosted URL for the App Store listing. Required for both stores.
- [ ] **Test on physical devices** — iOS simulator doesn't support: Stripe Payment Sheet, push notifications, background location, or phone calls (`tel:` links). All of these are core features.
- [ ] **Stripe live keys** — switch from `pk_test_*` / `sk_test_*` to live keys and test one real $1.00 transaction before launch.

---

## 8. 🟢 NICE TO HAVE (Post-MVP)

- [ ] Add **geo-filtered job broadcasts** — only notify drivers within X km of the pickup using PostGIS `ST_DWithin` instead of broadcasting to all `"drivers"`.
- [ ] Add **Redis adapter** for Socket.io so you can run multiple backend instances.
- [ ] Add **BullMQ job queue** for push notifications instead of inline `await` loops in `notifyAvailableDrivers`.
- [ ] Add **Sentry** for error tracking on both frontend (`@sentry/react-native`) and backend (`@sentry/node`).
- [ ] Add **admin dashboard** — `AdminOverviewScreen` exists as a UI but has no real data. Wire it to actual job counts, revenue, and user stats.
- [ ] **Job cancellation fee logic** — currently customers can cancel accepted jobs for free. Consider a policy and implement it.
- [ ] **Driver rating shown on job card** — `DriverDashboardScreen` job cards don't show the driver's average rating. Customers can't see who they're getting.

---

## Quick Summary

| Category | Blockers | Important | Nice to Have |
|---|---|---|---|
| Critical Bugs | 8 | — | — |
| Backend | 6 | 4 | — |
| Payments | 4 | — | — |
| Frontend/UX | — | 10 | — |
| Security | — | 5 | — |
| Database/Deploy | — | 5 | — |
| App Store | — | — | 7 |
| Post-MVP | — | — | 8 |
| **Total** | **18** | **24** | **15** |

**Minimum to have a working app in your hands on a real device: fix the 8 critical bugs + 3 backend items (socket auth, join-room, push notification wiring) + payment flow.**

That's roughly **2–3 focused weeks** of work before you can soft-launch to real users.
