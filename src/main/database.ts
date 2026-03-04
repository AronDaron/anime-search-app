import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

const dbPath = path.join(app.getPath('userData'), 'neo-search.db')
const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    coverImage TEXT NOT NULL,
    status TEXT DEFAULT 'PLANNING',
    score INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    addedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS history (
    searchQuery TEXT PRIMARY KEY,
    searchedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS translations (
    animeId INTEGER PRIMARY KEY,
    description_pl TEXT NOT NULL,
    translatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS review_summaries (
    animeId INTEGER PRIMARY KEY,
    summary_pl TEXT NOT NULL,
    generatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// Safe schema migrations for older local databases
try {
  db.exec(`ALTER TABLE favorites ADD COLUMN status TEXT DEFAULT 'PLANNING'`)
} catch (e: any) {
  // Ignore if column exists 
  if (!e.message.includes('duplicate column name')) console.error(e)
}

try {
  db.exec(`ALTER TABLE favorites ADD COLUMN score INTEGER DEFAULT 0`)
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) console.error(e)
}

try {
  db.exec(`ALTER TABLE favorites ADD COLUMN progress INTEGER DEFAULT 0`)
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) console.error(e)
}

try {
  db.exec(`ALTER TABLE favorites ADD COLUMN genres TEXT`)
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) console.error(e)
}

export const addFavorite = (anime: { id: number; title: string; coverImage: string; genres?: string }) => {
  // Use INSERT OR IGNORE to not overwrite existing statuses/scores if the anime is already in favs
  // If we want to allow updating coverImage/title, we could use INSERT ... ON CONFLICT(id) DO UPDATE ...
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO favorites (id, title, coverImage, status, score, progress, genres) VALUES (@id, @title, @coverImage, 'PLANNING', 0, 0, @genres)"
  )
  return stmt.run(anime)
}

export const removeFavorite = (id: number) => {
  const stmt = db.prepare('DELETE FROM favorites WHERE id = ?')
  return stmt.run(id)
}

export const getFavorites = () => {
  const stmt = db.prepare('SELECT * FROM favorites ORDER BY addedAt DESC')
  return stmt.all()
}

export const updateFavoriteDetails = (
  id: number,
  status: string,
  score: number,
  progress: number
) => {
  const stmt = db.prepare(
    'UPDATE favorites SET status = ?, score = ?, progress = ? WHERE id = ?'
  )
  return stmt.run(status, score, progress, id)
}

export const addHistory = (query: string) => {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO history (searchQuery, searchedAt) VALUES (?, CURRENT_TIMESTAMP)'
  )
  return stmt.run(query)
}

export const getHistory = () => {
  const stmt = db.prepare('SELECT * FROM history ORDER BY searchedAt DESC LIMIT 20')
  return stmt.all()
}

export const addTranslation = (animeId: number, description_pl: string) => {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO translations (animeId, description_pl) VALUES (?, ?)'
  )
  return stmt.run(animeId, description_pl)
}

export const getTranslation = (animeId: number) => {
  const stmt = db.prepare('SELECT description_pl FROM translations WHERE animeId = ?')
  return stmt.get(animeId)
}

export const addReviewSummary = (animeId: number, summary_pl: string) => {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO review_summaries (animeId, summary_pl) VALUES (?, ?)'
  )
  return stmt.run(animeId, summary_pl)
}

export const getReviewSummary = (animeId: number) => {
  const stmt = db.prepare('SELECT summary_pl FROM review_summaries WHERE animeId = ?')
  return stmt.get(animeId)
}
