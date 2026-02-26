import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GameCard, GameData } from './GameCard'
import { searchSteamGamesByGenre } from '../../api/steamStore'
import '../shared/Grid.css'
import './GamesHome.css'

import { GAME_GENRES } from '../../constants/gameGenres'

const INITIAL_LIMIT = 30
const INCREMENT = 20

export const GameGenresView: React.FC = () => {
    const navigate = useNavigate()
    const [selectedGenre, setSelectedGenre] = useState<string>('Action')
    const [allGames, setAllGames] = useState<GameData[]>([])
    const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    const loaderRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let isMounted = true

        const fetchGenreGames = async () => {
            setIsLoading(true)
            setDisplayLimit(INITIAL_LIMIT)
            try {
                const responseItems = await searchSteamGamesByGenre(selectedGenre)
                if (!isMounted) return

                const mappedGames: GameData[] = responseItems.map(item => ({
                    id: item.id.toString(),
                    title: item.name,
                    capsuleImage: item.large_capsule_image || item.small_capsule_image || item.header_image,
                    price: item.final_price / 100,
                    originalPrice: item.original_price ? item.original_price / 100 : undefined,
                    discountPercent: item.discount_percent,
                    tags: [],
                    osWindows: item.windows_available,
                }))

                setAllGames(mappedGames)
            } catch (error) {
                console.error('Failed to load genre data', error)
                if (isMounted) setAllGames([])
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        fetchGenreGames()

        return () => {
            isMounted = false
        }
    }, [selectedGenre])

    // Infinite Scroll Logic
    useEffect(() => {
        if (!loaderRef.current) return

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && allGames.length > displayLimit) {
                setDisplayLimit(prev => prev + INCREMENT)
            }
        }, { threshold: 0.1 })

        observer.observe(loaderRef.current)
        return () => observer.disconnect()
    }, [allGames.length, displayLimit])

    const visibleGames = allGames.slice(0, displayLimit)

    return (
        <div className="view-container fade-in">
            <div className="view-header">
                <h2 className="view-title">
                    Gatunki <span className="neon-text-green">Gier</span>
                </h2>
            </div>

            <div className="filters-container glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {GAME_GENRES.map((genre) => (
                        <button
                            key={genre.id}
                            onClick={() => setSelectedGenre(genre.id)}
                            style={{
                                padding: '0.4rem 1rem',
                                borderRadius: '20px',
                                border: `1px solid ${selectedGenre === genre.id ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)'}`,
                                background: selectedGenre === genre.id ? 'rgba(0, 255, 128, 0.15)' : 'transparent',
                                color: selectedGenre === genre.id ? 'var(--neon-green)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.9rem'
                            }}
                        >
                            {genre.label}
                        </button>
                    ))}
                </div>
            </div>

            <section className="games-featured-section">
                {isLoading ? (
                    <div className="loading-state" style={{ minHeight: '300px' }}>
                        <div className="neon-spinner green"></div>
                        <p>Wczytywanie gier: {GAME_GENRES.find((g) => g.id === selectedGenre)?.label}...</p>
                    </div>
                ) : (
                    <>
                        {allGames.length === 0 ? (
                            <div className="empty-state">
                                <p>Nie odnaleziono gier dla tego gatunku.</p>
                            </div>
                        ) : (
                            <div className="games-grid">
                                {visibleGames.map((game) => (
                                    <div key={game.id} className="game-card-wrapper">
                                        <GameCard game={game} onClick={() => navigate(`/games/${game.id}`)} />
                                    </div>
                                ))}
                                <div ref={loaderRef} style={{ gridColumn: '1/-1', height: '20px' }}></div>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    )
}
