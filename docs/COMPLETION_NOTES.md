# HealthSync - Completed Full-Stack Update

This version keeps the existing UI and completes the database-backed patient, caregiver and physician workflows.

## Completed

- Patient data remains scoped to the authenticated JWT user.
- Caregiver dashboard now loads all connected patients and allows selecting the patient to monitor.
- Caregiver Patients page loads connected patients from PostgreSQL.
- Caregiver patient details are role-authorized and database-backed.
- Caregiver alerts now include alerts from all connected patients.
- Caregiver appointments load all assigned patients; appointment requests can select the patient.
- Caregiver care-network page shows all connected patients and shared notes.
- Physician patient panel loads all connected patients from PostgreSQL.
- Physician patient details are role-authorized and database-backed.
- Physician appointments load all assigned patient appointments.
- Physician emergency log loads all emergency alerts from connected patients and resolves the selected alert.
- Reports are now generated from PostgreSQL data instead of mock report data.
- Shared care notes can be scoped to a selected patient.
- AI uses authorized patient bundles for the logged-in role and has a local fallback when Ollama is unavailable.
- Removed frontend mock-data initialization from the live application context.
- Existing visual design and navigation were preserved.

## Setup

### Frontend

From the project root:

```bash
cd frontend
npm ci
npm run dev
```

If Vite chooses a different port, the backend CORS list already allows localhost ports 5173, 5174 and 5175.

### Backend

```bash
cd backend
npm ci
npm run prisma:generate
npm run start
```

Create `backend/.env` from `backend/.env.example` and set:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=your-secret
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

The deliverable intentionally does not include a real `.env` file so database credentials are not packaged into the ZIP.

## Database

Make sure PostgreSQL is running and the Prisma schema has been applied to the target database before logging in.

If the database is already set up, do not recreate it unnecessarily.

## AI

Ollama is optional. If Ollama is running with the configured model, HealthSync uses it. If it is unavailable, the backend provides a restricted database-derived fallback for common medication, adherence and appointment questions.

## Important test flow

1. Create/login as a patient.
2. Connect a caregiver and physician using Care Network.
3. Add medications/vitals/appointments as the patient.
4. Login as the caregiver and verify Patients, Alerts, Appointments and Reports use the connected patient's database records.
5. Login as the physician and verify Patients, Emergencies, Appointments and Reports use the connected patient's database records.
6. Add a clinical note as physician and a care observation as caregiver.
7. Verify the patient can see the resulting shared updates.
8. Trigger SOS from the patient and verify it appears for connected caregiver/physician accounts.
9. Test the AI with questions about the logged-in user's authorized health information.
