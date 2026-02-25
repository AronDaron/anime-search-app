import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GameCard, GameData } from './GameCard'
import { searchSteamGames } from '../../api/steamStore'
import './GamesHome.css'

interface GameSearchProps {
    searchQuery: string
}

export const GameSearch: React.FC<GameSearchProps> = ({ searchQuery }) => {
    const navigate = useNavigate()
    const [games, setGames] = useState<GameData[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let isMounted = true
        const fetchSearchResults = async () => {
            if (!searchQuery.trim()) return

            setIsLoading(true)
            try {
                const results = await searchSteamGames(searchQuery)
                if (!isMounted) return

                const mappedGames: GameData[] = results.map((item) => ({
                    id: item.id.toString(),
                    title: item.name || 'Nieznany Tytuł',
                    capsuleImage:
                        item.large_capsule_image || item.small_capsule_image || item.header_image || '',
                    price: item.final_price ? item.final_price / 100 : 0,
                    originalPrice: item.original_price ? item.original_price / 100 : undefined,
                    discountPercent: item.discount_percent || 0,
                    tags: [],
                    osWindows: item.windows_available ?? true
                }))

                setGames(mappedGames)
            } catch (error) {
                console.error('Failed to search Steam games:', error)
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        const timer = setTimeout(() => {
            fetchSearchResults()
        }, 500)

        return () => {
            isMounted = false
            clearTimeout(timer)
        }
    }, [searchQuery])

    return (
        <div className="games-home-container fade-in">
            <header className="games-home-header">
                <h1 className="games-title">Wyniki wyszukiwania: "{searchQuery}"</h1>
            </header>

            <section className="games-featured-section">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="neon-spinner green"></div>
                        <p>Przeszukiwanie bazy danych Steam...</p>
                    </div>
                ) : games.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: '#888', fontSize: '1.2rem' }}>
                            Nie znaleziono gier pasujących do "{searchQuery}"
                        </p>
                    </div>
                ) : (
                    <div className="games-grid">
                        {games.map((game) => (
                            <div key={game.id} className="game-card-wrapper">
                                <GameCard game={game} onClick={() => navigate(`/games/${game.id}`)} />
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
