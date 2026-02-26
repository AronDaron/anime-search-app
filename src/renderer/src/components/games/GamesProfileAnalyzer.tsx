import React, { useState } from 'react'
import { getSteamOwnedGames, SteamOwnedGame } from '../../api/steamStore'
import { analyzePlayerProfile, AIProfileAnalysis } from '../../api/ai'
import { Search, Flame, Brain, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import './GamesProfileAnalyzer.css'

export const GamesProfileAnalyzer: React.FC = () => {
    const [steamId, setSteamId] = useState('')
    const [mode, setMode] = useState<'roast' | 'serious'>('roast')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [analysis, setAnalysis] = useState<AIProfileAnalysis | null>(null)
    const [topGames, setTopGames] = useState<SteamOwnedGame[]>([])

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!steamId.trim()) return

        setLoading(true)
        setError(null)
        setAnalysis(null)
        setTopGames([])

        try {
            const apiKey = import.meta.env.VITE_OPENROUTER_KEY
            if (!apiKey) {
                throw new Error('Brak klucza API OpenRouter (VITE_OPENROUTER_KEY) w zmiennych środowiskowych.')
            }

            const ownedGames = await getSteamOwnedGames(steamId.trim())

            if (!ownedGames || ownedGames.length === 0) {
                throw new Error('Nie znaleziono gier. Upewnij się, że podane Steam ID jest poprawne, a profil Steam (Szczegóły gier) jest ustawiony jako publiczny.')
            }

            const sortedGames = [...ownedGames]
                .sort((a, b) => b.playtime_forever - a.playtime_forever)
                .slice(0, 15)
                .filter(g => g.playtime_forever > 0)

            if (sortedGames.length === 0) {
                throw new Error('Użytkownik ma na koncie gry, ale 0 przegranych godzin.')
            }

            setTopGames(sortedGames)

            const payloadGames = sortedGames.map(g => ({
                name: g.name,
                playtimeMinutes: g.playtime_forever
            }))

            const aiResult = await analyzePlayerProfile(payloadGames, mode, apiKey)
            setAnalysis(aiResult)

        } catch (err: any) {
            setError(err.message || 'Wystąpił nieznany błąd podczas analizy.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="profile-analyzer-container fade-in">
            <header className="analyzer-header">
                <h1 className="games-title">Analizator Konta Steam</h1>
                <p className="analyzer-subtitle">Wpisz swoje Steam ID64, aby sztuczna inteligencja prześwietliła Twój gust z bezlitosną szczerością (lub nie).</p>
            </header>

            <div className="analyzer-form-glass glass-panel-inner">
                <form onSubmit={handleAnalyze} className="analyzer-form">
                    <div className="input-wrapper">
                        <Search className="input-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Wprowadź 17-cyfrowe Steam ID64 (np. 76561197960287930)..."
                            value={steamId}
                            onChange={(e) => setSteamId(e.target.value)}
                            className="steam-id-input"
                        />
                    </div>

                    <div className="mode-selector">
                        <button
                            type="button"
                            className={`mode-btn ${mode === 'roast' ? 'active roast' : ''}`}
                            onClick={() => setMode('roast')}
                        >
                            <Flame size={18} /> Bezlitosny Roast
                        </button>
                        <button
                            type="button"
                            className={`mode-btn ${mode === 'serious' ? 'active serious' : ''}`}
                            onClick={() => setMode('serious')}
                        >
                            <Brain size={18} /> Poważna Analiza
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="analyze-submit-btn"
                        disabled={loading || !steamId.trim()}
                    >
                        {loading ? 'Skanowanie umysłu gracza...' : 'Rozpocznij Analizę'}
                    </button>
                </form>

                <div className="info-alert">
                    <AlertCircle size={16} />
                    <small>Uwaga: Twój profil Steam oraz "Szczegóły gier" muszą być ustawione jako <b>Publiczne</b> w ustawieniach prywatności Steama.</small>
                </div>
            </div>

            {loading && (
                <div className="loading-state">
                    <div className={`neon-spinner ${mode === 'roast' ? 'orange' : 'cyan'}`}></div>
                    <p>Ładowanie Top 15 gier i generowanie analizy...</p>
                </div>
            )}

            {error && (
                <div className="error-message glass-panel-inner">
                    <AlertCircle size={24} color="#ff4d4d" />
                    <p>{error}</p>
                </div>
            )}

            {analysis && !loading && (
                <div className="analysis-result-bento">
                    <div className={`analysis-card main-analysis ${mode === 'roast' ? 'roast-theme' : 'serious-theme'}`}>
                        <div className="analysis-card-header">
                            <h2>{analysis.title}</h2>
                            <span className="verdict-badge">{analysis.verdictTag}</span>
                        </div>
                        <div className="analysis-markdown-content">
                            <ReactMarkdown>{analysis.content}</ReactMarkdown>
                        </div>
                    </div>

                    <div className="analysis-card top-games-list">
                        <h3>Podstawy Dowodowe (Top 15)</h3>
                        <div className="games-list-scroller">
                            {topGames.map((game, idx) => (
                                <div key={game.appid} className="analyzed-game-item">
                                    <span className="rank-num">#{idx + 1}</span>
                                    <img src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`} alt={game.name} className="game-micro-icon" onError={(e) => { (e.target as HTMLImageElement).src = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appid}/capsule_sm_120.jpg` }} />
                                    <div className="analyzed-game-info">
                                        <span className="game-name">{game.name}</span>
                                        <span className="game-time">{Math.round(game.playtime_forever / 60)} godz.</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
