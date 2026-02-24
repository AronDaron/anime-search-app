# Neo Search (Anime Search App) 🌌

Nowoczesna aplikacja desktopowa (Electron) oraz webowa (Vite) służąca jako zaawansowana wyszukiwarka japońskiej popkultury ze wsparciem Sztucznej Inteligencji. 

Głównym założeniem projektu jest stworzenie szybkiego, zjawiskowego podziału eksploracji anime, dając możliwość m.in błyskawicznego podglądu informacji, ratingów oraz ocen dla *każdego najmniejszego odcinka z osobna* pobieranego za pomocą wbudowanych scraperów.

## 🚀 Technologie

Projekt zbudowany jest w oparciu o solidne, najnowsze i najszybsze rozwiązania:
- **Core:** Node.js, Electron (via `electron-vite`)
- **Frontend:** React 19 (TypeScript), `react-router-dom`
- **Styling:** Vanilla CSS, autorski system ułożenia Glassmorphism & Neon (Dark Theme) 
- **Zarządzanie stanem offline:** wbudowany instalator SQL dzięki modułowi `better-sqlite3` (ukryty proces Main chroniony Preload-bridge'm obrabiający Historię oraz Ulubione)

## 📡 Używane API i Źródła
- **AniList GraphQL API:** Serce aplikacji odpytywane autorskimi kwerendami dociągającymi m.in logikę Sezonów, Relacji (Franchise/Prequel/Sequel), Obsady czy Dat.
- **OpenRouter (AI Search):** Opcjonalny moduł wyszukiwarki wykorzystujący zasilane m.in. modelem `gemini-2.5-flash-free` inteligentne przetwarzanie fabuły, wyszukujące anime po opisie tekstu "wolnego" użytkownika.
- **Jikan API (MyAnimeList):** Asynchroniczna integracja ze scraperami MAL załadowana paginacyjnymi próbkami (by obejść restrykcje serwera MAL), celowana w dostarczanie autentycznych ocean odcinkowych w punktacji 1.0 - 10.0 dla sekcji "Odcinki".

## ✨ Główne Funkcje (Feature list)

* **Inteligentny Navbar:** Dynamicznie adaptujący się pasek rozwijany nawigujący pomiędzy modułami (np. Neo Anime, Neo Gry) o pełnej elastyczności zmiennych barw np. Magenta / Cyan.
* **Rozszerzone Filtrowanie Anime:** 
  - Wyszukiwarka oparta o tekst klasyczny / tytuły.
  - Dedekowane Okno "Gatunki": Pula setek tagów do selekcjonowania po wariancie (Action, Sci-Fi) i rocznikowych widełkach.
  - Dedekowane Okno "Sezony": Automatycznie interpretujący datę moduł kalendarza emitowanych w aktualnej ramówce sezonowej anime.
* **Ai Plot Search:** Możliwość wpisania do wyszukiwarki np. "Anime o gościu który walczy używając łańcuchów obok blondyna" - w odpowiedź zwracane są karty pasujących tytułów (Wymagany klucz zmiennej środowiskowej `.env`: `VITE_OPENROUTER_KEY`).
* **Anime Details (Zakładkowo - Kartowe):** Rezygnacja z ogromnego przewijania w dół. Podsumowanie ekranowane przez UI-Tabs: Informacje, Odcinki (ze zdjęciami), Rozbudowana Obsada (Role, Postacie, Aktorzy) i Statystyki - ukryte w pięknej szklistej siatce *Grid*.

## 🛠️ Instalacja i Uruchomienie

### Wymagania
* Node.js
* Odblokowany ewentualny Firewall (szczególnie jeśli działa pod LXC / Proxmox w testowaniu trybu WEB)

### Szybki start
```bash
# Sklonuj repo
$ git clone [url-repo]

# Zainstaluj zależności
$ npm install

# Uruchom bezpieczny serwer deweloperski Web z udostępnieniem dla hosta
$ npm run dev:web

# LUB Uruchom bezpośrednio środowisko deweloperskie Electron
$ npm run dev
```

### Budowanie (Deploy)
```bash
# Windows (.exe)
$ npm run build:win

# Linux (.AppImage / .deb)
$ npm run build:linux
```
