# NEO SEARCH (dawniej Neo Anime) - Plan Koncepcyjny (Faza 2)

## Status Projektu (Podsumowanie Fazy 1)

Aplikacja zyskała w pełni działający fundament desktopowy i webowy:

- **Technologie:** Electron, Vite, React, TypeScript.
- **Styl:** Ciemny motyw (dark mode), szklarstwo (glassmorphism), neonowe akcenty.
- **Funkcje zrealizowane:**
  - Integracja z potężnym darmowym **API AniList** (GraphQL).
  - Wydajny **Live Search** z `debouncem` (400ms) i pamięcią podręczną (`Cache Map`).
  - Zabezpieczenia anti-hotlink (naprawione wyświetlanie obrazków okładek z AniList polityką `no-referrer`).
  - Działające lokalne środowisko proxy w Vite (`/graphql`) by omijać denerwujące usterki CORS i restrykcje sieci we frameworkach on-line.
  - Responsywny Grid wyświetlający listę "Trending Now" oraz zwracający dynamiczne wyniki wyszukiwania.

---

## Propozycja działań na Fazę 2 (Do realizacji w nowym czacie)

Głównym zadaniem Fazy 2 będzie ożywienie zawartości klikalnej oraz przyszykowanie potężniejszych mechanizmów bazy danych. Poniżej sugerowana roadmapa operacyjna dla nowego czatu:

### 1. Widok Szczegółów (Details View) - Najwyższy priorytet

Aktualnie kliknięcie na okładkę wyświetla wyskakujące powiadomienie alertu dla wybranego ID. W Fazie 2 należy zaprogramować pełny ekran detali.

- Szczegółowe zapytanie do AniList GraphQL pobierające resztę danych (Fabuła, Długość Odcinków, Status Emisji, Lista Gatunków, Postaci, Bannery).
- Dodanie lekkiego systemu nawigacji (tzw. "Routera"), żeby móc cofać się bezpiecznie z ekranu wybranego `widoku szczegółowego` z powrotem na `Stronę Główną` lub do konkretnych `Wyników Wyszukiwania`.

### 2. Podpięcie Bazy Lokalnej SQLite (Przyśpieszenie i tryb Offline)

Skierowanie aplikacji bardziej w stronę programu "Desktopowego".

- Zamiast polegać na 100% zapytań wysyłanych do chmury AniListu przy każdym uruchomieniu programu, wdrożymy lokalną bazę za pomocą `better-sqlite3`.
- Nasza wyszukiwarka czytałaby z błyskawicznej bazy systemowej (zera opóźnień sieci), a ukryty proces pobierałby najświeższe dane z API AniList w tle raz na dobę.
- Baza obsłuży "Historię wyszukiwania" i "Ulubione/Ocenione anime".

### 3. Moduł AI "Szukaj Fabułą" (Zarządzanie naturalnym tekstem)

Wymysł z oryginalnego konceptu, uatrakcyjniający projekt.

- Użytkownik pisze "Szukam anime o magach, którzy pracują jako kurierzy po apokalipsie", a zintegrowane API zewnętrznego LLMa filtruje i wyciąga precyzyjne rekordy bez spoilerów, przypinając je do ID w naszej aplikacji.

### 4. Agregator Źródeł (np. Crunchyroll/TMDB)

- Wzbogacenie komponentu widoku Szczegółów o ikonki "Gdzie obejrzeć legalnie". Wymaga to osobnego mniejszego zapytania do serwisów typu TMDB, które przechowują informacje o dostępności praw w Polsce/na świecie dla danego tytułu.

### 5. Widok miniaturek graficzny anime

- Naprawienie widoku miniaturek obecnie miniaturki nie pokazują grafik anime.

---

**ℹ️ Notatka dla Asystenta w nowym czacie:**

> Przed kontynuowaniem prac, by móc podglądać Reacta poprawnie w okienku w prawym panelu, uruchamiaj komendę `npm run dev:web`. Proces deweloperski Electrona może nie wspierać wirtualnych środowisk headless! Jeśli modyfikujesz coś w TypeScript, zawsze zachowaj importy Reacta w formacie `import * as React from 'react';`. Przed startem należy sprawdzić zawartość repozytorium m.in plik `anilist.ts` w katalogu src.
