import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getSteamGameDetails,
  SteamAppDetails,
  getSteamGameExtendedStats,
  SteamSpyGameExtended,
  getSteamRealtimeCCU,
  getSimilarGames,
  SteamFeaturedCategoryItem
} from '../../api/steamStore'
import {
  ArrowLeft,
  Monitor,
  ShoppingCart,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Users,
  Clock,
  TrendingUp,
  BarChart3
} from 'lucide-react'
import {
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts'
import { getSteamGameReviews } from '../../api/steamReviews'
import { fetchAIReviewSummary, AIReviewSummary } from '../../api/ai'
import './GameDetails.css'

import { SteamReviewResponse } from '../../api/steamReviews'

export const GameDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [game, setGame] = useState<SteamAppDetails | null>(null)
  const [reviewsResponse, setReviewsResponse] = useState<SteamReviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'requirements' | 'ai-review' | 'similar'>('requirements')
  const [activeMedia, setActiveMedia] = useState<{
    type: 'video' | 'image'
    src: string
    poster?: string
  } | null>(null)

  // AI Review State
  const [aiSummary, setAiSummary] = useState<AIReviewSummary | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Extended Stats State
  const [extraStats, setExtraStats] = useState<SteamSpyGameExtended | null>(null)
  const [realtimeCCU, setRealtimeCCU] = useState<number | null>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(false)

  // Similar Games State
  const [similarGames, setSimilarGames] = useState<SteamFeaturedCategoryItem[]>([])
  const [isSimilarLoading, setIsSimilarLoading] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return
      setIsLoading(true)
      setError(null)
      // Reset states for new game
      setGame(null)
      setReviewsResponse(null)
      setAiSummary(null)
      setExtraStats(null)
      setRealtimeCCU(null)
      setSimilarGames([])
      setActiveTab('requirements')
      window.scrollTo(0, 0)
      try {
        const [data, reviewsData] = await Promise.all([
          getSteamGameDetails(id),
          getSteamGameReviews(id, 20)
        ])

        if (data) {
          setGame(data)

          if (data.movies && data.movies.length > 0) {
            setActiveMedia({
              type: 'video',
              src: data.movies[0].webm?.max || data.movies[0].mp4?.max,
              poster: data.movies[0].thumbnail
            })
          } else if (data.screenshots && data.screenshots.length > 0) {
            setActiveMedia({ type: 'image', src: data.screenshots[0].path_full })
          }
        } else {
          setError('Nie udało się pobrać szczegółów tej gry ze Steama.')
        }

        if (reviewsData) {
          setReviewsResponse(reviewsData)
        }

        // Fetch Extended Stats & Realtime CCU
        setIsStatsLoading(true)
        const [statsData, ccuData] = await Promise.all([
          getSteamGameExtendedStats(id),
          getSteamRealtimeCCU(id)
        ])

        if (statsData) {
          setExtraStats(statsData)
        }
        if (ccuData !== undefined) {
          setRealtimeCCU(ccuData)
        }
        setIsStatsLoading(false)
      } catch (err) {
        console.error('GameDetails Fetch Error:', err)
        setError('Wystąpił błąd komunikacji z serwerem Steama.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDetails()
  }, [id])

  const handleLoadAIReview = async () => {
    if (!id || aiSummary || isAiLoading) return

    setIsAiLoading(true)
    setAiError(null)

    try {
      if (!reviewsResponse || !reviewsResponse.reviews || reviewsResponse.reviews.length === 0) {
        setAiError('Brak wystarczającej liczby recenzji na Steamie do analizy.')
        setIsAiLoading(false)
        return
      }

      const combinedText = reviewsResponse.reviews
        .map((r) => r.review)
        .join('\n\n---NEXT REVIEW---\n\n')

      const openRouterKey =
        import.meta.env.VITE_OPENROUTER_KEY || localStorage.getItem('openRouterApiKey')

      if (!openRouterKey) {
        setAiError('Brak klucza API OpenRouter. Uzbrój aplikację w ustawieniach.')
        setIsAiLoading(false)
        return
      }

      const summary = await fetchAIReviewSummary(combinedText, openRouterKey)
      setAiSummary(summary)
    } catch (err: any) {
      console.error('Błąd AI Review:', err)
      setAiError(err.message || 'Wystąpił błąd podczas analizy inteligencji sieciowej.')
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleLoadSimilarGames = async () => {
    if (!id || similarGames.length > 0 || isSimilarLoading) return

    setIsSimilarLoading(true)
    try {
      const data = await getSimilarGames(id)
      setSimilarGames(data)
    } catch (err) {
      console.error('Błąd pobierania podobnych gier:', err)
    } finally {
      setIsSimilarLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'similar') {
      handleLoadSimilarGames()
    }
  }, [activeTab])

  if (isLoading) {
    return (
      <div className="game-details-loading">
        <div className="neon-spinner green"></div>
        <p className="neon-text-green">Ładowanie połączenia Steam...</p>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="game-details-error fade-in">
        <h2>Odmowa dostępu</h2>
        <p>{error}</p>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} /> Wróć
        </button>
      </div>
    )
  }

  const createMarkup = (html: string) => {
    if (!html) return { __html: '' }

    // 1. Strip all image tags entirely
    let stripped = html.replace(/<img[^>]*>/gi, '')

    // 2. Strip empty links that usually wrap images
    stripped = stripped.replace(/<a[^>]*>\s*<\/a>/gi, '')

    // 3. Strip links that contain only images (double check)
    stripped = stripped.replace(/<a[^>]*>(\s*<img[^>]*>\s*)*<\/a>/gi, '')

    // 4. Sometimes Steam uses complicated structures for banners
    stripped = stripped.replace(/<div[^>]*class="bb_image_header"[^>]*>.*?<\/div>/gi, '')

    return { __html: stripped }
  }

  return (
    <div className="game-details-container fade-in">
      {/* Tło wielkiego rozmiaru (Header/Hero) */}
      <div
        className="game-hero-background"
        style={{ backgroundImage: `url(${game.background_raw || game.background})` }}
      >
        <div className="game-hero-overlay"></div>
      </div>

      <div className="game-content-wrapper">
        {/* Wróć & Tytuł */}
        <div className="game-header-top">
          <button className="back-btn" onClick={() => navigate('/games')}>
            <ArrowLeft size={20} /> Sklep Główny
          </button>
          <h1 className="game-main-title">{game.name}</h1>
        </div>

        <div className="game-main-grid">
          {/* 1. Sidebar Stats */}
          <div className="game-stats-sidebar glass-panel">
            <div className="sidebar-stat-block">
              <div className="stat-header">
                <Users size={16} className="neon-text-green" />
                <span>Online Teraz</span>
              </div>
              {isStatsLoading ? (
                <div className="small-spinner"></div>
              ) : (
                <div className="stat-value neon-text-green">
                  {(realtimeCCU ?? extraStats?.ccu ?? 0).toLocaleString()}
                </div>
              )}
            </div>

            <div className="sidebar-stat-block">
              <div className="stat-header">
                <Clock size={16} className="neon-text-blue" />
                <span>Czas Gry (Ogółem)</span>
              </div>
              <div className="playtime-info">
                <div className="playtime-row">
                  <span className="label">Średnio:</span>
                  <span className="value">
                    {extraStats ? Math.round(extraStats.average_forever / 60) : 0}h
                  </span>
                </div>
                <div className="playtime-row">
                  <span className="label">Mediana:</span>
                  <span className="value">
                    {extraStats ? Math.round(extraStats.median_forever / 60) : 0}h
                  </span>
                </div>
              </div>
            </div>

            <div className="sidebar-stat-block">
              <div className="stat-header">
                <BarChart3 size={16} className="neon-text-purple" />
                <span>Ranking & Oceny</span>
              </div>
              <div className="sidebar-chart-container">
                {reviewsResponse?.query_summary && (
                  <>
                    <div className="score-rank-badge">
                      <div className="rank-value-group">
                        <span className="rank-value">
                          {Math.round(
                            (reviewsResponse.query_summary.total_positive /
                              reviewsResponse.query_summary.total_reviews) *
                            100
                          )}
                          %
                        </span>
                        <span className="rank-desc">
                          {reviewsResponse.query_summary.review_score_desc}
                        </span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={90}>
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: 'Positive',
                              value: reviewsResponse.query_summary.total_positive
                            },
                            {
                              name: 'Negative',
                              value: reviewsResponse.query_summary.total_negative
                            }
                          ]}
                          innerRadius={20}
                          outerRadius={35}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="var(--accent-green)" />
                          <Cell fill="var(--accent-red)" />
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(20, 20, 20, 0.9)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            fontSize: '11px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="chart-legend">
                      <span className="pos">
                        {reviewsResponse.query_summary.total_positive.toLocaleString()} +
                      </span>
                      <span className="neg">
                        {reviewsResponse.query_summary.total_negative.toLocaleString()} -
                      </span>
                    </div>
                  </>
                )}
                {!reviewsResponse?.query_summary && !isLoading && (
                  <div className="stat-value-small">Brak danych o recenzjach</div>
                )}
              </div>
            </div>

            <div className="sidebar-stat-block">
              <div className="stat-header">
                <TrendingUp size={16} className="neon-text-cyan" />
                <span>Szacunkowa Sprzedaż</span>
              </div>
              <div className="stat-value-small">{extraStats?.owners || 'Brak danych'}</div>
            </div>

            <div className="sidebar-stat-block">
              <div className="stat-header">
                <Monitor size={16} className="neon-text-green" />
                <span>Produkcja</span>
              </div>
              <div className="extra-meta-info">
                <div className="meta-item">
                  <span className="meta-label">Producent:</span>
                  <span className="meta-value accent">{game.developers?.[0] || 'N/A'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Wydawca:</span>
                  <span className="meta-value">{game.publishers?.[0] || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Media Center */}
          <div className="game-media-center">
            <div className="game-main-media-container">
              {activeMedia?.type === 'video' ? (
                <video
                  key={activeMedia.src}
                  src={activeMedia.src}
                  autoPlay
                  muted
                  loop
                  controls
                  className="game-main-trailer"
                  poster={activeMedia.poster}
                />
              ) : activeMedia?.type === 'image' ? (
                <img
                  key={activeMedia.src}
                  src={activeMedia.src}
                  alt="Gameplay"
                  className="game-main-trailer"
                />
              ) : (
                <img
                  src={game.header_image}
                  alt={game.name}
                  className="game-main-trailer fallbackImage"
                />
              )}
            </div>

            <div className="game-screenshots-grid-large">
              {game.movies && game.movies.length > 0 && (
                <div
                  className="game-screenshot-thumb-wrapper"
                  onClick={() =>
                    setActiveMedia({
                      type: 'video',
                      src: game.movies![0].webm?.max || game.movies![0].mp4?.max,
                      poster: game.movies![0].thumbnail
                    })
                  }
                >
                  <img
                    src={game.movies[0].thumbnail}
                    alt="trailer"
                    className={`game-screenshot-thumb ${activeMedia?.src === (game.movies![0].webm?.max || game.movies![0].mp4?.max) ? 'active' : ''}`}
                  />
                  <div className="game-video-play-icon">▶</div>
                </div>
              )}
              {game.screenshots?.slice(0, 5).map((shot) => (
                <img
                  key={shot.id}
                  src={shot.path_thumbnail}
                  alt="screenshot"
                  className={`game-screenshot-thumb ${activeMedia?.src === shot.path_full ? 'active' : ''}`}
                  onClick={() => setActiveMedia({ type: 'image', src: shot.path_full })}
                />
              ))}
            </div>

            {/* TAB BUTTONS (Tucked under media) */}
            <div className="game-tabs-under-media">
              {game.platforms.windows && (
                <button
                  className={`game-tab-minimal ${activeTab === 'requirements' ? 'active' : ''}`}
                  onClick={() => setActiveTab('requirements')}
                >
                  <Monitor size={14} /> Wymagania Systemowe
                </button>
              )}
              <button
                className={`game-tab-minimal ai-tab ${activeTab === 'ai-review' ? 'active' : ''}`}
                onClick={() => setActiveTab('ai-review')}
              >
                <Sparkles size={14} /> Werdykt AI
              </button>
              <button
                className={`game-tab-minimal similar-tab ${activeTab === 'similar' ? 'active' : ''}`}
                onClick={() => setActiveTab('similar')}
              >
                <Users size={14} /> Podobne Gry
              </button>
            </div>
          </div>

          {/* 3. Buy Box (Right Side - Spans rows) */}
          <div className="game-buy-box glass-panel">
            <img src={game.header_image} alt="Header" className="game-buy-box-img" />

            <p
              className="game-short-desc"
              dangerouslySetInnerHTML={createMarkup(game.short_description)}
            ></p>

            <div className="game-meta-info">
              <div className="meta-row">
                <span className="meta-label">Data wydania:</span>
                <span className="meta-value">{game.release_date.date}</span>
              </div>
            </div>

            <div className="game-tags-cloud">
              {game.genres?.slice(0, 8).map((g) => (
                <span key={g.id} className="game-interactive-tag">
                  {g.description}
                </span>
              ))}
              {game.categories?.slice(0, 4).map((c) => (
                <span key={`cat-${c.id}`} className="game-interactive-tag cat-tag">
                  {c.description}
                </span>
              ))}
            </div>


            <div className="game-purchase-action">
              <div className="purchase-price-area">
                {game.is_free ? (
                  <span className="price-tag-free">Free to Play</span>
                ) : game.price_overview ? (
                  game.price_overview.discount_percent > 0 ? (
                    <div className="discount-block">
                      <div className="discount-pct">-{game.price_overview.discount_percent}%</div>
                      <div className="prices-col">
                        <del>{(game.price_overview.initial / 100).toFixed(2)} zł</del>
                        <span>{game.price_overview.final_formatted}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="price-tag-regular">
                      {game.price_overview.final_formatted}
                    </span>
                  )
                ) : (
                  <span className="price-tag-regular">Niedostępne</span>
                )}
              </div>
              <button
                className="game-btn-buy"
                onClick={() => window.open(`https://store.steampowered.com/app/${id}`, '_blank')}
              >
                <ShoppingCart size={18} /> Zagraj (Steam)
              </button>
            </div>
          </div>

          {/* 4. Details Section (Integrated into the grid to fix vertical gap) */}
          <div className="game-grid-details fade-in">
            {activeTab === 'requirements' && game.pc_requirements && (
              <div className="tab-req-section glass-panel">
                <h2 className="tab-title">Wymagania Sprzętowe (Windows PC)</h2>
                <div className="req-grid">
                  {game.pc_requirements.minimum && (
                    <div className="req-block minimal-req">
                      <h3 className="req-block-title">Minimalne</h3>
                      <div
                        className="steam-html-content text-small"
                        dangerouslySetInnerHTML={createMarkup(game.pc_requirements.minimum)}
                      ></div>
                    </div>
                  )}
                  {game.pc_requirements.recommended && (
                    <div className="req-block recommended-req">
                      <h3 className="req-block-title">Zalecane</h3>
                      <div
                        className="steam-html-content text-small"
                        dangerouslySetInnerHTML={createMarkup(game.pc_requirements.recommended)}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ai-review' && (
              <div className="tab-ai-section glass-panel">
                <h2 className="tab-title neon-text-purple">The AI Review Board</h2>

                {!aiSummary && !isAiLoading && !aiError && (
                  <div className="ai-placeholder-msg">
                    <p>
                      Inteligentna analiza opinii społeczności Steama. Dowiedz się, co gracze naprawdę myślą o tym tytule.
                    </p>
                    <button
                      className="game-btn-buy"
                      onClick={handleLoadAIReview}
                      style={{ marginTop: '1rem', width: 'auto', padding: '8px 20px' }}
                    >
                      <Sparkles size={16} /> Wygeneruj Raport AI
                    </button>
                  </div>
                )}

                {isAiLoading && (
                  <div className="ai-placeholder-msg">
                    <div className="neon-spinner purple mb-10"></div>
                    <p className="neon-text-purple">Analizowanie tysięcy recenzji...</p>
                  </div>
                )}

                {aiSummary && (
                  <div className="ai-report-container fade-in">
                    <p className="ai-verdict">
                      <strong>Werdykt AI:</strong> {aiSummary.verdict}
                    </p>

                    <div className="ai-pros-cons-grid">
                      <div className="ai-box play-box">
                        <h3>Zagraj, jeśli...</h3>
                        <ul>
                          {aiSummary.playIf.map((tip, i) => (
                            <li key={i}>
                              <CheckCircle2 size={14} className="play-icon" /> {tip}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="ai-box avoid-box">
                        <h3>Unikaj, jeśli...</h3>
                        <ul>
                          {aiSummary.avoidIf.map((tip, i) => (
                            <li key={i}>
                              <AlertTriangle size={14} className="avoid-icon" /> {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'similar' && (
              <div className="tab-similar-section glass-panel">
                <h2 className="tab-title">Relatywnie Podobne Tytuły (Smart Tag Match)</h2>

                {isSimilarLoading && (
                  <div className="similar-loading-box">
                    <div className="neon-spinner green"></div>
                    <p>Analizowanie powiązań między tagami...</p>
                  </div>
                )}

                {!isSimilarLoading && similarGames.length === 0 && (
                  <div className="no-data-msg">
                    Nie znaleziono wystarczająco podobnych gier.
                  </div>
                )}

                {!isSimilarLoading && similarGames.length > 0 && (
                  <div className="similar-games-grid">
                    {similarGames.map((simGame) => (
                      <div
                        key={simGame.id}
                        className="similar-game-mini-card"
                        onClick={() => navigate(`/games/${simGame.id}`)}
                      >
                        <img src={simGame.header_image} alt={simGame.name} />
                        <div className="card-overlay">
                          <span className="game-name">{simGame.name}</span>
                          {simGame.discount_percent > 0 && (
                            <span className="game-discount">-{simGame.discount_percent}%</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
