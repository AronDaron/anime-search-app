import * as React from 'react'
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchAnime, AnimeMedia } from '../../api/anilist'
import { fetchAIAnimeTitles } from '../../api/ai'
import { NeonCard } from '../shared/NeonCard'
import '../shared/Grid.css'

interface SearchProps {
  searchQuery: string
  isAiMode: boolean
}

// Custom hook for debouncing input values
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export const Search: React.FC<SearchProps> = ({ searchQuery, isAiMode }) => {
  const [results, setResults] = useState<AnimeMedia[]>([])
  const [loading, setLoading] = useState(false)
  const debouncedSearchQuery = useDebounce(searchQuery, 400)
  const navigate = useNavigate()

  // Implement local caching for previously searched terms
  const searchCache = useMemo(() => new Map<string, AnimeMedia[]>(), [])

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedSearchQuery.trim()) {
        setResults([])
        return
      }

      const cacheKey = isAiMode ? `AI_${debouncedSearchQuery}` : debouncedSearchQuery

      // Check cache first
      if (searchCache.has(cacheKey)) {
        setResults(searchCache.get(cacheKey)!)
        return
      }

      setLoading(true)
      try {
        let fetchedResults: AnimeMedia[] = []

        if (isAiMode) {
          // Try fetch recommendations from AI using OpenRouter Key optionally provided in env.
          const apiKey = import.meta.env.VITE_OPENROUTER_KEY || ''
          if (!apiKey) {
            alert(
              'Brak klucza API. Ustal zmienną VITE_OPENROUTER_KEY w pliku .env w korzeniu projektu.'
            )
            setLoading(false)
            return
          }

          const { titles } = await fetchAIAnimeTitles(debouncedSearchQuery, apiKey)

          if (titles.length === 0) {
            setResults([])
            setLoading(false)
            return
          }

          const promises = titles.map((t) => searchAnime(t, 1, 1))
          const resolved = await Promise.all(promises)
          fetchedResults = resolved
            .filter((r) => r.Page.media.length > 0)
            .map((r) => r.Page.media[0])
        } else {
          const response = await searchAnime(debouncedSearchQuery)
          fetchedResults = response.Page.media
        }

        // Save to cache
        searchCache.set(cacheKey, fetchedResults)
        setResults(fetchedResults)

        // Save to local SQLite history
        window.api.db.addHistory(debouncedSearchQuery).catch(console.error)
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [debouncedSearchQuery, searchCache])

  if (!searchQuery.trim()) {
    return null // Don't render search section ifquery is empty.
  }

  return (
    <div className="view-container fade-in">
      <div className="view-header">
        <h2 className="view-title">
          Wyniki wyszukiwania dla <span className="neon-text-purple">"{searchQuery}"</span>
        </h2>
      </div>

      {loading && (
        <div className="loading-container" style={{ minHeight: '300px' }}>
          <div className="neon-spinner purple"></div>
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="empty-state">
          <p>Nie znaleziono anime dla: "{searchQuery}"</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="anime-grid">
          {results.map((anime) => (
            <NeonCard
              key={`search-${anime.id}`}
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
    </div>
  )
}
