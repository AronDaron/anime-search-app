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
      ? `You are an expert PC video games recommendation engine. The user will give you a description of a game. 
           You must reply ONLY with a JSON object containing two keys:
           1. 'titles': an array of strings. These strings should be the exact official titles of the PC/Steam games that match. Return up to 5 results.
           2. 'searchParams': an object containing parameters extracted from the user's description. Use this to help find newer games. It can contain:
              - 'genres': array of strings (e.g., ["Action", "RPG", "FPS"])
              - 'tags': array of strings (e.g., ["Cyberpunk", "Multiplayer", "Story Rich"])
              - 'seasonYear': number (e.g., 2024), ONLY if the user explicitly mentions a year or says "newest/this year".
           
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

export const summarizeReviews = async (
  reviews: string[],
  apiKey: string
): Promise<string | null> => {
  if (!apiKey) {
    console.warn('Brak klucza API OpenRouter do streszczania recenzji.')
    return null
  }

  if (!reviews || reviews.length === 0) {
    return null
  }

  const payload = {
    model: 'google/gemini-3-flash-preview',
    messages: [
      {
        role: 'system',
        content: `Jesteś ekspertem od anime. Poniżej dostaniesz listę recenzji danego widowiska napisanych przez obumarłą społeczność fanów po angielsku. 
                Twoim zadaniem jest stworzenie JEDNEGO spójnego, obiektywnego i krótkiego podsumowania tych opinii w języku polskim ("Co lidzie sądzą o tym anime?").
                
                Zasady:
                - Podsumuj NAJWAŻNIEJSZE wady i zalety pojawiające się w tych recenzjach.
                - Nie spoiluj fabuły!
                - Zwróć tylko wygenerowany tekst w języku polskim. Możesz używać znaczników HTML <b> dla pogrubień, <i> dla kursywy i <br> dla nowych linii (ok. 2-3 zgrabne akapity to idealna wielkość).
                - Nie odzywaj się "Cześć" ani nie pisz "Oto podsumowanie". Od razu przejdź do rzeczy.
                - Jeśli recenzje są bardzo skrajne, napisz, że "zdania są mocno podzielone".`
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

    return content.trim()
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
