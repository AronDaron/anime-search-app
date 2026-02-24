import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnimeDetails, getAnimeEpisodesFromJikan, AnimeDetailsData, JikanEpisode } from '../../api/anilist';
import './AnimeDetails.css';

export const AnimeDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [anime, setAnime] = useState<AnimeDetailsData['Media'] | null>(null);
    const [malEpisodes, setMalEpisodes] = useState<JikanEpisode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'episodes' | 'characters' | 'stats'>('info');

    useEffect(() => {
        const fetchDetails = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const response = await getAnimeDetails(parseInt(id, 10));
                setAnime(response.Media);

                // Fetch MAL episodes if anime has a mal id
                if (response.Media.idMal) {
                    getAnimeEpisodesFromJikan(response.Media.idMal)
                        .then(episodes => setMalEpisodes(episodes))
                        .catch(console.error);
                }

            } catch (error) {
                console.error("Failed to load anime details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();

        if (id && window.api?.db) {
            window.api.db.getFavorites().then(favs => {
                setIsFavorite(favs.some((f: any) => f.id === parseInt(id, 10)));
            }).catch(console.error);
        }
    }, [id]);

    const toggleFavorite = async () => {
        if (!anime || !window.api?.db) return;
        try {
            if (isFavorite) {
                await window.api.db.removeFavorite(anime.id);
                setIsFavorite(false);
            } else {
                await window.api.db.addFavorite({
                    id: anime.id,
                    title: anime.title.english || anime.title.romaji,
                    coverImage: anime.coverImage.extraLarge || anime.coverImage.large || ''
                });
                setIsFavorite(true);
            }
        } catch (error) {
            console.error("Failed to toggle favorite", error);
        }
    };

    if (loading) {
        return (
            <div className="loading-container" style={{ minHeight: '100vh' }}>
                <div className="neon-spinner purple"></div>
            </div>
        );
    }

    if (!anime) {
        return <div className="empty-state"><p>Anime not found.</p><button onClick={() => navigate(-1)} className="nav-btn">Back</button></div>;
    }

    const seasons = anime.relations?.edges.filter(edge => {
        if (edge.node.type !== 'ANIME') return false;
        if (edge.node.format === 'MUSIC') return false;
        const excludedRelations = ['CHARACTER', 'OTHER'];
        if (excludedRelations.includes(edge.relationType)) return false;
        return true;
    }) || [];

    return (
        <div className="anime-details-container fade-in">
            <div className="details-top-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <button className="nav-btn back-btn" onClick={() => navigate(-1)} style={{ marginBottom: 0 }}>
                    &larr; Back
                </button>
                <button
                    className={`nav-btn fav-btn ${isFavorite ? 'active' : ''}`}
                    onClick={toggleFavorite}
                    style={{
                        background: isFavorite ? 'rgba(255, 0, 127, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        borderColor: isFavorite ? '#ff007f' : 'rgba(255, 255, 255, 0.3)',
                        marginBottom: 0
                    }}
                >
                    {isFavorite ? '♥ Favorited' : '♡ Add to Favorites'}
                </button>
            </div>
            {anime.bannerImage && (
                <div className="anime-banner" style={{ backgroundImage: `url(${anime.bannerImage})` }}>
                    <div className="banner-overlay"></div>
                </div>
            )}

            <div className="anime-details-content glass-panel">
                <div className="anime-tabs-nav" style={{ marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
                    <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Informacje</button>
                    <button className={`tab-btn ${activeTab === 'episodes' ? 'active' : ''}`} onClick={() => setActiveTab('episodes')}>Odcinki {anime.episodes ? `(${anime.episodes})` : ''}</button>
                    {anime.characters?.edges && anime.characters.edges.length > 0 && (
                        <button className={`tab-btn ${activeTab === 'characters' ? 'active' : ''}`} onClick={() => setActiveTab('characters')}>Bohaterowie</button>
                    )}
                    <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Statystyki</button>
                </div>

                <div className="anime-details-header">
                    <img src={anime.coverImage.extraLarge || anime.coverImage.large} alt={anime.title.english || anime.title.romaji} className="anime-cover-large" />
                    <div className="anime-info">
                        <h2>{anime.title.english || anime.title.romaji}</h2>
                        {anime.title.english && anime.title.romaji !== anime.title.english && (
                            <h3 className="romaji-title">{anime.title.romaji}</h3>
                        )}
                        <div className="franchise-list">
                            {/* Current Entry */}
                            <div className="franchise-item active">
                                <span className="franchise-label">Currently viewing:</span>
                                <div className="anime-stats">
                                    {anime.averageScore && <span className="stat-badge score">Score: {anime.averageScore}%</span>}
                                    {anime.episodes && <span className="stat-badge episodes">Episodes: {anime.episodes}</span>}
                                    <span className="stat-badge format">{anime.status}</span>
                                </div>
                            </div>

                            {/* Related Anime Tabs */}
                            {seasons.map((season, index) => (
                                <div key={index} className="franchise-item clickable" onClick={() => navigate(`/anime/${season.node.id}`)}>
                                    <span className="franchise-label">{season.relationType.replace(/_/g, ' ').toLowerCase()} ({season.node.format}):</span>
                                    <span className="franchise-title">{season.node.title.english || season.node.title.romaji}</span>
                                </div>
                            ))}
                        </div>
                        <div className="anime-genres">
                            {anime.genres.map(g => <span key={g} className="genre-tag">{g}</span>)}
                        </div>
                    </div>
                </div>

                {activeTab === 'info' && (
                    <div className="tab-content fade-in-tab">
                        <div className="anime-description mt-4">
                            <h3>Synopsis</h3>
                            <p dangerouslySetInnerHTML={{ __html: anime.description || 'No synopsis available.' }}></p>
                        </div>

                        {anime.studios?.nodes?.length > 0 && (
                            <div className="anime-studios mt-4">
                                <h3>Studios</h3>
                                <p>{anime.studios.nodes.map(s => s.name).join(', ')}</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'episodes' && (
                    <div className="tab-content fade-in-tab">
                        {anime.streamingEpisodes?.length > 0 ? (
                            <div className="anime-episodes glass-panel-inner mt-4">
                                <h3>Odcinki do obejrzenia ({anime.streamingEpisodes.length})</h3>
                                <div className="episodes-list">
                                    {anime.streamingEpisodes.map((ep, index) => {
                                        const jikanMatch = malEpisodes.length > index ? malEpisodes[index] : null;
                                        const rating = jikanMatch?.score;

                                        return (
                                            <div key={index} className="episode-item">
                                                <div className="episode-thumbnail-container">
                                                    <img src={ep.thumbnail} alt={ep.title} className="episode-thumbnail" loading="lazy" referrerPolicy="no-referrer" />
                                                    <div className="episode-play-overlay">
                                                        <a href={ep.url} target="_blank" rel="noopener noreferrer">▶</a>
                                                    </div>
                                                </div>
                                                <div className="episode-info">
                                                    <h4>{ep.title}</h4>
                                                    <div className="episode-meta">
                                                        <span className="platform-tag">{ep.site}</span>
                                                        {rating && rating > 0 ? (
                                                            <div className="rating-circle">
                                                                <span className="rating-star">★</span>
                                                                <span className="rating-number">{(rating * 2).toFixed(1)}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="rating-circle empty">
                                                                <span className="rating-number">N/A</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state-tab mt-4 glass-panel-inner">
                                <p>Brak dostępnych odcinków do strumieniowania dla tej serii.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'characters' && (
                    <div className="tab-content fade-in-tab">
                        <div className="characters-grid mt-4">
                            {anime.characters?.edges.map((edge, idx) => (
                                <div key={idx} className="character-card glass-panel-inner">
                                    <div className="character-side">
                                        <img src={edge.node.image?.large || ''} alt={edge.node.name?.full || 'Unknown'} loading="lazy" />
                                        <div className="character-details">
                                            <span className="char-name">{edge.node.name?.full || 'Unknown'}</span>
                                            <span className="char-role">{edge.role}</span>
                                        </div>
                                    </div>
                                    {edge.voiceActors && edge.voiceActors.length > 0 && (
                                        <div className="voice-actor-side">
                                            <div className="va-details text-right">
                                                <span className="char-name">{edge.voiceActors[0].name?.full || 'Unknown'}</span>
                                                <span className="char-role">Japanese</span>
                                            </div>
                                            <img src={edge.voiceActors[0].image?.large || ''} alt={edge.voiceActors[0].name?.full || 'Unknown'} loading="lazy" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="tab-content fade-in-tab">
                        <div className="stats-grid mt-4">
                            <div className="stat-card glass-panel-inner">
                                <span className="stat-value">{anime.averageScore || 'N/A'}%</span>
                                <span className="stat-label">Średnia Ocena</span>
                            </div>
                            <div className="stat-card glass-panel-inner">
                                <span className="stat-value">{anime.meanScore || 'N/A'}%</span>
                                <span className="stat-label">Średnia (Mean)</span>
                            </div>
                            <div className="stat-card glass-panel-inner">
                                <span className="stat-value">#{anime.popularity?.toLocaleString() || 'N/A'}</span>
                                <span className="stat-label">Popularność</span>
                            </div>
                            <div className="stat-card glass-panel-inner">
                                <span className="stat-value">{anime.favourites?.toLocaleString() || 'N/A'}</span>
                                <span className="stat-label">Ulubione</span>
                            </div>
                            <div className="stat-card glass-panel-inner">
                                <span className="stat-value">{anime.trending?.toLocaleString() || 'N/A'}</span>
                                <span className="stat-label">Trendujące</span>
                            </div>
                        </div>
                        {anime.rankings && anime.rankings.length > 0 && (
                            <div className="rankings-list mt-4 glass-panel-inner">
                                <h3>Rankingi</h3>
                                <ul>
                                    {anime.rankings.map((r, idx) => (
                                        <li key={idx}>
                                            <span className="rank-number">#{r.rank}</span> {r.context} {r.allTime ? '(All Time)' : ''}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
