import { GameTasteData } from './steamStore'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const parseAIJsonResponse = (content: string) => {
  let cleanContent = content.trim()
  const match = cleanContent.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  if (match) {
    cleanContent = match[1].trim()
  }
  return JSON.parse(cleanContent)
}

export interface AISearchResult {
  titles: string[]
  searchParams?: {
    genres?: string[]
    tags?: string[]
    seasonYear?: number
  }
}

export const fetchAIAnimeTitles = async (
  description: string,
  apiKey: string,
  domain: 'anime' | 'games' = 'anime'
): Promise<AISearchResult> => {
  if (!apiKey) {
    throw new Error(
      'Brak klucza API OpenRouter. Dodaj go w ustawieniach lub w pliku .env (VITE_OPENROUTER_KEY).'
    )
  }

  const systemPrompt =
    domain === 'games'
      ? `You are an expert PC video games recommendation engine. The user will give you a description of a game.            You must reply ONLY with a JSON object containing two keys:
            1. 'titles': an array of strings. These strings should be the exact official titles of the PC/Steam games that match. Return up to 5 results.
            2. 'searchParams': an object containing parameters extracted from the user's description. Use this to help find newer games. It can contain:
               - 'genres': array of strings (e.g., ["Action", "RPG", "FPS"])
               - 'tags': array of strings (e.g., ["Cyberpunk", "Multiplayer", "Story Rich", "Soulslike"])
               - 'seasonYear': number (e.g., 2024), ONLY if the user explicitly mentions a year or says "newest/this year".
            
            AVAILABLE STEAM TAGS (Use these for 'tags' and 'genres' if they match):
            Action, Adventure, RPG, Strategy, Indie, Simulation, Racing, Sports, Casual, Massively Multiplayer, 2D, 3D, 
            Atmospheric, Story Rich, Exploration, Fantasy, Multiplayer, Pixel Graphics, Puzzle, First-Person, Horror, 
            Open World, Survival, Co-op, Platformer, Roguelike, Sandbox, Management, Crafting, Sci-fi, Cyberpunk, 
            Soulslike, Metroidvania, Roguelite, Visual Novel, Hack and Slash, Zombies, Fighting, Stealth, Tactical, 
            Card Game, VR, Tower Defense, City Builder, Mystery, Point & Click, Rhythm, Turn-Based, Gore, Violent, 
            Great Soundtrack, Difficult, Funny, Anime, Space, War, Historical, Realistic, Third Person, Top-Down, 
            Side Scroller, Arcade, Bullet Hell, Shoot 'Em Up, Souls-like, Relaxing, Dark, Cute, Medieval, Magic, 
            Post-apocalyptic, Building, Space, Western, Noir, Parkour, Crime, Investigation, Comedy, Parody, 
            Political, Educational, Family Friendly.

            If you cannot extract a parameter, omit it from the 'searchParams' object.
            Do not include any explanations, just the JSON.`
      : `You are an expert anime recommendation engine. The user will give you a description of an anime plot or elements. 
           You must reply ONLY with a JSON object containing two keys:
           1. 'titles': an array of strings. These strings should be the exact official English or Romaji titles of the anime that match the description perfectly. Return up to 5 results.
           2. 'searchParams': an object containing parameters extracted from the user's description. Use this to help find newer anime that you might not know by title. It can contain:
              - 'genres': array of strings (e.g., ["Action", "Fantasy", "Romance"])
              - 'tags': array of strings (e.g., ["Magic School", "Demons", "Vampire"])
              - 'seasonYear': number (e.g., 2024), ONLY if the user explicitly mentions a year or says "newest/this year".
           
           If you cannot extract a parameter, omit it from the 'searchParams' object.
           Do not include any explanations, just the JSON.`

  const payload = {
    model: 'google/gemini-3-flash-preview', // Darmowy model z dobrym wsparciem JSON
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: description
      }
    ]
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`OpenRouter API Error: ${response.statusText}`)
  }

  const data = await response.json()
  
  if (data.error) {
    console.error('OpenRouter API Error:', data.error)
    throw new Error(data.error.message || 'OpenRouter API Error')
  }

  try {
    const content = data.choices?.[0]?.message?.content
    if (!content) return { titles: [] }
    const parsed = parseAIJsonResponse(content)
    return {
      titles: parsed.titles || [],
      searchParams: parsed.searchParams
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e)
    return { titles: [] }
  }
}

export const translateDescriptionToPolish = async (
  description: string,
  apiKey: string
): Promise<string | null> => {
  if (!apiKey) {
    console.warn('Brak klucza API OpenRouter do tłumaczenia opisu.')
    return null
  }

  if (!description || description.trim() === '') {
    return null
  }

  const payload = {
    model: 'google/gemini-3-flash-preview',
    messages: [
      {
        role: 'system',
        content:
          'Jesteś profesjonalnym tłumaczem. Przetłumacz podany angielski opis fabuły anime na perfekcyjny, naturalny język polski. ZACHOWAJ WSZYSTKIE ewentualne tagi HTML (np. <br>, <i>, <b>), jeśli są w oryginale. Zwróć WYŁĄCZNIE przetłumaczony tekst, absolutnie bez żadnych swoich dodatków, powitań ani bloków markdown.'
      },
      {
        role: 'user',
        content: description
      }
    ]
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(`Błąd tłumaczenia AI z OpenRouter:`, data)
      return null
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) return null

    return content.trim()
  } catch (e) {
    console.error('Błąd przetwarzania odpowiedzi z API tłumacza:', e)
    return null
  }
}

export interface AIAnimeReviewSummary {
  verdict: string
  pros: string[]
  cons: string[]
}

export const summarizeReviews = async (
  reviews: string[],
  apiKey: string
): Promise<AIAnimeReviewSummary | null> => {
  if (!apiKey) {
    console.warn('Brak klucza API OpenRouter do streszczania recenzji.')
    return null
  }

  if (!reviews || reviews.length === 0) {
    return null
  }

  const payload = {
    model: 'google/gemini-3.1-pro-preview',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Jesteś ekspertem od anime. Poniżej dostaniesz listę recenzji danego widowiska napisanych przez społeczność fanów po angielsku. 
                Twoim zadaniem jest stworzenie JEDNEGO spójnego, obiektywnego i krótkiego podsumowania tych opinii w języku polskim w formacie JSON.
                
                Zasady:
                - Nie spoiluj fabuły!
                - Odpowiedz WYŁĄCZNIE surowym obiektem JSON o strukturze:
                {
                  "verdict": "Krótkie (2-3 zdania) podsumowanie ogólnego konsensusu w języku polskim.",
                  "pros": ["Tablica 3-5 najważniejszych zalet w języku polskim"],
                  "cons": ["Tablica 3-5 najważniejszych wad w języku polskim"]
                }
                - Jeśli recenzje są bardzo skrajne, napisz w 'verdict', że "zdania są mocno podzielone".`
      },
      {
        role: 'user',
        content:
          'Oto wyciągnięte recenzje społeczności do podsumowania:\n\n' +
          reviews.map((r, i) => `--- RECENZJA ${i + 1} ---\n${r}`).join('\n\n')
      }
    ]
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(`Błąd podsumowania AI z OpenRouter:`, data)
      return null
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) return null

    try {
      return parseAIJsonResponse(content) as AIAnimeReviewSummary
    } catch (parseError) {
      console.error('Błąd parsowania JSON AI Review:', parseError)
      return null
    }
  } catch (e) {
    console.error('Błąd przetwarzania odpowiedzi z API tłumacza (Streszczenia):', e)
    return null
  }
}

export interface AIReviewSummary {
  playIf: string[]
  avoidIf: string[]
  verdict: string
}

export const fetchAIReviewSummary = async (
  reviewsText: string,
  apiKey: string,
  gamerDNA?: string
): Promise<AIReviewSummary> => {
  if (!apiKey) {
    throw new Error('Brak klucza API OpenRouter.')
  }

  const personalizationContext = gamerDNA 
    ? `KRYTYCZNIE WAŻNE: Poniżej znajduje się profil gustu gracza (Gamer DNA). 
       Twoim zadaniem jest dostosowanie werdyktu pod tego konkretnego użytkownika. 
       Odnoś się do jego preferencji, porównuj mechaniki gry do tego co lubi, i oceń czy ta gra mu się spodoba.
       
       PROFIL GRACZA (Gamer DNA):
       ${gamerDNA}
       
       Jeśli w Gamer DNA są wymienione konkretne gry lub gatunki, użyj tej wiedzy w sekcji 'verdict' oraz 'playIf'/'avoidIf'.`
    : ""

  const payload = {
    model: 'google/gemini-3.1-pro-preview',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert game critic and AI analyzer. The user will provide you with a raw dump of Steam user reviews for a specific game.
                Analyze the sentiment, recurring praises, and recurring complaints.
                
                ${personalizationContext}

                You must reply ONLY with a JSON object containing three keys:
                1. 'playIf': an array of 3-5 strings (in Polish). Short bullet points about who will enjoy this game and what its strongest points are (e.g. "Zagraj, jeśli lubisz głęboką fabułę").
                2. 'avoidIf': an array of 3-5 strings (in Polish). Short bullet points about who will hate this game and what its biggest flaws are (e.g. "Unikaj, jeśli nie tolerujesz powtarzalnego grindu").
                ${gamerDNA ? "3. 'verdict': A 1-3 sentence summary (in Polish) of the general consensus among the reviewers, HEAVILY PERSONALIZED based on the provided Gamer DNA. Make sure the verdict starts with something like 'Biorąc pod uwagę Twój gust...' or similar personal touch." : "3. 'verdict': A 1-3 sentence summary (in Polish) of the general consensus among the reviewers."}
                
                Do not include any other text, markdown blocks, or explanations. ONLY the raw JSON object.`
      },
      {
        role: 'user',
        content: `Here are the top reviews:\n\n${reviewsText}`
      }
    ]
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error('OpenRouter Error Response:', await response.text())
      throw new Error(`Błąd API OpenRouter: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.error) throw new Error(data.error.message || 'OpenRouter API Error')
    
    const content = data.choices?.[0]?.message?.content

    console.log('Surowa odpowiedź AI Review:', content)
    return parseAIJsonResponse(content) as AIReviewSummary
  } catch (e) {
    console.error('fetchAIReviewSummary error:', e)
    throw e
  }
}

export interface AIProfileAnalysis {
  title: string
  content: string
  verdictTag: string
}

export interface GameRecommendation {
  appid: number
  name: string
  justification: string
}

export const analyzePlayerProfile = async (
  topGames: { name: string; playtimeMinutes: number }[],
  mode: 'serious' | 'roast',
  apiKey: string
): Promise<AIProfileAnalysis> => {
  if (!apiKey) {
    throw new Error('Brak klucza API OpenRouter.')
  }

  const gamesListText = topGames
    .map((g, i) => `${i + 1}. ${g.name} - ${Math.round(g.playtimeMinutes / 60)} godzin`)
    .join('\n')

  const systemPrompt =
    mode === 'serious'
      ? `Jesteś profesjonalnym psychologiem i znawcą gier wideo. Odpowiedz WYŁĄCZNIE w formacie JSON.
         Przeanalizuj profil gracza na podstawie jego Top 15 najczęściej granych gier:
         
         1. 'title': Wymyśl pasujący, profesjonalny tytuł profilu gracza (np. "Strateg i Planista").
         2. 'content': W 3-4 akapitach przeanalizuj w języku polskim, co te gry mówią o jego osobowości, jakich doświadczeń szuka. Bądź obiektywny i ciekawy. Formatuj w Markdown.
         3. 'verdictTag': Krótki tag podsumowujący (np. "Typ Zrównoważony").`
      : `Jesteś bezlitosnym, sarkastycznym graczem, który uwielbia wyśmiewać (roast) innych za to, w co grają. Odpowiedz WYŁĄCZNIE w formacie JSON.
         Wyśmiej gust gracza na podstawie jego Top 15 gier i przegranych w nich koszmarnych ilości godzin:
         
         1. 'title': Wymyśl obraźliwy, śmieszny tytuł dla tego gracza (np. "Niewolnik Gacha" lub "Toksyczny Tryhard").
         2. 'content': W 3-4 akapitach jedź po nim bez litości w języku polskim. Używaj czarnego humoru, ironii i wytykaj mu zmarnowane życie formatując w Markdown. Daj radę, np. "idź dotknąć trawy".
         3. 'verdictTag': Szybki tag-punchline (np. "Syndrom Sztokholmski").`

  const payload = {
    model: 'google/gemini-3.1-pro-preview',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Oto lista Top gier gracza (format: Nazwa gry - czas w godzinach):\n\n${gamesListText}`
      }
    ]
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error('OpenRouter Error Response:', await response.text())
      throw new Error(`Błąd API OpenRouter: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.error) throw new Error(data.error.message || 'OpenRouter API Error')
    
    const content = data.choices?.[0]?.message?.content

    console.log('Surowa odpowiedź AI Profile Analyzer:', content)
    return parseAIJsonResponse(content) as AIProfileAnalysis
  } catch (e) {
    console.error('analyzePlayerProfile error:', e)
    throw e
  }
}

export interface CandidateGame {
  id: string | number
  name: string
  description?: string
  tags?: string[]
}

/**
 * AI Reranker: Takes a list of candidate games and ranks them by relevance to the user's original query.
 */
export const fetchAIRerankedGames = async (
  userQuery: string,
  candidates: CandidateGame[],
  apiKey: string
): Promise<(string | number)[]> => {
  if (!apiKey || candidates.length === 0) return candidates.map((c) => c.id)

  const candidatesText = candidates
    .map((c) => `ID: ${c.id} | Title: ${c.name} | Tags: ${c.tags?.join(', ')}`)
    .join('\n')

  const payload = {
    model: 'google/gemini-3.1-pro-preview', // Fast and cheap for reranking
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a game recommendation reranker. The user provided a description: "${userQuery}".
                 I will provide you with a list of up to 40 candidate games found by a search engine.
                 Your task is to select the BEST 10-12 games that match the user's description and rank them by relevance.
                 
                 CRITICAL: Prioritize FULL GAMES over DLCs, Soundtracks, or Map Packs. 
                 If a title contains "DLC", "Soundtrack", "Expansion Pass", or "Season Pass", it should be ranked very low or excluded UNLESS the user specifically asked for an expansion.
                 
                 Pay attention to atmospheric descriptions, specific themes, and mechanics mentioned by the user.
                 
                 Return ONLY a JSON object:
                 { "rankedIds": [id1, id2, id3, ...] }
                 Where IDs are from the original candidate list in order of relevance.`
      },
      {
        role: 'user',
        content: `Candidates:\n${candidatesText}`
      }
    ]
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    
    if (data.error) {
        console.error('OpenRouter API Error:', data.error);
        return candidates.slice(0, 12).map((c) => c.id);
    }
    
    const content = data.choices?.[0]?.message?.content
    if (!content) return candidates.slice(0, 12).map(c => c.id)
    
    const parsed = parseAIJsonResponse(content)
    return parsed.rankedIds || []
  } catch (e) {
    console.error('AI Reranking failed:', e)
    return candidates.slice(0, 12).map((c) => c.id) // Fallback to first few candidates
  }
}

export const fetchAIRecommendations = async (
  userOwnedGames: string,
  candidates: { id: number; name: string; tags: string[]; year?: number }[],
  apiKey: string,
  yearFilter: 'all' | '2015' = 'all'
): Promise<GameRecommendation[]> => {
  if (!apiKey || candidates.length === 0) return []

  const candidatesText = candidates
    .slice(0, 70)
    .map((c) => `ID: ${c.id} | Title: ${c.name} ${c.year ? `(${c.year})` : ''} | Tags: ${c.tags.join(', ')}`)
    .join('\n')

  const yearConstraint = yearFilter === '2015' 
    ? "4. WAŻNE: Wybieraj WYŁĄCZNIE gry wydane po 2015 roku (nowoczesne tytuły). Ignoruj te ze starszą datą." 
    : "4. Możesz wybierać gry z dowolnego roku (zarówno klasyki, jak i nowości)."

  const payload = {
    model: 'google/gemini-3.1-pro-preview',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Jesteś światowej klasy ekspertem-doradcą gier wideo. Odpowiedz WYŁĄCZNIE w formacie JSON.
                 Użytkownik posiada już te gry: ${userOwnedGames}.
                 Twoim zadaniem jest wybranie dokładnie 12 gier z poniższej listy kandydatów, które najlepiej pasują do gustu użytkownika.
                 
                 INFO O LIŚCIE: Niektóre gry na liście to najnowsze światowe premiery rynkowe, których możesz nie mieć w swoim treningu. Oceniaj je na podstawie podanych tagów, tytułu i rocznika.
                 
                 ZASADY WYBORU:
                 1. Wybierz dokładnie 12 gier.
                 2. PODZIAŁ:
                    - Powinieneś wybrać pierwsze 4 gry, które są stosunkowo popularne i dobrze oceniane (hity), a pasują do gustu użytkownika.
                    - Kolejne 8 gier wybierz pod kątem idealnego dopasowania do tagów i mechanik gier użytkownika, NIEZALEŻNIE od ich popularności (szukaj ukrytych perełek, gier niszowych lub zapomnianych).
                 3. UNIKAJ serii gier, które gracz już posiada. Jeśli gracz ma np. "The Witcher 3", nie proponuj "The Witcher 2" ani żadnej innej gry z tej samej serii/uniwersum. Szukaj innych marek o podobnym klimacie.
                 ${yearConstraint}
                 5. Dla każdej gry napisz JEDNO zdanie uzasadnienia w języku polskim ("justification"), wyjaśniające dlaczego ta gra pasuje do jego gustu.
                 6. Ignoruj gry, które użytkownik już posiada.
                 7. Zwróć tablicę obiektów.
                 
                 Format odpowiedzi:
                 {
                   "recommendations": [
                     { "appid": 123, "name": "Tytuł", "justification": "Bo lubisz gry RPG z otwartym światem." },
                     ...
                   ]
                 }`
      },
      {
        role: 'user',
        content: `Lista kandydatów:\n${candidatesText}`
      }
    ]
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`Błąd API OpenRouter: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.error) {
        throw new Error(data.error.message || 'Błąd API OpenRouter')
    }
    
    const content = data.choices?.[0]?.message?.content
    
    if (!content) {
        console.error('Empty AI response')
        return []
    }

    const parsed = parseAIJsonResponse(content)
    return parsed.recommendations || []
  } catch (e: any) {
    console.error('AI Recommendations failed:', e)
    throw e
  }
}

export const generateRecommendedTitles = async (
  userGames: string,
  apiKey: string,
  yearFilter: 'all' | '2015' = 'all'
): Promise<string[]> => {
  if (!apiKey) return []

  const yearConstraint = yearFilter === '2015'
    ? "Szukaj WYŁĄCZNIE gier wydanych po 2015 roku. Absolutnie ignoruj starsze tytuły."
    : "Możesz sugerować gry z dowolnego okresu (klasyki i nowości)."

  const payload = {
    model: 'google/gemini-3.1-pro-preview',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Jesteś ekspertem branży gier wideo. Na podstawie listy gier, które użytkownik uwielbia, zaproponuj 35-40 INNYCH tytułów gier, które mogłyby mu się spodobać.
                 
                 ZASADY:
                 1. Zwróć WYŁĄCZNIE listę samych tytułów gier w formacie JSON.
                 2. ${yearConstraint}
                 3. UNIKAJ gier z serii, które użytkownik już posiada.
                 4. Wybieraj gry różnorodne: zarówno duże hity, jak i mniejsze gry niezależne.
                 5. Tytuły muszą być dokładne (oficjalne nazwy angielskie), aby można je było wyszukać w API Steam.
                 
                 Format odpowiedzi:
                 {
                   "suggestions": ["Title 1", "Title 2", ...]
                 }`
      },
      {
        role: 'user',
        content: `Moje ulubione gry: ${userGames}`
      }
    ]
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) throw new Error(`OpenRouter Error: ${response.status}`)

    const data = await response.json()
    
    if (data.error) {
        throw new Error(data.error.message || 'Błąd API OpenRouter')
    }
    
    const content = data.choices?.[0]?.message?.content
    if (!content) return []

    const parsed = parseAIJsonResponse(content)
    return parsed.suggestions || []
  } catch (e: any) {
    console.error('generateRecommendedTitles failed:', e)
    throw e
  }
}
export const generateGamerDNA = async (
  tasteData: GameTasteData[],
  apiKey: string
): Promise<string> => {
  if (!apiKey) throw new Error('Brak klucza API OpenRouter.')

  const gamesContext = tasteData
    .map((g, i) => `${i + 1}. ${g.name} (${g.playtimeHours}h) - GATUNKI: ${g.genres.join(', ')} | TAGI: ${g.tags.join(', ')}`)
    .join('\n')

  const payload = {
    model: 'google/gemini-3.1-pro-preview', // Fast/Efficient for summarization
    messages: [
      {
        role: 'system',
        content: `Jesteś ekspertem profilowania graczy. Twoim zadaniem jest stworzenie "Gamer DNA" - bardzo zwięzłego profilu psychologiczno-rozgrywkowego użytkownika na podstawie jego Top 50 najczęściej granych gier (wraz z tagami i gatunkami).
        
        DNA powinno zawierać:
        - 3-4 główne archetypy gracza (np. "Strateg-Perfekcjonista", "Miłośnik mrocznych RPGów").
        - Listę 5 mechanik, które ten gracz kocha (np. "Trudna walka", "Zarządzanie zasobami").
        - Krótkie podsumowanie tego, czego ten gracz SZUKA w grach, a czego UNIKA.
        
        Zwróć TYLKO tekst profilu DNA w języku polskim. Bądź konkretny, pomiń uprzejmości. Ten tekst będzie używany jako kontekst dla innego AI do personalizacji recenzji.`
      },
      {
        role: 'user',
        content: `Oto dane o moich grach:\n\n${gamesContext}`
      }
    ]
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) throw new Error(`OpenRouter Error: ${response.status}`)
    const data = await response.json()

    if (data.error) {
        throw new Error(data.error.message || 'Błąd API OpenRouter')
    }
    
    return data.choices?.[0]?.message?.content || 'Brak danych o profilu.'
  } catch (e) {
    console.error('generateGamerDNA failed:', e)
    throw e
  }
}

export const analyzeAnimeProfile = async (
  favorites: { 
    title: string; 
    genres: string[]; 
    description: string; 
    score: number; 
    status: string; 
    progress: number; 
    totalEpisodes: number 
  }[],
  apiKey: string
): Promise<AIProfileAnalysis> => {
  if (!apiKey) {
    throw new Error('Brak klucza API OpenRouter.')
  }

  const animeListText = favorites
    .map((f, i) => {
      const progressText = f.totalEpisodes > 0 ? `${f.progress}/${f.totalEpisodes}` : `${f.progress}`;
      return `${i + 1}. ${f.title}
   - Status: ${f.status}
   - Ocena: ${f.score}/10
   - Postęp: ${progressText} odc.
   - Gatunki: ${f.genres.join(', ')}
   - Opis: ${f.description?.substring(0, 300)}...`
    })
    .join('\n\n')

  const systemPrompt = `Jesteś ekspertem od anime i psychologii mediów. Twoim zadaniem jest przeanalizowanie profilu fana anime na podstawie jego "Mojej Listy".
  
  Otrzymasz listę anime wraz z ocenami, statusami oglądania, postępem i krótkimi opisami fabuły.
  
  Przeanalizuj te dane i odpowiedz WYŁĄCZNIE w formacie JSON:
  1. 'title': Wymyśl kreatywny tytuł typu fana (np. "Koneser Seinenów", "Nostalgiczny Wojownik", "Łowca Emocji").
  2. 'content': W 3-4 akapitach (używając Markdown) przeanalizuj gust użytkownika. 
     - Co te anime mówią o jego potrzebach emocjonalnych?
     - Jakie motywy (mechanizmy fabularne) kocha, a jakie być może omija?
     - Zwróć uwagę na to, które serie porzucił (status DROPPED) lub wstrzymał (PAUSED) - co to o nim mówi?
     - Bądź błyskotliwy, nieco "geekowski", ale profesjonalny.
  3. 'verdictTag': Krótki tag podsumowujący (np. "Stabilny Emocjonalnie", "Szukający Przygód").
  
  Odpowiadaj w języku polskim. Jeśli dostaniesz opisy w innym języku, przetłumacz sobie ich sens w głowie, ale analizę napisz po polsku.
  ZACHOWAJ CZYSTY JSON.`

  const payload = {
    model: 'google/gemini-3.1-pro-preview', // Szybki i nowoczesny model
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Oto moja lista ulubionych anime:\n\n${animeListText}`
      }
    ]
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API Error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    return parseAIJsonResponse(content) as AIProfileAnalysis
  } catch (e) {
    console.error('analyzeAnimeProfile error:', e)
    throw e
  }
}
