import * as React from 'react'
import { Star } from 'lucide-react'
import './NeonCard.css'

export interface AnimeCardData {
  id: number
  title: string
  coverImage: string
  fallbackImage?: string
  secondFallback?: string
  averageScore?: number
  seasonYear?: number
  episodes?: number
}

interface NeonCardProps {
  anime: AnimeCardData
  onClick?: (id: number) => void
}

export const NeonCard: React.FC<NeonCardProps> = ({ anime, onClick }) => {
  const [imgError, setImgError] = React.useState(false)
  const [currentImg, setCurrentImg] = React.useState(anime.coverImage)

  React.useEffect(() => {
    setCurrentImg(anime.coverImage)
    setImgError(false)
  }, [anime.coverImage])

  const handleImgError = () => {
    if (currentImg === anime.coverImage && anime.fallbackImage) {
      setCurrentImg(anime.fallbackImage)
    } else if (currentImg === anime.fallbackImage && anime.secondFallback) {
      setCurrentImg(anime.secondFallback)
    } else {
      setImgError(true)
    }
  }

  return (
    <div className="neon-card" onClick={() => onClick?.(anime.id)}>
      <div className="img-wrapper">
        <img
          src={currentImg}
          alt={anime.title}
          className={`card-img ${imgError ? 'hidden' : ''}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleImgError}
        />
        {imgError && (
          <div className="img-placeholder">
            <div className="placeholder-content">
              <span>{anime.title}</span>
            </div>
          </div>
        )}
        {anime.averageScore && (
          <div className="score-badge glass-panel">
            <Star className="star-icon" size={14} fill="currentColor" />
            <span>{(anime.averageScore / 10).toFixed(1)}</span>
          </div>
        )}
      </div>
      <div className="card-info">
        <h3 className="card-title" title={anime.title}>
          {anime.title}
        </h3>
        <div className="card-meta">
          {anime.seasonYear && <span className="meta-item">{anime.seasonYear}</span>}
          {anime.seasonYear && anime.episodes && <span className="meta-dot">•</span>}
          {anime.episodes && <span className="meta-item">{anime.episodes} EP</span>}
        </div>
      </div>
    </div>
  )
}
