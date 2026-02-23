# Checklista Wdrożeniowa - Executive Cockpit

## 1. Konfiguracja środowiska
- [ ] Skopiuj `.env.example` do `.env`.
- [ ] Ustaw:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `APP_USER_ID`
  - `APP_USER_LINKS_TABLE` (opcjonalnie, domyślnie `app_user_links`)

## 2. Schemat bazy (minimum)
- [ ] Upewnij się, że istnieją tabele:
  - `task_items`
  - `habit_definitions`
  - `habit_completions`
  - `daily_reviews`
- [ ] (Zalecane) uruchom `sql/001_executive_dashboard_extensions.sql`.
- [ ] Uruchom root migracje: `../sql/005_events_life_events.sql`, `../sql/006_task_extensions_review_updates.sql`.
- [ ] Opcjonalnie: `projects`, `outcomes`, `bot_knowledge`.
- [ ] Uzupełnij mapowanie userów auth -> app user:
  - tabela: `app_user_links(auth_uid, app_user_id)`

## 3. Realtime
- [x] Frontend subskrybuje Realtime dla:
  - `task_items`
  - `habit_completions`
  - `daily_reviews`
- [x] Fallback polling 60s jest aktywny.

## 4. Bezpieczeństwo
- [ ] Włącz RLS na wszystkich tabelach produkcyjnych.
- [ ] Ogranicz dostęp do `service_role` tylko po stronie backendu.
- [ ] Dodaj polityki po `user_id`.
- [ ] Produkcyjnie wymagaj `Authorization: Bearer <jwt>` dla endpointów `/api/*`.

## 5. Uruchomienie
- Dev: `npm run dev`
- Build: `npm run build`
- Preview/Start: `npm run preview`

## 6. API snapshot
- [ ] Używaj głównie `GET /api/dashboard` (jedno wywołanie, pełny snapshot).
- [ ] Pozostałe endpointy traktuj jako pomocnicze dla mutacji i diagnostyki.

## 7. Operacyjnie
- [ ] Sprawdź `GET /api/health`.
- [ ] Sprawdź `GET /api/dashboard`.
- [ ] W razie przekroczeń limitów mutacji dostosuj:
  - `MUTATION_WINDOW_MS`
  - `MUTATION_LIMIT`
