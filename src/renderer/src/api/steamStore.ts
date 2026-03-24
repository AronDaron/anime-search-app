import { fetchSteamData } from './steamAPI'

// Typowania zwracane przez wewnętrzne endpointy appdetails Steama
export interface SteamAppDetails {
  steam_appid: number
  name: string
  is_free: boolean
  header_image: string
  background: string
  background_raw: string
  short_description: string
  about_the_game: string
  detailed_description: string
  type: string
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
  tags: Record<string, number>
}

/**
 * Zwraca bardzo szczegółowe dane na temat gry używając darmowego endpointu /api/appdetails.
 * Endpoint ten nie wymaga klucza API, ale jest mocno blokowany przez schematy CORS (dlatego korzystamy z hybrydy).
 */
export const getSteamGameDetails = async (
  appId: string | number,
  lang: string = 'polish'
): Promise<SteamAppDetails | null> => {
  try {
    const url = `https://store.steampowered.com/api/appdetails`
    // Dodajemy parametr l=english albo l=polish, zeby dostać dane w preferowanym języku (jeśli są)
    // cc=PL wymusza ceny w polskiej walucie i polski region cenowy
    const response = await fetchSteamData(url, { appids: appId.toString(), l: lang, cc: 'PL' })

    // Steam Store API zwraca obiekt, którego kluczem na roocie jest ID gry: { "1091500": { success: true, data: {...} } }
    const gameDataRoot = response[appId.toString()]

    if (gameDataRoot && gameDataRoot.success) {
      const data = gameDataRoot.data as SteamAppDetails
      return data
    }

    console.error(`Steam StoreAPI nie znalazł danych dla appid: ${appId}`)
    return null
  } catch (e) {
    console.error(`Błąd podczas pobierania detali gry Steam (${appId}):`, e)
    return null
  }
}

/**
 * Pobiera szczegóły dla wielu gier naraz, używając oficjalnego API Steam.
 * Wykorzystuje bezpieczne pobieranie równoległe w małych paczkach.
 */
export const getMultipleSteamAppDetails = async (
  appIds: (string | number)[],
  lang: string = 'polish'
): Promise<SteamAppDetails[]> => {
  const CHUNK_SIZE = 6
  const results: SteamAppDetails[] = []

  // Pobieramy w małych paczkach równolegle, aby uniknąć limitów i błędów batching'u Steama
  for (let i = 0; i < appIds.length; i += CHUNK_SIZE) {
    const chunk = appIds.slice(i, i + CHUNK_SIZE)
    const promises = chunk.map((id) => getSteamGameDetails(id, lang))
    const chunkResults = await Promise.all(promises)

    chunkResults.forEach((res) => {
      if (res) results.push(res)
    })

    // Bardzo krótka przerwa między paczkami
    if (i + CHUNK_SIZE < appIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }

  return results
}

// Typowania dla kategorii featured ze strony steama
export interface SteamFeaturedCategoryItem {
  id: number
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
  type: string
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
  } catch (e: any) {
    console.error(`Błąd podczas pobierania kategorii Steam:`, e)
    return null
  }
}

/**
 * Szuka gier wg gatunku.
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

    const mapResponse = (response: any): SteamFeaturedCategoryItem[] => {
      if (!response || typeof response !== 'object' || Array.isArray(response)) return []
      return Object.values(response)
        .filter((g: any) => g && g.appid)
        .map((spyGame: any) => {
          const finalPriceCents = Number(spyGame.price || 0)
          const discountPercent = Number(spyGame.discount || 0)
          const originalPriceCents = Number(spyGame.initialprice || finalPriceCents)

          return {
            id: parseInt(spyGame.appid),
            name: spyGame.name,
            discounted: discountPercent > 0,
            discount_percent: discountPercent,
            original_price: originalPriceCents,
            final_price: finalPriceCents,
            currency: 'USD',
            large_capsule_image: `https://cdn.akamai.steamstatic.com/steam/apps/${spyGame.appid}/header.jpg`,
            small_capsule_image: `https://cdn.akamai.steamstatic.com/steam/apps/${spyGame.appid}/capsule_184x69.jpg`,
            windows_available: true,
            mac_available: false,
            linux_available: false,
            streamingvideo_available: false,
            header_image: `https://cdn.akamai.steamstatic.com/steam/apps/${spyGame.appid}/header.jpg`,
            type: 'game'
          } as SteamFeaturedCategoryItem
        })
    }

    // Próba 1: primary endpoint (genre lub tag)
    const primaryParams: Record<string, string> = isPrimaryGenre 
      ? { request: 'genre', genre: genre } 
      : { request: 'tag', tag: genre }

    const response1 = await fetchSteamData(url, primaryParams)
    const items1 = mapResponse(response1)

    if (items1.length > 0) return items1

    // Fallback: jeżeli primary endpoint zwrócił 0 wyników – próbuj przeciwny endpoint
    console.warn(`[SteamSpy] Brak wyników dla ${JSON.stringify(primaryParams)}, próba fallback...`)
    const fallbackParams: Record<string, string> = isPrimaryGenre
      ? { request: 'tag', tag: genre }
      : { request: 'genre', genre: genre }

    const response2 = await fetchSteamData(url, fallbackParams)
    return mapResponse(response2)

  } catch (e: any) {
    console.error(`Błąd podczas wyszukiwania gier z gatunku ${genre}:`, e)
    return []
  }
}
/**
 * Pobiera listę popularnych nadchodzących premier bezpośrednio ze Steam Search API.
 */
export const getSteamPopularComingSoon = async (count: number = 50): Promise<number[]> => {
  try {
    const url = `https://store.steampowered.com/search/results/`
    const response = await fetchSteamData(url, { 
      filter: 'popularcomingsoon', 
      json: '1', 
      count: count.toString(),
      l: 'english',
      cc: 'PL'
    })

    if (response && response.items && Array.isArray(response.items)) {
      const appIds: number[] = response.items.map((item: any) => {
        const logoUrl = item.logo || ''
        // Ekstrakcja AppID z URL logotypu: .../apps/APPID/...
        // Przykład: https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3411970/89ef...
        const match = logoUrl.match(/\/apps\/(\d+)\//)
        return match ? parseInt(match[1]) : null
      }).filter((id: number | null): id is number => id !== null)

      return appIds
    }

    return []
  } catch (e) {
    console.error(`Błąd podczas pobierania popularnych nadchodzących premier:`, e)
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
            type: 'game',
            name: spyGame.name,
            discounted: discountPercent > 0,
            discount_percent: discountPercent,
            original_price: originalPriceCents,
            final_price: finalPriceCents,
            currency: 'USD',
            large_capsule_image: `https://cdn.akamai.steamstatic.com/steam/apps/${spyGame.appid}/header.jpg`,
            small_capsule_image: `https://cdn.akamai.steamstatic.com/steam/apps/${spyGame.appid}/capsule_184x69.jpg`,
            windows_available: true,
            mac_available: false,
            linux_available: false,
            streamingvideo_available: false,
            header_image: `https://cdn.akamai.steamstatic.com/steam/apps/${spyGame.appid}/header.jpg`
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
            type: 'game',
            name: spyGame.name,
            discounted: discountPercent > 0,
            discount_percent: discountPercent,
            original_price: originalPriceCents,
            final_price: finalPriceCents,
            currency: 'USD',
            large_capsule_image: `https://cdn.akamai.steamstatic.com/steam/apps/${spyGame.appid}/header.jpg`,
            small_capsule_image: `https://cdn.akamai.steamstatic.com/steam/apps/${spyGame.appid}/capsule_184x69.jpg`,
            windows_available: true,
            mac_available: false,
            linux_available: false,
            streamingvideo_available: false,
            header_image: `https://cdn.akamai.steamstatic.com/steam/apps/${spyGame.appid}/header.jpg`
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
    type: string
  }[]
}

/**
 * Przeszukuje sklep Steam po tytule.
 */
export const searchSteamGames = async (query: string): Promise<SteamFeaturedCategoryItem[]> => {
  try {
    const url = `https://store.steampowered.com/api/storesearch/`
    // l=english wymusza angielski, aby upewnić się, że gry mają angielską lokalizację (lub są tak opisane)
    // cc=PL dla cen w zł
    const response = await fetchSteamData(url, { term: query, l: 'english', cc: 'PL' })

    if (response && response.items) {
      return response.items.map((item: any) => ({
        id: item.id,
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
        header_image: item.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/header.jpg`,
        type: item.type || 'game'
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

/**
 * Pobiera liczbę graczy online w czasie rzeczywistym bezpośrednio z oficjalnego API Steam.
 */
export const getSteamRealtimeCCU = async (appId: string | number): Promise<number> => {
  try {
    const url = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/`
    const response = await fetchSteamData(url, { appid: appId.toString() })

    if (response && response.response && response.response.result === 1) {
      return response.response.player_count as number
    }
    return 0
  } catch (e) {
    console.error(`Błąd podczas pobierania CCU w czasie rzeczywistym (appid: ${appId}):`, e)
    return 0
  }
}

/**
 * Lista szerokich tagów, które powinny mieć mniejszy wpływ na podobieństwo.
 */
const BROAD_TAGS = new Set([
  'Action', 'Adventure', 'RPG', 'Strategy', 'Indie', 'Singleplayer', 'Multiplayer',
  '2D', '3D', 'Casual', 'Simulation', 'Early Access', 'Free to Play', 'Co-op',
  'Anime', 'Shooter', 'Atmospheric', 'Story Rich', 'Violent', 'Gore', 'Great Soundtrack',
  'Difficult', 'Open World', 'Fantasy', 'Sci-fi', 'Funny'
]);

/**
 * Oblicza podobieństwo między dwiema grami na podstawie ich tagów.
 */
const calculateSimilarity = (
  tagsA: Record<string, number>,
  tagsB: Record<string, number>
): number => {
  const keysA = Object.keys(tagsA)
  const keysB = Object.keys(tagsB)

  if (keysA.length === 0 || keysB.length === 0) return 0

  let score = 0
  const commonTags = keysA.filter((tag) => keysB.includes(tag))

  if (commonTags.length === 0) return 0

  commonTags.forEach((tag) => {
    // Bazujemy na liczbie głosów (logarytmicznie)
    let weightA = Math.log10(tagsA[tag] + 1)
    let weightB = Math.log10(tagsB[tag] + 1)
    
    // Kara dla szerokich tagów - redukujemy ich znaczenie o 90%
    if (BROAD_TAGS.has(tag)) {
      weightA *= 0.1
      weightB *= 0.1
    }

    score += weightA * weightB
  })

  return score
}

/**
 * Zwraca listę gier podobnych do podanego appId.
 */
export const getSimilarGames = async (
  appId: string | number
): Promise<SteamFeaturedCategoryItem[]> => {
  try {
    const baseGameStats = await getSteamGameExtendedStats(appId)
    let currentTags = baseGameStats?.tags || {}
    let sortedTags: string[] = []

    if (Object.keys(currentTags).length > 0) {
      // Priorytetyzujemy tagi niszowe (te, które nie są w BROAD_TAGS)
      // Nawet jeśli mają mniej głosów, są lepszymi indykatorami podobieństwa
      const entries = Object.entries(currentTags)
      
      sortedTags = entries
        .sort(([tagA, valA], [tagB, valB]) => {
          const isBroadA = BROAD_TAGS.has(tagA)
          const isBroadB = BROAD_TAGS.has(tagB)
          
          if (isBroadA && !isBroadB) return 1
          if (!isBroadA && isBroadB) return -1
          return valB - valA // Przy tym samym typie (niszowy/szeroki) decyduje popularność
        })
        .slice(0, 5)
        .map(([tag]) => tag)
    } 
    else {
      const details = await getSteamGameDetails(appId)
      if (details && details.genres) {
        sortedTags = details.genres.map(g => g.description)
        details.genres.forEach(g => {
          currentTags[g.description] = 100 
        })
      }
    }

    if (sortedTags.length === 0) return []

    const candidateFrequency: Map<number, { item: SteamFeaturedCategoryItem; count: number }> =
      new Map()

    const fetchPromises = sortedTags.map((tag) => getSteamSpyByTag(tag))
    const results = await Promise.all(fetchPromises)

    results.forEach((gameList) => {
      gameList.forEach((game) => {
        if (game.id.toString() !== appId.toString()) {
          const existing = candidateFrequency.get(game.id)
          if (existing) {
            existing.count++
          } else {
            candidateFrequency.set(game.id, { item: game, count: 1 })
          }
        }
      })
    })

    const prioritizedCandidates = Array.from(candidateFrequency.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 60)
    
    const scoredCandidates = await Promise.all(
      prioritizedCandidates.map(async ({ item }) => {
        const stats = await getSteamGameExtendedStats(item.id)
        if (!stats || !stats.tags) return { ...item, similarity: 0 }
        
        const similarity = calculateSimilarity(currentTags, stats.tags)
        return { ...item, similarity }
      })
    )

    let finalResults = scoredCandidates
      .filter((g) => g.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ similarity, ...game }) => game as SteamFeaturedCategoryItem)

    // 4. Mechanizm FALLBACK
    if (finalResults.length < 6 && sortedTags.length > 0) {
      // Wybieramy najbardziej unikalny (ostatni z naszych wybranych topowych) tag do fallbacku
      // Zakładając, że na początku są niszowe
      const nicheTag = sortedTags.find(t => !BROAD_TAGS.has(t)) || sortedTags[0]
      const fallbackGames = await getSteamSpyByTag(nicheTag)
      
      const existingIds = new Set(finalResults.map(r => r.id))
      existingIds.add(Number(appId))

      const additionalGames = fallbackGames
        .filter(g => !existingIds.has(g.id))
        .slice(0, 12 - finalResults.length)
      
      finalResults = [...finalResults, ...additionalGames]
    }

    return finalResults.slice(0, 12)

  } catch (e) {
    console.error('Błąd podczas pobierania podobnych gier:', e)
    return []
  }
}

/**
 * Pobiera listę gier posiadanych przez podanego gracza, wykorzystując podane Steam ID.
 * Wymaga publicznych szczegółów profilu gracza w ustawieniach prywatności Steama.
 */
export interface SteamOwnedGame {
  appid: number
  name: string
  playtime_forever: number
  img_icon_url: string
  has_community_visible_stats?: boolean
  playtime_windows_forever?: number
  playtime_mac_forever?: number
  playtime_linux_forever?: number
}

export const getSteamOwnedGames = async (steamId: string): Promise<SteamOwnedGame[]> => {
  try {
    const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/`
    const response = await fetchSteamData(url, { 
      steamid: steamId, 
      include_appinfo: 'true',
      include_played_free_games: 'true',
      format: 'json'
    })

    if (response && response.response && response.response.games) {
      return response.response.games as SteamOwnedGame[]
    }

    console.warn(`Nie udało się pobrać gier dla Steam ID: ${steamId}. Upewnij się, że profil jest publiczny.`)
    return []
  } catch (e) {
    return []
  }
}

/**
 * Pobiera najpopularniejsze nowości ze SteamSpy (ostatnie miesiące).
 */
export const getRecentSteamHits = async (): Promise<SteamFeaturedCategoryItem[]> => {
  try {
    const url = `https://steamspy.com/api.php`
    const response = await fetchSteamData(url, { request: 'top100in2weeks' }) 

    if (response && typeof response === 'object' && !Array.isArray(response)) {
      return Object.values(response)
        .map((spyGame: any) => ({
          id: parseInt(spyGame.appid),
          type: 'game',
          name: spyGame.name,
          large_capsule_image: `https://cdn.akamai.steamstatic.com/steam/apps/${spyGame.appid}/header.jpg`,
          small_capsule_image: `https://cdn.akamai.steamstatic.com/steam/apps/${spyGame.appid}/capsule_184x69.jpg`,
          header_image: `https://cdn.akamai.steamstatic.com/steam/apps/${spyGame.appid}/header.jpg`
        } as SteamFeaturedCategoryItem))
        .slice(0, 50)
    }
    return []
  } catch (e: any) {
    console.error(`Błąd podczas pobierania nowości ze SteamSpy:`, e)
    return []
  }
}
/**
 * Pobiera uproszczone dane o zestawie gier (tagi, opis, gatunki) do analizy gustu.
 */
export interface GameTasteData {
  appid: number
  name: string
  genres: string[]
  tags: string[]
  shortDescription: string
  playtimeHours: number
}

export const getGamesTasteData = async (
  games: SteamOwnedGame[]
): Promise<GameTasteData[]> => {
  // Przetwarzamy gry w paczkach po 5, aby nie przeciążyć API i uniknąć blokad
  const CHUNK_SIZE = 5
  const results: GameTasteData[] = []

  for (let i = 0; i < games.length; i += CHUNK_SIZE) {
    const chunk = games.slice(i, i + CHUNK_SIZE)
    const promises = chunk.map(async (g) => {
      try {
        // Próbujemy pobrać dane ze SteamSpy (dla tagów) i Steam Store (dla opisu/gatunków)
        // SteamSpy jest szybszy dla tagów
        const [spyData, storeData] = await Promise.all([
          getSteamGameExtendedStats(g.appid),
          getSteamGameDetails(g.appid)
        ])

        const tags = spyData?.tags ? Object.keys(spyData.tags) : []
        const genres = storeData?.genres ? storeData.genres.map(gen => gen.description) : []
        
        return {
          appid: g.appid,
          name: g.name,
          genres: genres,
          tags: tags.slice(0, 15), // Top 15 tagów wystarczy
          shortDescription: storeData?.short_description || '',
          playtimeHours: Math.round(g.playtime_forever / 60)
        } as GameTasteData
      } catch (err) {
        console.error(`Błąd pobierania danych gustu dla ${g.name}:`, err)
        return null
      }
    })

    const chunkResults = await Promise.all(promises)
    results.push(...chunkResults.filter((r): r is GameTasteData => r !== null))
    
    // Krótka przerwa między paczkami, aby być "miłym" dla API
    if (i + CHUNK_SIZE < games.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  return results
}
