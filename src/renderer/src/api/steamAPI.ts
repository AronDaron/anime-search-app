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

  const steamKey = import.meta.env.VITE_STEAM_API_KEY
  if (steamKey) {
    urlObj.searchParams.append('key', steamKey)
  }

  const fullUrl = urlObj.toString()

  // Sprawdzamy czy to aplikacja Electron (.exe / Linux App)
  if (window.electron && window.api && window.api.steam) {
    console.log('[SteamAPI] Pobieranie przez strumień Electron IPC:', fullUrl)
    return await window.api.steam.fetch(fullUrl)
  }
  // Jeśli to wersja w przeglądarce używająca serwera na Proxmoxie
  else {
    // Zamieniamy główną domenę na prefix proxy, który zadeklarowaliśmy w `vite.config.ts`
    const proxyUrl = fullUrl
      .replace(STEAM_STORE_URL, '/steam-store')
      .replace('https://steamspy.com', '/steamspy')
      .replace('https://api.steampowered.com', '/steam-api')
    console.log('[SteamAPI] Pobieranie przez Vite Proxy:', proxyUrl)

    const response = await fetch(proxyUrl)

    if (!response.ok) {
      throw new Error(`Błąd połączenia ze Steam API! Status: ${response.status}`)
    }
    return await response.json()
  }
}
