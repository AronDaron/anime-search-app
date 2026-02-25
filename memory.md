# Neo Search (Aplikacja Wyszukiwarki Anime) - Logi Pamięci & Kontekst

## Przegląd Projektu

Neo Search to aplikacja desktopowa oparta na Electronie (ze wsparciem dla podglądu przez przeglądarkę dzięki Vite). Głównym oknem zastosowań jest przeszukiwanie, przeglądanie detali oraz zapisywanie na dysku ulubionych anime i gier. Aplikacja uderza w API AniList GraphQL, żeby pobierać okładki, odcinki i recenzje, a dzięki wykorzystaniu LLMa (OpenRouter) potrafi sugerować anime na podstawie naturalnego opisu fabuły od użytkownika. Własne dane (historia wyszukiwania, polubienia) są obsługiwane przez super-szybką, lokalną bazę SQLite ukrytą dogłębnie w procesach zaplecza Electrona.

## Stos Technologiczny (Technologie)

- **Framework:** Electron (via electron-vite)
- **Biblioteka interfejsu (Frontend):** React 19 z routingiem `react-router-dom` (w wymuszonym trybie `HashRouter` odpowiednim dla offline'u).
- **Język:** TypeScript
- **Style:** Vanilla CSS (Styl szkła "Glassmorphism", Neony, Ciemny motyw).
- **Baza Danych:** `better-sqlite3` (Lokalny instalator SQLite dla przechowywania persystentnego).
- **Użyte API:**
  - **AniList GraphQL** (`https://graphql.anilist.co`) - Źródło informacji o anime (Fabuła, daty, autorzy, powiązane okładki odcinków `streamingEpisodes` oraz relacje/sezony `relations`).
  - **Steam API & SteamSpy** (`https://store.steampowered.com/api` i `https://steamspy.com/api.php`) - Źródło danych o grach wideo (Ceny, Wymagania Sprzętowe, Zwiastuny Wideo) oraz baza czystych recenzji społeczności. Ograniczenia CORS są omijane hybrydowo: przez wbudowane `Vite Proxy` (/steam-store oraz /steamspy) w trybie przeglądarki, z opcją przełączenia na surowe requesty `ipcRenderer` (Electron) po zbudowaniu binarnej paczki.
  - **OpenRouter (Sztuczna Inteligencja)** (`https://openrouter.ai/api/v1/chat/completions`) - Moduł odpowiedzialny za szukanie po opisie wpisanym zdaniami dla Anime i Gier. Tworzy inteligentny "Werdykt AI" podsumowując recenzje Steama w tabeli Za i Przeciwko oraz wyciąga tablice z proponowanymi tytułami, które aplikacja następnie wzbogaca okładkami z odpowiednich API (AniList / Steam). Preferowany darmowy model: `google/gemini-2.5-flash-free`.
  - **Jikan API (MyAnimeList)** (`https://api.jikan.moe/v4`) - Zewnętrzne, opcjonalne API używane do doczytywania prawdziwych społecznościowych ocen per odcinek (punkty 1-10) z serwisu MAL. Obejmuje pełną asynchroniczną paginację (z pętlą while omijającą 100 odcinków limitu z opóźnieniem omijającym rate-limits) by obsłużyć "tasiemce".
- **Wykresy & Analiza Danych:** `recharts` (Interaktywne elementy SVG wkomponowane w Bento Box)
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
- `steamAPI.ts`, `steamReviews.ts` & `steamStore.ts` [NOWE]: Agregatory danych łączące się ze sklepem Steam i bazą SteamSpy. `steamAPI` rozpoznaje środowisko i dynamicznie ukierunkowuje requesty (Proxy przeglądarki Vite vs Electron). Moduł `steamStore.ts` odpytuje o pełne detale gier, listę kategorii czy wyniki wyszukiwania z obsługą fallabacków w formacie `header.jpg` by omijać braki w starych tytułach. Moduł `steamReviews.ts` odpytuje o top 20 recenzji gry i parsuje je pod analizę sztucznej inteligencji omijając standardowe zablokowane ścieżki Steamworks API.
- `ai.ts`: Plik łączący się z potężnym LLMem przez OpenRouter nakazujący na wyjściu odpowiedź `array` w JSON. Obsługuje inteligentne ekstrahowanie intencji wyszukiwania (wyciąga `titles` oraz `searchParams` z tekstu) z dedykowanymi promptami na podstawie parametru bazowego domeny (Anime / Gry). Posiada asynchroniczną funkcję `fetchAIReviewSummary`, syntetyzującą surowe opinie ze Steama w ustandaryzowaną macierz punktów "Zagraj, jeśli..." vs "Unikaj, jeśli...". Klucze z `.env` obsługiwane są przez Vite.

#### Tłumaczenie UI, Streszczenia i Cacheowanie AI

- **Spolszczone UI**: Interfejs całej aplikacji został przetłumaczony na język polski, usuwając język angielski z frontu.
- **Tłumaczenie Tekstów i Generowanie Opinii (Optymalizacja SQLite)**: W `AnimeDetails.tsx` wdrożono hybrydowy system korzystający z darmowego modelu Gemini dla AI. Posiada on mechanizm ratowania Tokenów API: Najpierw zapytanie o przetłumaczony opis lub wygenerowany zarys recenzji (Opinie) trafia do lokalnej szybkiej bazy `window.api.db` (do tabeli `translations` lub `review_summaries`). Dopiero wtedy, gdy odpowiedź nie istnieje w cache'u aplikacji - następuje wysłanie surowych danych do OpenRoutera. Wygenerowany wynik wyświetla się użytkownikowi i jest niezauważalnie, permanentnie zrzucany do bazy danych, by w przyszłości zwrócić wynik natychmiastowo.

#### Zmienne, Kolory i Główne Komponenty Aplikacji

- `index.css`: Główny plik resetu. Na poziomie globalnym wymusza wsparcie Dark-Theme. Posiada wdrożone kolory zmiennych (CSS variables) gotowe do wsparcia hubów: Anime (Cyan), Gry (Green). Wykorzystuje `.theme-anime` i `.theme-games` do globalnego nadpisywania barw (np. świecenia neonów).
- `Navbar.tsx` / `Navbar.css` (`src/renderer/src/components/shared/`): Interaktywny pasek top-level. W locie podmienia układ przycisków i kolory (Cyan na Green) decydując na podstawie ścieżki `/anime` lub `/games`. Zawiera wbudowane pod-menu (flex-wrap wrapper dla zabezpieczenia przed nachodzeniem na małych oknach), pole inteligentnego wyszukiwania AI z dynamicznym promptem (Anime vs Gry) i nawigację zintegrowaną do rozdzielnych list (np. Nowości, Sezony, Promocje Steam).
- `PlaceholderSection.tsx` (`src/renderer/src/components/shared/`): Uniwersalny, adaptatywny wizualnie komponent używany jako atrapa do podglądu ścieżki `games`, przed wdrożeniem finalnego kodu dla tej subsekcji.

#### Komponenty Modułu Anime (`src/renderer/src/components/anime/`)

- `Home.tsx` / `Home.css`: Pulpit domowy witający użytkownika podzielony elastycznym gridem/flexem na asymetryczne kolumny. Po lewej (z łamaniem boksów) renderuje siatki `NeonCard` najpopularniejszych animacji. Po prawej znajduje się "Kalendarz Premier" – pobrany w locie za pomocą `Promise.all` harmonogram wychodzących dzisiaj/jutro odcinków wraz z odliczającym licznikiem czasowym dla łatwej weryfikacji przez kliknięcie.
- `Search.tsx`: Strona obsługująca wyszukiwanie po tytule wyciągana komendą Enter z nawigacji głównej.
- `FilterSearchView.tsx` / `FilterSearchView.css`: Główny, zaawansowany panel filtra ("Wyszukiwanie"). Posiada boczny pasek opcji pozwalający łączyć dziesiątki gatunków, sezony i lata emisji w jedno konkretne żądanie do bazy `searchAnime()` obsługiwane bez udziału AI.
- `AISearchView.tsx` / `AISearchView.css`: Dedykowany, futurystyczny interfejs dla asystenta sztucznej inteligencji wspierający wyszukiwanie gier i anime na bazie dynamicznego propa `domain`. Wystylizowany za pomocą dedykowanych klas CSS przypominających konsolę.
- `GenresView.tsx`: Pełnoprawna strona służąca do przeglądania anime na podstawie tagów z gatunkami.
- `SeasonsView.tsx`: Strona zorientowana na wydania ramówkowe anime wg pór roku.
- `AnimeDetails.tsx` / `AnimeDetails.css`: Główne "centrum opowieści". Ekran oparty na nowej generacji Zakładek (Tabs): **Informacje, Odcinki, Bohaterowie, Statystyki** oraz specjalnej świecącej na fioletowo nowej sekcji **Opinie AI**, doczytującej wnioski z recenzji z AniList. Zawiera także Grid Aktorów Głosowych (Seiyuu), logikę linkowania polskich portali strumieniujących (`Slug_Title`) oraz listę sezonów relacyjnych. **Sekcja "Statystyki" oparta jest na inteligentnym, kaskadowym układzie Bento Box z integrowanymi wykresami analitycznymi dostarczanymi graficznie przez bibliotekę zależną `recharts`. Obsługuje ona dedykowane polskie tłumaczenia globalnych statusów (Emitowane, Wstrzymane, Planowane).**

#### Komponenty Modułu Gier Steam (`src/renderer/src/components/games/`)

- `GamesHome.tsx`: Główny panel sekcji gamingowej posiadający logikę asynchronicznego pobierania list gier z darmowych endpointów deweloperskich (`api/featuredcategories`). Poprzez dynamiczny parametr `[title]`, komponent przydziela aktualne obiekty Bestsellerów, Promocji i Nowości w gridzie zamiast polegać na lokalnych mockach. Obsługuje też mieszanie danych z odfiltrowaniem zduplikowanych identyfikatorów z głównego koszyka sklepu.
- `GameSearch.tsx` [NOWE]: Prosty widok natychmiastowych wyników standardowej wyszukiwarki (obsługiwany wpisywaniem frazy bezpośrednio do głównego paska Navbar w domenie gier).
- `GameFilterSearchView.tsx` [NOWE]: Zaawansowany panel wyszukiwania gier. Udostępnia w pełni reaktywne wyszukiwanie tekstowe z _debouncingiem_ w połączeniu z limitami cen Steam i selektorami gatunków. Odświeża siatkę gier automatycznie bez potrzeby naciskania przycisku. Silnie integruje zapytania tekstowe do `steamStore.ts` oraz gatunkowe do Proxy `steamspy`.
- `GameGenresView.tsx` [NOWE]: Dedykowana z asynchronicznie ładowaną siatką dla gier po wybranym gatunku analogicznie jak to ma miejsce dla anime, napędzana dedykowanym zrzutem danych poprzez endpointy SteamSpy by ominąć puste ślepe trasy filtrowaniem oryginalnego sklepu Steam. Posiada interfejs oparty na zmyślnym pasku neonowych tagów u góry strony.
- `GameCard.tsx`: Komponent kafelek typu "Capsule" w horyzontalnym układzie graficznym (460:215). Posiada kaskadowy system naprawczy dla uszkodzonych i przestarzałych obrazów gier ze Steama (spadek z Capsule -> na Header -> na systemowy Neon CSS Placeholder). Zawiera etykiety procentowe rabatów (`discountPercent`) i tagi z odpowiednim formatowaniem polskiej ceny wyświetlające się przy wykonaniu akcji najechania myszy (*hover*).
- `GameDetails.tsx` / `GameDetails.css`: Potężny interfejs wizytówki gry (klon stylizacyjny Steama). Budowa uwzględnia poziomy "Hero Banner" załączający po lewej stronie elementu interaktywną "karuzelę wideo/screenshotów" pozwalającą kliknięciem przenieść odtwarzacz zwiastunu mp4 do zarysu krawędzi, oraz element **Buy Box** po prawej. Buy Box posiada dynamiczny Wykres Kołowy "Skali Recenzji Steama" generujący barwy stożkowe (%) w CSS. Obok integracji systemowych specyfikacji z HTML parsuje on "Werdykt AI", podsumowywujący pobrane recenzje do JSON w postaci dwóch obramowanych list zalet i wad gry od OpenRoutera!

#### Komponenty Dzielone (`src/renderer/src/components/shared/`)

- `NeonCard.tsx` / `NeonCard.css`: Wizytówka kafelek używana w Gridzie i w nawigacji wyników.
- `Grid.css`: Konfiguracja gridowych matryc CSS dla responsywnego ułożenia.

## Jak dewelopować program w trybie przeglądarki?

Aplikację należy w całości uruchamiać komendą wyciągającą aplikację po złączu Vite używając:
`npm run dev:web`
To tryb bezpieczny z serwerem deweloperskim dla testowania zmian w plikach jak np CSS. Do skryptu w `package.json` dopięta jest domyślnie flaga `--host`, która celowo udostępnia aplikację w szerokiej strukturze na porcie `5173`, używana dlatego, by dać radę wejść na nią domowym komputerem prosto z serwera lokalnego LXC Proxmox.
