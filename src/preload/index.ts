import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  db: {
    addFavorite: (anime: { id: number; title: string; coverImage: string }) =>
      ipcRenderer.invoke('db:addFavorite', anime),
    removeFavorite: (id: number) => ipcRenderer.invoke('db:removeFavorite', id),
    getFavorites: () => ipcRenderer.invoke('db:getFavorites'),
    addHistory: (query: string) => ipcRenderer.invoke('db:addHistory', query),
    getHistory: () => ipcRenderer.invoke('db:getHistory'),
    addTranslation: (animeId: number, desc: string) =>
      ipcRenderer.invoke('db:addTranslation', animeId, desc),
    getTranslation: (animeId: number) => ipcRenderer.invoke('db:getTranslation', animeId),
    addReviewSummary: (animeId: number, summary: string) =>
      ipcRenderer.invoke('db:addReviewSummary', animeId, summary),
    getReviewSummary: (animeId: number) => ipcRenderer.invoke('db:getReviewSummary', animeId)
  },
  steam: {
    fetch: (url: string) => ipcRenderer.invoke('steam:fetch', url)
  },
  anilist: {
    fetch: (query: string, variables?: Record<string, any>) =>
      ipcRenderer.invoke('anilist:fetch', query, variables)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
