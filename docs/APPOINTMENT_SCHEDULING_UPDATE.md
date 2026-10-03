# HealthSync – Research Paper Appointment Scheduling Update

This update adds an open-source intelligent appointment scheduling layer inspired by:
**An ASP-based Solution to the Medical Appointment Scheduling Problem** (ICLP 2025 / EPTCS 439, 2026).

## Added to the existing project

- Smart appointment optimizer in the Appointments page
- Patient urgency: Low / Medium / High
- Preferred clinic
- Preferred doctor
- Preferred time window
- Accessibility requirement
- Sensory preference (light / noise)
- Conflict-free slot filtering against existing appointments
- Clinic/doctor availability catalog
- Distance-aware scheduling
- In-person vs telemedicine compatibility
- Ranked slot suggestions
- Answer Set Programming (ASP) model using Clingo
- Automatic fallback constraint scheduler when Clingo is not installed
- REST endpoint: `POST /api/appointments/optimize`

## Open-source technologies added

- Python 3.10+
- Clingo 5.7+
- Answer Set Programming (ASP)

Install the optional ASP solver with:

```bash
cd backend
pip install -r scheduler/requirements.txt
```

Then start HealthSync normally. If Clingo is installed, the optimizer reports `clingo-asp`; otherwise it uses the built-in deterministic fallback.
