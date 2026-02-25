/**
 * Hybrid Steam API Client
 * - Dla przeglądarki (dev:web): wykorzystuje Vite Proxy (omija CORS zachowując zapytania po stronie sieci lokalnej).
 * - Dla okienkowej aplikacji desktopowej (.exe): wykorzystuje Electron IPC (omija CORS wykorzystując natywny Node.js fetch).
 */

// BAZOWE ADRESY STEAM (Mogą być dwa różne, zależnie od potrzebnych danych)
const STEAM_STORE_URL = 'https://store.steampowered.com'
// const STEAM_WEB_API_URL = 'https://api.steampowered.com';

export const fetchSteamData = async (endpointUrl: string, params: Record<string, string> = {}) => {
  // Przyklejamy parametry
  const urlObj = new URL(endpointUrl)
  Object.keys(params).forEach((key) => urlObj.searchParams.append(key, params[key]))

  // MIEJSCE NA KLUCZ API:
  // Większość darmowych funkcji sklepu Steama (ceny, opisy) NIE wymaga klucza API!
  // Jeśli będziesz używać endpointów ze Steam Web API (np. IPlayerService), odkomentuj linię poniżej
  // i dodaj zmienną VITE_STEAM_API_KEY do swojego pliku .env.local
  //
  urlObj.searchParams.append('key', import.meta.env.VITE_STEAM_API_KEY || '')

  const fullUrl = urlObj.toString()

  // Sprawdzamy czy to aplikacja Electron (.exe / Linux App)
  if (window.electron && window.api && window.api.steam) {
    console.log('[SteamAPI] Pobieranie przez strumień Electron IPC:', fullUrl)
    return await window.api.steam.fetch(fullUrl)
  }
  // Jeśli to wersja w przeglądarce używająca serwera na Proxmoxie
  else {
    // Zamieniamy główną domenę na prefix proxy, który zadeklarowaliśmy w `vite.config.ts`
    const proxyUrl = fullUrl.replace(STEAM_STORE_URL, '/steam-store')
    console.log('[SteamAPI] Pobieranie przez Vite Proxy:', proxyUrl)

    const response = await fetch(proxyUrl)

    if (!response.ok) {
      throw new Error(`Błąd połączenia ze Steam API! Status: ${response.status}`)
    }
    return await response.json()
  }
}
