/**
 * Serwis Ulubionych – obsługuje zapis/odczyt ulubionych anime.
 * Gdy dostępna jest baza SQLite (Electron), używa window.api.db.
 * W trybie przeglądarkowym (dev:web) używa localStorage jako fallback.
 */

const STORAGE_KEY = 'neo_search_favorites'

interface FavoriteAnime {
  id: number
  title: string
  coverImage: string
  status: string
  score: number
  progress: number
  addedAt: string
}

function getLocalFavorites(): FavoriteAnime[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalFavorites(favs: FavoriteAnime[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs))
}

const isElectron = (): boolean => !!(window as any).api?.db

export const FavoritesService = {
  async addFavorite(anime: { id: number; title: string; coverImage: string }): Promise<void> {
    if (isElectron()) {
      await (window as any).api.db.addFavorite(anime)
    } else {
      const favs = getLocalFavorites()
      if (!favs.some((f) => f.id === anime.id)) {
        favs.unshift({
          ...anime,
          status: 'PLANNING',
          score: 0,
          progress: 0,
          addedAt: new Date().toISOString()
        })
        saveLocalFavorites(favs)
      }
    }
  },

  async removeFavorite(id: number): Promise<void> {
    if (isElectron()) {
      await (window as any).api.db.removeFavorite(id)
    } else {
      const favs = getLocalFavorites().filter((f) => f.id !== id)
      saveLocalFavorites(favs)
    }
  },

  async getFavorites(): Promise<FavoriteAnime[]> {
    if (isElectron()) {
      return await (window as any).api.db.getFavorites()
    } else {
      return getLocalFavorites()
    }
  },

  async updateFavoriteDetails(
    id: number,
    status: string,
    score: number,
    progress: number
  ): Promise<void> {
    if (isElectron()) {
      await (window as any).api.db.updateFavoriteDetails(id, status, score, progress)
    } else {
      const favs = getLocalFavorites()
      const idx = favs.findIndex((f) => f.id === id)
      if (idx !== -1) {
        favs[idx].status = status
        favs[idx].score = score
        favs[idx].progress = progress
        saveLocalFavorites(favs)
      }
    }
  },

  async isFavorite(id: number): Promise<boolean> {
    const favs = await this.getFavorites()
    return favs.some((f) => f.id === id)
  }
}
