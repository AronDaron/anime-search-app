import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnimeDetails, getAnimeEpisodesFromJikan, AnimeDetailsData, JikanEpisode } from '../../api/anilist';
import { translateDescriptionToPolish } from '../../api/ai';
import './AnimeDetails.css';

const apiToPolishGenre = (genre: string): string => {
    const map: Record<string, string> = {
        "Action": "Akcja", "Adventure": "Przygoda", "Comedy": "Komedia", "Drama": "Dramat",
        "Ecchi": "Ecchi", "Fantasy": "Fantasy", "Horror": "Horror", "Mahou Shoujo": "Magiczne Dziewczyny",
        "Mecha": "Mecha", "Music": "Muzyczne", "Mystery": "Tajemnica", "Psychological": "Psychologiczne",
        "Romance": "Romans", "Sci-Fi": "Sci-Fi", "Slice of Life": "Okruchy Życia", "Sports": "Sportowe",
        "Supernatural": "Nadprzyrodzone", "Thriller": "Thriller"
    };
    return map[genre] || genre;
};

export const AnimeDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [anime, setAnime] = useState<AnimeDetailsData['Media'] | null>(null);
    const [malEpisodes, setMalEpisodes] = useState<JikanEpisode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'episodes' | 'characters' | 'stats'>('info');
    const [expandedEpisodeIndex, setExpandedEpisodeIndex] = useState<number | null>(null);

    const generateSlug = (title: string) => {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    };

    // Translation states
    const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const response = await getAnimeDetails(parseInt(id, 10));
                setAnime(response.Media);

                // Try to translate description
                if (response.Media.description) {
                    let cachedTranslation: string | null = null;
                    if (window.api && window.api.db) {
                        try {
                            const cached = await window.api.db.getTranslation(response.Media.id);
                            if (cached && cached.description_pl) {
                                cachedTranslation = cached.description_pl;
                            }
                        } catch (err) {
                            console.error("Failed to fetch translation from DB:", err);
                        }
                    }

                    if (cachedTranslation) {
                        setTranslatedDescription(cachedTranslation);
                    } else {
                        const apiKey = import.meta.env.VITE_OPENROUTER_KEY || '';
                        if (apiKey) {
                            setIsTranslating(true);
                            translateDescriptionToPolish(response.Media.description, apiKey)
                                .then(async (translated) => {
                                    if (translated) {
                                        setTranslatedDescription(translated);
                                        // Save to DB Cache
                                        if (window.api && window.api.db) {
                                            try {
                                                await window.api.db.addTranslation(response.Media.id, translated);
                                            } catch (err) {
                                                console.error("Failed to save translation to DB:", err);
                                            }
                                        }
                                    }
                                })
                                .catch(err => console.error("Translation threw an error:", err))
                                .finally(() => setIsTranslating(false));
                        }
                    }
                }

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
        return <div className="empty-state"><p>Nie znaleziono anime.</p><button onClick={() => navigate(-1)} className="nav-btn">Wróć</button></div>;
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
                    &larr; Wróć
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
                    {isFavorite ? '♥ W ulubionych' : '♡ Dodaj do ulubionych'}
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
                                <span className="franchise-label">Obecnie przeglądasz:</span>
                                <div className="anime-stats">
                                    {anime.averageScore && <span className="stat-badge score">Ocena: {anime.averageScore}%</span>}
                                    {anime.episodes && <span className="stat-badge episodes">Odcinków: {anime.episodes}</span>}
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
                            {anime.genres.map(g => <span key={g} className="genre-tag">{apiToPolishGenre(g)}</span>)}
                        </div>
                    </div>
                </div>

                {activeTab === 'info' && (
                    <div className="tab-content fade-in-tab">
                        <div className="anime-description mt-4">
                            <h3>Opis Fabuły</h3>
                            {isTranslating ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--neon-purple)', margin: '1rem 0' }}>
                                    <div className="neon-spinner purple" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                                    <span style={{ fontSize: '0.9rem' }}>Tłumaczenie opisu przez sztuczną inteligencję (OpenRouter)...</span>
                                </div>
                            ) : (
                                <p dangerouslySetInnerHTML={{ __html: translatedDescription || anime.description || 'Brak dostępnego opisu.' }}></p>
                            )}
                        </div>

                        {anime.studios?.nodes?.length > 0 && (
                            <div className="anime-studios mt-4">
                                <h3>Studia Animacji</h3>
                                <p>{anime.studios.nodes.map(s => s.name).join(', ')}</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'episodes' && (
                    <div className="tab-content fade-in-tab">
                        {(() => {
                            let episodesList: any[] = [];

                            // 1. Try AniList streaming episodes first
                            if (anime.streamingEpisodes && anime.streamingEpisodes.length > 0) {
                                // Fix AniList merging cours (e.g. Spy x Family showing 25 for part 1)
                                // Limit to actual episode count if known
                                const limit = anime.episodes || anime.streamingEpisodes.length;
                                const limitedStreaming = anime.streamingEpisodes.slice(0, limit);

                                episodesList = limitedStreaming.map((ep, index) => {
                                    const jikanMatch = malEpisodes.length > index ? malEpisodes[index] : null;
                                    return {
                                        title: ep.title,
                                        thumbnail: ep.thumbnail,
                                        url: ep.url,
                                        site: ep.site,
                                        rating: jikanMatch?.score
                                    };
                                });
                            }
                            // 2. Fallback to Jikan (MyAnimeList) episodes if AniList has no streams (e.g. Cour 2)
                            else if (malEpisodes && malEpisodes.length > 0) {
                                episodesList = malEpisodes.map(ep => ({
                                    title: `${ep.mal_id}. ${ep.title}`,
                                    thumbnail: anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large,
                                    url: ep.url,
                                    site: 'MyAnimeList',
                                    rating: ep.score
                                }));
                            }

                            if (episodesList.length > 0) {
                                return (
                                    <div className="anime-episodes glass-panel-inner mt-4">
                                        <h3>Lista Odcinków ({episodesList.length})</h3>
                                        <div className="episodes-list">
                                            {episodesList.map((ep, index) => {
                                                // Polish sites usually use romaji (Japanese) titles in their slugs rather than English ones
                                                const animeTitleRomaji = anime.title.romaji || anime.title.english || '';
                                                const animeTitleEnglishOrRomaji = anime.title.english || anime.title.romaji || '';

                                                const slug = generateSlug(animeTitleRomaji);
                                                const searchTitle = animeTitleEnglishOrRomaji;

                                                const episodeNumber = index + 1;
                                                const isExpanded = expandedEpisodeIndex === index;

                                                const officialStreams = anime.externalLinks?.filter(link => link.type === 'STREAM' || link.type === 'INFO') || [];

                                                // Create a list of unique official streaming links to avoid duplicates with the base ep.site
                                                const uniqueOfficialStreams = officialStreams.filter(link => link.site !== ep.site && link.url !== ep.url);

                                                return (
                                                    <div key={index} className="episode-item-container">
                                                        <div className={`episode-item clickable ${isExpanded ? 'expanded' : ''}`} onClick={() => setExpandedEpisodeIndex(isExpanded ? null : index)}>
                                                            <div className="episode-thumbnail-container">
                                                                <img src={ep.thumbnail} alt={ep.title} className="episode-thumbnail" loading="lazy" referrerPolicy="no-referrer" />
                                                                <div className="episode-play-overlay">
                                                                    <span>{isExpanded ? '▲' : '▼'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="episode-info">
                                                                <h4>{ep.title}</h4>
                                                                <div className="episode-meta">
                                                                    <span className="platform-tag">{ep.site}</span>
                                                                    {ep.rating && ep.rating > 0 ? (
                                                                        <div className="rating-circle">
                                                                            <span className="rating-star">★</span>
                                                                            <span className="rating-number">{(ep.rating * 2).toFixed(1)}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="rating-circle empty">
                                                                            <span className="rating-number">N/A</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {isExpanded && (
                                                            <div className="episode-links-panel fade-in-down">
                                                                <h4>Gdzie obejrzeć ten odcinek?</h4>
                                                                <div className="external-links-grid">
                                                                    <div className="link-group">
                                                                        <h5>Polskie serwisy:</h5>
                                                                        <div className="link-buttons">
                                                                            <a className="neon-btn btn-animezone" href={`https://www.animezone.pl/odcinek/${slug}/${episodeNumber}`} target="_blank" rel="noopener noreferrer">
                                                                                AnimeZone
                                                                            </a>
                                                                            <a className="neon-btn btn-desu" href={`https://desu-online.pl/${slug}-odcinek-${episodeNumber}/`} target="_blank" rel="noopener noreferrer">
                                                                                Desu-Online
                                                                            </a>
                                                                            <a className="neon-btn btn-shinden" href={`https://shinden.pl/search?q=${encodeURIComponent(searchTitle)}`} target="_blank" rel="noopener noreferrer">
                                                                                Shinden
                                                                            </a>
                                                                        </div>
                                                                    </div>

                                                                    {(uniqueOfficialStreams.length > 0 || ep.url) && (
                                                                        <div className="link-group">
                                                                            <h5>Oficjalne / Zagraniczne:</h5>
                                                                            <div className="link-buttons">
                                                                                {ep.site && ep.url && (
                                                                                    <a className="neon-btn btn-official" href={ep.url} target="_blank" rel="noopener noreferrer">
                                                                                        {ep.site}
                                                                                    </a>
                                                                                )}
                                                                                {uniqueOfficialStreams.map((link, lIndex) => (
                                                                                    <a key={lIndex} className="neon-btn btn-official" href={link.url} target="_blank" rel="noopener noreferrer">
                                                                                        {link.site}
                                                                                    </a>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="empty-state-tab mt-4 glass-panel-inner">
                                        <p>Brak dostępnych odcinków w bazie dla tej serii.</p>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                )}

                {activeTab === 'characters' && (
                    <div className="tab-content fade-in-tab">
                        <div className="characters-grid mt-4">
                            {anime.characters?.edges.map((edge, idx) => (
                                <div key={idx} className="character-card glass-panel-inner">
                                    <div className="character-side">
                                        <img src={edge.node.image?.large || ''} alt={edge.node.name?.full || 'Nieznany'} loading="lazy" />
                                        <div className="character-details">
                                            <span className="char-name">{edge.node.name?.full || 'Nieznany'}</span>
                                            <span className="char-role">{edge.role === 'MAIN' ? 'Główny' : 'Poboczny'}</span>
                                        </div>
                                    </div>
                                    {edge.voiceActors && edge.voiceActors.length > 0 && (
                                        <div className="voice-actor-side">
                                            <div className="va-details text-right">
                                                <span className="char-name">{edge.voiceActors[0].name?.full || 'Nieznany'}</span>
                                                <span className="char-role">Japoński</span>
                                            </div>
                                            <img src={edge.voiceActors[0].image?.large || ''} alt={edge.voiceActors[0].name?.full || 'Nieznany'} loading="lazy" />
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
