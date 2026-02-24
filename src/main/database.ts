import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

const dbPath = path.join(app.getPath('userData'), 'neo-search.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    coverImage TEXT NOT NULL,
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
`);

export const addFavorite = (anime: { id: number, title: string, coverImage: string }) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO favorites (id, title, coverImage) VALUES (@id, @title, @coverImage)');
    return stmt.run(anime);
};

export const removeFavorite = (id: number) => {
    const stmt = db.prepare('DELETE FROM favorites WHERE id = ?');
    return stmt.run(id);
};

export const getFavorites = () => {
    const stmt = db.prepare('SELECT * FROM favorites ORDER BY addedAt DESC');
    return stmt.all();
};

export const addHistory = (query: string) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO history (searchQuery, searchedAt) VALUES (?, CURRENT_TIMESTAMP)');
    return stmt.run(query);
};

export const getHistory = () => {
    const stmt = db.prepare('SELECT * FROM history ORDER BY searchedAt DESC LIMIT 20');
    return stmt.all();
};

export const addTranslation = (animeId: number, description_pl: string) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO translations (animeId, description_pl) VALUES (?, ?)');
    return stmt.run(animeId, description_pl);
};

export const getTranslation = (animeId: number) => {
    const stmt = db.prepare('SELECT description_pl FROM translations WHERE animeId = ?');
    return stmt.get(animeId);
};
