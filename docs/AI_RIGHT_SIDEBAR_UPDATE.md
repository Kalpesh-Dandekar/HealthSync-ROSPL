# HealthSync AI Assistant Update

## Included

- Added a desktop right-side AI patient overview panel.
- Right panel shows the authorized patient, adherence, open alerts, latest vitals, medications, upcoming appointments, and escalation status.
- Caregiver/physician workspaces can switch between authorized patients when more than one is connected.
- Added `/api/ai/context` for role-authorized AI dashboard context.
- Chat record questions are grounded directly in PostgreSQL records for medications, vitals, appointments, adherence, and alerts. This prevents the local LLM from refusing a record lookup or inventing patient data.
- General questions continue to use local Ollama (`llama3.2:3b`).
- Strengthened the medication AI coach prompt so supplied authorized medication records are used directly.
- Backend `.env.example` uses `http://127.0.0.1:11434` to avoid Windows localhost IPv6 (`::1`) connection issues.

## Ollama

For Windows, use:

```env
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
```

The actual local `.env` is intentionally not included in the ZIP. Keep your existing PostgreSQL credentials and the working Ollama settings.
