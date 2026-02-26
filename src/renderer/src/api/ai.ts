const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

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
  try {
    const content = data.choices[0].message.content
    const parsed = JSON.parse(content)
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
    model: 'google/gemini-3-flash-preview',
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
      return JSON.parse(content) as AIAnimeReviewSummary
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
  apiKey: string
): Promise<AIReviewSummary> => {
  if (!apiKey) {
    throw new Error('Brak klucza API OpenRouter.')
  }

  const payload = {
    model: 'google/gemini-3-flash-preview',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert game critic and AI analyzer. The user will provide you with a raw dump of Steam user reviews for a specific game.
                Analyze the sentiment, recurring praises, and recurring complaints.
                
                You must reply ONLY with a JSON object containing three keys:
                1. 'playIf': an array of 3-5 strings (in Polish). Short bullet points about who will enjoy this game and what its strongest points are (e.g. "Zagraj, jeśli lubisz głęboką fabułę").
                2. 'avoidIf': an array of 3-5 strings (in Polish). Short bullet points about who will hate this game and what its biggest flaws are (e.g. "Unikaj, jeśli nie tolerujesz powtarzalnego grindu").
                3. 'verdict': A 1-3 sentence summary (in Polish) of the general consensus among the reviewers.

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
    const content = data.choices[0].message.content

    console.log('Surowa odpowiedź AI Review:', content)
    return JSON.parse(content) as AIReviewSummary
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
    const content = data.choices[0].message.content

    console.log('Surowa odpowiedź AI Profile Analyzer:', content)
    return JSON.parse(content) as AIProfileAnalysis
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
    model: 'google/gemini-2.0-flash-exp', // Fast and cheap for reranking
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
    const content = data.choices[0].message.content
    const parsed = JSON.parse(content)
    return parsed.rankedIds || []
  } catch (e) {
    console.error('AI Reranking failed:', e)
    return candidates.slice(0, 12).map((c) => c.id) // Fallback to first few candidates
  }
}
