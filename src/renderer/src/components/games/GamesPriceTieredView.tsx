import * as React from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Loader2, DollarSign, TrendingUp, Sparkles, Gamepad2, Rocket, Zap, Heart, Sword } from 'lucide-react'
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
// Sub-komponent dla pojedynczej kolumny cenowej z własnym Infinite Scroll i weryfikacjami API
const PriceTierColumn: React.FC<{
    title: string
    icon: React.ReactNode
    rawCandidates: SteamFeaturedCategoryItem[]
    categoryType: 'new' | 'deals'
    colorClass: string
    onCardClick: (id: string | number) => void
}> = ({ title, icon, rawCandidates, categoryType, colorClass, onCardClick }) => {
    const [games, setGames] = useState<GameData[]>([])
    const [loadingMore, setLoadingMore] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const loaderRef = useRef<HTMLDivElement>(null)

    // Reset gdy zmienia się lista kandydatów (np. zmiana filtra)
    useEffect(() => {
        setGames([])
        setCurrentIndex(0)
    }, [rawCandidates])

    // Funkcja pobierająca zaledwie 12 sztuk w locie w celu oszczędzenia limitu 429
    const loadMoreDeals = useCallback(async () => {
        if (loadingMore || currentIndex >= rawCandidates.length) return

        setLoadingMore(true)
        try {
            const nextBatch = rawCandidates.slice(currentIndex, currentIndex + 12)
            const idsToCheck = nextBatch.map(c => c.id)

            if (idsToCheck.length === 0) {
                setLoadingMore(false)
                return
            }

            const { getMultipleSteamAppDetails } = await import('../../api/steamStore')
            const freshSteamData = await getMultipleSteamAppDetails(idsToCheck)
            const freshMap = new Map<number, any>()
            freshSteamData.forEach(game => freshMap.set(game.steam_appid, game))

            const newGames: GameData[] = []

            nextBatch.forEach(item => {
                const liveData = freshMap.get(item.id)
                let priceInPln = item.final_price ? item.final_price / 100 : 0
                let originalPriceInPln = item.original_price ? item.original_price / 100 : undefined
                let discountPercent = item.discount_percent || 0

                if (item.currency === 'USD') {
                    priceInPln *= 4
                    if (originalPriceInPln) originalPriceInPln *= 4
                }

                // Przypięcie NAJŚWIEŻSZEJ wyceny ze Steama załadowanej w paczce 12:
                if (liveData && liveData.price_overview) {
                    priceInPln = liveData.price_overview.final / 100
                    originalPriceInPln = liveData.price_overview.initial / 100
                    discountPercent = liveData.price_overview.discount_percent
                }

                // Filtrowanie jeżeli to widok Promocji i obniżka realnie przestała na Steamie istnieć!
                if (categoryType === 'deals' && discountPercent === 0) {
                    return;
                }

                newGames.push({
                    id: item.id.toString(),
                    title: liveData?.name || item.name || (item as any).title || 'Nieznany Tytuł',
                    capsuleImage: liveData?.header_image || item.large_capsule_image || item.header_image || '',
                    price: priceInPln,
                    originalPrice: originalPriceInPln,
                    discountPercent: discountPercent,
                    tags: [],
                    osWindows: liveData?.platforms?.windows ?? item.windows_available ?? true
                })
            })

            // Unikanie duplikatów przy React 18
            setGames(prev => {
                const existingIds = new Set(prev.map(g => g.id))
                const uniqueNewGames = newGames.filter(g => !existingIds.has(g.id))
                return [...prev, ...uniqueNewGames]
            })
            setCurrentIndex(prev => prev + 12)
        } catch (err) {
            console.error('Error loading more deals:', err)
        } finally {
            setLoadingMore(false)
        }
    }, [rawCandidates, currentIndex, loadingMore, categoryType])

    // Pobranie pierwszej paczki dla samej kolumny
    useEffect(() => {
        if (rawCandidates.length > 0 && games.length === 0 && currentIndex === 0 && !loadingMore) {
            loadMoreDeals()
        }
    }, [rawCandidates, games.length, currentIndex, loadingMore, loadMoreDeals])

    // Mechanizm Lazy Loader obserwujący czy suwak w TIERZE osiągnął koniec i wywołujący max 12 gier
    useEffect(() => {
        if (!loaderRef.current || loadingMore) return

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && currentIndex < rawCandidates.length) {
                loadMoreDeals()
            }
        }, { threshold: 0.1, rootMargin: '100px' })

        observer.observe(loaderRef.current)
        return () => observer.disconnect()
    }, [loadMoreDeals, loadingMore, currentIndex, rawCandidates.length])

    return (
        <div className={`price-tier-column ${colorClass}`}>
            <div className="tier-header">
                {icon}
                <h3>{title}</h3>
                <span className="tier-count">{games.length > 0 ? `${games.length}+` : 0}</span>
            </div>
            <div className="tier-scroll-area">
                {games.length > 0 ? (
                    <>
                        {games.map(game => (
                            <div key={game.id} className="game-card-compact-wrapper">
                                <GameCard game={game} onClick={() => onCardClick(game.id)} />
                            </div>
                        ))}
                        {(currentIndex < rawCandidates.length || loadingMore) && (
                            <div ref={loaderRef} className="tier-loader-sentinel">
                                <div className="mini-spinner"></div>
                            </div>
                        )}
                    </>
                ) : (
                    !loadingMore && <div className="empty-tier">Brak gier w tej cenie</div>
                )}
            </div>
        </div>
    )
}

export const GamesPriceTieredView: React.FC<GamesPriceTieredViewProps> = ({ title, categoryType }) => {
    const navigate = useNavigate()
    const [selectedGenre, setSelectedGenre] = useState('All')

    // Surowe identyfikatory dla każdego tieru oczekujące na dociągnięcie ich cenowych profili po scrollu 12 sztuk
    const [tier1Candidates, setTier1Candidates] = useState<SteamFeaturedCategoryItem[]>([])
    const [tier2Candidates, setTier2Candidates] = useState<SteamFeaturedCategoryItem[]>([])
    const [tier3Candidates, setTier3Candidates] = useState<SteamFeaturedCategoryItem[]>([])

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
                    const storeSpecials = (featured?.specials?.items || []).filter(item => item.discount_percent > 0)
                    const spySpecials = (await getSteamSpyByTag('specials')).filter(item => item.discount_percent > 0)
                    allItems = [...storeSpecials, ...spySpecials]
                }
            } else {
                const genreGames = await searchSteamGamesByGenre(selectedGenre)
                // Nie filtrujemy po discounted/discount_percent - SteamSpy ma nieaktualne dane o zniżkach.
                // PriceTierColumn weryfikuje zniżki na żywo ze Steam API (per game).
                // Sortujemy po ID malejąco (nowsze gry mają wyższe ID) i bierzemy max 500.
                allItems = genreGames.sort((a, b) => b.id - a.id).slice(0, 500)
            }

            const uniqueMap = new Map<number, SteamFeaturedCategoryItem>()
            allItems.forEach(item => {
                if (item && item.id) uniqueMap.set(item.id, item)
            })

            const uniqueCandidates = Array.from(uniqueMap.values())

            // KATEGORYZACJA SUROWYCH KANDYDATÓW
            // SteamSpy często zwraca price=0 (brak danych) - wtedy rozdzielamy równomiernie na wszystkie tiery.
            // PriceTierColumn weryfikuje i wyświetla realne ceny ze Steam API.
            const withPrice = uniqueCandidates.filter(c => c.final_price > 0)
            const noPrice   = uniqueCandidates.filter(c => !c.final_price || c.final_price === 0)

            const pricedLow = withPrice.filter(c => {
                let p = c.final_price / 100
                if (c.currency === 'USD') p *= 4
                return p <= 40
            })
            const pricedMid = withPrice.filter(c => {
                let p = c.final_price / 100
                if (c.currency === 'USD') p *= 4
                return p > 40 && p <= 90
            })
            const pricedHigh = withPrice.filter(c => {
                let p = c.final_price / 100
                if (c.currency === 'USD') p *= 4
                return p > 90
            })

            // Gry bez danych cenowych → równomierny podział pomiędzy tiery
            const chunk = Math.ceil(noPrice.length / 3)
            const unknownLow  = noPrice.slice(0, chunk)
            const unknownMid  = noPrice.slice(chunk, chunk * 2)
            const unknownHigh = noPrice.slice(chunk * 2)

            setTier1Candidates([...pricedLow,  ...unknownLow])
            setTier2Candidates([...pricedMid,  ...unknownMid])
            setTier3Candidates([...pricedHigh, ...unknownHigh])

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

    const handleCardClick = (id: string | number) => navigate(`/games/${id}`)

    return (
        <div className="price-tiered-layout fade-in">
            <header className="price-tiered-header">
                <div className="header-main">
                    <div className="title-group">
                        <h1>{title}</h1>
                        <p className="page-subtitle">Odkryj najlepsze okazje i nowości wyselekcjonowane przez AI</p>
                    </div>
                    <div className="genre-filter-row">
                        <Filter size={18} className="filter-icon" />
                        <div className="genre-chips-scroll">
                            {GAME_GENRES.map(genre => {
                                let GenreIcon = Gamepad2;
                                if (genre.label === 'Akcja') GenreIcon = Sword;
                                if (genre.label === 'RPG') GenreIcon = Heart;
                                if (genre.label === 'Strategia') GenreIcon = Zap;
                                if (genre.label === 'Przygodowe') GenreIcon = Rocket;

                                return (
                                    <button
                                        key={genre.id}
                                        className={`genre-chip-mini ${selectedGenre === genre.id ? 'active' : ''}`}
                                        onClick={() => setSelectedGenre(genre.id)}
                                    >
                                        <GenreIcon size={14} className="chip-icon" />
                                        {genre.label}
                                    </button>
                                );
                            })}
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
                        title="BUDŻETOWE SKARBY"
                        icon={<Sparkles className="tier-icon" />}
                        rawCandidates={tier1Candidates}
                        categoryType={categoryType}
                        colorClass="tier-low"
                        onCardClick={handleCardClick}
                    />
                    <PriceTierColumn
                        title="OPTYMALNE WYBORY"
                        icon={<DollarSign className="tier-icon" />}
                        rawCandidates={tier2Candidates}
                        categoryType={categoryType}
                        colorClass="tier-mid"
                        onCardClick={handleCardClick}
                    />
                    <PriceTierColumn
                        title="DOŚWIADCZENIE PREMIUM"
                        icon={<TrendingUp className="tier-icon" />}
                        rawCandidates={tier3Candidates}
                        categoryType={categoryType}
                        colorClass="tier-high"
                        onCardClick={handleCardClick}
                    />
                </div>
            )}
        </div>
    )
}
