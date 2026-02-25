import * as React from 'react'
import { Search as SearchIcon, Sparkles, ChevronDown } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import './Navbar.css'

interface NavbarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  isAiMode: boolean
  setIsAiMode: (ai: boolean) => void
}

export const Navbar: React.FC<NavbarProps> = ({ searchQuery, setSearchQuery, isAiMode }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const path = location.pathname
  let currentSection = { name: 'ANIME', color: 'cyan', path: '/anime' }
  if (path.startsWith('/games')) currentSection = { name: 'GRY', color: 'green', path: '/games' }

  const sections = [
    { name: 'ANIME', color: 'cyan', path: '/anime' },
    { name: 'GRY', color: 'green', path: '/games' }
  ]

  const handleSectionChange = (sectionPath: string) => {
    setIsDropdownOpen(false)
    navigate(sectionPath)
  }

  const goHome = () => {
    setSearchQuery('')
    navigate(currentSection.path)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    if (val.trim().length > 0 && location.pathname !== currentSection.path) {
      navigate(currentSection.path)
    }
  }

  return (
    <nav className="navbar glass-panel">
      <div className="navbar-container">
        <div className="navbar-brand" ref={dropdownRef}>
          <div className="brand-current" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <span className={`logo-text neon-text-${currentSection.color}`}>NEO</span>
            <span className="logo-text-sub">{currentSection.name}</span>
            <ChevronDown size={20} className={`dropdown-icon ${isDropdownOpen ? 'open' : ''}`} />
          </div>

          {isDropdownOpen && (
            <div className="dropdown-menu glass-panel">
              {sections.map((section) => (
                <div
                  key={section.name}
                  className="dropdown-item"
                  onClick={() => handleSectionChange(section.path)}
                >
                  <span className={`logo-text neon-text-${section.color}`}>NEO</span>
                  <span className="logo-text-sub">{section.name}</span>
                </div>
              ))}
            </div>
          )}
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
                  ? 'Opisz fabułę... (np. magowie pocztowi)'
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
              navigate(currentSection.name === 'ANIME' ? '/anime/ai-search' : '/games/ai-search')
              setIsDropdownOpen(false)
              setSearchQuery('')
            }}
            title="Wyszukiwanie AI"
          >
            Wyszukiwanie AI
          </button>

          {currentSection.name === 'ANIME' ? (
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
                className={`nav-btn ${path === '/games/bestsellers' ? 'active' : ''}`}
                onClick={() => navigate('/games/bestsellers')}
              >
                Bestsellery
              </button>
              <button
                className={`nav-btn ${path === '/games/deals' ? 'active' : ''}`}
                onClick={() => navigate('/games/deals')}
              >
                Promocje
              </button>
              <button
                className={`nav-btn ${path === '/games/genres' ? 'active' : ''}`}
                onClick={() => navigate('/games/genres')}
              >
                Gatunki
              </button>
              <button
                className={`nav-btn ${path === '/games/new' ? 'active' : ''}`}
                onClick={() => navigate('/games/new')}
              >
                Nowości
              </button>
            </>
          )}

          <button className="nav-btn btn-home-accent" onClick={goHome}>
            Główna
          </button>
        </div>
      </div>
    </nav>
  )
}
