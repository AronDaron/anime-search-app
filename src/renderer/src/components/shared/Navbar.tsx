import { Search as SearchIcon, Sparkles, Settings, Heart } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import './Navbar.css'

interface NavbarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  isAiMode: boolean
  setIsAiMode: (ai: boolean) => void
  onOpenSettings: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ searchQuery, setSearchQuery, isAiMode, onOpenSettings }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname
  const isGamesSection = path.startsWith('/games')
  const currentSectionPath = isGamesSection ? '/games' : '/anime'

  const goHome = () => {
    setSearchQuery('')
    navigate(currentSectionPath)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    if (val.trim().length > 0 && location.pathname !== currentSectionPath) {
      navigate(currentSectionPath)
    }
  }

  return (
    <nav className="navbar glass-panel">
      <div className="navbar-container">
        <div className="navbar-brand-group">
          <div className="navbar-logo" onClick={goHome}>
            <span className="logo-text-gradient">NEO</span>
          </div>

          <div className="navbar-switcher">
            <button
              className={`switcher-btn ${!isGamesSection ? 'active' : ''}`}
              onClick={() => navigate('/anime')}
            >
              Anime
            </button>
            <button
              className={`switcher-btn ${isGamesSection ? 'active' : ''}`}
              onClick={() => navigate('/games')}
            >
              Gry
            </button>
            <div className={`switcher-slider ${isGamesSection ? 'slide-right' : ''}`} />
          </div>
        </div>

        <div
          className="search-container"
          style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}
        >
          <div
            className={`search-bar ${isAiMode ? 'ai-active' : ''}`}
            style={
              isAiMode ? { borderColor: '#bf00ff', boxShadow: '0 0 10px rgba(191,0,255,0.3)' } : {}
            }
          >
            {isAiMode ? (
              <Sparkles className="search-icon" size={20} color="#bf00ff" />
            ) : (
              <SearchIcon className="search-icon" size={20} />
            )}
            <input
              type="text"
              className="search-input"
              placeholder={
                isAiMode
                  ? isGamesSection
                    ? 'Opisz grę... (np. RPG w kosmosie)'
                    : 'Opisz fabułę... (np. magowie pocztowi)'
                  : isGamesSection
                    ? 'Szukaj gry... (np. Cyberpunk 2077)'
                    : 'Szukaj anime... (np. Jujutsu Kaisen)'
              }
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        <div className="navbar-menu">
          <button
            className={`nav-btn nav-btn-ai ${path.includes('/ai-search') ? 'active' : ''}`}
            onClick={() => {
              navigate(isGamesSection ? '/games/ai-search' : '/anime/ai-search')
              setSearchQuery('')
            }}
            title="Wyszukiwanie AI"
          >
            Wyszukiwanie AI
          </button>

          {!isGamesSection ? (
            <>
              <button
                className={`nav-btn ${path === '/anime/filter-search' ? 'active' : ''}`}
                onClick={() => navigate('/anime/filter-search')}
                title="ZAAWANSOWANE WYSZUKIWANIE"
              >
                Wyszukiwanie
              </button>
              <button
                className={`nav-btn ${path === '/anime/genres' ? 'active' : ''}`}
                onClick={() => navigate('/anime/genres')}
              >
                Gatunki
              </button>
              <button
                className={`nav-btn ${path === '/anime/seasons' ? 'active' : ''}`}
                onClick={() => navigate('/anime/seasons')}
              >
                Sezony
              </button>
              <button
                className={`nav-btn nav-btn-favorites ${path === '/anime/favorites' ? 'active' : ''}`}
                onClick={() => navigate('/anime/favorites')}
                title="Moja Lista"
              >
                <Heart size={16} style={{ marginRight: '6px', marginBottom: '-3px' }} />
                Moja Lista
              </button>
            </>
          ) : (
            <>
              <button
                className={`nav-btn ${path === '/games/filter-search' ? 'active' : ''}`}
                onClick={() => navigate('/games/filter-search')}
                title="ZAAWANSOWANE WYSZUKIWANIE"
              >
                Wyszukiwanie
              </button>
              <button
                className={`nav-btn ${path === '/games/deals' ? 'active' : ''}`}
                onClick={() => navigate('/games/deals')}
              >
                Promocje
              </button>
              <button
                className={`nav-btn ${path === '/games/calendar' ? 'active' : ''}`}
                onClick={() => navigate('/games/calendar')}
              >
                Kalendarz
              </button>
              <button
                className={`nav-btn ${path === '/games/profile-analyzer' ? 'active' : ''}`}
                onClick={() => navigate('/games/profile-analyzer')}
              >
                Analiza Konta
              </button>
              <button
                className={`nav-btn ${path === '/games/recommendations' ? 'active' : ''}`}
                onClick={() => navigate('/games/recommendations')}
              >
                Rekomendacje AI
              </button>
            </>
          )}

          <button className="nav-btn btn-home-accent" onClick={goHome}>
            Główna
          </button>

          <button
            className="nav-btn nav-btn-settings"
            onClick={onOpenSettings}
            title="Ustawienia API"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </nav>
  )
}
