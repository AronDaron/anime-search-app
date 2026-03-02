import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import {
  addFavorite,
  removeFavorite,
  getFavorites,
  addHistory,
  getHistory,
  addTranslation,
  getTranslation,
  addReviewSummary,
  getReviewSummary
} from './database'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Global error handler to catch silent crashes before or after windows open
  process.on('uncaughtException', (error) => {
    dialog.showErrorBox('Krytyczny Błąd Aplikacji (Uncaught Exception)', `Aplikacja napotkała nieoczekiwany błąd i musi zostać wyłączona.\n\nSzczegóły:\n${error.message}\n\nStack:\n${error.stack}`)
    app.exit(1)
  })

  try {
    // Database IPC Handlers
    ipcMain.handle('db:addFavorite', (_, anime) => addFavorite(anime))
    ipcMain.handle('db:removeFavorite', (_, id) => removeFavorite(id))
    ipcMain.handle('db:getFavorites', () => getFavorites())
    ipcMain.handle('db:addHistory', (_, query) => addHistory(query))
    ipcMain.handle('db:getHistory', () => getHistory())
    ipcMain.handle('db:addTranslation', (_, animeId, desc) => addTranslation(animeId, desc))
    ipcMain.handle('db:getTranslation', (_, animeId) => getTranslation(animeId))
    ipcMain.handle('db:addReviewSummary', (_, animeId, summary) => addReviewSummary(animeId, summary))
    ipcMain.handle('db:getReviewSummary', (_, animeId) => getReviewSummary(animeId))

    // Steam API Proxy IPC (Bypasses CORS for external APIs in Electron)
    ipcMain.handle('steam:fetch', async (_, url: string) => {
      try {
        const parsedUrl = new URL(url)
        const allowedDomains = ['store.steampowered.com', 'steamspy.com', 'api.steampowered.com']
        
        if (!allowedDomains.includes(parsedUrl.hostname)) {
          throw new Error('Niedozwolona domena w wywołaniu proxy steam:fetch')
        }

        // Use native fetch available in Node 18+
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Steam API HTTP error! status: ${response.status} from ${url}`)
        }
        return await response.json()
      } catch (error: any) {
        console.error('Steam API error:', error.message)
        throw error
      }
    })

    // AniList API Proxy IPC (Bypasses CORS for detailed rate limit error blocks 429)
    ipcMain.handle(
      'anilist:fetch',
      async (_, query: string, variables?: Record<string, any>) => {
        try {
          const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify({ query, variables })
          })

          if (!response.ok) {
            if (response.status === 429) {
               console.warn("AniList API Rate Limit (429) Exceeded in Main Process");
            }
            throw new Error(`AniList API error: ${response.statusText} (${response.status})`)
          }
          return await response.json()
        } catch (error: any) {
          console.error('AniList API Main Process error:', error.message)
          throw error
        }
      }
    )

    createWindow()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (err: any) {
    dialog.showErrorBox('Krytyczny Błąd Uruchamiania (Initialization)', `Błąd podczas ładowania modułów lub bazy danych:\n\n${err.message}\n\nStack:\n${err.stack}`)
    app.exit(1)
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
