import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAnimeDetails,
  getAnimeEpisodesFromJikan,
  AnimeDetailsData,
  JikanEpisode
} from '../../api/anilist'
import { translateDescriptionToPolish, summarizeReviews } from '../../api/ai'
import {
  Sparkles,
  MessageSquare,
  Flame,
  Heart,
  TrendingUp,
  BarChart2,
  Activity,
  Trophy
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts'
import './AnimeDetails.css'

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

const translateRankingContext = (context: string): string => {
  const contextMap: Record<string, string> = {
    'highest rated all time': 'Najwyżej oceniane wszech czasów',
    'highest rated': 'Najwyżej oceniane',
    'most popular all time': 'Najpopularniejsze wszech czasów',
    'most popular': 'Najpopularniejsze',
    'most favorited all time': 'Ulubione wszech czasów',
    'most favorited': 'Ulubione'
  }

  // Fallback translation rules for generic season rankings
  let translated = context
  if (contextMap[context.toLowerCase()]) {
    translated = contextMap[context.toLowerCase()]
  } else {
    translated = translated.replace(/highest rated/i, 'Najwyżej oceniane')
    translated = translated.replace(/most popular/i, 'Najpopularniejsze')
    translated = translated.replace(/all time/i, 'wszech czasów')
    translated = translated.replace(/winter/i, 'Zima')
    translated = translated.replace(/spring/i, 'Wiosna')
    translated = translated.replace(/summer/i, 'Lato')
    translated = translated.replace(/fall/i, 'Jesień')
  }
  return translated
}

const translateSeasonInfo = (season?: string | null): string => {
  if (!season) return ''
  const sMap: Record<string, string> = {
    WINTER: 'Zima',
    SPRING: 'Wiosna',
    SUMMER: 'Lato',
    FALL: 'Jesień'
  }
  return sMap[season.toUpperCase()] || season
}

const translateStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    CURRENT: 'Oglądane',
    PLANNING: 'Planowane',
    COMPLETED: 'Ukończone',
    DROPPED: 'Porzucone',
    PAUSED: 'Wstrzymane',
    REPEATING: 'Oglądane ponownie'
  }
  return statusMap[status.toUpperCase()] || status
}

const translateAiringStatus = (status: string): string => {
  if (!status) return ''
  const statusMap: Record<string, string> = {
    FINISHED: 'Zakończone',
    RELEASING: 'Emitowane',
    NOT_YET_RELEASED: 'Planowane',
    CANCELLED: 'Anulowane',
    HIATUS: 'Wstrzymane'
  }
  return statusMap[status.toUpperCase()] || status
}

export const AnimeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [anime, setAnime] = useState<AnimeDetailsData['Media'] | null>(null)
  const [malEpisodes, setMalEpisodes] = useState<JikanEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'info' | 'episodes' | 'characters' | 'stats' | 'opinions'
  >('info')
  const [expandedEpisodeIndex, setExpandedEpisodeIndex] = useState<number | null>(null)

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  }

  // Translation states
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)

  // AI Reviews states
  const [aiReviewSummary, setAiReviewSummary] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return
      setLoading(true)
      try {
        const response = await getAnimeDetails(parseInt(id, 10))
        setAnime(response.Media)

        // Try to translate description
        if (response.Media.description) {
          let cachedTranslation: string | null = null
          if (window.api && window.api.db) {
            try {
              const cached = await window.api.db.getTranslation(response.Media.id)
              if (cached && cached.description_pl) {
                cachedTranslation = cached.description_pl
              }
            } catch (err) {
              console.error('Failed to fetch translation from DB:', err)
            }
          }

          if (cachedTranslation) {
            setTranslatedDescription(cachedTranslation)
          } else {
            const apiKey = import.meta.env.VITE_OPENROUTER_KEY || ''
            if (apiKey) {
              setIsTranslating(true)
              translateDescriptionToPolish(response.Media.description, apiKey)
                .then(async (translated) => {
                  if (translated) {
                    setTranslatedDescription(translated)
                    // Save to DB Cache
                    if (window.api && window.api.db) {
                      try {
                        await window.api.db.addTranslation(response.Media.id, translated)
                      } catch (err) {
                        console.error('Failed to save translation to DB:', err)
                      }
                    }
                  }
                })
                .catch((err) => console.error('Translation threw an error:', err))
                .finally(() => setIsTranslating(false))
            }
          }
        }

        // Try to get AI Review Summary
        if (response.Media.reviews?.edges && response.Media.reviews.edges.length > 0) {
          let cachedSummary: string | null = null
          if (window.api && window.api.db) {
            try {
              const cached = await window.api.db.getReviewSummary(response.Media.id)
              if (cached && cached.summary_pl) {
                cachedSummary = cached.summary_pl
              }
            } catch (err) {
              console.error('Failed to fetch review summary from DB:', err)
            }
          }

          if (cachedSummary) {
            setAiReviewSummary(cachedSummary)
          } else {
            // Gather reviews text
            const reviewsText = response.Media.reviews.edges
              .slice(0, 10) // Take top 10 maximum to not overflow token limits
              .map((edge) => edge.node.body || edge.node.summary)
              .filter(Boolean) as string[]

            if (reviewsText.length > 0) {
              const apiKey = import.meta.env.VITE_OPENROUTER_KEY || ''
              if (apiKey) {
                setIsSummarizing(true)
                summarizeReviews(reviewsText, apiKey)
                  .then(async (summary) => {
                    if (summary) {
                      setAiReviewSummary(summary)
                      // Save to DB Cache
                      if (window.api && window.api.db) {
                        try {
                          await window.api.db.addReviewSummary(response.Media.id, summary)
                        } catch (err) {
                          console.error('Failed to save review summary to DB:', err)
                        }
                      }
                    }
                  })
                  .catch((err) => console.error('Review summarizing threw an error:', err))
                  .finally(() => setIsSummarizing(false))
              }
            }
          }
        }

        // Fetch MAL episodes if anime has a mal id
        if (response.Media.idMal) {
          getAnimeEpisodesFromJikan(response.Media.idMal)
            .then((episodes) => setMalEpisodes(episodes))
            .catch(console.error)
        }
      } catch (error) {
        console.error('Failed to load anime details', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()

    if (id && window.api?.db) {
      window.api.db
        .getFavorites()
        .then((favs) => {
          setIsFavorite(favs.some((f: any) => f.id === parseInt(id, 10)))
        })
        .catch(console.error)
    }
  }, [id])

  const toggleFavorite = async () => {
    if (!anime || !window.api?.db) return
    try {
      if (isFavorite) {
        await window.api.db.removeFavorite(anime.id)
        setIsFavorite(false)
      } else {
        await window.api.db.addFavorite({
          id: anime.id,
          title: anime.title.english || anime.title.romaji,
          coverImage: anime.coverImage.extraLarge || anime.coverImage.large || ''
        })
        setIsFavorite(true)
      }
    } catch (error) {
      console.error('Failed to toggle favorite', error)
    }
  }

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="neon-spinner purple"></div>
      </div>
    )
  }

  if (!anime) {
    return (
      <div className="empty-state">
        <p>Nie znaleziono anime.</p>
        <button onClick={() => navigate(-1)} className="nav-btn">
          Wróć
        </button>
      </div>
    )
  }

  const seasons =
    anime.relations?.edges.filter((edge) => {
      if (edge.node.type !== 'ANIME') return false
      if (edge.node.format === 'MUSIC') return false
      const excludedRelations = ['CHARACTER', 'OTHER']
      if (excludedRelations.includes(edge.relationType)) return false
      return true
    }) || []

  return (
    <div className="anime-details-container fade-in">
      <div
        className="details-top-actions"
        style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}
      >
        <button
          className="nav-btn back-btn"
          onClick={() => navigate(-1)}
          style={{ marginBottom: 0 }}
        >
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
          <button
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Informacje
          </button>
          <button
            className={`tab-btn ${activeTab === 'episodes' ? 'active' : ''}`}
            onClick={() => setActiveTab('episodes')}
          >
            Odcinki {anime.episodes ? `(${anime.episodes})` : ''}
          </button>
          {anime.characters?.edges && anime.characters.edges.length > 0 && (
            <button
              className={`tab-btn ${activeTab === 'characters' ? 'active' : ''}`}
              onClick={() => setActiveTab('characters')}
            >
              Bohaterowie
            </button>
          )}
          <button
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Statystyki
          </button>
          <button
            className={`tab-btn ${activeTab === 'opinions' ? 'active' : ''}`}
            onClick={() => setActiveTab('opinions')}
          >
            <Sparkles
              size={14}
              style={{
                display: 'inline',
                marginRight: '4px',
                marginBottom: '-2px',
                color: 'var(--neon-purple)'
              }}
            />
            Opinie AI
          </button>
        </div>

        <div className="anime-details-header">
          <img
            src={anime.coverImage.extraLarge || anime.coverImage.large}
            alt={anime.title.english || anime.title.romaji}
            className="anime-cover-large"
          />
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
                  {anime.averageScore && (
                    <span className="stat-badge score">Ocena: {anime.averageScore}%</span>
                  )}
                  {anime.episodes && (
                    <span className="stat-badge episodes">Odcinków: {anime.episodes}</span>
                  )}
                  <span className="stat-badge format">{translateAiringStatus(anime.status)}</span>
                </div>
              </div>

              {/* Related Anime Tabs */}
              {seasons.map((season, index) => (
                <div
                  key={index}
                  className="franchise-item clickable"
                  onClick={() => navigate(`/anime/${season.node.id}`)}
                >
                  <span className="franchise-label">
                    {season.relationType.replace(/_/g, ' ').toLowerCase()} ({season.node.format}):
                  </span>
                  <span className="franchise-title">
                    {season.node.title.english || season.node.title.romaji}
                  </span>
                </div>
              ))}
            </div>
            <div className="anime-genres">
              {anime.genres.map((g) => (
                <span key={g} className="genre-tag">
                  {apiToPolishGenre(g)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'info' && (
          <div className="tab-content fade-in-tab">
            <div className="anime-description mt-4">
              <h3>Opis Fabuły</h3>
              {isTranslating ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    color: 'var(--neon-purple)',
                    margin: '1rem 0'
                  }}
                >
                  <div
                    className="neon-spinner purple"
                    style={{ width: '20px', height: '20px', borderWidth: '2px' }}
                  ></div>
                  <span style={{ fontSize: '0.9rem' }}>
                    Tłumaczenie opisu przez sztuczną inteligencję (OpenRouter)...
                  </span>
                </div>
              ) : (
                <p
                  dangerouslySetInnerHTML={{
                    __html: translatedDescription || anime.description || 'Brak dostępnego opisu.'
                  }}
                ></p>
              )}
            </div>

            {anime.studios?.nodes?.length > 0 && (
              <div className="anime-studios mt-4">
                <h3>Studia Animacji</h3>
                <p>{anime.studios.nodes.map((s) => s.name).join(', ')}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'episodes' && (
          <div className="tab-content fade-in-tab">
            {(() => {
              let episodesList: any[] = []

              // 1. Try AniList streaming episodes first
              if (anime.streamingEpisodes && anime.streamingEpisodes.length > 0) {
                // Fix AniList merging cours (e.g. Spy x Family showing 25 for part 1)
                // Limit to actual episode count if known
                const limit = anime.episodes || anime.streamingEpisodes.length
                const limitedStreaming = anime.streamingEpisodes.slice(0, limit)

                episodesList = limitedStreaming.map((ep, index) => {
                  const jikanMatch = malEpisodes.length > index ? malEpisodes[index] : null
                  return {
                    title: ep.title,
                    thumbnail: ep.thumbnail,
                    url: ep.url,
                    site: ep.site,
                    rating: jikanMatch?.score
                  }
                })
              }
              // 2. Fallback to Jikan (MyAnimeList) episodes if AniList has no streams (e.g. Cour 2)
              else if (malEpisodes && malEpisodes.length > 0) {
                episodesList = malEpisodes.map((ep) => ({
                  title: `${ep.mal_id}. ${ep.title}`,
                  thumbnail:
                    anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large,
                  url: ep.url,
                  site: 'MyAnimeList',
                  rating: ep.score
                }))
              }

              if (episodesList.length > 0) {
                return (
                  <div className="anime-episodes glass-panel-inner mt-4">
                    <h3>Lista Odcinków ({episodesList.length})</h3>
                    <div className="episodes-list">
                      {episodesList.map((ep, index) => {
                        // Polish sites usually use romaji (Japanese) titles in their slugs rather than English ones
                        const animeTitleRomaji = anime.title.romaji || anime.title.english || ''
                        const animeTitleEnglishOrRomaji =
                          anime.title.english || anime.title.romaji || ''

                        const slug = generateSlug(animeTitleRomaji)
                        const searchTitle = animeTitleEnglishOrRomaji

                        const episodeNumber = index + 1
                        const isExpanded = expandedEpisodeIndex === index

                        const officialStreams =
                          anime.externalLinks?.filter(
                            (link) => link.type === 'STREAM' || link.type === 'INFO'
                          ) || []

                        // Create a list of unique official streaming links to avoid duplicates with the base ep.site
                        const uniqueOfficialStreams = officialStreams.filter(
                          (link) => link.site !== ep.site && link.url !== ep.url
                        )

                        return (
                          <div key={index} className="episode-item-container">
                            <div
                              className={`episode-item clickable ${isExpanded ? 'expanded' : ''}`}
                              onClick={() => setExpandedEpisodeIndex(isExpanded ? null : index)}
                            >
                              <div className="episode-thumbnail-container">
                                <img
                                  src={ep.thumbnail}
                                  alt={ep.title}
                                  className="episode-thumbnail"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
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
                                      <span className="rating-number">
                                        {(ep.rating * 2).toFixed(1)}
                                      </span>
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
                                      <a
                                        className="neon-btn btn-animezone"
                                        href={`https://www.animezone.pl/odcinek/${slug}/${episodeNumber}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        AnimeZone
                                      </a>
                                      <a
                                        className="neon-btn btn-desu"
                                        href={`https://desu-online.pl/${slug}-odcinek-${episodeNumber}/`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        Desu-Online
                                      </a>
                                      <a
                                        className="neon-btn btn-shinden"
                                        href={`https://shinden.pl/search?q=${encodeURIComponent(searchTitle)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        Shinden
                                      </a>
                                    </div>
                                  </div>

                                  {(uniqueOfficialStreams.length > 0 || ep.url) && (
                                    <div className="link-group">
                                      <h5>Oficjalne / Zagraniczne:</h5>
                                      <div className="link-buttons">
                                        {ep.site && ep.url && (
                                          <a
                                            className="neon-btn btn-official"
                                            href={ep.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            {ep.site}
                                          </a>
                                        )}
                                        {uniqueOfficialStreams.map((link, lIndex) => (
                                          <a
                                            key={lIndex}
                                            className="neon-btn btn-official"
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
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
                        )
                      })}
                    </div>
                  </div>
                )
              } else {
                return (
                  <div className="empty-state-tab mt-4 glass-panel-inner">
                    <p>Brak dostępnych odcinków w bazie dla tej serii.</p>
                  </div>
                )
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
                    <img
                      src={edge.node.image?.large || ''}
                      alt={edge.node.name?.full || 'Nieznany'}
                      loading="lazy"
                    />
                    <div className="character-details">
                      <span className="char-name">{edge.node.name?.full || 'Nieznany'}</span>
                      <span className="char-role">
                        {edge.role === 'MAIN' ? 'Główny' : 'Poboczny'}
                      </span>
                    </div>
                  </div>
                  {edge.voiceActors && edge.voiceActors.length > 0 && (
                    <div className="voice-actor-side">
                      <div className="va-details text-right">
                        <span className="char-name">
                          {edge.voiceActors[0].name?.full || 'Nieznany'}
                        </span>
                        <span className="char-role">Japoński</span>
                      </div>
                      <img
                        src={edge.voiceActors[0].image?.large || ''}
                        alt={edge.voiceActors[0].name?.full || 'Nieznany'}
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="tab-content fade-in-tab">
            <div className="stats-bento-grid mt-4">
              {/* Score Distribution Chart */}
              <div className="bento-card bento-main glass-panel-inner">
                <div className="bento-header">
                  <BarChart2 size={18} className="neon-text-purple" />
                  <h3>Rozkład Ocen</h3>
                </div>
                <div
                  className="bento-chart-container"
                  style={{ height: '200px', width: '100%', marginTop: '1rem' }}
                >
                  {anime.stats?.scoreDistribution ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={anime.stats.scoreDistribution}>
                        <XAxis
                          dataKey="score"
                          stroke="rgba(255,255,255,0.5)"
                          tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'rgba(20, 20, 30, 0.9)',
                            borderColor: '#bf00ff',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                          formatter={(value: any) => [
                            new Intl.NumberFormat('pl-PL').format(value || 0),
                            'Ocen'
                          ]}
                          labelFormatter={(label) => `Ocena: ${label}`}
                        />
                        <Bar dataKey="amount" fill="#bf00ff" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state-tab">
                      <p>Brak danych rozkładu ocen.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Distribution Donut Chart */}
              <div className="bento-card bento-side glass-panel-inner">
                <div className="bento-header">
                  <Activity size={18} className="neon-text-purple" />
                  <h3>Statusy Oglądania</h3>
                </div>
                <div
                  className="bento-chart-container"
                  style={{
                    height: '200px',
                    width: '100%',
                    marginTop: '1rem',
                    position: 'relative'
                  }}
                >
                  {anime.stats?.statusDistribution ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={anime.stats.statusDistribution.map((s) => ({
                              name: translateStatus(s.status),
                              value: s.amount
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {anime.stats.statusDistribution.map((_, index) => {
                              const colors = [
                                '#00e5ff',
                                '#ff007f',
                                '#b300ff',
                                '#ffb300',
                                '#aaaaaa',
                                '#4caf50'
                              ]
                              return (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                              )
                            })}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'rgba(20, 20, 30, 0.9)',
                              borderColor: '#00e5ff',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: any) => [
                              new Intl.NumberFormat('pl-PL').format(value || 0),
                              'Użytk.'
                            ]}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{
                              fontSize: '12px',
                              color: 'rgba(255,255,255,0.7)',
                              paddingTop: '15px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div
                        style={{
                          position: 'absolute',
                          top: '43%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center',
                          pointerEvents: 'none'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            color: 'rgba(255,255,255,0.8)'
                          }}
                        >
                          Statusy
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state-tab">
                      <p>Brak danych o statusach.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Small stat cards */}
              <div
                className="bento-card bento-small glass-panel-inner bento-score-card"
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <div className="bento-small-content">
                  <div
                    className="radial-progress"
                    style={
                      {
                        '--progress': anime.averageScore ? `${anime.averageScore}%` : '0%',
                        '--progress-color':
                          anime.averageScore && anime.averageScore > 80
                            ? '#00e5ff'
                            : anime.averageScore && anime.averageScore > 60
                              ? '#ffb300'
                              : '#ff007f'
                      } as React.CSSProperties
                    }
                  >
                    <div className="inner-circle">
                      <span className="stat-value">{anime.averageScore || 'N/A'}%</span>
                    </div>
                  </div>
                  <span className="stat-label mt-2">Średnia Ocena</span>
                  <span className="stat-sublabel" style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                    Oceny: {anime.meanScore || 'N/A'}%
                  </span>
                </div>
              </div>

              <div
                className="bento-card bento-small glass-panel-inner"
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <div className="bento-small-content">
                  <TrendingUp
                    size={28}
                    className="neon-text-blue"
                    style={{ marginBottom: '10px' }}
                  />
                  <span className="stat-value">
                    {anime.popularity
                      ? anime.popularity > 1000
                        ? (anime.popularity / 1000).toFixed(1) + 'k'
                        : anime.popularity
                      : 'N/A'}
                  </span>
                  <span className="stat-label">Popularność</span>
                </div>
              </div>

              <div
                className="bento-card bento-small glass-panel-inner"
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <div className="bento-small-content">
                  <Heart size={28} style={{ color: '#ff007f', marginBottom: '10px' }} />
                  <span className="stat-value">
                    {anime.favourites
                      ? anime.favourites > 1000
                        ? (anime.favourites / 1000).toFixed(1) + 'k'
                        : anime.favourites
                      : 'N/A'}
                  </span>
                  <span className="stat-label">Ulubione</span>
                </div>
              </div>

              <div
                className="bento-card bento-small glass-panel-inner"
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <div className="bento-small-content">
                  <Flame size={28} style={{ color: '#ffb300', marginBottom: '10px' }} />
                  <span className="stat-value">
                    {anime.trending
                      ? anime.trending > 1000
                        ? (anime.trending / 1000).toFixed(1) + 'k'
                        : anime.trending
                      : 'N/A'}
                  </span>
                  <span className="stat-label">Trendujące</span>
                </div>
              </div>

              {/* Rankings list (Wide bento block) */}
              {anime.rankings && anime.rankings.length > 0 && (
                <div
                  className="bento-card bento-wide glass-panel-inner rankings-list"
                  style={{ gridColumn: '1 / -1' }}
                >
                  <div className="bento-header mb-3">
                    <Trophy size={18} style={{ color: '#ffd700' }} />
                    <h3>Rankingi</h3>
                  </div>
                  <ul
                    className="rankings-ul"
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '10px'
                    }}
                  >
                    {anime.rankings.map((r, idx) => (
                      <li
                        key={idx}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          padding: '10px 15px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '15px'
                        }}
                      >
                        <span
                          className="rank-number"
                          style={{
                            color: '#ff007f',
                            fontWeight: 'bold',
                            fontSize: '1.2rem',
                            minWidth: '40px'
                          }}
                        >
                          #{r.rank}
                        </span>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                          }}
                        >
                          <span style={{ lineHeight: '1.2' }}>
                            {translateRankingContext(r.context)}
                            {(r.season || r.year) &&
                              !r.allTime &&
                              !r.context.toLowerCase().includes(r.year?.toString() || '999999') &&
                              ` ${translateSeasonInfo(r.season)} ${r.year ? r.year : ''}`}
                          </span>
                          {r.allTime && (
                            <span style={{ opacity: 0.6, fontSize: '0.85rem', marginTop: '2px' }}>
                              (Cały czas)
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'opinions' && (
          <div className="tab-content fade-in-tab">
            <div className="anime-opinions mt-4">
              <div
                className="opinions-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  marginBottom: '1.5rem'
                }}
              >
                <MessageSquare size={24} className="neon-text-purple" />
                <h3>Co społeczność sądzi o tym anime?</h3>
              </div>

              {isSummarizing ? (
                <div
                  className="ai-thinking-box glass-panel-inner"
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    borderColor: 'rgba(191,0,255,0.3)'
                  }}
                >
                  <div className="neon-spinner purple" style={{ margin: '0 0 1rem 0' }}></div>
                  <h4 style={{ color: 'var(--neon-purple)', margin: '0 0 0.5rem 0' }}>
                    AI analizuje recenzje...
                  </h4>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: 0 }}>
                    Model językowy czyta setki angielskich opinii z AniList i przygotowuje dla
                    Ciebie bezspoilerowe podsumowanie zalet i wad tej produkcji.
                  </p>
                </div>
              ) : aiReviewSummary ? (
                <div
                  className="ai-summary-result glass-panel-inner fade-in"
                  style={{
                    padding: '1.5rem',
                    borderLeft: '4px solid var(--neon-purple)',
                    background: 'rgba(191,0,255,0.05)'
                  }}
                >
                  <p
                    style={{ lineHeight: '1.7', margin: 0 }}
                    dangerouslySetInnerHTML={{ __html: aiReviewSummary }}
                  ></p>
                  <div
                    style={{
                      marginTop: '1rem',
                      fontSize: '0.8rem',
                      color: 'rgba(255,255,255,0.4)',
                      textAlign: 'right'
                    }}
                  >
                    Podsumowanie wygenerowane maszynowo przez model AI na podstawie publicznych
                    recenzji.
                  </div>
                </div>
              ) : anime.reviews?.edges && anime.reviews.edges.length > 0 ? (
                <div className="empty-state-tab glass-panel-inner">
                  <p>
                    Oczekujące recenzje. Jeśli to widzisz, aplikacja napotkała błąd podczas próby
                    wygenerowania podsumowania ze strony API OpenRouter (Brak limitów lub
                    skonfigurowanego klucza).
                  </p>
                </div>
              ) : (
                <div className="empty-state-tab glass-panel-inner">
                  <p>
                    To anime jest zbyt niszowe lub nowe. Brak wystarczającej ilości recenzji w bazie
                    AniList do wygenerowania modelu opinii.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
