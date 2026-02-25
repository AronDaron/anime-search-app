import * as React from 'react'
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Search as SearchIcon } from 'lucide-react'
import { searchAnime, AnimeMedia, MediaSeason } from '../../api/anilist'
import { NeonCard } from '../shared/NeonCard'
import '../shared/Grid.css'
import './FilterSearchView.css'

// Lista podstawowych gatunków z AniList
const AVAILABLE_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller'
]

// Helper do generowania lat zjazdowych (np od teraźniejszości do 1970)
const generateYears = (): number[] => {
  const currentYear = new Date().getFullYear() + 1 // +1 dla zapowiedzi
  const years: number[] = []
  for (let i = currentYear; i >= 1970; i--) {
    years.push(i)
  }
  return years
}

export const FilterSearchView: React.FC = () => {
  const navigate = useNavigate()

  // Stany filtrów
  const [searchText, setSearchText] = useState('')
  const [selectedSeason, setSelectedSeason] = useState<MediaSeason | ''>('')
  const [selectedYear, setSelectedYear] = useState<number | ''>('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])

  // Stany wyników
  const [results, setResults] = useState<AnimeMedia[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    )
  }

  const handleSearch = useCallback(async () => {
    setLoading(true)
    setHasSearched(true)
    try {
      // Konwertuj pustego stringa wyszukiwarki na undefined da prawidłowego query
      const safeSearch = searchText.trim() === '' ? undefined : searchText.trim()
      const safeSeason = selectedSeason === '' ? undefined : selectedSeason
      const safeYear = selectedYear === '' ? undefined : selectedYear
      const safeGenres = selectedGenres.length === 0 ? undefined : selectedGenres

      // Używamy zaktualizowanej funkcji searchAnime
      const response = await searchAnime(
        safeSearch,
        1, // page
        30, // perPage - pobierzmy więcej dla filtrowania
        safeSeason,
        safeYear,
        safeGenres,
        undefined // tags ukryte na razie w UI dla przejrzystości
      )

      setResults(response.Page.media)
    } catch (error) {
      console.error('Błąd podczas filtrowanego wyszukiwania:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [searchText, selectedSeason, selectedYear, selectedGenres])

  return (
    <div className="filter-search-layout fade-in">
      {/* Panel Boczny z Filtrami */}
      <aside className="filter-sidebar">
        <div className="filter-header">
          <h3 className="neon-text-cyan flex items-center gap-2">
            <Filter size={20} />
            Filtry Wyszukiwania
          </h3>
        </div>

        {/* Tekst */}
        <div className="filter-group">
          <label>Tytuł anime</label>
          <input
            type="text"
            className="filter-input"
            placeholder="np. Naruto, Attack on Titan..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        {/* Rok i Sezon */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="filter-group" style={{ flex: 1 }}>
            <label>Rok</label>
            <select
              className="filter-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Wszystkie</option>
              {generateYears().map((year) => (
                <option key={`y-${year}`} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group" style={{ flex: 1 }}>
            <label>Sezon</label>
            <select
              className="filter-select"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value as MediaSeason | '')}
            >
              <option value="">Wszystkie</option>
              <option value={MediaSeason.WINTER}>Zima</option>
              <option value={MediaSeason.SPRING}>Wiosna</option>
              <option value={MediaSeason.SUMMER}>Lato</option>
              <option value={MediaSeason.FALL}>Jesień</option>
            </select>
          </div>
        </div>

        {/* Gatunki Checkboxy */}
        <div className="filter-group">
          <label>Gatunki</label>
          <div className="genres-grid">
            {AVAILABLE_GENRES.map((genre) => (
              <label key={genre} className="genre-checkbox-label">
                <input
                  type="checkbox"
                  className="genre-checkbox-input"
                  checked={selectedGenres.includes(genre)}
                  onChange={() => handleGenreToggle(genre)}
                />
                <span>{genre}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Przycisk Akcji podpięty na sam dół panleu */}
        <button className="search-action-btn" onClick={handleSearch}>
          <SearchIcon size={18} />
          Szukaj Anime
        </button>
      </aside>

      {/* Obszar Wyników */}
      <main className="filter-results-area">
        <div className="filter-results-header">
          <h2>
            Wyniki Wyszukiwania{' '}
            {results.length > 0 && (
              <span style={{ fontSize: '1rem', color: '#888' }}>({results.length})</span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="loading-container" style={{ minHeight: '300px' }}>
            <div className="neon-spinner cyan"></div>
            <p style={{ marginTop: '1rem', color: '#888' }}>Przeszukiwanie bazy danych...</p>
          </div>
        ) : (
          <>
            {!hasSearched ? (
              <div className="empty-state">
                <Filter size={48} opacity={0.2} style={{ marginBottom: '1rem' }} />
                <h3>Wybierz filtry i kliknij "Szukaj Anime"</h3>
                <p>
                  Skorzystaj z panelu po lewej stronie, aby precyzyjniej przeglądać tysiące tytułów
                  z bazy.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <h3>Brak wyników</h3>
                <p>
                  Nie znaleziono anime spełniającego wybrane kryteria wyszukiwania. Spróbuj
                  złagodzić filtry.
                </p>
              </div>
            ) : (
              <div className="anime-grid">
                {results.map((anime) => (
                  <NeonCard
                    key={`filter-${anime.id}`}
                    anime={{
                      id: anime.id,
                      title: anime.title.english || anime.title.romaji,
                      coverImage: anime.coverImage.extraLarge,
                      averageScore: anime.averageScore || undefined,
                      seasonYear: anime.seasonYear || undefined,
                      episodes: anime.episodes || undefined
                    }}
                    onClick={() => navigate(`/anime/${anime.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
