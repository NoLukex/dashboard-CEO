# Rejestr Ryzyk i Mitygacji

## 1. Ryzyko: Wydajność przy dużej liczbie zadań
- **Opis:** Przy tysiącach zakończonych zadań, obliczanie KPI "w locie" może spowolnić dashboard.
- **Mitygacja:** 
  - Archiwizacja starych zadań (np. > 1 rok) do osobnej tabeli `task_archive`.
  - Materialized Views dla KPI odświeżane co godzinę/dzień.

## 2. Ryzyko: Brak synchronizacji offline
- **Opis:** Utrata połączenia uniemożliwia pracę.
- **Mitygacja:**
  - Wdrożenie `tanstack-query` z persystencją w `localStorage`.
  - Queueing akcji (optimistic updates) i synchronizacja po odzyskaniu połączenia.

## 3. Ryzyko: "Zombienie" nawyków
- **Opis:** Użytkownik przestaje śledzić nawyki, dashboard pokazuje demotywujące 0%.
- **Mitygacja:**
  - Funkcja "Reset Momentum" (czysta karta).
  - Automatyczne wyłączanie (`active = false`) nawyków nieużywanych przez 14 dni.

## 4. Ryzyko: Przeciążenie poznawcze (Cognitive Load)
- **Opis:** Zbyt wiele metryk na start.
- **Mitygacja:**
  - Progresywne ujawnianie (domyślnie zwinięte sekcje Strategy/Knowledge).
  - Tryb "Focus Mode" ukrywający wszystko poza "Fokus Dnia".
