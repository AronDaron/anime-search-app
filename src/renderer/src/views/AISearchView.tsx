import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Sparkles, SlidersHorizontal, Search, AlertCircle } from 'lucide-react'
import { fetchAIAnimeTitles, AISearchResult } from '../api/ai'
import { getAnimeByExactTitle, searchAnime, AnimeMedia } from '../api/anilist'
import { searchSteamGames } from '../api/steamStore'
import { NeonCard } from '../components/shared/NeonCard'
import './AISearchView.css'
import '../components/shared/Grid.css'

export interface AISearchViewProps {
  domain?: 'anime' | 'games'
}

export const AISearchView: React.FC<AISearchViewProps> = ({ domain = 'anime' }) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<AnimeMedia[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [aiParams, setAiParams] = useState<AISearchResult['searchParams'] | null>(null)

  const [apiKey] = useState(
    import.meta.env.VITE_OPENROUTER_KEY || localStorage.getItem('openRouterApiKey') || ''
  )

  // Explicit manual filters that override AI if set
  const [manualYear, setManualYear] = useState<string>('')
  const [manualSeason, setManualSeason] = useState<string>('')

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!query.trim()) return

    if (!apiKey) {
      setError('Brak klucza API OpenRouter. Dodaj go w ustawieniach (Settings).')
      return
    }

    setIsSearching(true)
    setError(null)
    setResults([])
    setAiParams(null)

    try {
      // Include manual filters in the prompt context to help reasoning
      let fullPrompt = query
      if (manualYear || manualSeason) {
        fullPrompt += `\n\nAdditional constraints: `
        if (manualYear) fullPrompt += `Year MUST be exactly ${manualYear}. `
        if (manualSeason) fullPrompt += `Season MUST be exactly ${manualSeason}.`
      }

      console.log(`Wysyłanie zapytania do AI (${domain}):`, fullPrompt)
      const aiResult = await fetchAIAnimeTitles(fullPrompt, apiKey, domain)

      setAiParams(aiResult.searchParams || null)

      let combinedResults: AnimeMedia[] = []

      // 1. Fetch exact titles guessed by AI
      if (aiResult.titles && aiResult.titles.length > 0) {
        console.log('AI wytypowało tytuły:', aiResult.titles)

        if (domain === 'anime') {
          const titlePromises = aiResult.titles.map((title) => getAnimeByExactTitle(title))
          const titleResponses = await Promise.all(titlePromises)

          const validAnimes = titleResponses.filter((item): item is AnimeMedia => item !== null)
          combinedResults = [...validAnimes]
        } else {
          // Pobieramy dane ze Steam dla każdego tytułu AI
          const gamePromises = aiResult.titles.map((title) => searchSteamGames(title))
          const gameResponses = await Promise.all(gamePromises)

          const validGames = gameResponses
            .map((res) => (res && res.length > 0 ? res[0] : null))
            .filter((item): item is any => item !== null)

          combinedResults = validGames.map(
            (g) =>
              ({
                id: g.id,
                title: { romaji: g.name, english: g.name, native: g.name },
                coverImage: { extraLarge: g.large_capsule_image, large: g.large_capsule_image, medium: g.small_capsule_image, color: '' },
                averageScore: 0,
                seasonYear: 0,
                episodes: 0
              }) as unknown as AnimeMedia
          )
        }
      }

      // 2. Supplement with advanced search based on extracted parameters
      if (aiResult.searchParams && domain === 'anime') {
        console.log('Wyszukiwanie uzupełniające po tagach:', aiResult.searchParams)

        const yearToUse = manualYear ? parseInt(manualYear, 10) : aiResult.searchParams.seasonYear
        const seasonToUse = manualSeason ? (manualSeason as any) : undefined

        if (
          (aiResult.searchParams.genres && aiResult.searchParams.genres.length > 0) ||
          (aiResult.searchParams.tags && aiResult.searchParams.tags.length > 0) ||
          yearToUse ||
          seasonToUse
        ) {
          try {
            const advancedSearchResults = await searchAnime(
              null, // no specific text search
              1,
              10, // Max 10 tag results
              seasonToUse,
              yearToUse,
              aiResult.searchParams.genres,
              aiResult.searchParams.tags
            )

            if (advancedSearchResults.Page.media.length > 0) {
              // Avoid duplicates by ID
              const existingIds = new Set(combinedResults.map((a) => a.id))
              const newUnique = advancedSearchResults.Page.media.filter(
                (a) => !existingIds.has(a.id)
              )
              combinedResults = [...combinedResults, ...newUnique]
            }
          } catch (tagErr) {
            console.error('Błąd wyszukiwania po tagach:', tagErr)
          }
        }
      }

      if (combinedResults.length === 0) {
        setError(
          'Nie znaleziono żadnych pasujących anime. Spróbuj sformułować opis inaczej lub zmniejszyć liczbę filtrów.'
        )
      } else {
        setResults(combinedResults)
      }
    } catch (err: any) {
      console.error('AI Search Error:', err)
      setError(err.message || 'Wystąpił nieznany błąd podczas wyszukiwania.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="ai-search-container fade-in">
      <div className="ai-header">
        <div className="ai-icon-wrapper">
          <Bot size={48} />
        </div>
        <h1 className="ai-title">Neon AI {domain === 'games' ? 'Game' : 'Anime'} Search</h1>
        <p className="ai-subtitle">
          {domain === 'games' ? (
            <>
              Opisz grę, której szukasz (np.{' '}
              <span className="highlight-cyan">"Dynamiczny RPG w świecie cyberpunka"</span> lub{' '}
              <span className="highlight-pink">"Relaksująca gra o budowaniu farmy"</span>). Sztuczna
              inteligencja przeanalizuje Twoje zapytanie i przeszuka bazę Steam.
            </>
          ) : (
            <>
              Opisz anime, którego szukasz (np.{' '}
              <span className="highlight-pink">"Wampiry i akcja z lat 90"</span> lub{' '}
              <span className="highlight-cyan">"Nowość o magii ze świetną animacją"</span>). Sztuczna
              inteligencja przeanalizuje Twoje zapytanie i przeszuka bazę danych.
            </>
          )}
        </p>
      </div>

      <div className="ai-search-box">
        <div className="ai-search-inner">
          <form onSubmit={handleSearch}>
            <div className="ai-textarea-wrapper">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  domain === 'games'
                    ? 'Np. RPG akcji z otwartym światem, gdzie walczymy z potworami w mrocznym fantasy...'
                    : 'Np. Głównego bohatera reinkarnuje do świata fantasy jako najsilniejszy szlam...'
                }
                className="ai-textarea"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
              />
              <div className="ai-textarea-hint">Naciśnij Enter, aby szukać</div>
            </div>

            <div className="ai-controls">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="ai-advanced-toggle"
              >
                <SlidersHorizontal size={16} />
                Zaawansowane opcje
              </button>

              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="ai-submit-btn"
              >
                {isSearching ? (
                  <>
                    <div
                      className={`neon-spinner ${domain === 'games' ? 'green' : 'purple'}`}
                      style={{ width: '20px', height: '20px', borderWidth: '2px' }}
                    ></div>
                    <span>Analizowanie...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Szukaj (AI)</span>
                  </>
                )}
              </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="ai-filters-panel">
                    <div className="ai-filter-group">
                      <label className="ai-filter-label">Wymuś Rok (Opcjonalnie)</label>
                      <input
                        type="number"
                        value={manualYear}
                        onChange={(e) => setManualYear(e.target.value)}
                        placeholder="np. 2024"
                        className="ai-filter-input"
                      />
                      <p className="ai-filter-hint">
                        AI zignoruje rok z tekstu, jeśli to wypełnisz.
                      </p>
                    </div>
                    {domain === 'anime' && (
                      <div className="ai-filter-group">
                        <label className="ai-filter-label">Wymuś Sezon (Opcjonalnie)</label>
                        <select
                          value={manualSeason}
                          onChange={(e) => setManualSeason(e.target.value)}
                          className="ai-filter-select"
                        >
                          <option value="">Wszystkie (Zgadywane przez AI)</option>
                          <option value="WINTER">Zima</option>
                          <option value="SPRING">Wiosna</option>
                          <option value="SUMMER">Lato</option>
                          <option value="FALL">Jesień</option>
                        </select>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>

      {error && (
        <div className="ai-error-box fade-in">
          <AlertCircle className="ai-error-icon" size={24} />
          <p>{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="fade-in">
          <div className="ai-results-header">
            <h2 className="ai-results-title">
              <Search className="ai-results-icon" size={24} />
              Wyniki Analizy
              <span className="ai-results-count">{results.length} tytułów</span>
            </h2>

            {aiParams && (
              <div className="ai-tags-list">
                {aiParams.genres &&
                  aiParams.genres.map((g) => (
                    <span key={g} className="ai-tag">
                      {g}
                    </span>
                  ))}
                {aiParams.seasonYear && (
                  <span className="ai-tag year">Rocznik: {aiParams.seasonYear}</span>
                )}
              </div>
            )}
          </div>

          <div className="anime-grid">
            {results.map((anime, index) => (
              <NeonCard
                key={`${anime.id}-${index}`}
                anime={{
                  id: anime.id,
                  title: anime.title.english || anime.title.romaji,
                  coverImage: anime.coverImage.extraLarge,
                  averageScore: anime.averageScore || undefined,
                  seasonYear: anime.seasonYear || undefined,
                  episodes: anime.episodes || undefined
                }}
                onClick={() => navigate(`/${domain === 'games' ? 'games' : 'anime'}/${anime.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
