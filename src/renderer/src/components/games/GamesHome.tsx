import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GameCard, GameData } from './GameCard'
import { getSteamFeaturedCategories, SteamFeaturedCategoryItem } from '../../api/steamStore'
import './GamesHome.css'

export interface GamesHomeProps {
    title?: string
}

export const GamesHome: React.FC<GamesHomeProps> = ({ title = 'Polecane i Wyróżnione' }) => {
    const navigate = useNavigate()
    const [games, setGames] = useState<GameData[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let isMounted = true;
        const fetchGames = async () => {
            setIsLoading(true);
            try {
                const categories = await getSteamFeaturedCategories();
                if (!categories || !isMounted) return;

                let selectedItems: SteamFeaturedCategoryItem[] = [];

                if (title === 'Bestsellery Gier') {
                    selectedItems = categories.top_sellers?.items || [];
                } else if (title === 'Promocje Steam') {
                    selectedItems = categories.specials?.items || [];
                } else if (title === 'Nowości na Steam') {
                    selectedItems = categories.new_releases?.items || [];
                } else {
                    // Domyślnie na stronie głównej gier miksujemy duże nagłówki z bestsellerami
                    const topItems = categories.top_sellers?.items?.slice(0, 10) || [];

                    // Fallback to various popular sections if '0' is missing
                    const featureItems = categories['0']?.items || categories.large_capsules?.items || [];
                    selectedItems = [...featureItems, ...topItems];
                }

                // Globalne usunięcie duplikatów i uszkodzonych ofert bez ID, by zapobiec usterką w kluczach i renderowaniu 
                const uniqueItems = selectedItems.filter(
                    (item, index, self) => item?.id && index === self.findIndex((t) => t?.id === item?.id)
                );

                const mappedGames: GameData[] = uniqueItems.map(item => ({
                    id: item.id.toString(),
                    title: item.name || 'Nieznany Tytuł',
                    capsuleImage: item.large_capsule_image || item.small_capsule_image || item.header_image || '',
                    price: item.final_price ? item.final_price / 100 : 0,
                    originalPrice: item.original_price ? item.original_price / 100 : undefined,
                    discountPercent: item.discount_percent || 0,
                    tags: [], // Tags not available in featured categories summary
                    osWindows: item.windows_available ?? true,
                }));

                setGames(mappedGames);
            } catch (error) {
                console.error("Failed to load featured categories:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchGames();

        return () => {
            isMounted = false;
        };
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
