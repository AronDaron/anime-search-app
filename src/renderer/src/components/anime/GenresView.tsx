import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NeonCard } from '../shared/NeonCard';
import { searchAnime, AnimeMedia } from '../../api/anilist';
import '../shared/Grid.css';

const GENRES = [
    "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy",
    "Horror", "Mahou Shoujo", "Mecha", "Music", "Mystery",
    "Psychological", "Romance", "Sci-Fi", "Slice of Life",
    "Sports", "Supernatural", "Thriller"
];

// Generowanie lat dla selecta (np. od bieżącego w dół do 1980)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1979 }, (_, i) => currentYear - i);

export const GenresView: React.FC = () => {
    const [selectedGenre, setSelectedGenre] = useState<string>("Action");
    const [selectedYear, setSelectedYear] = useState<number | "Wszystkie">("Wszystkie");
    const [results, setResults] = useState<AnimeMedia[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchGenreData = async () => {
            setLoading(true);
            try {
                // Konwersja roku dla API
                const yearNumber = selectedYear === "Wszystkie" ? undefined : selectedYear;

                // search?: string | null, page = 1, perPage = 20, season?: MediaSeason, seasonYear?: number, genres?: string[]
                const response = await searchAnime(null, 1, 30, undefined, yearNumber, [selectedGenre]);
                setResults(response.Page.media);
            } catch (error) {
                console.error("Failed to load genre data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGenreData();
    }, [selectedGenre, selectedYear]);

    return (
        <div className="view-container fade-in">
            <div className="view-header">
                <h2 className="view-title">Gatunki <span className="neon-text-cyan">Anime</span></h2>
            </div>

            <div className="filters-container glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Rok wydania:</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value === "Wszystkie" ? "Wszystkie" : parseInt(e.target.value))}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value="Wszystkie" style={{ background: '#111' }}>Wszystkie lata</option>
                        {YEARS.map(year => (
                            <option key={year} value={year} style={{ background: '#111' }}>{year}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {GENRES.map(genre => (
                        <button
                            key={genre}
                            onClick={() => setSelectedGenre(genre)}
                            style={{
                                padding: '0.4rem 1rem',
                                borderRadius: '20px',
                                border: `1px solid ${selectedGenre === genre ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)'}`,
                                background: selectedGenre === genre ? 'rgba(0, 255, 255, 0.15)' : 'transparent',
                                color: selectedGenre === genre ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.9rem'
                            }}
                        >
                            {genre}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="loading-container" style={{ minHeight: '300px' }}>
                    <div className="neon-spinner cyan"></div>
                </div>
            ) : (
                <>
                    {results.length === 0 ? (
                        <div className="empty-state">
                            <p>Nie odnaleziono anime dla gatunku "{selectedGenre}"{selectedYear !== "Wszystkie" ? ` w roku ${selectedYear}` : ''}.</p>
                        </div>
                    ) : (
                        <div className="anime-grid">
                            {results.map((anime) => (
                                <NeonCard
                                    key={anime.id}
                                    anime={{
                                        id: anime.id,
                                        title: anime.title.english || anime.title.romaji,
                                        coverImage: anime.coverImage.extraLarge,
                                        averageScore: anime.averageScore || undefined,
                                        seasonYear: anime.seasonYear || undefined,
                                        episodes: anime.episodes || undefined
                                    }}
                                    onClick={() => navigate(`/anime/${anime.id}`)}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
