import * as React from 'react'
import { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Navbar } from './components/shared/Navbar'
import { Home } from './components/anime/Home'
import { Search } from './components/anime/Search'
import { AnimeDetails } from './components/anime/AnimeDetails'
import { GenresView } from './components/anime/GenresView'
import { SeasonsView } from './components/anime/SeasonsView'
import { FilterSearchView } from './components/anime/FilterSearchView'
import { AISearchView } from './views/AISearchView'
import { AnimeFavoritesHub } from './components/anime/AnimeFavoritesHub'
import { GamesHome } from './components/games/GamesHome'
import { GameDetails } from './components/games/GameDetails'
import { GameGenresView } from './components/games/GameGenresView'
import { GameSearch } from './components/games/GameSearch'
import { GameFilterSearchView } from './components/games/GameFilterSearchView'
import { GamesPriceTieredView } from './components/games/GamesPriceTieredView'
import { GamesProfileAnalyzer } from './components/games/GamesProfileAnalyzer'
import { GameRecommendationsView } from './components/games/GameRecommendationsView'
import { GamesCalendarView } from './components/games/GamesCalendarView'
import { SettingsModal } from './components/shared/SettingsModal'
import './assets/index.css'

// Force TS server refresh 2

function App(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')
  const [isAiMode, setIsAiMode] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const location = useLocation()

  const isGames = location.pathname.startsWith('/games')

  return (
    <div className={`app-layout ${isGames ? 'theme-games' : ''}`}>
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isAiMode={isAiMode}
        setIsAiMode={setIsAiMode}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/anime" replace />} />

          <Route
            path="/anime"
            element={
              searchQuery.trim().length > 0 ? (
                <Search searchQuery={searchQuery} isAiMode={isAiMode} />
              ) : (
                <Home />
              )
            }
          />
          <Route path="/anime/:id" element={<AnimeDetails />} />
          <Route path="/anime/genres" element={<GenresView />} />
          <Route path="/anime/seasons" element={<SeasonsView />} />
          <Route path="/anime/filter-search" element={<FilterSearchView />} />
          <Route path="/anime/ai-search" element={<AISearchView domain="anime" />} />
          <Route path="/anime/favorites" element={<AnimeFavoritesHub />} />

          <Route
            path="/games"
            element={
              searchQuery.trim().length > 0 ? (
                <GameSearch searchQuery={searchQuery} />
              ) : (
                <GamesHome />
              )
            }
          />
          <Route path="/games/ai-search" element={<AISearchView domain="games" />} />
          <Route path="/games/deals" element={<GamesPriceTieredView title="Promocje Steam" categoryType="deals" />} />
          <Route path="/games/genres" element={<GameGenresView />} />
          <Route path="/games/filter-search" element={<GameFilterSearchView />} />
          <Route path="/games/new" element={<GamesPriceTieredView title="Nowości na Steam" categoryType="new" />} />
          <Route path="/games/calendar" element={<GamesCalendarView />} />
          <Route path="/games/profile-analyzer" element={<GamesProfileAnalyzer />} />
          <Route path="/games/recommendations" element={<GameRecommendationsView />} />
          {/* Dynamic route must be last in the /games group */}
          <Route path="/games/:id" element={<GameDetails />} />
        </Routes>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}

export default App
