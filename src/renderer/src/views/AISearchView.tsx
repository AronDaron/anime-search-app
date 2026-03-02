import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Sparkles, SlidersHorizontal, Search, AlertCircle } from 'lucide-react'
import { getAnimeByExactTitle, searchAnime, AnimeMedia } from '../api/anilist'
import { searchSteamGames, searchSteamGamesByGenre, getSteamGameExtendedStats } from '../api/steamStore'
import { fetchAIAnimeTitles, AISearchResult, fetchAIRerankedGames, CandidateGame } from '../api/ai'
import { ApiKeyService } from '../api/apiKeyService'
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
  const [searchStep, setSearchStep] = useState<string>('')

  // Use ApiKeyService to get the current key (from localStorage or .env)
  const apiKey = ApiKeyService.getOpenRouterKey()

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
      setSearchStep('Analizowanie Twojego zapytania...')
      const aiResult = await fetchAIAnimeTitles(fullPrompt, apiKey, domain)

      setAiParams(aiResult.searchParams || null)

      let combinedResults: AnimeMedia[] = []

      if (domain === 'anime') {
        // --- ANIME FLOW (Original) ---
        if (aiResult.titles && aiResult.titles.length > 0) {
          const titlePromises = aiResult.titles.map((title) => getAnimeByExactTitle(title))
          const titleResponses = await Promise.all(titlePromises)
          combinedResults = titleResponses.filter((item): item is AnimeMedia => item !== null)
        }

        if (aiResult.searchParams) {
          const yearToUse = manualYear ? parseInt(manualYear, 10) : aiResult.searchParams.seasonYear
          const seasonToUse = manualSeason ? (manualSeason as any) : undefined

          if ((aiResult.searchParams.genres?.length || aiResult.searchParams.tags?.length || yearToUse || seasonToUse)) {
            const advanced = await searchAnime(null, 1, 10, seasonToUse, yearToUse, aiResult.searchParams.genres, aiResult.searchParams.tags)
            const existingIds = new Set(combinedResults.map(a => a.id))
            const newUnique = advanced.Page.media.filter(a => !existingIds.has(a.id))
            combinedResults = [...combinedResults, ...newUnique]
          }
        }
      } else {
        // --- GAMES HYBRID FLOW (New) ---
        setSearchStep('Budowanie puli kandydatów ze Steam...')
        const candidatePool = new Map<number, any>()

        const filterGame = (g: any) => {
          if (!g || !g.id || !g.name) return false
          const nameLower = g.name.toLowerCase()
          const dlcKeywords = [
            'dlc', 'soundtrack', 'expansion', 'pass', 'pack', 'artbook', 'content',
            'bonus', 'upgrade', 'digital', 'bundle', 'krew i wino', 'serca z kamienia',
            'blood and wine', 'hearts of stone', 'premium', 'ost'
          ]
          const isDLC = dlcKeywords.some(kw => nameLower.includes(kw))
          const isFullGameEdition = nameLower.includes('complete') ||
            nameLower.includes('game of the year') ||
            nameLower.includes('definitive') ||
            nameLower.includes('edycja kompletna')
          if (isDLC && !isFullGameEdition) return false
          return true
        }

        // 1. Fetch by titles guessed by AI
        if (aiResult.titles && aiResult.titles.length > 0) {
          const titleResults = await Promise.all(aiResult.titles.map(t => searchSteamGames(t)))
          titleResults.flat().forEach(g => {
            if (filterGame(g)) candidatePool.set(g.id, g)
          })
        }

        // 2. Fetch by tags extracted by AI
        if (aiResult.searchParams?.tags || aiResult.searchParams?.genres) {
          const allTags = [...(aiResult.searchParams.genres || []), ...(aiResult.searchParams.tags || [])].slice(0, 3)
          const tagResults = await Promise.all(allTags.map(tag => searchSteamGamesByGenre(tag)))
          tagResults.flat().forEach(g => {
            if (filterGame(g)) candidatePool.set(g.id, g)
          })
        }

        // 3. Name-based deduplication
        const uniqueByName = new Map<string, any>()
        candidatePool.forEach((g) => {
          const baseName = g.name.split(/ - |: /)[0].trim().toLowerCase()
          if (!uniqueByName.has(baseName) || g.name.length < uniqueByName.get(baseName).name.length) {
            uniqueByName.set(baseName, g)
          }
        })

        let candidates = Array.from(uniqueByName.values()).slice(0, 40)

        // 3. AI Reranking Phase
        if (candidates.length > 0) {
          setSearchStep(`Weryfikowanie ${candidates.length} kandydatów przez AI...`)

          // Pobieramy tagi dla kandydatów (część ich może nie mieć z prostego searcha)
          const candidateData: CandidateGame[] = await Promise.all(candidates.map(async (c) => {
            // Próbujemy pobrać tagi ze SteamSpy jeśli ich brakuje
            const stats = await getSteamGameExtendedStats(c.id)
            return {
              id: c.id,
              name: c.name,
              tags: stats?.tags ? Object.keys(stats.tags).slice(0, 10) : []
            }
          }))

          const rankedIds = await fetchAIRerankedGames(query, candidateData, apiKey)

          // Sort candidates by AI rank
          const rankedResults = rankedIds
            .map(id => candidates.find(c => c.id.toString() === id.toString()))
            .filter((c): c is any => !!c)

          // Fallback if AI fails to return enough
          const finalSet = [...rankedResults]
          if (finalSet.length < 5) {
            candidates.slice(0, 5).forEach(c => {
              if (!finalSet.find(f => f.id === c.id)) finalSet.push(c)
            })
          }

          combinedResults = finalSet.slice(0, 12).map(g => {
            const appId = g.id.toString()
            // Use vertical library capsule for Steam games (2:3 aspect ratio) which matches NeonCard
            const verticalCover = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`
            // Fallback 1: horizontal header
            const horizontalFallback = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
            // Fallback 2: capsule_616x353
            const secondFallback = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg`

            return {
              id: g.id,
              title: { romaji: g.name, english: g.name, native: g.name },
              coverImage: {
                extraLarge: verticalCover,
                large: verticalCover,
                medium: verticalCover,
                color: ''
              },
              fallbackImage: horizontalFallback,
              secondFallback: secondFallback, // We'll add this to NeonCard too
              averageScore: 0,
              seasonYear: 0,
              episodes: 0
            } as any
          })
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Szukanie...</span>
                      <span style={{ fontSize: '10px', opacity: 0.8, whiteSpace: 'nowrap' }}>{searchStep}</span>
                    </div>
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
            {results.map((item: any, index) => (
              <NeonCard
                key={`${item.id}-${index}`}
                anime={{
                  id: item.id,
                  title: item.title.english || item.title.romaji,
                  coverImage: item.coverImage.extraLarge,
                  fallbackImage: item.fallbackImage, // Pass the fallback image
                  averageScore: item.averageScore || undefined,
                  seasonYear: item.seasonYear || undefined,
                  episodes: item.episodes || undefined
                }}
                onClick={() => navigate(`/${domain === 'games' ? 'games' : 'anime'}/${item.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
