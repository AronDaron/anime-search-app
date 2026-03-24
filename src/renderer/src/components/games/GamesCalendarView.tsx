import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar as CalendarIcon, ChevronLeft, Info } from 'lucide-react'
import { getSteamStoreFeaturedCategories, getSteamPopularComingSoon, getRecentSteamHits, getMultipleSteamAppDetails, SteamAppDetails } from '../../api/steamStore'
import './GamesCalendarView.css'

interface CalendarDay {
    date: Date
    games: SteamAppDetails[]
    isPast: boolean
}

export const GamesCalendarView: React.FC = () => {
    const navigate = useNavigate()
    const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchCalendarData = async () => {
            setIsLoading(true)
            try {
                // Pobieramy nadchodzące gry, hity ze SteamSpy, oraz OFICJALNE nowości ze Steama (najświeższe)
                const [comingSoonIds, recentHitGames, featured] = await Promise.all([
                    getSteamPopularComingSoon(50),
                    getRecentSteamHits(),
                    getSteamStoreFeaturedCategories()
                ])

                const recentHitIds = recentHitGames.map(g => g.id)
                const featuredNewIds = featured?.new_releases?.items?.map(g => g.id) || []
                const featuredTopIds = featured?.top_sellers?.items?.map(g => g.id) || []
                
                // Łączymy wszystkie źródła by pokryć i wczoraj, i jutro
                const allAppIds = Array.from(new Set([...comingSoonIds, ...featuredNewIds, ...featuredTopIds, ...recentHitIds])).slice(0, 100)

                if (allAppIds.length === 0) {
                    setCalendarDays(generateEmptyCalendar())
                    setIsLoading(false)
                    return
                }

                // Pobieramy detale dla gier w języku angielskim, aby mieć dane o dacie premiery zdatne do parsowania
                const details = await getMultipleSteamAppDetails(allAppIds, 'english')

                const days = generateCalendarDays(details)
                setCalendarDays(days)
            } catch (err) {
                console.error('Failed to fetch calendar games:', err)
                setError('Nie udało się pobrać danych kalendarza.')
            } finally {
                setIsLoading(false)
            }
        }

        fetchCalendarData()
    }, [])

    const generateEmptyCalendar = (): CalendarDay[] => {
        const days: CalendarDay[] = []
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        // Dni od -2 (przedwczoraj) do 6 (za 6 dni) = razem 9 dni
        for (let i = -2; i <= 6; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() + i)
            days.push({ date, games: [], isPast: i < 0 })
        }
        return days
    }

    const generateCalendarDays = (games: SteamAppDetails[]): CalendarDay[] => {
        const days: CalendarDay[] = []
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (let i = -2; i <= 6; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() + i)
            const isPast = i < 0

            const dayGames = games.filter(game => {
                if (!game.release_date || !game.release_date.date) return false

                try {
                    // Steam w 'english' podaje np. "Mar 2, 2026" lub "2 Mar, 2026"
                    const releaseDate = new Date(game.release_date.date)

                    if (isNaN(releaseDate.getTime())) return false

                    return releaseDate.toDateString() === date.toDateString()
                } catch (e) {
                    return false
                }
            })

            days.push({ date, games: dayGames, isPast })
        }
        return days
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })
    }

    const getDayName = (date: Date) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const diffHours = (date.getTime() - today.getTime()) / (1000 * 3600)
        
        if (Math.abs(diffHours) < 24 && date.getDate() === today.getDate()) {
            return date.toLocaleDateString('pl-PL', { weekday: 'long' }) + ' (Dzisiaj)'
        }
        if (date < today && Math.abs(diffHours) < 48 && date.getDate() === today.getDate() - 1) {
            return date.toLocaleDateString('pl-PL', { weekday: 'long' }) + ' (Wczoraj)'
        }
        if (date < today && Math.abs(diffHours) < 72 && date.getDate() === today.getDate() - 2) {
            return date.toLocaleDateString('pl-PL', { weekday: 'long' }) + ' (Przedwczoraj)'
        }
        
        return date.toLocaleDateString('pl-PL', { weekday: 'long' })
    }

    return (
        <div className="games-calendar-container fade-in">
            <header className="calendar-header">
                <div className="header-left">
                    <button className="calendar-back-btn" onClick={() => navigate('/games')}>
                        <ChevronLeft size={20} />
                        <span>Wróć</span>
                    </button>
                </div>

                <div className="header-center">
                    <CalendarIcon className="header-icon" />
                    <h1>Kalendarz Premier</h1>
                </div>

                <div className="header-right">
                    <div className="header-info">
                        <Info size={16} />
                        <span>Ostatnie 48h i najbliższe 7 dni</span>
                    </div>
                </div>
            </header>

            {isLoading ? (
                <div className="loading-state">
                    <div className="neon-spinner green"></div>
                    <p>Generowanie kalendarza premier...</p>
                </div>
            ) : error ? (
                <div className="error-state">
                    <p>{error}</p>
                </div>
            ) : (
                <div className="calendar-grid">
                    {calendarDays.map((day, index) => (
                        <div key={index} className={`calendar-day-card ${day.games.length > 0 ? 'has-games' : ''} ${day.isPast ? 'past-day' : ''}`}>
                            <div className="day-info">
                                <span className={`day-name ${day.isPast ? 'past-text' : ''}`}>
                                    {getDayName(day.date)}
                                </span>
                                <span className="day-date">{formatDate(day.date)}</span>
                                {day.isPast && <div className="past-label">Już dostępne!</div>}
                            </div>
                            <div className="day-games-list">
                                {day.games.length > 0 ? (
                                    day.games.map(game => (
                                        <div
                                            key={game.steam_appid}
                                            className="mini-game-card"
                                            onClick={() => navigate(`/games/${game.steam_appid}`)}
                                        >
                                            <img src={game.header_image} alt={game.name} className="mini-capsule" />
                                            <div className="mini-details">
                                                <span className="mini-title" title={game.name}>{game.name}</span>
                                                {game.price_overview ? (
                                                    <span className="mini-price">{game.price_overview.final_formatted}</span>
                                                ) : (
                                                    <span className="mini-price-soon">Wkrótce</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-games-hint">Brak premier</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
