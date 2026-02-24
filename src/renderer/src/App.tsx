import * as React from 'react';
import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/shared/Navbar';
import { Home } from './components/anime/Home';
import { Search } from './components/anime/Search';
import { AnimeDetails } from './components/anime/AnimeDetails';
import { GenresView } from './components/anime/GenresView';
import { SeasonsView } from './components/anime/SeasonsView';
import { PlaceholderSection } from './components/shared/PlaceholderSection';
import './assets/index.css';

// Force TS server refresh

function App(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);

  return (
    <div className="app-layout">
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isAiMode={isAiMode}
        setIsAiMode={setIsAiMode}
      />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/anime" replace />} />

          <Route path="/anime" element={
            searchQuery.trim().length > 0 ? (
              <Search searchQuery={searchQuery} isAiMode={isAiMode} />
            ) : (
              <Home />
            )
          } />
          <Route path="/anime/:id" element={<AnimeDetails />} />
          <Route path="/anime/genres" element={<GenresView />} />
          <Route path="/anime/seasons" element={<SeasonsView />} />

          <Route path="/series" element={<PlaceholderSection title="Neo Seriale" colorClass="neon-text-purple" />} />
          <Route path="/movies" element={<PlaceholderSection title="Neo Filmy" colorClass="neon-text-red" />} />
          <Route path="/games" element={<PlaceholderSection title="Neo Gry" colorClass="neon-text-green" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
