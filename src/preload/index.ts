import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  db: {
    addFavorite: (anime: { id: number, title: string, coverImage: string }) => ipcRenderer.invoke('db:addFavorite', anime),
    removeFavorite: (id: number) => ipcRenderer.invoke('db:removeFavorite', id),
    getFavorites: () => ipcRenderer.invoke('db:getFavorites'),
    addHistory: (query: string) => ipcRenderer.invoke('db:addHistory', query),
    getHistory: () => ipcRenderer.invoke('db:getHistory'),
    addTranslation: (animeId: number, desc: string) => ipcRenderer.invoke('db:addTranslation', animeId, desc),
    getTranslation: (animeId: number) => ipcRenderer.invoke('db:getTranslation', animeId)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
