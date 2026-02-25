import * as React from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { NeonCard } from '../shared/NeonCard'
import { searchAnime, AnimeMedia, MediaSeason } from '../../api/anilist'
import '../shared/Grid.css'

const SEASONS: { label: string; value: MediaSeason }[] = [
  { label: 'Wiosna', value: MediaSeason.SPRING },
  { label: 'Lato', value: MediaSeason.SUMMER },
  { label: 'Jesień', value: MediaSeason.FALL },
  { label: 'Zima', value: MediaSeason.WINTER }
]

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1 // 1-12

let initialSeason = MediaSeason.WINTER
if (currentMonth >= 3 && currentMonth <= 5) initialSeason = MediaSeason.SPRING
else if (currentMonth >= 6 && currentMonth <= 8) initialSeason = MediaSeason.SUMMER
else if (currentMonth >= 9 && currentMonth <= 11) initialSeason = MediaSeason.FALL

const YEARS = Array.from({ length: 30 }, (_, i) => currentYear + 1 - i) // Od przyszłego roku w dół

export const SeasonsView: React.FC = () => {
  const [selectedSeason, setSelectedSeason] = useState<MediaSeason>(initialSeason)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [results, setResults] = useState<AnimeMedia[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchSeasonData = async () => {
      setLoading(true)
      try {
        // search?: string | null, page = 1, perPage = 20, season?: MediaSeason, seasonYear?: number, genres?: string[]
        const response = await searchAnime(null, 1, 30, selectedSeason, selectedYear)
        setResults(response.Page.media)
      } catch (error) {
        console.error('Failed to load season data', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSeasonData()
  }, [selectedSeason, selectedYear])

  return (
    <div className="view-container fade-in">
      <div className="view-header">
        <h2 className="view-title">
          Sezony <span className="neon-text-cyan">Anime</span>
        </h2>
      </div>

      <div
        className="filters-container glass-panel"
        style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          borderRadius: '12px',
          display: 'flex',
          gap: '2rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        {/* Przyciski sezonów */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {SEASONS.map((season) => (
            <button
              key={season.value}
              onClick={() => setSelectedSeason(season.value)}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '8px',
                border: `1px solid ${selectedSeason === season.value ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)'}`,
                background:
                  selectedSeason === season.value ? 'rgba(0, 255, 255, 0.15)' : 'transparent',
                color:
                  selectedSeason === season.value ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontWeight: 500
              }}
            >
              {season.label}
            </button>
          ))}
        </div>

        {/* Wybór roku */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Wybierz rok:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              outline: 'none',
              fontSize: '1rem',
              minWidth: '100px'
            }}
          >
            {YEARS.map((year) => (
              <option key={year} value={year} style={{ background: '#111' }}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-container" style={{ minHeight: '300px' }}>
          <div className="neon-spinner cyan"></div>
        </div>
      ) : (
        <>
          {results.length === 0 ? (
            <div className="empty-state">
              <p>
                Nie odnaleziono anime dla {SEASONS.find((s) => s.value === selectedSeason)?.label}{' '}
                {selectedYear}.
              </p>
            </div>
          ) : (
            <div className="anime-grid">
              {results.map((anime) => (
                <NeonCard
                  key={anime.id}
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
    </div>
  )
}
