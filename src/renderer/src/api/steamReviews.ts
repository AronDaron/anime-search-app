import { fetchSteamData } from './steamAPI'

// Zwracany typ z nowego endpointu opinii Steama
export interface SteamReview {
  recommendationid: string
  author: {
    steamid: string
    num_games_owned: number
    num_reviews: number
    playtime_forever: number
  }
  language: string
  review: string
  time_created: number
  time_updated: number
  voted_up: boolean
  votes_up: number
  votes_funny: number
}

export interface SteamReviewResponse {
  success: number
  query_summary: {
    num_reviews: number
    review_score: number
    review_score_desc: string
    total_positive: number
    total_negative: number
    total_reviews: number
  }
  reviews: SteamReview[]
}

/**
 * Endpoint zwracający najpopularniejsze opinie na temat gry prosto ze sklepu Steama.
 * Zawiera surowy tekst, który możemy przekierować do OpenRouter AI w celu wygenerowania podsumowania.
 */
export const getSteamGameReviews = async (
  appId: string | number,
  limit: number = 20
): Promise<SteamReviewResponse | null> => {
  try {
    const url = `https://store.steampowered.com/appreviews/${appId}`
    const params = {
      json: '1',
      language: 'english', // Angielski daje najwięcej i najsensowniejszych opinii do podsumowania przez potężnego LLM
      filter: 'all',
      review_type: 'all',
      purchase_type: 'all',
      num_per_page: limit.toString()
    }

    const response = await fetchSteamData(url, params)

    if (response && response.success === 1) {
      return response as SteamReviewResponse
    }

    console.error(`Brak sukcesu z API recenzji: ${appId}`)
    return null
  } catch (e) {
    console.error(`Błąd podczas pobierania opinii gry Steam (${appId}):`, e)
    return null
  }
}
