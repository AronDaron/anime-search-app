import * as React from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Loader2, DollarSign, TrendingUp, Sparkles } from 'lucide-react'
import { GameCard, GameData } from './GameCard'
import { getSteamStoreFeaturedCategories, getSteamSpyByTag, searchSteamGamesByGenre, SteamFeaturedCategoryItem } from '../../api/steamStore'
import '../shared/Grid.css'
import './GamesPriceTieredView.css'

interface GamesPriceTieredViewProps {
    title: string
    categoryType: 'new' | 'deals'
}

import { GAME_GENRES as ALL_GENRES } from '../../constants/gameGenres'

const GAME_GENRES = [
    { label: 'Wszystkie', id: 'All' },
    ...ALL_GENRES
]

const INITIAL_LOAD_COUNT = 20
const SCROLL_STEP = 15

// Sub-komponent dla pojedynczej kolumny cenowej z własnym Infinite Scroll
const PriceTierColumn: React.FC<{
    title: string
    icon: React.ReactNode
    games: GameData[]
    colorClass: string
    onCardClick: (id: string | number) => void
}> = ({ title, icon, games, colorClass, onCardClick }) => {
    const [displayLimit, setDisplayLimit] = useState(INITIAL_LOAD_COUNT)
    const loaderRef = useRef<HTMLDivElement>(null)

    // Resetuj limit wyświetlania gdy zmienia się zestaw gier (np. zmiana gatunku)
    useEffect(() => {
        setDisplayLimit(INITIAL_LOAD_COUNT)
    }, [games])

    useEffect(() => {
        if (!loaderRef.current) return

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && displayLimit < games.length) {
                setDisplayLimit(prev => prev + SCROLL_STEP)
            }
        }, { threshold: 0.1, rootMargin: '100px' })

        observer.observe(loaderRef.current)
        return () => observer.disconnect()
    }, [displayLimit, games.length])

    const visibleGames = games.slice(0, displayLimit)

    return (
        <div className={`price-tier-column ${colorClass}`}>
            <div className="tier-header">
                {icon}
                <h3>{title}</h3>
                <span className="tier-count">{games.length}</span>
            </div>
            <div className="tier-scroll-area">
                {visibleGames.length > 0 ? (
                    <>
                        {visibleGames.map(game => (
                            <div key={game.id} className="game-card-compact-wrapper">
                                <GameCard game={game} onClick={() => onCardClick(game.id)} />
                            </div>
                        ))}
                        {displayLimit < games.length && (
                            <div ref={loaderRef} className="tier-loader-sentinel">
                                <div className="mini-spinner"></div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-tier">Brak gier w tej cenie</div>
                )}
            </div>
        </div>
    )
}

export const GamesPriceTieredView: React.FC<GamesPriceTieredViewProps> = ({ title, categoryType }) => {
    const navigate = useNavigate()
    const [selectedGenre, setSelectedGenre] = useState('All')
    const [games, setGames] = useState<GameData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchGames = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            let allItems: SteamFeaturedCategoryItem[] = []

            if (selectedGenre === 'All') {
                if (categoryType === 'new') {
                    const featured = await getSteamStoreFeaturedCategories()
                    const storeGames = featured?.new_releases?.items || []
                    const spyNew = await getSteamSpyByTag('newreleases')
                    allItems = [...storeGames, ...spyNew]
                } else {
                    const featured = await getSteamStoreFeaturedCategories()
                    const storeSpecials = featured?.specials?.items || []
                    const spySpecials = await getSteamSpyByTag('specials')
                    allItems = [...storeSpecials, ...spySpecials]
                }
            } else {
                const genreGames = await searchSteamGamesByGenre(selectedGenre)
                if (categoryType === 'deals') {
                    allItems = genreGames.filter(item => item.discounted || item.discount_percent > 0)
                } else {
                    allItems = genreGames.sort((a, b) => b.id - a.id).slice(0, 500)
                }
            }

            const uniqueMap = new Map<number, SteamFeaturedCategoryItem>()
            allItems.forEach(item => {
                if (item && item.id) uniqueMap.set(item.id, item)
            })

            const mappedGames: GameData[] = Array.from(uniqueMap.values()).map(item => {
                let priceInPln = item.final_price ? item.final_price / 100 : 0
                if (item.currency === 'USD') priceInPln *= 4

                return {
                    id: item.id.toString(),
                    title: item.name || 'Nieznany Tytuł',
                    capsuleImage: item.large_capsule_image || item.header_image || '',
                    price: priceInPln,
                    originalPrice: item.original_price ? (item.currency === 'USD' ? item.original_price * 4 / 100 : item.original_price / 100) : undefined,
                    discountPercent: item.discount_percent || 0,
                    tags: [],
                    osWindows: item.windows_available ?? true
                }
            })

            setGames(mappedGames)
        } catch (err) {
            console.error('Error fetching games:', err)
            setError('Nie udało się pobrać gier. Spróbuj ponownie później.')
        } finally {
            setLoading(false)
        }
    }, [categoryType, selectedGenre])

    useEffect(() => {
        fetchGames()
    }, [fetchGames])

    const tier1 = games.filter(g => (g.price ?? 0) <= 30)
    const tier2 = games.filter(g => (g.price ?? 0) > 30 && (g.price ?? 0) <= 60)
    const tier3 = games.filter(g => (g.price ?? 0) > 60)

    const handleCardClick = (id: string | number) => navigate(`/games/${id}`)

    return (
        <div className="price-tiered-layout fade-in">
            <header className="price-tiered-header">
                <div className="header-main">
                    <h1>{title}</h1>
                    <div className="genre-filter-row">
                        <Filter size={18} className="filter-icon" />
                        <div className="genre-chips-scroll">
                            {GAME_GENRES.map(genre => (
                                <button
                                    key={genre.id}
                                    className={`genre-chip-mini ${selectedGenre === genre.id ? 'active' : ''}`}
                                    onClick={() => setSelectedGenre(genre.id)}
                                >
                                    {genre.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="tiered-loading">
                    <Loader2 className="animate-spin" size={48} />
                    <p>Wczytywanie i kategoryzacja gier...</p>
                </div>
            ) : error ? (
                <div className="tiered-error">{error}</div>
            ) : (
                <div className="price-tiers-container">
                    <PriceTierColumn
                        title="Okazje do 30 PLN"
                        icon={<Sparkles className="tier-icon" />}
                        games={tier1}
                        colorClass="tier-low"
                        onCardClick={handleCardClick}
                    />
                    <PriceTierColumn
                        title="Hity do 60 PLN"
                        icon={<DollarSign className="tier-icon" />}
                        games={tier2}
                        colorClass="tier-mid"
                        onCardClick={handleCardClick}
                    />
                    <PriceTierColumn
                        title="Premium 60 PLN+"
                        icon={<TrendingUp className="tier-icon" />}
                        games={tier3}
                        colorClass="tier-high"
                        onCardClick={handleCardClick}
                    />
                </div>
            )}
        </div>
    )
}
