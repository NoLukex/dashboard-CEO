# Checklista Wdrożeniowa - Executive Cockpit

## 1. Migracja do Produkcji (Supabase)
- [ ] Utwórz projekt w Supabase.
- [ ] Uruchom skrypt SQL z `server.ts` w SQL Editorze Supabase.
- [ ] Skonfiguruj zmienne środowiskowe w `.env`:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Zamień wywołania `fetch('/api/...')` na `supabase.from('...').select()` w warstwie serwisu frontendowego.
- [ ] Włącz Row Level Security (RLS) dla tabel:
  - `alter table task_items enable row level security;`
  - `create policy "Users can only see their own tasks" on task_items for select using (auth.uid() = user_id);`

## 2. Realtime
- [ ] Zamień `setInterval` w `App.tsx` na subskrypcję Supabase:
  ```typescript
  supabase
    .channel('public:task_items')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'task_items' }, payload => {
      fetchData(); // lub aktualizacja granularna
    })
    .subscribe()
  ```

## 3. Bezpieczeństwo
- [ ] Upewnij się, że RLS jest włączone dla WSZYSTKICH tabel.
- [ ] Wyłącz publiczny dostęp do tabel (tylko autoryzowani userzy).
- [ ] Skonfiguruj Auth Providers (Google/GitHub) w Supabase.

## 4. Optymalizacja
- [ ] Dodaj indeksy na kolumnach często filtrowanych (`user_id`, `status`, `due_date`).
- [ ] Wdróż Edge Functions dla agregacji KPI jeśli zapytania staną się wolne.

## 5. Backup
- [ ] Skonfiguruj Point-in-Time Recovery (PITR) w Supabase (dla planu Pro).
- [ ] Regularny eksport JSON z `bot_knowledge`.
