# Neo Search (Aplikacja Wyszukiwarki Anime) - Logi Pamięci & Kontekst

## Przegląd Projektu
Neo Search to aplikacja desktopowa oparta na Electronie (ze wsparciem dla podglądu przez przeglądarkę dzięki Vite). Głównym oknem zastosowań jest przeszukiwanie, przeglądanie detali oraz zapisywanie na dysku ulubionych anime, serialow, filmow i gier. Aplikacja uderza w API AniList GraphQL, żeby pobierać okładki, odcinki i recenzje, a dzięki wykorzystaniu LLMa (OpenRouter) potrafi sugerować anime na podstawie naturalnego opisu fabuły od użytkownika. Własne dane (historia wyszukiwania, polubienia) są obsługiwane przez super-szybką, lokalną bazę SQLite ukrytą dogłębnie w procesach zaplecza Electrona.

## Stos Technologiczny (Technologie)
- **Framework:** Electron (via electron-vite)
- **Biblioteka interfejsu (Frontend):** React 19 z routingiem `react-router-dom` (w wymuszonym trybie `HashRouter` odpowiednim dla offline'u).
- **Język:** TypeScript
- **Style:** Vanilla CSS (Styl szkła "Glassmorphism", Neony, Ciemny motyw).
- **Baza Danych:** `better-sqlite3` (Lokalny instalator SQLite dla przechowywania persystentnego).
- **Użyte API:**
  - **AniList GraphQL** (`https://graphql.anilist.co`) - Źródło informacji o anime (Fabuła, daty, autorzy, powiązane okładki odcinków `streamingEpisodes` oraz relacje/sezony `relations`).
  - **OpenRouter (Sztuczna Inteligencja)** (`https://openrouter.ai/api/v1/chat/completions`) - Moduł odpowiedzialny za szukanie po opisie wpisanym zdaniami. Preferowany darmowy model: `google/gemini-2.5-flash-free`.
  - **Jikan API (MyAnimeList)** (`https://api.jikan.moe/v4`) - Zewnętrzne, opcjonalne API używane do doczytywania prawdziwych społecznościowych ocen per odcinek (punkty 1-10) z serwisu MAL. Obejmuje pełną asynchroniczną paginację (z pętlą while omijającą 100 odcinków limitu z opóźnieniem omijającym rate-limits) by obsłużyć "tasiemce".
- **Ikonografia:** `lucide-react`

## Struktura Plików i Architektura

Logika bazuje na standardowym środowisku `electron-vite` i dzieli się w głównym folderze `src/` na trzy pakiety (Proces Główny, Most Preload, oraz Proces Renderujący - React).

### 1. Main Process (`src/main/`) - Serwer w tle
Proces działający w serwerze Node.js, posiada pełne prawo dostępu do operacji dyskowych systemu.
- `index.ts`: Plik startowy aplikacji. Od tego miejsca ładuje się ikona Electrona, tworzone zostaje główne okno (BrowserWindow). Tutaj też zadeklarowane są połączenia (np. `ipcMain.handle()`) pozwalające oknu interkomunikować się z ukrytą bazą danych SQLite.
- `database.ts`: Skrypt utrzymujący połączenie z bazą `better-sqlite3`. Tworzy tabele `favorites` (Ulubione anime), `history` (ostatnie wyszukiwania), `translations` (polskie opisy fabuły) oraz `review_summaries` (polskie streszczenia recenzji AI). Znajdują się tu komendy obsługujące zapis i odczyt z bazy. Plik z bazą zapisywany jest bezinwazyjnie w `%APPDATA%` / folderze użytkownika poprzez zmienną ścieżki z `app.getPath('userData')`.

### 2. Preload Script (`src/preload/`) - Most bezpieczeństwa
Elektron ze względów bezpieczeństwa zamyka okno Reacta tak, by nie mogło ono używać API systemu (np. czytać dysku). Zamek ten otwiera skrypt "Preload", który łączy oba te światy wystawiając okrojone kanały.
- `index.ts`: Kod rejestrujący API globalnej zmiennej na oknie przeglądarki używając `contextBridge.exposeInMainWorld()`. Tutaj deklarujemy że pod zmienną `window.api.db` mamy zestaw asynchronicznych akcji wysyłających polecenia do Maina (`ipcRenderer.invoke`).
- `index.d.ts`: Plik pomocniczy napisany w TypeScriptcie. Udostępnia silnikowi typescriptu w Reakcie wiedzę o tym, że `window.api.db` faktycznie istnieje i ma odpowiednie funkcje (zapobiega błędom TS). Zadeklarowane tutaj są np. Promise zwracające historię wyszukiwań.

### 3. Renderer Process (`src/renderer/`) - React Frontend
Miejsce gdzie znajdują się absolutnie wszystkie pliki wyświetlane użytkownikowi przez interfejs (UI).

#### Pliki Konfiguracyjne
- `index.html`: Główny korzeń wyświetlania Reactowego `<div id="root"></div>`. Zawiera polityki bezpieczeństwa (CSP) tagu meta, który został ręcznie załagodzony o łączność REST do zewnętrznych serwerów (odblokowanie Jikan API opcją `connect-src 'self' https:`), co pozwala omijać cięcia CORS-owe zapobiegające powstawaniu ocen odcinków.
- `src/main.tsx`: Główne "Zaczepienie" drzewa DOM. Owija komponent w `StrictMode` z wymuszonym `HashRouterem`.
- `src/App.tsx`: Kapsuła głównych zmiennych stanowych. Przechowuje frazę wyszukiwarki `searchQuery` i flagę `isAiMode`. Obsługuje `Routes` które zrządzają widokami i nawigacją.

#### Głowna Baza Klientów-API (`src/renderer/src/api/`)
- `anilist.ts`: Kombajn danych AniList GraphQL wraz z pomocniczym konektorem do platform streamingowych. Zawiera precyzyjne interfejsy z `ANIME_DETAILS_QUERY` dociągające nie tylko studia animatorskie ale obsadzone mocno w zapytania relacji (Sezony), listy epizodyczne, węzeł `reviews` (opinie społeczności) oraz `externalLinks` do oficjalnych serwisów VOD. Rozbudowano zapytanie `SEARCH_ANIME_QUERY` o możliwość filtrowania przez tablicę gatunków (`genre_in`), Enumy sezonowe (`season`) i rok sezonu (`seasonYear`), by obsługiwać zaawansowane wyszukiwanie. Rozszczepiono tu też funkcję `getAnimeEpisodesFromJikan()` strzelającą pętlami do API Jikan z obsługą paginacji w 100-odcinkowych paczkach na raty.
- `ai.ts`: Plik łączący się z potężnym LLMem przez OpenRouter nakazujący na wyjściu odpowiedź `array` w JSON. Obsługuje inteligentne ekstrahowanie intencji wyszukiwania (wyciąga `titles` oraz `searchParams` z tekstu polskiego), tłumaczenie opisów `translateDescriptionToPolish` oraz od niedawna funkcję `summarizeReviews`, budującą bezspoilerowe, obiektywne streszczenie angielskich opinii prosto w języku polskim. Klucze API do tej usługi pobierane są ze środowiska i lokalnej przeglądarki.

#### Tłumaczenie UI, Streszczenia i Cacheowanie AI
- **Spolszczone UI**: Interfejs całej aplikacji został przetłumaczony na język polski, usuwając język angielski z frontu.
- **Tłumaczenie Tekstów i Generowanie Opinii (Optymalizacja SQLite)**: W `AnimeDetails.tsx` wdrożono hybrydowy system korzystający z darmowego modelu Gemini dla AI. Posiada on mechanizm ratowania Tokenów API: Najpierw zapytanie o przetłumaczony opis lub wygenerowany zarys recenzji (Opinie) trafia do lokalnej szybkiej bazy `window.api.db` (do tabeli `translations` lub `review_summaries`). Dopiero wtedy, gdy odpowiedź nie istnieje w cache'u aplikacji - następuje wysłanie surowych danych do OpenRoutera. Wygenerowany wynik wyświetla się użytkownikowi i jest niezauważalnie, permanentnie zrzucany do bazy danych, by w przyszłości zwrócić wynik natychmiastowo.

#### Zmienne, Kolory i Główne Komponenty Aplikacji
- `index.css`: Główny plik resetu. Na poziomie globalnym wymusza wsparcie Dark-Theme. Posiada wdrożone kolory zmiennych (CSS variables) gotowe do wsparcia hubów: Anime (Cyan), Seriale (Purple), Filmy (Red), Gry (Green).
- `Navbar.tsx` / `Navbar.css` (`src/renderer/src/components/shared/`): Interaktywny pasek ze wsparciem menu rozwijanego (dropdown) dla zmian modułów popkultury. Posiada obok wyszukiwarkę tekstową, klasyczny zaawansowany lejek z filtrami ("🔍 Wyszukiwanie") oraz inteligentny przycisk "🧠 Wyszukiwanie AI". Towarzyszą mu tagowe pod-moduły "Gatunki" i "Sezony".
- `PlaceholderSection.tsx` (`src/renderer/src/components/shared/`): Uniwersalny, adaptatywny wizualnie komponent używany jako atrapa do podglądu ścieżek `movies`, `series` i `games`, przed wdrożeniem finalnego kodu dla tych subsekcji.

#### Komponenty Modułu Anime (`src/renderer/src/components/anime/`)
- `Home.tsx`: Strona główna witająca użytkownika ładująca popularne anime.
- `Search.tsx`: Strona obsługująca wyszukiwanie po tytule wyciągana komendą Enter z nawigacji głównej.
- `FilterSearchView.tsx` / `FilterSearchView.css` [NOWE]: Główny, zaawansowany panel filtra ("Wyszukiwanie"). Posiada boczny pasek opcji pozwalający łączyć dziesiątki gatunków, sezony i lata emisji w jedno konkretne żądanie do bazy `searchAnime()` obsługiwane bez udziału AI.
- `AISearchView.tsx` / `AISearchView.css`: Dedykowany, futurystyczny interfejs dla asystenta sztucznej inteligencji. Wystylizowany za pomocą dedykowanych klas CSS przypominających konsolę.
- `GenresView.tsx`: Pełnoprawna strona służąca do przeglądania anime na podstawie tagów z gatunkami.
- `SeasonsView.tsx`: Strona zorientowana na wydania ramówkowe anime wg pór roku.
- `AnimeDetails.tsx` / `AnimeDetails.css`: Główne "centrum opowieści". Ekran oparty na nowej generacji Zakładek (Tabs): **Informacje, Odcinki, Bohaterowie, Statystyki** oraz specjalnej świecącej na fioletowo nowej sekcji **Opinie AI**, doczytującej wnioski z recenzji z AniList. Zawiera także Grid Aktorów Głosowych (Seiyuu), logikę linkowania polskich portali strumieniujących (`Slug_Title`) oraz listę sezonów relacyjnych.

#### Komponenty Dzielone (`src/renderer/src/components/shared/`)
- `NeonCard.tsx` / `NeonCard.css`: Wizytówka kafelek używana w Gridzie i w nawigacji wyników.
- `Grid.css`: Konfiguracja gridowych matryc CSS dla responsywnego ułożenia.

## Jak dewelopować program w trybie przeglądarki?
Aplikację należy w całości uruchamiać komendą wyciągającą aplikację po złączu Vite używając:
`npm run dev:web`
To tryb bezpieczny z serwerem deweloperskim dla testowania zmian w plikach jak np CSS. Do skryptu w `package.json` dopięta jest domyślnie flaga `--host`, która celowo udostępnia aplikację w szerokiej strukturze na porcie `5173`, używana dlatego, by dać radę wejść na nią domowym komputerem prosto z serwera lokalnego LXC Proxmox.
