# HealthSync Backend

Node.js + Express + PostgreSQL + Prisma + JWT + bcrypt + Socket.IO.

## First setup

From the repository's `backend` directory:

```bash
npm ci
npx prisma generate
```

If PostgreSQL `healthsync` is a new/empty database:

```bash
npx prisma migrate dev --name init
```

If you already completed the migration in your existing `healthsync` database, **do not run another migration**. The schema is already in sync.

Start the backend:

```bash
npm run dev
```

Test:

`http://localhost:5000/api/health`

## Environment

Copy `.env.example` to `.env` and put your real PostgreSQL password in `DATABASE_URL`.
Never commit `.env`.


## Patient data entry

The patient dashboard now has **Add Data** at `/patient/add-data`.

It saves real data to PostgreSQL through Prisma:
- Medications
- Vital readings
- Appointments

After extracting the project, create `backend/.env` from `.env.example`, then run from `backend`:

```powershell
npm ci
npx prisma generate
npm run dev
```

Run the frontend separately with `npm ci` and `npm run dev` from the repository's `frontend` directory.
