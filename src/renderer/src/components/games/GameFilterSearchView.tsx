import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Search as SearchIcon } from 'lucide-react'
import { searchSteamGames, searchSteamGamesByGenre } from '../../api/steamStore'
import { GameCard, GameData } from './GameCard'
import '../shared/Grid.css'
import '../anime/FilterSearchView.css' // Reuse anime styles for consistency

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
    { label: 'MMO', id: 'Massively Multiplayer' }
]

const PRICE_FILTERS = [
    { label: 'Wszystkie', value: -1 },
    { label: 'Darmowe', value: 0 },
    { label: 'Do 20 zł', value: 20 },
    { label: 'Do 50 zł', value: 50 },
    { label: 'Do 100 zł', value: 100 },
    { label: 'Do 200 zł', value: 200 }
]

export const GameFilterSearchView: React.FC = () => {
    const navigate = useNavigate()

    // Stany filtrów
    const [searchText, setSearchText] = useState('')
    const [selectedGenre, setSelectedGenre] = useState<string>('')
    const [maxPrice, setMaxPrice] = useState<number>(-1)

    // Stany wyników
    const [results, setResults] = useState<GameData[]>([])
    const [loading, setLoading] = useState(false)

    const handleSearch = useCallback(async () => {
        setLoading(true)
        try {
            let gamesItems: any[] = []

            if (searchText.trim()) {
                // Wyszukiwanie tekstowe
                gamesItems = await searchSteamGames(searchText.trim())
            } else {
                // Jeśli brak tekstu, szukaj po wybranym gatunku lub domyślnym 'Action'
                const genreToSearch = selectedGenre || 'Action'
                gamesItems = await searchSteamGamesByGenre(genreToSearch)
            }

            let mappedGames: GameData[] = gamesItems.map((item: any) => ({
                id: item.id.toString(),
                title: item.name,
                capsuleImage: item.large_capsule_image || item.small_capsule_image || item.header_image,
                price: (item.final_price || 0) / 100,
                originalPrice: item.original_price ? item.original_price / 100 : undefined,
                discountPercent: item.discount_percent || 0,
                tags: [],
                osWindows: item.windows_available ?? true
            }))

            // Filtrowanie ceny (lokalne, bo API Steama jest ograniczone)
            if (maxPrice !== -1) {
                if (maxPrice === 0) {
                    mappedGames = mappedGames.filter((g) => (g.price ?? 0) === 0)
                } else {
                    mappedGames = mappedGames.filter((g) => (g.price ?? 0) <= maxPrice)
                }
            }

            console.log(`[GameSearch] Znaleziono ${mappedGames.length} gier po filtrowaniu.`, {
                searchText,
                selectedGenre,
                maxPrice
            })

            setResults(mappedGames)
        } catch (error) {
            console.error('Błąd podczas filtrowanego wyszukiwania gier:', error)
            setResults([])
        } finally {
            setLoading(false)
        }
    }, [searchText, selectedGenre, maxPrice])

    // Automatyczne wyszukiwanie przy każdej zmianie filtrów
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch()
        }, searchText.trim() ? 500 : 0) // Debounce tylko dla tekstu

        return () => clearTimeout(timer)
    }, [searchText, selectedGenre, maxPrice, handleSearch])

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
                        placeholder="np. Cyberpunk, Witcher..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>

                <div className="filter-group">
                    <label>Gatunek</label>
                    <select
                        className="filter-select"
                        value={selectedGenre}
                        onChange={(e) => setSelectedGenre(e.target.value)}
                    >
                        <option value="">Wybierz gatunek</option>
                        {GAME_GENRES.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Cena maksymalna</label>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '0.5rem',
                            marginTop: '0.5rem'
                        }}
                    >
                        {PRICE_FILTERS.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setMaxPrice(p.value)}
                                className={`filter-btn ${maxPrice === p.value ? 'active' : ''}`}
                                style={{
                                    padding: '0.5rem',
                                    fontSize: '0.8rem',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: maxPrice === p.value ? 'rgba(0, 255, 128, 0.2)' : 'rgba(0,0,0,0.2)',
                                    color: maxPrice === p.value ? '#00ff80' : '#888',
                                    cursor: 'pointer'
                                }}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    className="search-action-btn"
                    onClick={handleSearch}
                    style={{ background: 'linear-gradient(45deg, #00ff80, #0080ff)' }}
                >
                    <SearchIcon size={18} />
                    Szukaj Gier
                </button>
            </aside>

            <main className="filter-results-area">
                <div className="filter-results-header">
                    <h2>
                        {searchText.trim() ? `Wyniki dla: "${searchText}"` : `Przeglądanie: ${GAME_GENRES.find(g => g.id === selectedGenre)?.label || 'Akcja'}`}
                        {' '}
                        {results.length > 0 && (
                            <span style={{ fontSize: '1rem', color: '#888' }}>({results.length})</span>
                        )}
                    </h2>
                </div>

                {loading ? (
                    <div className="loading-container" style={{ minHeight: '300px' }}>
                        <div className="neon-spinner green"></div>
                        <p style={{ marginTop: '1rem', color: '#888' }}>Przeszukiwanie bazy Steam...</p>
                    </div>
                ) : (
                    <div className="games-grid">
                        {results.length === 0 ? (
                            <div
                                className="empty-state"
                                style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}
                            >
                                <h3>Brak wyników</h3>
                                <p>Spróbuj zmienić filtry lub wyszukiwaną frazę.</p>
                            </div>
                        ) : (
                            results.map((game) => (
                                <div key={game.id} className="game-card-wrapper">
                                    <GameCard game={game} onClick={() => navigate(`/games/${game.id}`)} />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
