import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { GameCard, GameData } from './GameCard'
import { getSteamStoreFeaturedCategories, searchSteamGamesByGenre, SteamFeaturedCategoryItem, getMultipleSteamAppDetails } from '../../api/steamStore'
import './GamesHome.css'

export interface GamesHomeProps {
    title?: string
}

const ITEMS_PER_PAGE = 20;

export const GamesHome: React.FC<GamesHomeProps> = ({ title = 'Polecane i Wyróżnione' }) => {
    const navigate = useNavigate()
    const [games, setGames] = useState<GameData[]>([])
    const [allRawItems, setAllRawItems] = useState<SteamFeaturedCategoryItem[]>([])
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
    const [isLoading, setIsLoading] = useState(true)
    const [isMoreLoading, setIsMoreLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)

    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement | null) => {
        if (isLoading || isMoreLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !isMoreLoading) {
                setVisibleCount(prev => prev + ITEMS_PER_PAGE);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, isMoreLoading, hasMore]);

    // 1. Pobieranie wstępnej listy ID
    useEffect(() => {
        let isMounted = true;
        const fetchInitialList = async () => {
            setIsLoading(true);
            setGames([]);
            setVisibleCount(ITEMS_PER_PAGE);
            try {
                const categories = await getSteamStoreFeaturedCategories();
                if (!isMounted) return;

                let selectedItems: SteamFeaturedCategoryItem[] = [];

                if (title === 'Promocje Steam') {
                    selectedItems = categories?.specials?.items || [];
                } else {
                    // Domyślnie miksujemy duże nagłówki z bestsellerami
                    const featureItems = categories?.['0']?.items || categories?.large_capsules?.items || [];
                    const topSellers = categories?.top_sellers?.items || [];
                    const animeGames = await searchSteamGamesByGenre('Anime');
                    selectedItems = [...featureItems, ...topSellers, ...animeGames.slice(0, 20)];
                }

                const uniqueItems = selectedItems.filter(
                    (item, index, self) => item?.id && index === self.findIndex((t) => t?.id === item?.id)
                );

                setAllRawItems(uniqueItems);
                setHasMore(uniqueItems.length > ITEMS_PER_PAGE);

                const firstBatch = uniqueItems.slice(0, ITEMS_PER_PAGE);
                await fetchBatchDetails(firstBatch, true);

            } catch (error) {
                console.error("Failed to load initial games list:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchInitialList();
        return () => { isMounted = false; };
    }, [title]);

    // 2. Pobieranie kolejnych paczek gdy visibleCount rośnie
    useEffect(() => {
        if (isLoading || visibleCount <= ITEMS_PER_PAGE || isMoreLoading) return;

        const start = visibleCount - ITEMS_PER_PAGE;
        const nextBatch = allRawItems.slice(start, visibleCount);

        if (nextBatch.length > 0) {
            fetchBatchDetails(nextBatch, false);
        }

        if (visibleCount >= allRawItems.length) {
            setHasMore(false);
        }
    }, [visibleCount]);

    const fetchBatchDetails = async (batch: SteamFeaturedCategoryItem[], isInitial: boolean) => {
        if (!isInitial) setIsMoreLoading(true);
        try {
            const appIds = batch.map(item => item.id);
            const freshDetails = await getMultipleSteamAppDetails(appIds);

            const mappedBatch: GameData[] = freshDetails.map(d => ({
                id: (d.steam_appid || (d as any).id || '').toString(),
                title: d.name || 'Nieznany Tytuł',
                capsuleImage: d.header_image || '',
                price: d.price_overview ? d.price_overview.final / 100 : 0,
                originalPrice: d.price_overview ? d.price_overview.initial / 100 : undefined,
                discountPercent: d.price_overview?.discount_percent || 0,
                tags: [],
                osWindows: d.platforms?.windows ?? true,
            }));

            setGames(prev => isInitial ? mappedBatch : [...prev, ...mappedBatch]);
        } catch (err) {
            console.error("Error fetching batch details:", err);
            const fallbackBatch = batch.map(item => ({
                id: item.id.toString(),
                title: item.name,
                capsuleImage: item.large_capsule_image || item.header_image || '',
                price: (item.final_price || 0) / 100,
                originalPrice: item.original_price ? item.original_price / 100 : undefined,
                discountPercent: item.discount_percent || 0,
                tags: [],
                osWindows: item.windows_available ?? true,
            }));
            setGames(prev => isInitial ? fallbackBatch : [...prev, ...fallbackBatch]);
        } finally {
            if (!isInitial) setIsMoreLoading(false);
        }
    };

    return (
        <div className="games-home-container fade-in">
            <header className="games-home-header">
                <h1 className="games-title">{title}</h1>
            </header>

            <section className="games-featured-section">
                {isLoading && games.length === 0 ? (
                    <div className="loading-state">
                        <div className="neon-spinner green"></div>
                        <p>Inicjalizacja bazy danych...</p>
                    </div>
                ) : (
                    <>
                        <div className="games-grid">
                            {games.map((game) => (
                                <div key={game.id} className="game-card-wrapper">
                                    <GameCard game={game} onClick={() => navigate(`/games/${game.id}`)} />
                                </div>
                            ))}
                        </div>

                        {/* Kotwica do Infinite Scroll */}
                        <div ref={lastElementRef} className="scroll-anchor" style={{ height: '20px', margin: '20px 0' }}>
                            {isMoreLoading && (
                                <div className="more-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                                    <div className="small-spinner"></div>
                                    <span>Pobieranie kolejnych bestsellerów...</span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </section>
        </div>
    )
}
