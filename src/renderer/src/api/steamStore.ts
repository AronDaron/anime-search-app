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
export const getSteamFeaturedCategories = async (): Promise<SteamFeaturedCategories | null> => {
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
    // Endpint wyszukiwania Steam zwraca HTML wymieszany w JSONie jeśli uderzamy standardowo, 
    // więc dla podstrony Gatunków skorzystamy ze SteamSpy, które ma prostsze API GET po gatunkach.
    const url = `https://steamspy.com/api.php`
    const response = await fetchSteamData(url, { request: 'genre', genre: genre })

    // SteamSpy zwraca obiekt z kluczami jako string id gier
    // Ograniczamy i mapujemy to z grubsza na nasz potrzebny interfejs,
    // ponieważ SteamSpy nie ma wszystkich obrazków zduplikowanych jak endpoint featured,
    // zbudujemy adresy ręcznie
    if (response && typeof response === 'object') {
      const items: SteamFeaturedCategoryItem[] = Object.values(response)
        .slice(0, 30) // ograniczenie by nie wyświetlić tysiąca w renderze
        .map((spyGame: any) => {
          const finalPriceCents = (spyGame.price || 0)
          const discountPercent = spyGame.discount || 0
          // Odwrócenie równania procentowego by wyliczyć (zawsze mniej więcej) cenę bazową w centach
          const originalPriceCents = discountPercent > 0 
              ? Math.round(finalPriceCents / (1 - (discountPercent / 100))) 
              : finalPriceCents

          return {
            id: parseInt(spyGame.appid),
            type: 0,
            name: spyGame.name,
            discounted: discountPercent > 0,
            discount_percent: discountPercent,
            original_price: originalPriceCents,
            final_price: finalPriceCents,
            currency: 'USD', // Steamspy defaultowo zwraca centy $
            large_capsule_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${spyGame.appid}/capsule_616x353.jpg`,
            small_capsule_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${spyGame.appid}/capsule_184x69.jpg`,
            windows_available: true,
            mac_available: false,
            linux_available: false,
            streamingvideo_available: false,
            header_image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${spyGame.appid}/header.jpg`
          } as SteamFeaturedCategoryItem
        })

      // Sortuj wg score żeby najlepsze gry z gatunku wyświetlały się najpierw
      return items.sort((a, b) => b.id - a.id) // Dla mocku najnowsze po id, bo spy nie gwarantuje sortu
    }

    return []
  } catch (e) {
    console.error(`Błąd podczas wyszukiwania gier z gatunku ${genre}:`, e)
    return []
  }
}
