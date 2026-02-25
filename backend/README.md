# RoadLift Backend Architecture

This is the Node.js/TypeScript backend for RoadLift.

## 🏗 Folder Structure

\`\`\`text
backend/
├── prisma/
│ └── schema.prisma # Database schema & models
├── src/
│ ├── config/
│ │ └── env.ts # Environment variable validation (Zod)
│ ├── middleware/
│ │ ├── auth.middleware.ts # JWT validation
│ │ └── error.middleware.ts # Centralized error handling
│ ├── modules/
│ │ ├── auth/ # Auth controller, service, routes
│ │ ├── jobs/ # Job creation, acceptance logic
│ │ └── drivers/ # Driver-specific endpoints
│ ├── services/
│ │ ├── stripe.service.ts # Stripe API wrapper
│ │ └── maps.service.ts # Google Routes API wrapper
│ ├── sockets/
│ │ └── socketSetup.ts # Real-time tracking and events
│ ├── app.ts # Express app setup
│ └── server.ts # Entry point
├── package.json
└── tsconfig.json
\`\`\`

## 🚀 Local Setup

1. **Install dependencies:**
   \`npm install\`
2. **Environment Setup:**
   Copy `.env.example` to `.env` and fill in your PostgreSQL URI, Stripe keys, and Google Maps API key.

3. **Database Migration:**
   \`npx prisma migrate dev --name init\`
   \`npx prisma generate\`

4. **Run Development Server:**
   \`npm run dev\`

## 💳 Stripe Webhook Setup

1. Use the Stripe CLI to forward events to your local server:
   \`stripe listen --forward-to localhost:3000/api/payments/webhook\`
2. Copy the webhook secret provided by the CLI into your `.env` as `STRIPE_WEBHOOK_SECRET`.
3. The backend listens for `payment_intent.succeeded` to mark a job as `COMPLETED`.

## ☁️ Deployment (Railway / Render / AWS)

1. **Database:** Provision a managed PostgreSQL database (e.g., AWS RDS, Railway Postgres).
2. **Environment:** Set all `.env` variables in your hosting provider's dashboard.
3. **Build Command:** \`npm run build && npx prisma generate\`
4. **Start Command:** \`npm start\`
5. **Sockets:** Ensure your host supports WebSockets (Railway and Render do by default, AWS requires ALBs configured for WebSocket upgrading).

## 🧪 Postman Examples

### Request a Job (Customer)

\`\`\`http
POST /api/jobs
Authorization: Bearer <CUSTOMER_TOKEN>
Content-Type: application/json

{
"serviceType": "TOWING",
"pickupLat": 43.6532,
"pickupLng": -79.3832,
"destinationLat": 43.7000,
"destinationLng": -79.4000
}
\`\`\`

### Accept a Job (Driver)

\`\`\`http
POST /api/jobs/123e4567-e89b-12d3-a456-426614174000/accept
Authorization: Bearer <DRIVER_TOKEN>
\`\`\`
