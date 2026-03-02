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
  - **Steam API & SteamSpy** (`https://store.steampowered.com/api`, `https://api.steampowered.com` i `https://steamspy.com/api.php`) - Źródło danych o grach wideo. Statystyki "Online Teraz" (CCU) pobierane są w czasie rzeczywistym z oficjalnego API Steam (`GetNumberOfCurrentPlayers`). Ograniczenia CORS są omijane przez `Vite Proxy` (/steam-store, /steamspy oraz nowy /steam-api) lub `ipcRenderer` (Electron). Zaimplementowano wydajne **pobieranie wsadowe (batch)** dla danych o bibliotece użytkownika (Top 50 gier).
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
- `steamAPI.ts`, `steamReviews.ts` & `steamStore.ts` : Agregatory danych Steam. `steamAPI` obsługuje logikę proxy, w tym nowy tunel dla `api.steampowered.com`. `steamStore.ts` wzbogacono o funkcję `getSteamRealtimeCCU` oraz zaawansowany algorytm `getSimilarGames`. Ten ostatni wykorzystuje inteligentne ważenie tagów (z karą dla tagów ogólnych jak "Action") oraz mechanizm fallbacku na gatunki Steam Store API, aby zapewnić trafne rekomendacje nawet dla nowych tytułów.
- `ai.ts`: Plik łączący się z potężnym LLMem przez OpenRouter nakazujący na wyjściu odpowiedź `array` (dla wyszukiwania) lub `json_object` (dla opinii) w JSON. Obsługuje inteligentne ekstrahowanie intencji wyszukiwania (wzbogacone o wbudowaną bazę ~150 popularnych tagów Steam dla Gier) oraz funkcje syntezy recenzji. Wprowadzono funkcję `fetchAIRerankedGames` (Reranker) oraz nowość: **`generateGamerDNA`**. Ta ostatnia tworzy unikalny, tekstowy profil gustu użytkownika na podstawie 50 najczęściej granych gier, który służy do personalizacji werdyktów. Preferowany model dla zaawansowanych analiz: `google/gemini-3.1-pro-preview`.
- `apiKeyService.ts` [NOWE]: Menedżer lokalnego zapisywania własnych kluczy API (np. dla OpenRouter), by uniezależnić się od limitów darmowych kluczy wbudowanych, zarządzający ich umieszczaniem w `localStorage`.

#### Stałe i Konfiguracje Danych (`src/renderer/src/constants/`)

- `gameGenres.ts` [NOWE]: Scentralizowany magazyn gatunków gier. Zawiera rozszerzoną listę prawie 40 kategorii (Gatunki i Tagi Steam), mapując polskie nazwy na identyfikatory API. Jest używany globalnie w całej sekcji gier, zapewniając spójność filtrów i nawigacji.

#### Tłumaczenie UI, Streszczenia i Cacheowanie AI

- **Spolszczone UI**: Interfejs całej aplikacji został przetłumaczony na język polski, usuwając język angielski z frontu.
- **Tłumaczenie Tekstów i Generowanie Opinii (Optymalizacja SQLite)**: W `AnimeDetails.tsx` wdrożono hybrydowy system korzystający z darmowego modelu Gemini dla AI. Posiada on mechanizm ratowania Tokenów API: Najpierw zapytanie o przetłumaczony opis lub wygenerowany zarys recenzji (Opinie) trafia do lokalnej szybkiej bazy `window.api.db` (do tabeli `translations` lub `review_summaries`). Dopiero wtedy, gdy odpowiedź nie istnieje w cache'u aplikacji - następuje wysłanie surowych danych do OpenRoutera. Wygenerowany wynik wyświetla się użytkownikowi i jest niezauważalnie, permanentnie zrzucany do bazy danych, by w przyszłości zwrócić wynik natychmiastowo.

#### Widoki Główne (Routingu) (`src/renderer/src/views/`)

- `AISearchView.tsx` / `AISearchView.css`: Dedykowany, futurystyczny interfejs dla asystenta sztucznej inteligencji wspierający wyszukiwanie gier i anime na bazie dynamicznego propa `domain`. Implementuje **zaawansowany proces Hybrid Search** dla gier: 1) Ekstrakcja parametrów przez AI, 2) Budowanie puli kandydatów (tytuły + tagi), 3) **Aktywne filtrowanie DLC/Soundtracków**, 4) Druga faza AI (Reranking) wybierająca finalne hity. Posiada wizualny wskaźnik postępu (Analiza -> Szukanie -> Weryfikacja). Przeniesiony do osobnego folderu views dla lepszej organizacji.

#### Zmienne, Kolory i Główne Komponenty Aplikacji (`src/renderer/src/assets/` oraz inne)

- `index.css`: Główny plik arkusza stylów i resetu znajdujący się w folderze `assets`. Na poziomie globalnym wymusza wsparcie Dark-Theme. Posiada wdrożone kolory zmiennych (CSS variables) gotowe do wsparcia hubów: Anime (Cyan), Gry (Green). Wykorzystuje `.theme-anime` i `.theme-games` do globalnego nadpisywania barw (np. świecenia neonów).
- W folderze `assets/` znajdują się również główne tła aplikacji: `anime-bg.png` i `games-bg.png`.
- `Navbar.tsx` / `Navbar.css` (`src/renderer/src/components/shared/`): Interaktywny pasek top-level. Zawiera jednolite, dwukolorowe logo **NEO** z gradientem (cyjan-zieleń) oraz nowoczesny **przełącznik segmentowy** (Anime/Gry) w formie pigułki z animowanym sliderem (z idealnie wycentrowaną symetrią). Dynamicznie podmienia układ przycisków, akcenty kolorystyczne oraz **placeholder wyszukiwarki** ("Szukaj anime" / "Szukaj gry") na podstawie aktywnej sekcji. Posiada zoptymalizowaną, luksusową stylistykę "Glassmorphism" dla przycisków menu (wyeliminowano grube obramowania na rzecz dyskretnych neonowych poświat `hover`), inteligentne pole wyszukiwania AI z fioletowymi detalami, oraz dodany przycisk Analizy Profilu gracza. **Pasek jest przyklejony do góry (`sticky`) z wysokim priorytetem wyświetlania (`z-index: 1000`).**
- `PlaceholderSection.tsx` (`src/renderer/src/components/shared/`): Uniwersalny, adaptatywny wizualnie komponent używany jako atrapa do podglądu ścieżki `games`, przed wdrożeniem finalnego kodu dla tej subsekcji.

#### Komponenty Modułu Anime (`src/renderer/src/components/anime/`)

- `Home.tsx` / `Home.css`: Pulpit domowy witający użytkownika podzielony elastycznym gridem/flexem na asymetryczne kolumny. Po lewej (z łamaniem boksów) renderuje siatki `NeonCard` najpopularniejszych animacji. Po prawej znajduje się "Kalendarz Premier" – pobrany w locie za pomocą `Promise.all` harmonogram wychodzących dzisiaj/jutro odcinków wraz z odliczającym licznikiem czasowym dla łatwej weryfikacji przez kliknięcie.
- `Search.tsx`: Strona obsługująca wyszukiwanie po tytule wyciągana komendą Enter z nawigacji głównej.
- `FilterSearchView.tsx` / `FilterSearchView.css`: Główny, zaawansowany panel filtra ("Wyszukiwanie"). Posiada boczny pasek opcji pozwalający łączyć dziesiątki gatunków, sezony i lata emisji w jedno konkretne żądanie do bazy `searchAnime()` obsługiwane bez udziału AI.
- `GenresView.tsx`: Pełnoprawna strona służąca do przeglądania anime na podstawie tagów z gatunkami.
- `SeasonsView.tsx`: Strona zorientowana na wydania ramówkowe anime wg pór roku.
- `AnimeDetails.tsx` / `AnimeDetails.css`: Główne "centrum opowieści". Ekran oparty na nowej generacji Zakładek (Tabs): **Informacje, Odcinki, Bohaterowie, Statystyki** oraz specjalnej świecącej na fioletowo sekcji **Opinie AI**. Ta ostatnia wykorzystuje ustrukturyzowany format JSON (Werdykt, Zalety, Wady) wizualnie spójny z sekcją gier. Zawiera także Grid Aktorów Głosowych (Seiyuu), logikę linkowania polskich portali strumieniujących (`Slug_Title`) oraz listę sezonów relacyjnych. **Sekcja "Statystyki" oparta jest na inteligentnym, kaskadowym układzie Bento Box z integrowanymi wykresami analitycznymi dostarczanymi graficznie przez bibliotekę zależną `recharts`. Pasek akcji górnych (`anime-top-bar`) posiada priorytet `z-index: 40`, co pozwala mu chować się pod głównym paskiem nawigacji podczas przewijania.**

#### Komponenty Modułu Gier Steam (`src/renderer/src/components/games/`)

- `GamesHome.tsx`: Główny panel sekcji gamingowej posiadający logikę asynchronicznego pobierania list gier. Wykorzystuje dane ze Steam Store, SteamSpy (Top 100) oraz celowane wyszukiwanie tematów "Anime", aby zapełnić sekcje bogatą zawartością (30-100 pozycji). Obsługuje automatyczne usuwanie duplikatów i dynamiczne mapowanie cen.
- `GamesCalendarView.tsx` / `GamesCalendarView.css` [NOWE]: Niezależny widok Kalendarza Premier dla nadchodzących gier (z filtrowaniem według daty wydania).
- `GameSearch.tsx`: Prosty widok natychmiastowych wyników standardowej wyszukiwarki (obsługiwany wpisywaniem frazy bezpośrednio do głównego paska Navbar w domenie gier).
- `GamesPriceTieredView.tsx` [NOWE]: Specjalistyczny widok dla sekcji "Nowości" oraz "Promocje". Implementuje układ trzykolumnowy oparty na progach cenowych (Do 30 PLN, Do 60 PLN, Powyżej 60 PLN). Każda kolumna posiada **niezależny mechanizm Infinite Scroll** (Lazy Loading) oparty na `IntersectionObserver`, co zapewnia wysoką wydajność przy wyświetlaniu setek pozycji. Obsługuje filtrowanie po gatunkach oraz wykorzystuje kompaktowe, poziome kafelki gier.
- `GameFilterSearchView.tsx`: Zaawansowany panel wyszukiwania gier. Udostępnia w pełni reaktywne wyszukiwanie z _debouncingiem_, filtrowaniem cen i gatunków. Posiada zoptymalizowany UI z **scrollowalną listą gatunków** (compact view) oraz mechanizm **Infinite Scroll** dla wyników wyszukiwania, co pozwala na płynne przeglądanie tysięcy tytułów bez obciążania przeglądarki.
- `GameGenresView.tsx`: Dedykowana strona z asynchronicznie ładowaną siatką dla gier po wybranym gatunku. Posiada rozbudowany interfejs oparty na pasku neonowych tagów (korzystający z pełnej listy ~40 kategorii z `gameGenres.ts`) i wykorzystuje mechanizm **Infinite Scroll**, aby zapewnić wydajność przy dużych wolumenach danych.
- `GameCard.tsx`: Komponent kafelek typu "Capsule". Zawiera unikalny system **Auto-Naprawy** obrazów: w przypadku błędu ładowania (częsty problem nowszych gier Steam wymagających hasha w URL), komponent poprzez niezależny kanał dociąga poprawne metadane ze Steam Store API. Równolegle, w tle działa system inteligentnej detekcji struktury DLC – w przypadku wykrycia dodatku nakłada dedykowaną, fioletową obwódkę oraz wycentrowaną plakietkę "DLC". Wykorzystuje zoptymalizowane do tego główne serwery CDN Akamai. Posiada kaskadowe fallbacki na różne formaty graficzne i systemowy placeholder.
- `GameRecommendationsView.tsx` / `GameRecommendationsView.css` [NOWE]: **Serce systemu Rekomendacji AI (v5.1)**. Implementuje unikalny algorytm hybrydowy: 1) AI Discovery (sugerowanie tytułów na podstawie gustu), 2) Live Injection (dociąganie 50 najświeższych hitów ze Steam), 3) Weryfikacja AppID/Danych, 4) Final AI Verdict (wybór Top 12). Posiada przełącznik filtrów wiekowych (Wszystkie vs Tylko po 2015) i rozbudowany system informowania o statusie (Analiza -> Szukanie -> Miksowanie).
- `GameDetails.tsx` / `GameDetails.css`: Zaawansowany interfejs wizytówki gry (profesjonalny styl Bento). Architektura oparta na **tucked grid layout**: 3-kolumnowy górny pas (**Powiększony do 320px Sidebar statystyk** | Centrum mediów z **2-rzędową galerią miniatur** | Buy Box). Nagłówek posiada **wycentrowany tytuł gry** oraz transparentny przycisk powrotu z neonowym hoverem. Wprowadzono system **Zakładek (Tabs)**: Wymagania, Werdykt AI oraz nową sekcję **Podobne Gry**, wykorzystującą autorski algorytm podobieństwa tagów. **Werdykt AI został rozbudowany o system personalizacji (Gamer DNA)** – użytkownik może podpiąć swój Steam ID, a AI dostosuje recenzję do jego biblioteki gier (Top 50 pozycji). Wynik analizy profilu jest cache'owany w `localStorage`.
- `GamesProfileAnalyzer.tsx` / `GamesProfileAnalyzer.css` [NOWE]: Kompleksowy analizator profilu Steam. Skanuje publiczną bibliotekę gracza na podstawie jego Steam ID64, łącząc pobieranie Top 15 najogrywanych gier z zadeklarowanym w `ai.ts` inteligentnym asystentem. Posiada hybrydowy interfejs oferujący zarówno "Bezlitosny Roast" obnażający zmarnowane życie gracza z dużą dozą czarnego humoru, jak i poważną diagnozę psychologiczną "Jakim jesteś graczem". Układ wykorzystuje Bento Box i współpracuje z Markdown Parserem dla perfekcyjnego ułożenia wizualnego.

#### Komponenty Dzielone (`src/renderer/src/components/shared/` oraz nadrzędny folder `components/`)

- `NeonCard.tsx` / `NeonCard.css`: Wizytówka kafelek używana w Gridzie i w nawigacji wyników. Dla sekcji gier obsługuje pionowy format okładek "Library Capsule" (2:3) z **3-stopniowym systemem fallbacku** (Pionowa -> Pozioma -> Kapsułka) oraz wbudowaną obsługą błędów obrazu (`onError`), co gwarantuje poprawny wygląd nawet przy niepełnych danych ze Steam. Posiada stylizowany placeholder tekstowy w razie braku wszystkich grafik.
- `Grid.css`: Konfiguracja gridowych matryc CSS dla responsywnego ułożenia.
- `SettingsModal.tsx` / `SettingsModal.css` [NOWE]: Okienko modalne z ustawieniami ogólnymi dające np. opcję wprowadzenia własnego klucza API dla OpenRouter.
- `Versions.tsx`: Bazowy komponent (wygenerowany np. z Electron Vite) informujący o wersjach powiązanych pakietów podrzędnych.

## Jak dewelopować program w trybie przeglądarki?

Aplikację należy w całości uruchamiać komendą wyciągającą aplikację po złączu Vite używając:
`npm run dev:web`
To tryb bezpieczny z serwerem deweloperskim dla testowania zmian w plikach jak np CSS. Do skryptu w `package.json` dopięta jest domyślnie flaga `--host`, która celowo udostępnia aplikację w szerokiej strukturze na porcie `5173`, używana dlatego, by dać radę wejść na nią domowym komputerem prosto z serwera lokalnego LXC Proxmox.
