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
- `database.ts`: Skrypt utrzymujący połączenie z bazą `better-sqlite3`. Tworzy tabele `favorites` (Ulubione anime) oraz `history` (ostatnie wyszukiwania). Znajdują się tu komendy `addFavorite`, `removeFavorite`, `getFavorites`, i odpowiedniki dla historii. Plik z bazą zapisywany jest bezinwazyjnie w `%APPDATA%` / folderze użytkownika poprzez zmienną ścieżki z `app.getPath('userData')`.

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
- `anilist.ts`: Kombajn danych AniList GraphQL wraz z pomocniczym konektorem do platform streamingowych. Zawiera precyzyjne interfejsy z `ANIME_DETAILS_QUERY` dociągające nie tylko studia animatorskie ale obsadzone mocno w zapytania relacji (Sezony) i listy epizodyczne. Rozbudowano zapytanie `SEARCH_ANIME_QUERY` o możliwość filtrowania przez tablicę gatunków (`genre_in`), Enumy sezonowe (`season`) i rok sezonu (`seasonYear`), by obsługiwać zaawansowane wyszukiwanie z AI. Rozszczepiono tu też funkcję `getAnimeEpisodesFromJikan()` strzelającą pętlami do API Jikan z obsługą paginacji w 100-odcinkowych paczkach na raty.
- `ai.ts`: Plik łączący się z potężnym LLMem przez OpenRouter nakazujący na wyjściu odpowiedź `array` w JSON. Obsługuje inteligentne ekstrahowanie intencji wyszukiwania (wyciąga `titles` oraz `searchParams` takie jak gatunki, roczniki i tagi z tekstu polskiego), co omija tzw. punkt odcięcia (Knowledge Cutoff) modeli LLM. Zawiera też funkcję `translateDescriptionToPolish(description: string, apiKey: string)`, która tłumaczy surowe angielskie opisy pobrane z AniList na poprawny i naturalny język polski przy użyciu modelu `google/gemini-2.5-flash-free`. Zwraca przetłumaczony tekst lub rzuca log błędu w przypadku problemów z limitem po stronie OpenRouter. Klucze API do tych usług odnajdywane są na warstwie frontendu poprzez odpytanie zmiennych środowiskowych Vite (`import.meta.env.VITE_OPENROUTER_KEY`) a jako plan B z pamięci przeglądarki (`localStorage`).

#### Tłumaczenie UI i Cacheowanie AI (Ostatnie Wdrożenia)
- **Spolszczone UI**: Interfejs całej aplikacji (przyciski, nawigacja w `Navbar.tsx`, ładowarki, sekcje w `Home.tsx`, `Search.tsx`, `GenresView.tsx` oraz tagi w `apiToPolishGenre`) został na twardo przetłumaczony na język polski, usuwając całkowicie język angielski z frontu (z wyjątkiem oryginalnych tytułów z API).
- **Tłumaczenie i Cacheowanie Opisów (Optymalizacja)**: W `AnimeDetails.tsx` wdrożono hybrydowy system renderowania opisu. Najpierw komponent pyta w ułamku sekundy wewnętrzną bazę SQLite (przez IPC most `window.api.db.getTranslation`) o to, czy kiedykolwiek to anime było otwierane. Jeśli tak - wkleja natychmiast polski archiwalny tekst (0 zapytań do API). Jeśli nie - renderuje się Spinner (stan `isTranslating`), w tle wysyłany jest tekst do chmury OpenRouter uderzając w plik `ai.ts`, a wygenerowana polska treść zostaje "w locie" wtłoczona w UI i natychmiast zapisana na zawsze do lokalnej bazy (`window.api.db.addTranslation`) za pomocą nowej tabeli `translations` w logice procesów Node.js. 

#### Zmienne, Kolory i Główne Komponenty Aplikacji
- `index.css`: Główny plik resetu. Na poziomie globalnym wymusza wsparcie Dark-Theme. Posiada wdrożone kolory zmiennych (CSS variables) gotowe do wsparcia hubów: Anime (Cyan), Seriale (Purple), Filmy (Red), Gry (Green).
- `Navbar.tsx` / `Navbar.css` (`src/renderer/src/components/shared/`): Interaktywny pasek ze wsparciem menu rozwijanego (dropdown) dla zmian modułów popkultury. Logo dynamicznie zmienia tekst na nazwę sub-sekcji (np. NEO GRY) i adaptuje do tego zdeklarowany kolor neonu. Posiada obok wyszukiwarkę tekstową, inteligentny przycisk "AI Search" oraz dedykowane przyciski przekierowujące do stron "Gatunki" oraz "Sezony", obok inteligentnego przycisku "Home".
- `PlaceholderSection.tsx` (`src/renderer/src/components/shared/`): Uniwersalny, adaptatywny wizualnie komponent używany jako atrapa do podglądu ścieżek `movies`, `series` i `games`, przed wdrożeniem finalnego kodu dla tych subsekcji.

#### Komponenty Modułu Anime (`src/renderer/src/components/anime/`)
- `Home.tsx`: Strona główna witająca użytkownika ładująca popularne anime.
- `Search.tsx`: Strona obsługująca wyszukiwanie standardowe.
- `AISearchView.tsx` / `AISearchView.css` [NOWE]: Dedykowany, futurystyczny interfejs dla asystenta sztucznej inteligencji. Posiada pole tekstowe i manualne modyfikatory ucinające AI (Filtry roku i sezonu). Wystylizowany za pomocą dedykowanych klas CSS przypominających konsolę.
- `GenresView.tsx` [NOWE]: Pełnoprawna strona służąca do przeglądania anime na podstawie tagów z gatunkami. Zawiera chmurki do szybkiego zaznaczania gatunków i wybierak roczników obok.
- `SeasonsView.tsx` [NOWE]: Strona zorientowana na wydania ramówkowe anime wg pór roku. Posiada sprytny skrypt detekcji obecnego mięsiąca ładując najświeższe premiery domyślnie "na dzień dobry", oraz przyciski i selecty do żonglowania czasem i latami.
- `AnimeDetails.tsx`: Główne "centrum opowieści". Ekran bazuje na nowoczesnym podziale na Zakładki (Tabs): **Informacje, Odcinki, Bohaterowie, Statystyki**, umieszczonych nad tytułem i plakatem. Dzięki temu zlikwidowano problem przewijania długich stron. Zawiera zoptymalizowaną, przewijaną horyzontalnie listę powiązanych sezonów (franchise-list) o stałej wysokości. Posiada dedykowany grid dla postaci i aktorów głosowych. Zaawansowana zakładka "Odcinki" obsługuje błędy architektury "Split-Cour" w AniList – domyślnie ładuje strumienie odcinków do limitu dla części 1, i mądrze korzysta z alternatywnego MyAnimeList jako "Fallout", aby dograć strumienie i stopnie ocen do pustych kontynuacji (np. Part 2 / Cour 2). Obsługuje system ulubionych.
- `AnimeDetails.css`: Dodatki neonów "Glassmorphism" w tym nowoczesny element `.rating-circle` (przezroczyste, gradientowe, szklane koło na rzucającej światło ocenę po prawej od odcinka z gwiazdką), pasek nawigacji zakładek (Tabs) oraz system gridowy dla nowej sekcji Bohaterów i Statystyk.

#### Komponenty Dzielone (`src/renderer/src/components/shared/`)
- `NeonCard.tsx` / `NeonCard.css`: Wizytówka kafelek używana w Gridzie i w nawigacji wyników.
- `Grid.css`: Konfiguracja gridowych matryc CSS dla responsywnego ułożenia.

## Jak dewelopować program w trybie przeglądarki?
Aplikację należy w całości uruchamiać komendą wyciągającą aplikację po złączu Vite używając:
`npm run dev:web`
To tryb bezpieczny z serwerem deweloperskim dla testowania zmian w plikach jak np CSS. Do skryptu w `package.json` dopięta jest domyślnie flaga `--host`, która celowo udostępnia aplikację w szerokiej strukturze na porcie `5173`, używana dlatego, by dać radę wejść na nią domowym komputerem prosto z serwera lokalnego LXC Proxmox.
