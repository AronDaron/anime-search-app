import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Save, Check, Plus, Minus, Trash2, Sparkles } from 'lucide-react'
import { FavoritesService } from '../../api/favoritesService'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts'
import { analyzeAnimeProfile, AIProfileAnalysis } from '../../api/ai'
import { ApiKeyService } from '../../api/apiKeyService'
import ReactMarkdown from 'react-markdown'
import './AnimeFavoritesHub.css'

interface FavoriteAnime {
    id: number
    title: string
    coverImage: string
    status: string
    score: number | null
    progress: number | null
    genres: string[]
    totalEpisodes: number | null
    description: string | null
    addedAt: string
}

const statusOptions = [
    { value: 'PLANNING', label: 'Planowane', color: '#aaaaaa' },
    { value: 'CURRENT', label: 'Oglądane', color: '#00e5ff' },
    { value: 'COMPLETED', label: 'Ukończone', color: '#4caf50' },
    { value: 'PAUSED', label: 'Wstrzymane', color: '#ffb300' },
    { value: 'DROPPED', label: 'Porzucone', color: '#ff007f' }
]

const apiToPolishGenre = (genre: string): string => {
    const map: Record<string, string> = {
        Action: 'Akcja',
        Adventure: 'Przygoda',
        Comedy: 'Komedia',
        Drama: 'Dramat',
        Ecchi: 'Ecchi',
        Fantasy: 'Fantasy',
        Horror: 'Horror',
        'Mahou Shoujo': 'Magiczne Dziewczyny',
        Mecha: 'Mecha',
        Music: 'Muzyczne',
        Mystery: 'Tajemnica',
        Psychological: 'Psychologiczne',
        Romance: 'Romans',
        'Sci-Fi': 'Sci-Fi',
        'Slice of Life': 'Okruchy Życia',
        Sports: 'Sportowe',
        Supernatural: 'Nadprzyrodzone',
        Thriller: 'Thriller'
    }
    return map[genre] || genre
}

export const AnimeFavoritesHub: React.FC = () => {
    const navigate = useNavigate()
    const [favorites, setFavorites] = useState<FavoriteAnime[]>([])
    const [loading, setLoading] = useState(true)
    const [savingId, setSavingId] = useState<number | null>(null)
    const [aiAnalysis, setAiAnalysis] = useState<AIProfileAnalysis | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    useEffect(() => {
        fetchFavorites()

        const cachedAnalysis = localStorage.getItem('animeAiProfile')
        if (cachedAnalysis) {
            try {
                setAiAnalysis(JSON.parse(cachedAnalysis))
            } catch (e) {
                console.error('Failed to parse cached AI profile', e)
            }
        }
    }, [])

    const fetchFavorites = async () => {
        try {
            setLoading(true)
            const data = await FavoritesService.getFavorites()
            setFavorites(data)
        } catch (error) {
            console.error('Failed to load favorites', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async (
        id: number,
        field: keyof FavoriteAnime,
        value: string | number
    ) => {
        const updatedFavorites = favorites.map(fav => {
            if (fav.id === id) {
                let newValue = value;
                if (field === 'progress' && fav.totalEpisodes && fav.totalEpisodes > 0) {
                    newValue = Math.min(fav.totalEpisodes, Math.max(0, value as number));
                }
                return { ...fav, [field]: newValue }
            }
            return fav
        })
        setFavorites(updatedFavorites)
        await saveToDb(id, updatedFavorites.find(f => f.id === id)!)
    }

    const saveToDb = async (id: number, fav: FavoriteAnime) => {
        try {
            setSavingId(id)
            await FavoritesService.updateFavoriteDetails(
                id,
                fav.status || 'PLANNING',
                fav.score || 0,
                fav.progress || 0
            )
        } catch (error) {
            console.error('Failed to save', error)
        } finally {
            setTimeout(() => setSavingId(null), 1000)
        }
    }

    const handleRemove = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation()
        try {
            await FavoritesService.removeFavorite(id)
            setFavorites(favorites.filter(f => f.id !== id))
        } catch (error) {
            console.error('Failed to remove favorite', error)
        }
    }

    const totalAnime = favorites.length

    const statusCounts = favorites.reduce((acc, fav) => {
        const status = fav.status || 'PLANNING'
        acc[status] = (acc[status] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const pieData = statusOptions.map(opt => ({
        name: opt.label,
        value: statusCounts[opt.value] || 0,
        color: opt.color
    })).filter(d => d.value > 0)

    const scoreData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => ({
        score: s.toString(),
        count: favorites.filter(f => Math.round(f.score || 0) === s).length
    }))

    const genreCounts = favorites.reduce((acc, fav) => {
        if (fav.genres && Array.isArray(fav.genres)) {
            fav.genres.forEach(genre => {
                const translated = apiToPolishGenre(genre)
                acc[translated] = (acc[translated] || 0) + 1
            })
        }
        return acc
    }, {} as Record<string, number>)

    const genreData = Object.entries(genreCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10) // Pokaż top 10 gatunków

    const genreColors = [
        '#00e5ff', '#bf00ff', '#ff007f', '#4caf50', '#ffb300',
        '#ff5722', '#2196f3', '#9c27b0', '#e91e63', '#009688'
    ]

    const handleRunAnalysis = async () => {
        const apiKey = ApiKeyService.getOpenRouterKey();
        if (!apiKey) {
            alert('Proszę najpierw dodać klucz OpenRouter w ustawieniach.');
            return;
        }

        try {
            setIsAnalyzing(true);
            const analysis = await analyzeAnimeProfile(
                favorites.map(f => ({
                    title: f.title,
                    genres: f.genres,
                    description: f.description || '',
                    score: f.score || 0,
                    status: f.status,
                    progress: f.progress || 0,
                    totalEpisodes: f.totalEpisodes || 0
                })),
                apiKey
            );
            setAiAnalysis(analysis);
            localStorage.setItem('animeAiProfile', JSON.stringify(analysis));
        } catch (error) {
            console.error('Analysis failed', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container" style={{ minHeight: '100vh' }}>
                <div className="neon-spinner purple"></div>
            </div>
        )
    }

    return (
        <div className="favorites-hub-container fade-in">
            <div className="favorites-hub-layout">
                {/* ---------- GŁÓWNA TREŚĆ (Statystyki + Lista) ---------- */}
                <div className="favorites-hub-main">
                    {totalAnime > 0 && (
                        <div className="hub-dashboard-header">
                            <div className="hub-chart-panel glass-panel">
                                <h3>Status Oglądania</h3>
                                <div className="chart-container-small">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={35}
                                                outerRadius={55}
                                                stroke="none"
                                                paddingAngle={4}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(20, 20, 30, 0.95)',
                                                    border: '1px solid rgba(191, 0, 255, 0.3)',
                                                    borderRadius: '8px',
                                                    color: '#fff'
                                                }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend
                                                iconSize={10}
                                                iconType="circle"
                                                wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="hub-chart-panel glass-panel">
                                <h3>Twoje Gatunki</h3>
                                <div className="chart-container-small">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={genreData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={35}
                                                outerRadius={55}
                                                stroke="none"
                                                paddingAngle={4}
                                            >
                                                {genreData.map((_, index) => (
                                                    <Cell key={`cell-genre-${index}`} fill={genreColors[index % genreColors.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(20, 20, 30, 0.95)',
                                                    border: '1px solid rgba(191, 0, 255, 0.3)',
                                                    borderRadius: '8px',
                                                    color: '#fff'
                                                }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend
                                                iconSize={10}
                                                iconType="circle"
                                                wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                                                layout="horizontal"
                                                verticalAlign="bottom"
                                                align="center"
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="hub-chart-panel glass-panel">
                                <h3>Rozkład Ocen</h3>
                                <div className="chart-container-small">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={scoreData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                            <XAxis dataKey="score" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                                            <Bar dataKey="count" fill="#bf00ff" radius={[4, 4, 0, 0]} />
                                            <RechartsTooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                contentStyle={{
                                                    backgroundColor: 'rgba(20, 20, 30, 0.95)',
                                                    border: '1px solid rgba(191, 0, 255, 0.3)',
                                                    borderRadius: '8px',
                                                    color: '#fff'
                                                }}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {favorites.length === 0 ? (
                        <div className="empty-state glass-panel">
                            <p>Twoja lista jest pusta.</p>
                            <button className="neon-btn" onClick={() => navigate('/anime')}>
                                Wróć do przeglądania
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="horizontal-stats-bar glass-panel-inner">
                                <Heart size={20} className="neon-text-purple" />
                                <h2>Twoja Kolekcja</h2>
                                <div className="hub-stats-badge" style={{ marginLeft: 'auto', marginTop: 0 }}>
                                    <span className="count">{totalAnime}</span>
                                    <span className="label">Tytułów</span>
                                </div>
                            </div>

                            <div className="favorites-list">
                                {favorites.map(anime => (
                                    <div key={anime.id} className="favorite-row glass-panel-inner">
                                        <div
                                            className="fav-cover clickable"
                                            onClick={() => navigate(`/anime/${anime.id}`)}
                                        >
                                            <img src={anime.coverImage} alt={anime.title} />
                                        </div>

                                        <div className="fav-info">
                                            <h3 onClick={() => navigate(`/anime/${anime.id}`)} className="clickable-title">
                                                {anime.title}
                                            </h3>

                                            <div className="fav-controls">
                                                <div className="control-group">
                                                    <label>Status</label>
                                                    <select
                                                        value={anime.status || 'PLANNING'}
                                                        onChange={(e) => handleUpdate(anime.id, 'status', e.target.value)}
                                                        className="neon-select"
                                                        style={{
                                                            borderLeftColor: statusOptions.find(o => o.value === anime.status)?.color || '#aaaaaa'
                                                        }}
                                                    >
                                                        {statusOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="control-group">
                                                    <label>Ocena (1-10)</label>
                                                    <div className="neon-number-wrapper">
                                                        <button className="num-btn" onClick={() => handleUpdate(anime.id, 'score', Math.max(0, (anime.score || 0) - 1))}><Minus size={14} /></button>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="10"
                                                            value={anime.score || 0}
                                                            onChange={(e) => handleUpdate(anime.id, 'score', Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                                                            className="new-neon-input"
                                                        />
                                                        <button className="num-btn" onClick={() => handleUpdate(anime.id, 'score', Math.min(10, (anime.score || 0) + 1))}><Plus size={14} /></button>
                                                    </div>
                                                </div>

                                                <div className="control-group">
                                                    <label>Odcinki</label>
                                                    <div className="neon-number-wrapper">
                                                        <button className="num-btn" onClick={() => handleUpdate(anime.id, 'progress', Math.max(0, (anime.progress || 0) - 1))}><Minus size={14} /></button>
                                                        <div className="progress-input-group">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={anime.totalEpisodes || 9999}
                                                                value={anime.progress || 0}
                                                                onChange={(e) => handleUpdate(anime.id, 'progress', parseInt(e.target.value) || 0)}
                                                                className="new-neon-input"
                                                            />
                                                            <span className="progress-divider">/</span>
                                                            <span className="total-eps">{anime.totalEpisodes || '?'}</span>
                                                        </div>
                                                        <button className="num-btn" onClick={() => handleUpdate(anime.id, 'progress', (anime.progress || 0) + 1)}><Plus size={14} /></button>
                                                    </div>
                                                </div>

                                                <div className="save-indicator">
                                                    {savingId === anime.id ? (
                                                        <span className="saving text-success fade-in"><Check size={16} /></span>
                                                    ) : (
                                                        <span className="text-muted"><Save size={16} /></span>
                                                    )}
                                                </div>
                                                <button
                                                    className="hub-delete-btn"
                                                    title="Usuń z Ulubionych"
                                                    onClick={(e) => handleRemove(e, anime.id)}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* ---------- PANEL BOCZNY (Analiza AI) ---------- */}
                {totalAnime > 0 && (
                    <div className="favorites-hub-side">
                        <div className="hub-analysis-panel glass-panel">
                            <h2 className="sidebar-analysis-title">Analiza Listy</h2>

                            {!aiAnalysis && !isAnalyzing && (
                                <p className="sidebar-analysis-desc">
                                    Dowiedz się, jakim typem fana jesteś! Kliknij przycisk poniżej, aby Sztuczna Inteligencja przeanalizowała Twoją listę anime i wygenerowała Twój unikalny profil widza.
                                </p>
                            )}

                            <button
                                className={`analysis-trigger-btn glass-panel ${isAnalyzing ? 'analyzing' : ''} ${aiAnalysis ? 'has-results' : ''}`}
                                onClick={handleRunAnalysis}
                                disabled={isAnalyzing}
                            >
                                <Sparkles size={32} className="neon-text-purple" />
                                <span>{aiAnalysis ? 'Odśwież Analizę' : 'Generuj Profil Fana'}</span>
                            </button>

                            {isAnalyzing && !aiAnalysis && (
                                <div className="analysis-loading">
                                    <div className="neon-spinner purple"></div>
                                    <p>Sztuczna Inteligencja bada Twoje wybory...</p>
                                </div>
                            )}

                            {aiAnalysis && (
                                <div className="analysis-results analysis-scroll-area">
                                    <div className="verdict-badge neon-border-purple">
                                        {aiAnalysis.verdictTag}
                                    </div>
                                    <h3 className="analysis-title">{aiAnalysis.title}</h3>
                                    <div className="markdown-content">
                                        <ReactMarkdown>{aiAnalysis.content}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
