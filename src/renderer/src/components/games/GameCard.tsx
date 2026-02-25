import React from 'react'
import { motion } from 'framer-motion'
import { Monitor } from 'lucide-react'
import './GameCard.css'

export interface GameData {
  id: string | number
  title: string
  capsuleImage: string
  price?: number
  discountPercent?: number
  originalPrice?: number
  tags?: string[]
  osWindows?: boolean
}

interface GameCardProps {
  game: GameData
  onClick: () => void
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  // Formatowanie ceny na lokację polską (zł)
  const formatPrice = (p: number) => {
    if (p === 0) return 'Free to Play'
    return `${p.toFixed(2).replace('.', ',')} zł`
  }

  return (
    <motion.div
      className="game-card"
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -5 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="game-card-image-wrapper">
        <img src={game.capsuleImage} alt={game.title} className="game-card-image" loading="lazy" />
      </div>

      <div className="game-card-content">
        <h3 className="game-card-title">{game.title}</h3>

        <div className="game-card-details">
          <div className="game-card-platforms">
            {game.osWindows && <Monitor size={14} className="platform-icon" />}
          </div>

          <div className="game-card-tags">
            {game.tags?.slice(0, 3).map((tag) => (
              <span key={tag} className="game-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="game-card-price-block">
          {game.discountPercent && game.discountPercent > 0 ? (
            <div className="game-price-discount-wrapper">
              <div className="game-discount-badge">-{game.discountPercent}%</div>
              <div className="game-price-column">
                <span className="game-price-original">
                  {game.originalPrice ? formatPrice(game.originalPrice) : ''}
                </span>
                <span className="game-price-final">
                  {game.price !== undefined ? formatPrice(game.price) : ''}
                </span>
              </div>
            </div>
          ) : (
            <div className="game-price-final standard-price">
              {game.price !== undefined ? formatPrice(game.price) : 'Brak Ceny'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
