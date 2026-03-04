# Neo Search (Anime & Games) 🌌🎮

Nowoczesna aplikacja desktopowa (Electron) oraz webowa (Vite) służąca jako zaawansowana wyszukiwarka japońskiej popkultury oraz gier wideo, zasilana przez potężne wsparcie Sztucznej Inteligencji (LLM).

Głównym założeniem projektu jest stworzenie szybkiego, zjawiskowego centrum eksploracji rozrywki, dając możliwość m.in błyskawicznego podglądu informacji, generowania opinii, zaawansowanego podpowiadania tytułów za pomocą modelu językowego oraz asystenta rekomendującego pozycje pod unikalne DNA Gracza.

## 🚀 Technologie

Projekt zbudowany jest w oparciu o szybkie, wydajne i nowoczesne rozwiązania:

- **Środowisko:** Node.js, Electron (via `electron-vite`) z pełnym wsparciem Strict Sandbox Security
- **Frontend:** React 19 (TypeScript), `react-router-dom`
- **Styling:** Vanilla CSS, autorski system designu "Glassmorphism & Neon" z dynamicznymi motywami (Cyjan dla Anime, Zieleń dla Gier)
- **Zarządzanie stanem offline & Cache:** wbudowana i zoptymalizowana lokalna baza SQL dzięki modułowi `better-sqlite3` (ukryta w procesie Main, bezpiecznie tunelowana przez IPC do zapisu tłumaczeń, historii i ocen profilowych użytkownika)
- **Sieć:** Electron `net.fetch` zintegrowany z backendem IPC, zdolny do omijania restrykcyjnych osłon Anty-Bot (np. Cloudflare) i barier CORS ze strumieniowaniem.

## 📡 Używane API i Źródła

- **Steam API & SteamSpy:** Świeże i dokładne metadane o grach PC, asynchroniczna integracja statystyk CCU (Aktywni Gracze w tym momencie) i list bestsellerów.
- **AniList GraphQL API:** Serce sekcji anime odpytywane autorskimi kwerendami dociągającymi m.in logikę Sezonów, Relacji (Franchise/Prequel/Sequel), Obsady czy Dat.
- **OpenRouter (AI Assistant):** Moduł potężnego asystenta wykorzystujący m.in. model `google/gemini-3.1-pro-preview` i `google/gemini-3-flash-preview` do inteligentnego przetwarzania fabuły, analizy bibliotek z grami, rerankingu hitów oraz tworzenia podsumowań recenzji w pigułce z użyciem wymuszonych schematów JSON.
- **Jikan API (MyAnimeList):** Asynchroniczna integracja ze scraperami MAL załadowana paginacyjnymi podzbiórkami, docelowo dostarczająca autentyczne oceny per odcinek.

## ✨ Główne Funkcje (Feature list)

- **AI Discovery & Gamer DNA:** Potężny system hybrydowy analizujący bazę ~100 tagów Steam i ekstrahujący parametry z zapytań użytkownika. Profil z 50 najogrywaniejszymi tytułami gracza może posłużyć by wygenerować jemu unikalny "Roast" profilu i rekomendować pasujące idealnie pod jego gusta inne produkcje ubrane w personalizowany werdykt.
- **Moja Lista Anime (Hub Ulubionych):** Spersonalizowany panel pozwalający na zaawansowane śledzenie oglądanych animacji. Użytkownik ma pełną kontrolę nad statusem (Oglądane, Porzucone, itp.), ocenami (1-10) i progresem odcinków (z limitem w formacie X/Y). Posiada wbudowany boczny panel **"Analiza Listy"** – moduł AI generujący unikalny profil fana anime na podstawie całej listy tytułów (oceny, gatunki, statusy, postęp). Panel dynamicznie zmienia stany: duży przycisk → spinner ładowania → kompaktowy pasek z przewijalną treścią profilu. Zwieńczony wbudowanym u góry dashboardem statystycznym Recharts (wykresy kołowe statusów i gatunków z legendą, słupkowy rozkład ocen) w stylistyce Neon. Automatycznie detekuje środowisko przełączając zapis między bazą SQLite (aplikacja Desktop) a widokiem LocalStorage (przeglądarka).
- **Moduł Gier Steam na sterydach:** Przeszukiwanie sklepu z podziałem na ceny (darmowe, do 30 PLN, 60+ PLN), widoki kalendarzowe nadchodzących gier, kategoryzowanie po blisko 40 odrębnych dokładnych gatunkach oraz "Infinite Scroll" na potężnych bibliotekach tysięcy kart bez mulenia komputera. Dynamiczny fallback miniaturek ładujący kapsułki ratunkowe w razie braku materiałów CDN od deweloperów.
- **Inteligentny Navbar:** Dynamicznie adaptujący się pasek rozwijany nawigujący pomiędzy przestrzeniami (Neon Anime / Szmaragdowe Gry), animowany zaawansowanym trybem pigułki.
- **Anime Details (Zakładkowo-Bento-Kartowe):** Zoptymalizowany pod minimalne przewijanie interfejs informacyjny: Informacje, Odcinki, Obsada i Statystyki - ukryte w pięknej szklistej siatce *Bento Box* ze wsparciem interaktywnych analitycznych wykresów.

## 🛠️ Instalacja i Uruchomienie

### Wymagania

- Node.js (serwer Node oraz npm)
- Opcjonalnie: Prywatny klucz OpenRouter wpisany w ustawienia programu dla zniesienia limitów LLM'a.

### Szybki start deweloperski

```bash
# Sklonuj repo
$ git clone [url-repo]

# Zainstaluj zależności
$ npm install

# Uruchom bezpośrednio środowisko deweloperskie przeglądarkowe z dostępem do sieci LAN:
$ npm run dev:web

# LUB Uruchom bezpośrednio środowisko deweloperskie natywnego Electrona:
$ npm run dev
```

### Budowanie Edycji Produkcyjnej (Deploy)

Aplikacja ma restrykcyjnie włączoną ochronę `sandbox: true` i pakuje się jako zamknięty, nietykalny plik wykonywalny ze wbudowanym oknem Chromium. Omija on weryfikacje CORS przeglądarek przy strzałach na serwery zewnętrze.

> **Uwaga dotycząca prywatności i danych:** Po pierwszym uruchomieniu zbudowanej aplikacji, system operacyjny automatycznie wygeneruje lokalny folder z prywatnymi danymi użytkownika (historia wyszukiwań, ulubione pozycje, klucze API oraz lokalna baza SQLite). 
> Domyślna lokalizacja plików na systemie Windows to: `%APPDATA%\anime-search-app` (np. `C:\Users\[Twój_User]\AppData\Roaming\anime-search-app`).

```bash
# Budowanie Instalatora oraz .exe (Windows)
$ npm run build:win

# Budowanie dla Linuxa (.AppImage / .deb)
$ npm run build:linux
```
