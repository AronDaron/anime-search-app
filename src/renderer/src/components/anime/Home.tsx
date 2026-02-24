import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPopularAnime, AnimeMedia } from '../../api/anilist';
import { NeonCard } from '../shared/NeonCard';
import '../shared/Grid.css';

export const Home: React.FC = () => {
    const [popularAnime, setPopularAnime] = useState<AnimeMedia[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPopular = async () => {
            try {
                const response = await getPopularAnime();
                setPopularAnime(response.Page.media);
            } catch (error) {
                console.error("Failed to load popular anime", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPopular();
    }, []);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="neon-spinner"></div>
            </div>
        );
    }

    return (
        <div className="view-container">
            <div className="view-header">
                <h2 className="view-title">Trending <span className="neon-text-cyan">Now</span></h2>
            </div>

            <div className="anime-grid">
                {popularAnime.map((anime) => (
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
                        onClick={(id) => navigate(`/anime/${id}`)}
                    />
                ))}
            </div>
        </div>
    );
};
