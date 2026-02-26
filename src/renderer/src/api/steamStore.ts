import { fetchSteamData } from './steamAPI'

// Typowania zwracane przez wewnętrzne endpointy appdetails Steama
export interface SteamAppDetails {
  name: string
  is_free: boolean
  header_image: string
  background: string
  background_raw: string
  short_description: string
  about_the_game: string
  detailed_description: string
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

export interface SteamSpyGameExtended {
  appid: number
  name: string
  developer: string
  publisher: string
  score_rank: string
  positive: number
  negative: number
  userscore: number
  owners: string
  average_forever: number
  average_2weeks: number
  median_forever: number
  median_2weeks: number
  price: string
  initialprice: string
  discount: string
  ccu: number
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

// Typowania dla kategorii featured ze strony steama
export interface SteamFeaturedCategoryItem {
  id: number
  type: number
  name: string
  discounted: boolean
  discount_percent: number
  original_price: number
  final_price: number
  currency: string
  large_capsule_image: string
  small_capsule_image: string
  windows_available: boolean
  mac_available: boolean
  linux_available: boolean
  streamingvideo_available: boolean
  header_image: string
  controller_support?: string
}

export interface SteamFeaturedCategories {
  0?: { id: string; name: string; items: SteamFeaturedCategoryItem[] }
  1?: { id: string; name: string; items: SteamFeaturedCategoryItem[] }
  2?: { id: string; name: string; items: SteamFeaturedCategoryItem[] }
  3?: { id: string; name: string; items: SteamFeaturedCategoryItem[] }
  4?: { id: string; name: string; items: SteamFeaturedCategoryItem[] }
  5?: { id: string; name: string; items: SteamFeaturedCategoryItem[] }
  specials?: { id: string; name: string; items: SteamFeaturedCategoryItem[] }
  coming_soon?: { id: string; name: string; items: SteamFeaturedCategoryItem[] }
  top_sellers?: { id: string; name: string; items: SteamFeaturedCategoryItem[] }
  new_releases?: { id: string; name: string; items: SteamFeaturedCategoryItem[] }
  genres?: { id: string; name: string; items: SteamFeaturedCategoryItem[] }
  trailerslideshow?: { id: string; name: string; items: SteamFeaturedCategoryItem[] }
  large_capsules?: { id: string; name: string; items: SteamFeaturedCategoryItem[] }
  status?: 1
}

/**
 * Zwraca dynamiczne listy gier z głównej strony Steam (Bestsellery, Nowości, Promocje).
 */
export const getSteamStoreFeaturedCategories = async (): Promise<SteamFeaturedCategories | null> => {
  try {
    const url = `https://store.steampowered.com/api/featuredcategories`
    // Waluta: PLN
    const response = await fetchSteamData(url, { l: 'polish', cc: 'PL' })

    if (response && response.status === 1) {
      return response as SteamFeaturedCategories
    }

    console.error(`Steam StoreAPI błąd statusu dla featuredcategories`)
    return null
  } catch (e) {
    console.error(`Błąd podczas pobierania kategorii Steam:`, e)
    return null
  }
}

/**
 * Szuka gier wg gatunku. Wykorzystuje nieudokumentowany endpoint wyszukiwarki sklepowej Steam
 * przepuszczony przez fetchSteamData by ominąć cors.
 */
export const searchSteamGamesByGenre = async (
  genre: string
): Promise<SteamFeaturedCategoryItem[]> => {
  try {
    const url = `https://steamspy.com/api.php`
    
    // Lista podstawowych gatunków obsługiwanych przez request=genre w SteamSpy
    const spyGenres = [
      'Action', 'Adventure', 'RPG', 'Strategy', 'Indie', 'Simulation', 
      'Racing', 'Sports', 'Casual', 'Massively Multiplayer', 'Early Access'
    ]

    const isPrimaryGenre = spyGenres.includes(genre)
    const params: Record<string, string> = isPrimaryGenre 
      ? { request: 'genre', genre: genre } 
      : { request: 'tag', tag: genre }

    const response = await fetchSteamData(url, params)

    if (response && typeof response === 'object' && !Array.isArray(response)) {
      // Mapujemy WSZYSTKIE gry z gatunku (bez slice)
      const items: SteamFeaturedCategoryItem[] = Object.values(response)
        .filter((g: any) => g && g.appid)
        .map((spyGame: any) => {
          const finalPriceCents = Number(spyGame.price || 0)
          const discountPercent = Number(spyGame.discount || 0)
          const originalPriceCents = Number(spyGame.initialprice || finalPriceCents)

          return {
            id: parseInt(spyGame.appid),
            type: 0,
            name: spyGame.name,
            discounted: discountPercent > 0,
            discount_percent: discountPercent,
            original_price: originalPriceCents,
            final_price: finalPriceCents,
            currency: 'USD',
            large_capsule_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${spyGame.appid}/header.jpg`,
            small_capsule_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${spyGame.appid}/capsule_184x69.jpg`,
            windows_available: true,
            mac_available: false,
            linux_available: false,
            streamingvideo_available: false,
            header_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${spyGame.appid}/header.jpg`
          } as SteamFeaturedCategoryItem
        })

      return items
    }

    return []
  } catch (e) {
    console.error(`Błąd podczas wyszukiwania gier z gatunku ${genre}:`, e)
    return []
  }
}

/**
 * Pobiera gry z SteamSpy dla konkretnego tagu/kategorii (np. 'top100in2weeks', 'specials', 'newreleases')
 */
export const getSteamSpyByTag = async (tag: string): Promise<SteamFeaturedCategoryItem[]> => {
  try {
    const url = `https://steamspy.com/api.php`
    const response = await fetchSteamData(url, { request: 'tag', tag: tag })

    if (response && typeof response === 'object' && !Array.isArray(response)) {
      return Object.values(response)
        .filter((g: any) => g && g.appid)
        .map((spyGame: any) => {
          const finalPriceCents = Number(spyGame.price || 0)
          const discountPercent = Number(spyGame.discount || 0)
          const originalPriceCents = Number(spyGame.initialprice || finalPriceCents)

          return {
            id: parseInt(spyGame.appid),
            type: 0,
            name: spyGame.name,
            discounted: discountPercent > 0,
            discount_percent: discountPercent,
            original_price: originalPriceCents,
            final_price: finalPriceCents,
            currency: 'USD',
            large_capsule_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${spyGame.appid}/header.jpg`,
            small_capsule_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${spyGame.appid}/capsule_184x69.jpg`,
            windows_available: true,
            mac_available: false,
            linux_available: false,
            streamingvideo_available: false,
            header_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${spyGame.appid}/header.jpg`
          } as SteamFeaturedCategoryItem
        })
    }
    return []
  } catch (e) {
    console.error(`Błąd podczas pobierania kategorii ${tag} ze SteamSpy:`, e)
    return []
  }
}

/**
 * Pobiera Top 100 gier z ostatnich 2 tygodni lub wszechczasów ze SteamSpy.
 */
export const getSteamSpyTop100 = async (
  type: 'top100in2weeks' | 'top100forever' = 'top100in2weeks'
): Promise<SteamFeaturedCategoryItem[]> => {
  try {
    const url = `https://steamspy.com/api.php`
    const response = await fetchSteamData(url, { request: type })

    if (response && typeof response === 'object' && !Array.isArray(response)) {
      return Object.values(response)
        .filter((g: any) => g && g.appid)
        .map((spyGame: any) => {
          const finalPriceCents = Number(spyGame.price || 0)
          const discountPercent = Number(spyGame.discount || 0)
          const originalPriceCents = Number(spyGame.initialprice || finalPriceCents)

          return {
            id: parseInt(spyGame.appid),
            type: 0,
            name: spyGame.name,
            discounted: discountPercent > 0,
            discount_percent: discountPercent,
            original_price: originalPriceCents,
            final_price: finalPriceCents,
            currency: 'USD',
            large_capsule_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${spyGame.appid}/header.jpg`,
            small_capsule_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${spyGame.appid}/capsule_184x69.jpg`,
            windows_available: true,
            mac_available: false,
            linux_available: false,
            streamingvideo_available: false,
            header_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${spyGame.appid}/header.jpg`
          } as SteamFeaturedCategoryItem
        })
    }
    return []
  } catch (e) {
    console.error(`Błąd podczas pobierania ${type} ze SteamSpy:`, e)
    return []
  }
}

export interface SteamSearchResponse {
  total: number
  items: {
    id: number
    name: string
    tiny_image: string
    short_description: string
    price?: {
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
    streamingvideo_available: boolean
    header_image: string
  }[]
}

/**
 * Przeszukuje sklep Steam po tytule.
 */
export const searchSteamGames = async (query: string): Promise<SteamFeaturedCategoryItem[]> => {
  try {
    const url = `https://store.steampowered.com/api/storesearch/`
    // cc=PL dla cen w zł, l=polish dla języka
    const response = await fetchSteamData(url, { term: query, l: 'polish', cc: 'PL' })

    if (response && response.items) {
      return response.items.map((item: any) => ({
        id: item.id,
        type: 0,
        name: item.name,
        discounted: !!item.price,
        discount_percent: item.price?.discount_percent || 0,
        original_price: item.price?.initial || 0,
        final_price: item.price?.final || 0,
        currency: 'PLN',
        large_capsule_image: item.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/header.jpg`,
        small_capsule_image: item.tiny_image,
        windows_available: item.platforms?.windows || true,
        mac_available: item.platforms?.mac || false,
        linux_available: item.platforms?.linux || false,
        streamingvideo_available: false,
        header_image: item.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/header.jpg`
      })) as SteamFeaturedCategoryItem[]
    }

    return []
  } catch (e) {
    console.error(`Błąd podczas wyszukiwania gier dla zapytania "${query}":`, e)
    return []
  }
}

/**
 * Pobiera rozszerzone statystyki ze SteamSpy (CCU, Playtime, Owners itp.)
 */
export const getSteamGameExtendedStats = async (
  appId: string | number
): Promise<SteamSpyGameExtended | null> => {
  try {
    const url = `https://steamspy.com/api.php`
    const response = await fetchSteamData(url, { request: 'appdetails', appid: appId.toString() })

    if (response && response.appid) {
      return response as SteamSpyGameExtended
    }
    return null
  } catch (e) {
    console.error(`Błąd podczas pobierania rozszerzonych statystyk (appid: ${appId}):`, e)
    return null
  }
}
