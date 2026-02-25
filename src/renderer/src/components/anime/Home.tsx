import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPopularAnime, getAiringSchedule, AnimeMedia, AiringScheduleEdge } from '../../api/anilist';
import { NeonCard } from '../shared/NeonCard';
import '../shared/Grid.css';
import './Home.css';
import { CalendarClock } from 'lucide-react';

export const Home: React.FC = () => {
    const [popularAnime, setPopularAnime] = useState<AnimeMedia[]>([]);
    const [schedule, setSchedule] = useState<AiringScheduleEdge[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                const [popularRes, scheduleRes] = await Promise.all([
                    getPopularAnime(),
                    getAiringSchedule()
                ]);

                setPopularAnime(popularRes.Page.media);
                if (scheduleRes.Page.airingSchedules) {
                    setSchedule(scheduleRes.Page.airingSchedules);
                }
            } catch (error) {
                console.error("Failed to load home data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHomeData();
    }, []);

    const formatTimeUntil = (seconds: number) => {
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `Za ${days} dni`;
        if (hours > 0) return `Za ${hours} godz.`;
        return `Za ${minutes} min.`;
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="neon-spinner"></div>
            </div>
        );
    }

    return (
        <div className="home-layout fade-in">
            {/* Lewa Kolumna: Popularne */}
            <div className="home-main-content">
                <div className="view-header">
                    <h2 className="view-title">Popularne <span className="neon-text-cyan">Teraz</span></h2>
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

            {/* Prawa Kolumna: Kalendarz Premier */}
            <div className="home-sidebar">
                <div className="view-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CalendarClock className="neon-text-purple" size={24} />
                    <h2 className="view-title" style={{ fontSize: '1.4rem' }}>Kalendarz <span className="neon-text-purple">Premier</span></h2>
                </div>

                <div className="schedule-list glass-panel-inner">
                    {schedule.length > 0 ? (
                        schedule.map((item) => (
                            <Link to={`/anime/${item.media.id}`} key={item.id} className="schedule-item">
                                <img
                                    src={item.media.coverImage.extraLarge}
                                    alt={item.media.title.english || item.media.title.romaji}
                                    className="schedule-thumbnail"
                                    loading="lazy"
                                />
                                <div className="schedule-info">
                                    <h4 className="schedule-title">{item.media.title.english || item.media.title.romaji}</h4>
                                    <span className="schedule-episode">Odcinek {item.episode}</span>
                                    <span className="schedule-time">{formatTimeUntil(item.timeUntilAiring)}</span>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: '2rem' }}>
                            Brak harmonogramu
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
