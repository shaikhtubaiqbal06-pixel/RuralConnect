# RuralConnect

RuralConnect is a full-stack marketplace and business management prototype for rural entrepreneurs, farmers, artisans, and small businesses.

## Features

- React + Vite frontend with routing and responsive design
- Express + Prisma + PostgreSQL backend
- Authentication and role-based access for entrepreneurs and customers
- Product catalog and marketplace
- Inventory management
- Order creation and order tracking workflows
- Multi-seller checkout creates one seller-owned order per seller, linked by a shared checkout reference
- Simulated UPI and cash-on-delivery payments with per-order payment status
- Simulated payments, support conversations, notifications, and analytics
- English, Hindi, and Marathi interface support
- Voice interaction using the browser speech API
- Progressive Web App shell and offline indicator

## Tech stack

- Frontend: React, Vite, Tailwind CSS, React Router, Recharts, Lucide
- Backend: Node.js, Express.js, JWT auth, Prisma, PostgreSQL

## Requirements

- Node.js 18+
- npm
- PostgreSQL 15+

## PostgreSQL setup

Install PostgreSQL locally and create a database named `ruralconnect`.

Example:

```bash
createdb ruralconnect
```

Then set the environment variable in `server/.env` using the following pattern:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ruralconnect?schema=public"
JWT_SECRET="set-a-strong-secret"
PORT=4000
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

The project includes `server/.env.example` as a template.

## Backend tests

Run the checkout and inventory transaction tests with:

```bash
npm test --prefix server
```

## Install dependencies

```bash
npm install
npm install --prefix client
npm install --prefix server
```

## Run the app

Start both the API and frontend together:

```bash
npm run dev
```

Or run individually:

```bash
npm run dev:server
npm run dev:client
```

The frontend runs on http://localhost:5173 and the API runs on http://localhost:4000.
The frontend sends API requests to `/api`; Vite forwards them to `http://localhost:4000` during development. Keep the API server running while using the client. To point the development proxy at another API host, set `VITE_API_PROXY_TARGET`. For a deployed frontend, set `VITE_API_URL` to the API base URL, including `/api`.

## Database migration and seed

From the `server` folder:

```bash
npx prisma migrate dev --name init
node prisma/seed.js
```

## Demo accounts

Seeded demo accounts are for development only:

- Entrepreneur: `asha@ruralconnect.in` / `Demo@123`
- Entrepreneur: `meera@ruralconnect.in` / `Demo@123`
- Customer: `rohit@ruralconnect.in` / `Demo@456`

## Simulated features

This prototype simulates the following features intentionally:

- Payments via UPI and cash on delivery
- Logistics and tracking events
- SMS preview and notification center
- Voice interactions through browser APIs
- Offline capability and caching in the browser

## Notes

The application is designed as a college project prototype and is intentionally not a real financial or logistics integration.
