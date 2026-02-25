import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSteamGameDetails, SteamAppDetails } from '../../api/steamStore'
import {
  ArrowLeft,
  Monitor,
  Info,
  ShoppingCart,
  Sparkles,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'info' | 'requirements' | 'ai-review'>('info')
  const [activeMedia, setActiveMedia] = useState<{
    type: 'video' | 'image'
    src: string
    poster?: string
  } | null>(null)

  // AI Review State
  const [aiSummary, setAiSummary] = useState<AIReviewSummary | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return
      setIsLoading(true)
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
      // 1. Pobierz top ~20 najdłuższych / najbardziej pomocnych opinii Steama
      // const reviewsResponse = await getSteamGameReviews(id, 20); // Removed as reviewsResponse is now stateful

      if (!reviewsResponse || !reviewsResponse.reviews || reviewsResponse.reviews.length === 0) {
        setAiError('Brak wystarczającej liczby recenzji na Steamie do analizy.')
        setIsAiLoading(false)
        return
      }

      // 2. Sklej wszystkie recenzje w jeden wielki string
      const combinedText = reviewsResponse.reviews
        .map((r) => r.review)
        .join('\n\n---NEXT REVIEW---\n\n')

      // 3. Sprawdź, czy mamy klucz OpenRouter z localStorage / env
      const openRouterKey =
        import.meta.env.VITE_OPENROUTER_KEY || localStorage.getItem('openRouterApiKey')

      if (!openRouterKey) {
        setAiError('Brak klucza API OpenRouter. Uzbrój aplikację w ustawieniach.')
        setIsAiLoading(false)
        return
      }

      // 4. Odpytaj AI
      const summary = await fetchAIReviewSummary(combinedText, openRouterKey)
      setAiSummary(summary)
    } catch (err: any) {
      console.error('Błąd AI Review:', err)
      setAiError(err.message || 'Wystąpił błąd podczas analizy inteligencji sieciowej.')
    } finally {
      setIsAiLoading(false)
    }
  }

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

  // Parsowanie HTML ze Steama do bezpieczniejszego React-renderingu
  // (Steam API zwraca BRki zamiast nowej linii i tagi strong)
  const createMarkup = (html: string) => ({ __html: html })

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

        {/* Sekcja Mediów i Głównego 'Buy Boxa' */}
        <div className="game-overview-grid">
          <div className="game-media-carousel">
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

            <div className="game-screenshots-strip">
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
              {game.screenshots?.slice(0, 4).map((shot) => (
                <img
                  key={shot.id}
                  src={shot.path_thumbnail}
                  alt="screenshot"
                  className={`game-screenshot-thumb ${activeMedia?.src === shot.path_full ? 'active' : ''}`}
                  onClick={() => setActiveMedia({ type: 'image', src: shot.path_full })}
                />
              ))}
            </div>
          </div>

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
              <div className="meta-row">
                <span className="meta-label">Producent:</span>
                <span className="meta-value accent">{game.developers?.[0] || 'Brak danych'}</span>
              </div>
            </div>

            <div className="game-tags-cloud">
              {game.genres?.map((g) => (
                <span key={g.id} className="game-interactive-tag">
                  {g.description}
                </span>
              ))}
              {game.categories?.slice(0, 3).map((c) => (
                <span key={`cat-${c.id}`} className="game-interactive-tag cat-tag">
                  {c.description}
                </span>
              ))}
            </div>

            {reviewsResponse &&
              reviewsResponse.query_summary &&
              reviewsResponse.query_summary.total_reviews > 0 && (
                <div className="game-reviews-summary-block">
                  <div className="game-reviews-text">
                    <span className="reviews-desc">
                      {reviewsResponse.query_summary.review_score_desc}
                    </span>
                    <span className="reviews-count">
                      ({reviewsResponse.query_summary.total_reviews.toLocaleString()} recenzji)
                    </span>
                  </div>
                  <div
                    className="game-reviews-pie-chart"
                    style={{
                      background: `conic-gradient(var(--accent-green) ${Math.round((reviewsResponse.query_summary.total_positive / reviewsResponse.query_summary.total_reviews) * 100)}%, var(--accent-red) 0)`
                    }}
                    title={`${Math.round((reviewsResponse.query_summary.total_positive / reviewsResponse.query_summary.total_reviews) * 100)}% Pozytywnych`}
                  ></div>
                </div>
              )}

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
                    <span className="price-tag-regular">{game.price_overview.final_formatted}</span>
                  )
                ) : (
                  <span className="price-tag-regular">Niedostępne</span>
                )}
              </div>
              <button
                className="game-btn-buy"
                onClick={() => window.open(`https://store.steampowered.com/app/${id}`, '_blank')}
              >
                <ShoppingCart size={20} /> Zagraj (Steam)
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Nawigacyjne - Cechy gry */}
        <div className="game-tabs glass-panel">
          <button
            className={`game-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <Info size={18} /> O grze
          </button>
          {game.platforms.windows && (
            <button
              className={`game-tab ${activeTab === 'requirements' ? 'active' : ''}`}
              onClick={() => setActiveTab('requirements')}
            >
              <Monitor size={18} /> Wymagania Systemowe
            </button>
          )}
          <button
            className={`game-tab ai-tab ${activeTab === 'ai-review' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai-review')}
          >
            <Sparkles size={18} /> Werdykt AI (Wkrótce)
          </button>
        </div>

        {/* Zawartość Aktywnych Zakładek */}
        <div className="game-tab-content glass-panel fade-in">
          {activeTab === 'info' && (
            <div className="tab-info-section">
              <h2 className="tab-title">Informacje Ogólne</h2>
              {/* Często zablokowany tag z uwagi na duże blocki HTML. Do uproszczenia */}
              <p
                className="steam-html-content"
                dangerouslySetInnerHTML={createMarkup(game.short_description)}
              ></p>

              <h3 className="sub-title">Wspierane Języki</h3>
              <p
                className="steam-html-content"
                dangerouslySetInnerHTML={createMarkup(game.supported_languages)}
              ></p>
            </div>
          )}

          {activeTab === 'requirements' && game.pc_requirements && (
            <div className="tab-req-section">
              <h2 className="tab-title">Wymagania Sprzętowe (Windows PC)</h2>
              <div className="req-grid">
                {game.pc_requirements.minimum && (
                  <div className="req-block">
                    <h3 className="req-block-title">Minimalne</h3>
                    <div
                      className="steam-html-content text-small"
                      dangerouslySetInnerHTML={createMarkup(game.pc_requirements.minimum)}
                    ></div>
                  </div>
                )}
                {game.pc_requirements.recommended && (
                  <div className="req-block">
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
            <div className="tab-ai-section">
              <h2 className="tab-title neon-text-purple">The AI Review Board</h2>

              {!aiSummary && !isAiLoading && !aiError && (
                <div className="ai-placeholder-msg">
                  <Sparkles size={40} className="neon-text-purple mb-10" />
                  <p>
                    Moduł sztucznej inteligencji służący do wnikliwej analizy najczęstszych
                    problemów i pochwał ze Steam Community zostanie tu zaimplementowany w Kroku 5.
                  </p>
                  <button
                    className="game-btn-buy"
                    onClick={handleLoadAIReview}
                    style={{ marginTop: '1.5rem', width: 'auto', padding: '10px 30px' }}
                  >
                    <Sparkles size={18} /> Wygeneruj Raport AI
                  </button>
                </div>
              )}

              {isAiLoading && (
                <div className="ai-placeholder-msg">
                  <div className="neon-spinner purple mb-10"></div>
                  <p className="neon-text-purple">Skanowanie tysięcy ludzkich opinii ze Steam...</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Synteza werdyktu może potrwać kilka sekund.
                  </p>
                </div>
              )}

              {aiError && (
                <div className="ai-placeholder-msg" style={{ color: 'var(--accent-red)' }}>
                  <AlertTriangle size={40} className="mb-10" />
                  <p>{aiError}</p>
                  <button
                    className="back-btn"
                    onClick={handleLoadAIReview}
                    style={{ marginTop: '1rem' }}
                  >
                    Spróbuj ponownie
                  </button>
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
                            <CheckCircle2 size={16} className="play-icon" /> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="ai-box avoid-box">
                      <h3>Unikaj, jeśli...</h3>
                      <ul>
                        {aiSummary.avoidIf.map((tip, i) => (
                          <li key={i}>
                            <AlertTriangle size={16} className="avoid-icon" /> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
