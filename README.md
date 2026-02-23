<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Executive Cockpit Dashboard

Dashboard operacyjny (PL) dla workflow: Tasks + Habits + Weekly Review + Knowledge.

## Run locally

1. Skopiuj env:
   `cp .env.example .env`
2. Uzupełnij klucze Supabase w `.env`.
3. Zainstaluj zależności:
   `npm install`
4. Uruchom aplikację:
   `npm run dev`

Aplikacja działa na `http://localhost:3000` (frontend + API w jednym serwerze).

## Stack

- React + Vite + Tailwind + Recharts
- Express API
- Supabase (Postgres + Realtime)

## Najważniejsze funkcje

- Decision-first cockpit: KPI + rekomendacje + konsola ryzyka
- Focus Mode i Command Palette (`Ctrl/Cmd + K`)
- Snapshot API (`/api/dashboard`) dla szybkiego ładowania
- Realtime z Supabase + fallback polling
- Heatmap nawyków (28 dni) i warstwa strategiczna (Projects/Outcomes)

## Główne endpointy

- `GET /api/dashboard`
- `GET /api/overview`
- `GET /api/ops`
- `GET /api/tasks?scope=today|week|overdue`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `GET /api/habits`
- `POST /api/habits/:id/toggle`
- `GET /api/strategy`
- `GET /api/knowledge`
- `GET /api/charts/activity`
- `GET /api/charts/focus`

## Schema alignment with bot

- Uruchom migracje z root `sql/` (szczegolnie `005_events_life_events.sql` i `006_task_extensions_review_updates.sql`).
- Dashboard wykorzystuje dane bota z tabel: `events`, `life_events`, `memory_chunks`, `reminders`, `system_logs`.
