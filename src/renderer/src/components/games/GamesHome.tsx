import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GameCard, GameData } from './GameCard'
import './GamesHome.css'

export interface GamesHomeProps {
    title?: string
}

export const GamesHome: React.FC<GamesHomeProps> = ({ title = 'Polecane i Wyróżnione' }) => {
    const navigate = useNavigate()
    const [games, setGames] = useState<GameData[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        setIsLoading(true);
        // Docelowo tutaj będzie pobierane ze Steam API
        // Ponieważ nie mamy jeszcze gotowego endpointu polecanych/trending ze Steam, uzywamy mockow prezentacyjnych
        const mockSteamGames: GameData[] = [
            { id: '1091500', title: 'Cyberpunk 2077', capsuleImage: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/capsule_616x353.jpg', price: 99.50, originalPrice: 199.00, discountPercent: 50, tags: ['Cyberpunk', 'RPG', 'Sci-fi'], osWindows: true },
            { id: '1086940', title: 'Baldur\'s Gate 3', capsuleImage: 'https://cdn.akamai.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg', price: 249.00, tags: ['CRPG', 'Story Rich', 'Choices Matter'], osWindows: true },
            { id: '323190', title: 'Frostpunk', capsuleImage: 'https://cdn.akamai.steamstatic.com/steam/apps/323190/capsule_616x353.jpg', price: 21.99, originalPrice: 109.99, discountPercent: 80, tags: ['City Builder', 'Survival', 'Strategy'], osWindows: true },
            { id: '236390', title: 'War Thunder', capsuleImage: 'https://cdn.akamai.steamstatic.com/steam/apps/236390/capsule_616x353.jpg', price: 0, tags: ['Free to Play', 'Vehicular Combat', 'VR'], osWindows: true },
            { id: '1172470', title: 'Apex Legends', capsuleImage: 'https://cdn.akamai.steamstatic.com/steam/apps/1172470/capsule_616x353.jpg', price: 0, tags: ['Free to Play', 'Battle Royale', 'Hero Shooter'], osWindows: true },
            { id: '271590', title: 'Grand Theft Auto V', capsuleImage: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/capsule_616x353.jpg', price: 63.90, originalPrice: 142.00, discountPercent: 55, tags: ['Open World', 'Action', 'Multiplayer'], osWindows: true },
        ];

        // Symulacja ładowania i prosty shuffle tablicy by markować różne kategorie na próbę!
        const shuffled = [...mockSteamGames].sort(() => 0.5 - Math.random());

        setTimeout(() => {
            setGames(title === 'Promocje Steam' ? shuffled.filter(g => g.discountPercent) : shuffled);
            setIsLoading(false);
        }, 500);
    }, [title]);

    return (
        <div className="games-home-container fade-in">
            <header className="games-home-header">
                <h1 className="games-title">{title}</h1>
            </header>

            <section className="games-featured-section">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="neon-spinner green"></div>
                        <p>Wczytywanie bazy danych Steam...</p>
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
