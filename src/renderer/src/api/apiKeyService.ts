/**
 * ApiKeyService - Zarządza kluczami API dla Steam i OpenRouter.
 * Obsługuje zapis/odczyt z localStorage oraz fallback do zmiennych środowiskowych Vite.
 */

const STEAM_KEY_STORAGE = 'v_steam_api_key'
const OPENROUTER_KEY_STORAGE = 'v_openrouter_api_key'

export const ApiKeyService = {
  /**
   * Pobiera klucz Steam API.
   * Szuka najpierw w localStorage, potem w zmiennych środowiskowych.
   */
  getSteamKey: (): string => {
    const savedKey = localStorage.getItem(STEAM_KEY_STORAGE)
    if (savedKey) return savedKey
    return import.meta.env.VITE_STEAM_API_KEY || ''
  },

  /**
   * Zapisuje klucz Steam API w localStorage.
   */
  setSteamKey: (key: string): void => {
    if (key.trim()) {
      localStorage.setItem(STEAM_KEY_STORAGE, key.trim())
    } else {
      localStorage.removeItem(STEAM_KEY_STORAGE)
    }
  },

  /**
   * Pobiera klucz OpenRouter API.
   * Szuka najpierw w localStorage, potem w zmiennych środowiskowych.
   */
  getOpenRouterKey: (): string => {
    const savedKey = localStorage.getItem(OPENROUTER_KEY_STORAGE)
    if (savedKey) return savedKey
    return import.meta.env.VITE_OPENROUTER_KEY || ''
  },

  /**
   * Zapisuje klucz OpenRouter API w localStorage.
   */
  setOpenRouterKey: (key: string): void => {
    if (key.trim()) {
      localStorage.setItem(OPENROUTER_KEY_STORAGE, key.trim())
    } else {
      localStorage.removeItem(OPENROUTER_KEY_STORAGE)
    }
  },

  /**
   * Sprawdza, czy dany klucz pochodzi z localStorage (czy został ustawiony przez użytkownika).
   */
  isUserSetSteamKey: (): boolean => !!localStorage.getItem(STEAM_KEY_STORAGE),
  isUserSetOpenRouterKey: (): boolean => !!localStorage.getItem(OPENROUTER_KEY_STORAGE)
}
