# HealthSync AI - Working Setup

1. Install Node.js 20+ and PostgreSQL.
2. Install Ollama from https://ollama.com/download.
3. Open PowerShell and run `ollama pull llama3.2:3b`. If you use another installed model, set `OLLAMA_MODEL` in `backend/.env`.
4. Create `backend/.env` from `backend/.env.example` and set your PostgreSQL password/database.
5. From the HealthSync project root run `npm --prefix frontend ci`.
6. Run `npm --prefix backend ci`.
7. Run `npm --prefix frontend run dev:all`. This starts Vite and the HealthSync backend together.
8. Open the Vite URL shown in the terminal (normally http://localhost:5173).

The AI page now shows whether Ollama is connected and which model is being used. If Ollama is temporarily unavailable, HealthSync returns a safe local fallback instead of hanging or showing a blank result.

## Quick Windows start

After `npm --prefix frontend ci` and `npm --prefix backend ci` from the project root, use:

`npm --prefix frontend run dev:all`

This starts both the React/Vite frontend and the Express/Prisma backend. The AI screen checks Ollama automatically. The configured model is preferred; if another local Ollama model is installed, HealthSync can use that model automatically.
