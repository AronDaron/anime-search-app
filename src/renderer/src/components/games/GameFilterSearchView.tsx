import * as React from 'react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Search as SearchIcon, Loader2 } from 'lucide-react'
import { searchSteamGames, searchSteamGamesByGenre } from '../../api/steamStore'
import { GameCard, GameData } from './GameCard'
import '../shared/Grid.css'
import '../anime/FilterSearchView.css' // Base layout styles
import './GameFilterSearchView.css'   // Specialized game filter styles

import { GAME_GENRES } from '../../constants/gameGenres'

const INITIAL_DISPLAY_LIMIT = 40
const SCROLL_INCREMENT = 20

export const GameFilterSearchView: React.FC = () => {
    const navigate = useNavigate()

    // Stany filtrów
    const [searchText, setSearchText] = useState('')
    const [selectedGenres, setSelectedGenres] = useState<string[]>(['Action'])

    // Cena: min i max
    const [minPrice, setMinPrice] = useState<number>(0)
    const [maxPrice, setMaxPrice] = useState<number>(500)

    // Rok: min i max
    const [minYear, setMinYear] = useState<number>(2000)
    const [maxYear, setMaxYear] = useState<number>(new Date().getFullYear())

    // Stany wyników i wydajności
    const [allFilteredResults, setAllFilteredResults] = useState<GameData[]>([])
    const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_LIMIT)
    const [loading, setLoading] = useState(false)
    const [loadingProgress, setLoadingProgress] = useState('')

    // Cache i Refy
    const genreCache = useRef<Record<string, any[]>>({})
    const loaderRef = useRef<HTMLDivElement>(null)

    const toggleGenre = (genreId: string) => {
        setSelectedGenres(prev =>
            prev.includes(genreId)
                ? prev.filter(id => id !== genreId)
                : [...prev, genreId]
        )
    }

    const handleSearch = useCallback(async () => {
        setLoading(true)
        setLoadingProgress('Przeszukiwanie bazy Steam...')
        setDisplayLimit(INITIAL_DISPLAY_LIMIT)

        try {
            let baseGames: any[] = []

            if (searchText.trim()) {
                setLoadingProgress(`Szukanie: ${searchText}...`)
                baseGames = await searchSteamGames(searchText.trim())
            } else if (selectedGenres.length > 0) {
                // MASOWE POBIERANIE (DEEP FETCH)
                const allFetched: any[] = []
                const genresToFetch = [...selectedGenres]

                for (let i = 0; i < genresToFetch.length; i++) {
                    const genre = genresToFetch[i]
                    setLoadingProgress(`Gatunek: ${genre} (${i + 1}/${genresToFetch.length})...`)

                    if (!genreCache.current[genre]) {
                        genreCache.current[genre] = await searchSteamGamesByGenre(genre)
                    }
                    allFetched.push(...genreCache.current[genre])
                }

                // Usuwanie duplikatów po AppID
                const uniqueItems = new Map()
                allFetched.forEach(item => {
                    const id = item.id || item.appid
                    if (!uniqueItems.has(id)) uniqueItems.set(id, item)
                })
                baseGames = Array.from(uniqueItems.values())
            } else {
                baseGames = await searchSteamGamesByGenre('Action')
            }

            // Mapowanie i Filtrowanie
            const mappedGames: GameData[] = baseGames.map((item: any) => {
                const appId = parseInt(item.id || item.appid || '0')
                let priceInPln = (item.final_price || item.price || 0) / 100

                if (item.currency === 'USD') priceInPln = priceInPln * 4

                // Szacowanie roku produkcji
                let estimatedYear = 2015
                if (appId < 100000) estimatedYear = 2004 + Math.floor(appId / 15000)
                else if (appId < 300000) estimatedYear = 2010 + Math.floor((appId - 100000) / 40000)
                else if (appId < 600000) estimatedYear = 2014 + Math.floor((appId - 300000) / 60000)
                else if (appId < 1500000) estimatedYear = 2018 + Math.floor((appId - 600000) / 150000)
                else estimatedYear = 2023 + Math.floor((appId - 1500000) / 300000)

                return {
                    id: appId.toString(),
                    title: item.name,
                    capsuleImage: item.large_capsule_image || item.small_capsule_image || item.header_image,
                    price: priceInPln,
                    originalPrice: item.original_price ? (item.currency === 'USD' ? item.original_price * 4 / 100 : item.original_price / 100) : undefined,
                    discountPercent: item.discount_percent || 0,
                    tags: item.tags || [],
                    osWindows: item.windows_available ?? true,
                    releaseYear: Math.min(estimatedYear, 2026)
                }
            })

            // Filtrowanie zakresów
            const filtered = mappedGames.filter((g) => {
                const p = g.price ?? 0
                const y = (g as any).releaseYear ?? 2020
                return p >= minPrice && (maxPrice === 500 ? true : p <= maxPrice) &&
                    y >= minYear && y <= maxYear
            }).sort((a, b) => parseInt(b.id.toString()) - parseInt(a.id.toString()))

            setAllFilteredResults(filtered)
        } catch (error) {
            console.error('Błąd wyszukiwania:', error)
            setAllFilteredResults([])
        } finally {
            setLoading(false)
            setLoadingProgress('')
        }
    }, [searchText, selectedGenres, minPrice, maxPrice, minYear, maxYear])

    // Infinite Scroll Logic with IntersectionObserver
    useEffect(() => {
        if (!loaderRef.current) return

        const observer = new IntersectionObserver((entries) => {
            const first = entries[0]
            if (first.isIntersecting && allFilteredResults.length > displayLimit) {
                setDisplayLimit(prev => prev + SCROLL_INCREMENT)
            }
        }, { threshold: 0.1 })

        observer.observe(loaderRef.current)
        return () => observer.disconnect()
    }, [allFilteredResults.length, displayLimit])

    // Automatyczne wyszukiwanie przy każdej zmianie filtrów
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch()
        }, 400)

        return () => clearTimeout(timer)
    }, [searchText, selectedGenres, minPrice, maxPrice, minYear, maxYear, handleSearch])

    const visibleResults = allFilteredResults.slice(0, displayLimit)

    return (
        <div className="filter-search-layout theme-games fade-in">
            <aside className="filter-sidebar">
                <div className="filter-header">
                    <h3 className="neon-text-green flex items-center gap-2">
                        <Filter size={20} />
                        Filtry Gier
                    </h3>
                </div>

                <div className="filter-group">
                    <label>Tytuł gry</label>
                    <input
                        type="text"
                        className="filter-input"
                        placeholder="Szukaj na Steam..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <label>Gatunki (Multi-Select)</label>
                    <div className="genre-chips">
                        {GAME_GENRES.map((g) => (
                            <div
                                key={g.id}
                                className={`genre-chip ${selectedGenres.includes(g.id) ? 'active' : ''}`}
                                onClick={() => toggleGenre(g.id)}
                            >
                                {g.label}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="filter-group">
                    <label>Cena: {minPrice} - {maxPrice === 500 ? 'Bez limitu' : `${maxPrice} zł`}</label>
                    <div className="range-container">
                        <div className="range-inputs">
                            <input
                                type="range" min="0" max="500" step="10" value={minPrice}
                                onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice - 10))}
                            />
                            <input
                                type="range" min="0" max="500" step="10" value={maxPrice}
                                onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice + 10))}
                            />
                        </div>
                    </div>
                </div>

                <div className="filter-group">
                    <label>Rok: {minYear} - {maxYear}</label>
                    <div className="range-container">
                        <div className="range-inputs">
                            <input
                                type="range" min="2000" max="2026" value={minYear}
                                onChange={(e) => setMinYear(Math.min(Number(e.target.value), maxYear - 1))}
                            />
                            <input
                                type="range" min="2000" max="2026" value={maxYear}
                                onChange={(e) => setMaxYear(Math.max(Number(e.target.value), minYear + 1))}
                            />
                        </div>
                    </div>
                </div>

                <button
                    className={`search-action-btn ${loading ? 'loading' : ''}`}
                    onClick={handleSearch}
                    disabled={loading}
                    style={{ background: 'linear-gradient(45deg, #00ff80, #0080ff)' }}
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <SearchIcon size={18} />}
                    Szukaj Gier
                </button>
            </aside>

            <main className="filter-results-area">
                <div className="filter-results-header">
                    <h2>
                        {searchText.trim() ? `Wyniki dla: "${searchText}"` : `Wyniki filtrów`}
                        {' '}
                        {allFilteredResults.length > 0 && (
                            <span className="results-count">({allFilteredResults.length})</span>
                        )}
                    </h2>
                </div>

                {loading ? (
                    <div className="loading-container" style={{ minHeight: '300px' }}>
                        <div className="neon-spinner green"></div>
                        <p style={{ marginTop: '1.5rem', color: '#00ff80' }}>{loadingProgress}</p>
                        <p style={{ marginTop: '0.5rem', color: '#888', fontSize: '0.9rem' }}>Pobieranie tysięcy gier ze SteamSpy...</p>
                    </div>
                ) : (
                    <div className="games-grid">
                        {allFilteredResults.length === 0 ? (
                            <div
                                className="empty-state"
                                style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}
                            >
                                <h3>Brak wyników</h3>
                                <p>Zmień parametry zakresu lub dodaj więcej gatunków.</p>
                            </div>
                        ) : (
                            <>
                                {visibleResults.map((game) => (
                                    <div key={game.id} className="game-card-wrapper">
                                        <GameCard game={game} onClick={() => navigate(`/games/${game.id}`)} />
                                    </div>
                                ))}
                                {/* Sentinel for Infinite Scroll */}
                                <div
                                    ref={loaderRef}
                                    style={{
                                        gridColumn: '1/-1',
                                        height: '50px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        opacity: displayLimit >= allFilteredResults.length ? 0 : 1
                                    }}
                                >
                                    {displayLimit < allFilteredResults.length && (
                                        <div className="neon-spinner green" style={{ width: '20px', height: '20px' }}></div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
