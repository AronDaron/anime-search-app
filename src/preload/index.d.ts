import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      db: {
        addFavorite: (anime: { id: number, title: string, coverImage: string }) => Promise<any>
        removeFavorite: (id: number) => Promise<any>
        getFavorites: () => Promise<any[]>
        addHistory: (query: string) => Promise<any>
        getHistory: () => Promise<any[]>
      }
    }
  }
}
