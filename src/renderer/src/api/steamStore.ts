import { fetchSteamData } from './steamAPI'

// Typowania zwracane przez wewnętrzne endpointy appdetails Steama
export interface SteamAppDetails {
  name: string
  is_free: boolean
  header_image: string
  background: string
  background_raw: string
  short_description: string
  supported_languages: string
  pc_requirements: {
    minimum?: string
    recommended?: string
  }
  mac_requirements: any
  linux_requirements: any
  developers: string[]
  publishers: string[]
  price_overview?: {
    currency: string
    initial: number
    final: number
    discount_percent: number
    final_formatted: string
  }
  platforms: {
    windows: boolean
    mac: boolean
    linux: boolean
  }
  categories: { id: number; description: string }[]
  genres: { id: string; description: string }[]
  screenshots: { id: number; path_thumbnail: string; path_full: string }[]
  movies?: {
    id: number
    name: string
    thumbnail: string
    webm: { 480: string; max: string }
    mp4: { 480: string; max: string }
  }[]
  release_date: {
    coming_soon: boolean
    date: string
  }
}

/**
 * Zwraca bardzo szczegółowe dane na temat gry używając darmowego endpointu /api/appdetails.
 * Endpoint ten nie wymaga klucza API, ale jest mocno blokowany przez schematy CORS (dlatego korzystamy z hybrydy).
 */
export const getSteamGameDetails = async (
  appId: string | number
): Promise<SteamAppDetails | null> => {
  try {
    const url = `https://store.steampowered.com/api/appdetails`
    // Dodajemy parametr l=english albo l=polish, zeby dostać dane w preferowanym języku (jeśli są)
    const response = await fetchSteamData(url, { appids: appId.toString(), l: 'polish' })

    // Steam Store API zwraca obiekt, którego kluczem na roocie jest ID gry: { "1091500": { success: true, data: {...} } }
    const gameDataRoot = response[appId.toString()]

    if (gameDataRoot && gameDataRoot.success) {
      return gameDataRoot.data as SteamAppDetails
    }

    console.error(`Steam StoreAPI nie znalazł danych dla appid: ${appId}`)
    return null
  } catch (e) {
    console.error(`Błąd podczas pobierania detali gry Steam (${appId}):`, e)
    return null
  }
}
