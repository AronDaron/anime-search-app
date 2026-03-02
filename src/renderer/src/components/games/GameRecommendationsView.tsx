import React, { useState } from 'react'
import { getSteamOwnedGames, getSteamGameExtendedStats, getSteamGameDetails, searchSteamGames, getRecentSteamHits } from '../../api/steamStore'
import { fetchAIRecommendations, GameRecommendation, generateRecommendedTitles } from '../../api/ai'
import { ApiKeyService } from '../../api/apiKeyService'
import { Search, Sparkles, AlertCircle, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './GameRecommendationsView.css'

export const GameRecommendationsView: React.FC = () => {
    const [steamId, setSteamId] = useState('')
    const [yearFilter, setYearFilter] = useState<'all' | '2015'>('all')
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [recommendations, setRecommendations] = useState<GameRecommendation[]>([])
    const navigate = useNavigate()

    const handleGetRecommendations = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!steamId.trim()) return

        setLoading(true)
        setError(null)
        setRecommendations([])
        setStatus('Pobieranie Twojej biblioteki Steam...')

        try {
            const apiKey = ApiKeyService.getOpenRouterKey()
            if (!apiKey) {
                throw new Error('Brak klucza API OpenRouter. Dodaj go w ustawieniach aplikacji.')
            }

            const ownedGames = await getSteamOwnedGames(steamId.trim())

            if (!ownedGames || ownedGames.length === 0) {
                throw new Error('Nie znaleziono gier. Upewnij się, że Twoje Steam ID jest poprawne i profil jest publiczny.')
            }

            // 1. Analiza gier użytkownika
            setStatus('Analizowanie Twojej biblioteki...')
            const topPlayed = [...ownedGames]
                .sort((a, b) => b.playtime_forever - a.playtime_forever)
                .slice(0, 15)

            const ownedAppIds = new Set(ownedGames.map(g => g.appid))
            const ownedGamesString = topPlayed.map(g => g.name).join(', ')

            // 2. AI Discovery + Real-time Discovery
            setStatus('Szukanie klasyków i najnowszych hitów...')

            const [suggestedTitles, recentHits] = await Promise.all([
                generateRecommendedTitles(ownedGamesString, apiKey, yearFilter),
                getRecentSteamHits()
            ])

            if ((!suggestedTitles || suggestedTitles.length === 0) && recentHits.length === 0) {
                throw new Error('Nie udało się znaleźć żadnych propozycji. Spróbuj później.')
            }

            // 3. Weryfikacja i pobieranie danych dla wszystkich kandydatów
            const matchedCandidates: { id: number; name: string; tags: string[]; year?: number }[] = []

            // 3a. Przetwarzanie propozycji AI (wymagają wyszukania AppID)
            if (suggestedTitles && suggestedTitles.length > 0) {
                setStatus(`Weryfikacja pomysłów AI...`)
                for (let i = 0; i < suggestedTitles.length; i += 10) {
                    const chunk = suggestedTitles.slice(i, i + 10)
                    const chunkResults = await Promise.all(chunk.map(async title => {
                        try {
                            const searchResults = await searchSteamGames(title)
                            if (searchResults && searchResults.length > 0) {
                                const bestMatch = searchResults.find(r => !ownedAppIds.has(r.id))
                                if (bestMatch) {
                                    const [stats, details] = await Promise.all([
                                        getSteamGameExtendedStats(bestMatch.id),
                                        getSteamGameDetails(bestMatch.id)
                                    ])
                                    let year: number | undefined = undefined
                                    if (details?.release_date?.date) {
                                        const yearMatch = details.release_date.date.match(/\d{4}/)
                                        if (yearMatch) year = parseInt(yearMatch[0])
                                    }
                                    return { id: bestMatch.id, name: bestMatch.name, tags: stats?.tags ? Object.keys(stats.tags).slice(0, 8) : [], year }
                                }
                            }
                            return null
                        } catch (e) { return null }
                    }))
                    matchedCandidates.push(...chunkResults.filter((c): c is NonNullable<typeof c> => c !== null))
                }
            }

            // 3b. Przetwarzanie nowości ze Steama (AppID już mamy)
            if (recentHits && recentHits.length > 0) {
                setStatus('Analizowanie nowości rynkowych pod Twój gust...')
                const freshHits = recentHits.filter(h => !ownedAppIds.has(h.id)).slice(0, 30)
                for (let i = 0; i < freshHits.length; i += 10) {
                    const chunk = freshHits.slice(i, i + 10)
                    const chunkResults = await Promise.all(chunk.map(async hit => {
                        try {
                            const [stats, details] = await Promise.all([
                                getSteamGameExtendedStats(hit.id),
                                getSteamGameDetails(hit.id)
                            ])
                            let year: number | undefined = undefined
                            if (details?.release_date?.date) {
                                const yearMatch = details.release_date.date.match(/\d{4}/)
                                if (yearMatch) year = parseInt(yearMatch[0])
                            }
                            return { id: hit.id, name: hit.name, tags: stats?.tags ? Object.keys(stats.tags).slice(0, 8) : [], year }
                        } catch (e) { return null }
                    }))
                    matchedCandidates.push(...chunkResults.filter((c): c is NonNullable<typeof c> => c !== null))
                }
            }

            // Usuń ewentualne duplikaty między listami
            const uniqueMatched = Array.from(new Map(matchedCandidates.map(c => [c.id, c])).values())

            if (uniqueMatched.length < 5) {
                throw new Error('Nie udało się dopasować wystarczającej liczby gier. Spróbuj ponownie.')
            }

            // 4. Final Ranking: AI wybiera Top 12
            setStatus('Sztuczna Inteligencja miksuje nowości z klasykami...')

            let finalCandidates = uniqueMatched
            if (yearFilter === '2015') {
                finalCandidates = uniqueMatched.filter(c => !c.year || c.year >= 2015)
            }

            // Przesyłamy większą pulę do AI (do 60 gier), aby mogło wybrać najlepsze, w tym nowości
            const aiResult = await fetchAIRecommendations(ownedGamesString, finalCandidates.slice(0, 60), apiKey, yearFilter)

            if (!aiResult || aiResult.length === 0) {
                throw new Error('Wystąpił błąd podczas finalnego szeregowania gier.')
            }

            setRecommendations(aiResult)

        } catch (err: any) {
            setError(err.message || 'Wystąpił nieoczekiwany błąd podczas generowania rekomendacji.')
            console.error('Recommendation Error:', err)
        } finally {
            setLoading(false)
            setStatus('')
        }
    }

    return (
        <div className="recommendations-container fade-in">
            <header className="recommendations-header">
                <h1 className="games-title">Osobiste Rekomendacje AI</h1>
                <p className="recommendations-subtitle">System hybrydowy: łączymy wiedzę AI z najgorętszymi nowościami rynkowymi ze Steama.</p>
            </header>

            <div className="recommendations-form-glass glass-panel-inner">
                <form onSubmit={handleGetRecommendations} className="recommendations-form">
                    <div className="input-wrapper">
                        <Search className="input-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Twoje Steam ID64 (7656119...)"
                            value={steamId}
                            onChange={(e) => setSteamId(e.target.value)}
                            className="steam-id-input"
                        />
                    </div>

                    <div className="filter-selector">
                        <button
                            type="button"
                            className={`filter-btn ${yearFilter === 'all' ? 'active all' : ''}`}
                            onClick={() => setYearFilter('all')}
                        >
                            Wszystkie gry
                        </button>
                        <button
                            type="button"
                            className={`filter-btn ${yearFilter === '2015' ? 'active newer' : ''}`}
                            onClick={() => setYearFilter('2015')}
                        >
                            Tylko po 2015 r.
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="recommendations-submit-btn"
                        disabled={loading || !steamId.trim()}
                    >
                        {loading ? 'Analizowanie...' : 'Odkryj Moje Gry'}
                    </button>
                </form>

                <div className="info-alert">
                    <AlertCircle size={16} />
                    <small>Upewnij się, że profil i szczegóły gier są <b>Publiczne</b>.</small>
                </div>
            </div>

            {loading && (
                <div className="loading-state">
                    <div className="neon-spinner purple"></div>
                    <p style={{ color: 'var(--neon-purple)', fontWeight: 600 }}>{status}</p>
                </div>
            )}

            {error && (
                <div className="error-message glass-panel-inner">
                    <AlertCircle size={24} color="#ff4d4d" />
                    <p>{error}</p>
                </div>
            )}

            {recommendations.length > 0 && !loading && (
                <div className="recommendation-grid">
                    {recommendations.map((rec, idx) => (
                        <div key={rec.appid} className="recommendation-card">
                            <div className="card-number">#{idx + 1}</div>
                            <img
                                src={`https://cdn.akamai.steamstatic.com/steam/apps/${rec.appid}/header.js?t=1`}
                                alt={rec.name}
                                className="card-header-img"
                                onError={(e) => { (e.target as HTMLImageElement).src = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${rec.appid}/capsule_616x353.jpg` }}
                            />
                            <div className="card-content">
                                <h3 className="card-title">{rec.name}</h3>
                                <p className="card-justification">
                                    <Sparkles size={14} style={{ marginRight: '6px', color: 'var(--neon-purple)' }} />
                                    {rec.justification}
                                </p>
                                <div className="card-footer">
                                    <button
                                        className="view-details-btn"
                                        onClick={() => navigate(`/games/${rec.appid}`)}
                                    >
                                        Szczegóły
                                    </button>
                                    <a
                                        href={`https://store.steampowered.com/app/${rec.appid}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="external-link"
                                        title="Otwórz na Steam"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
