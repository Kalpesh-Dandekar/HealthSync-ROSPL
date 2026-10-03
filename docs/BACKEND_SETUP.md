# HealthSync Backend Setup

Backend folder: `backend/`

Stack: Node.js + Express + PostgreSQL + Prisma + JWT + bcrypt + Socket.IO.

## Install

From the project root:

```bash
cd frontend
npm ci
cd ../backend
npm ci
```

Then copy:

`backend/.env.example` → `backend/.env`

Set your PostgreSQL password in `DATABASE_URL`.

## Prisma

```bash
cd backend
npx prisma generate
```

The HealthSync `healthsync` database used during development is already connected and migrated. For a brand-new empty database, run:

```bash
npx prisma migrate dev --name init
```

## Start

Backend:

```bash
cd backend
npm run dev
```

Frontend, in another terminal from the project root:

```bash
cd frontend
npm run dev
```

Backend health check:

`http://localhost:5000/api/health`


## Cross-role care team demo

Caregiver and physician accounts must be connected to a patient before they can see that patient's records. You can connect them from each role's **Patients** page or **Care Network** page by entering the patient's HealthSync email. The backend merges the caregiver and physician connections so all three authorized roles see the same care team.

For an existing demo database, an optional helper is available:

```bash
node backend/scripts/link-first-care-team.js
```

It connects the first PATIENT account to the first CAREGIVER and first PHYSICIAN account. Use this only for demo/test data.
