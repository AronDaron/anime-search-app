import * as React from 'react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GameCard, GameData } from './GameCard'
import { searchSteamGamesByGenre } from '../../api/steamStore'
import '../shared/Grid.css'
import './GamesHome.css' // Reuse the same CSS structure where applicable

const GAME_GENRES = [
    { label: 'Akcja', id: 'Action' },
    { label: 'RPG', id: 'RPG' },
    { label: 'Strategia', id: 'Strategy' },
    { label: 'Przygoda', id: 'Adventure' },
    { label: 'Indie', id: 'Indie' },
    { label: 'Symulacje', id: 'Simulation' },
    { label: 'Wyścigi', id: 'Racing' },
    { label: 'Sportowe', id: 'Sports' },
    { label: 'Casual', id: 'Casual' },
    { label: 'MMO', id: 'Massively Multiplayer' },
    { label: 'Survival', id: 'Survival' },
    { label: 'Horror', id: 'Horror' },
    { label: 'Otwarty Świat', id: 'Open World' },
    { label: 'FPS', id: 'FPS' }
]

export const GameGenresView: React.FC = () => {
    const navigate = useNavigate()
    const [selectedGenre, setSelectedGenre] = useState<string>('Action')
    const [games, setGames] = useState<GameData[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)

    useEffect(() => {
        let isMounted = true

        const fetchGenreGames = async () => {
            setIsLoading(true)
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
                    tags: [], // Tags not available in featured categories summary limit
                    osWindows: item.windows_available,
                }))

                setGames(mappedGames)
            } catch (error) {
                console.error('Failed to load genre data', error)
                if (isMounted) setGames([])
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        fetchGenreGames()

        return () => {
            isMounted = false
        }
    }, [selectedGenre])

    return (
        <div className="view-container fade-in">
            <div className="view-header">
                <h2 className="view-title">
                    Gatunki <span className="neon-text-green">Gier</span>
                </h2>
            </div>

            <div
                className="filters-container glass-panel"
                style={{
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}
            >
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
                        <p>Wczytywanie gier z kategorii {GAME_GENRES.find((g) => g.id === selectedGenre)?.label}...</p>
                    </div>
                ) : (
                    <>
                        {games.length === 0 ? (
                            <div className="empty-state">
                                <p>
                                    Nie odnaleziono gier dla gatunku "
                                    {GAME_GENRES.find((g) => g.id === selectedGenre)?.label || selectedGenre}".
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
                    </>
                )}
            </section>
        </div>
    )
}
