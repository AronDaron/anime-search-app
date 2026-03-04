import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Save, Check, Plus, Minus, Trash2 } from 'lucide-react'
import { FavoritesService } from '../../api/favoritesService'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'
import './AnimeFavoritesHub.css'

interface FavoriteAnime {
    id: number
    title: string
    coverImage: string
    status: string
    score: number | null
    progress: number | null
    addedAt: string
}

const statusOptions = [
    { value: 'PLANNING', label: 'Planowane', color: '#aaaaaa' },
    { value: 'CURRENT', label: 'Oglądane', color: '#00e5ff' },
    { value: 'COMPLETED', label: 'Ukończone', color: '#4caf50' },
    { value: 'PAUSED', label: 'Wstrzymane', color: '#ffb300' },
    { value: 'DROPPED', label: 'Porzucone', color: '#ff007f' }
]

export const AnimeFavoritesHub: React.FC = () => {
    const navigate = useNavigate()
    const [favorites, setFavorites] = useState<FavoriteAnime[]>([])
    const [loading, setLoading] = useState(true)
    const [savingId, setSavingId] = useState<number | null>(null)

    useEffect(() => {
        fetchFavorites()
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
                return { ...fav, [field]: value }
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

    if (loading) {
        return (
            <div className="loading-container" style={{ minHeight: '100vh' }}>
                <div className="neon-spinner purple"></div>
            </div>
        )
    }

    return (
        <div className="favorites-hub-container fade-in">
            <div className="hub-dashboard-header">
                <div className="hub-title-section glass-panel">
                    <Heart size={36} className="neon-text-purple" />
                    <h1>Moja Lista</h1>
                    <div className="hub-stats-badge">
                        <span className="count">{totalAnime}</span>
                        <span className="label">Tytułów</span>
                    </div>
                </div>

                {totalAnime > 0 && (
                    <>
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
                                            outerRadius={50}
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
                    </>
                )}
            </div>

            {favorites.length === 0 ? (
                <div className="empty-state glass-panel">
                    <p>Twoja lista jest pusta.</p>
                    <button className="neon-btn" onClick={() => navigate('/anime')}>
                        Wróć do przeglądania
                    </button>
                </div>
            ) : (
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
                                            <input
                                                type="number"
                                                min="0"
                                                value={anime.progress || 0}
                                                onChange={(e) => handleUpdate(anime.id, 'progress', Math.max(0, parseInt(e.target.value) || 0))}
                                                className="new-neon-input"
                                            />
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
            )}
        </div>
    )
}
