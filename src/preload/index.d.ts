import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      db: {
        addFavorite: (anime: { id: number; title: string; coverImage: string }) => Promise<any>
        removeFavorite: (id: number) => Promise<any>
        getFavorites: () => Promise<any[]>
        addHistory: (query: string) => Promise<any>
        getHistory: () => Promise<any[]>
        addTranslation: (animeId: number, desc: string) => Promise<any>
        getTranslation: (animeId: number) => Promise<{ description_pl: string } | undefined>
        addReviewSummary: (animeId: number, summary: string) => Promise<any>
        getReviewSummary: (animeId: number) => Promise<{ summary_pl: string } | undefined>
      }
      steam: {
        fetch: (url: string) => Promise<any>
      }
      anilist: {
        fetch: (query: string, variables?: Record<string, any>) => Promise<any>
      }
    }
  }
}
