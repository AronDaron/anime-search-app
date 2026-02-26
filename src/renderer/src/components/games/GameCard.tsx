import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Monitor } from 'lucide-react'
import { getSteamGameDetails } from '../../api/steamStore'
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
  isDlc?: boolean
}

interface GameCardProps {
  game: GameData
  onClick: () => void
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const [imgError, setImgError] = useState(false)
  const [currentImg, setCurrentImg] = useState(game.capsuleImage)
  const [imgRepairAttempted, setImgRepairAttempted] = useState(false)
  const [dlcCheckAttempted, setDlcCheckAttempted] = useState(false)
  const [isDlc, setIsDlc] = useState(game.isDlc || false)

  // Formatowanie ceny na lokację polską (zł)
  const formatPrice = (p: number) => {
    if (p === 0) return 'Free to Play'
    return `${p.toFixed(2).replace('.', ',')} zł`
  }

  // Mechanizm detekcji DLC (raz na zamontowanie)
  useEffect(() => {
    if (!dlcCheckAttempted) {
      const checkDlc = setTimeout(async () => {
        try {
          const details = await getSteamGameDetails(game.id)
          if (details && (details.type === 'dlc' || details.type === 'DLC')) {
            setIsDlc(true)
          }
          setDlcCheckAttempted(true)
        } catch (e) {
          setDlcCheckAttempted(true)
        }
      }, Math.random() * 2000)
      return () => clearTimeout(checkDlc)
    }
    return undefined
  }, [game.id, dlcCheckAttempted])

  // Mechanizm naprawy obrazka (wyzwalany przy imgError)
  useEffect(() => {
    if (imgError && !imgRepairAttempted) {
      const repair = async () => {
        try {
          const details = await getSteamGameDetails(game.id)
          if (details && details.header_image) {
            setCurrentImg(details.header_image)
            setImgError(false)
          }
          setImgRepairAttempted(true)
        } catch (e) {
          setImgRepairAttempted(true)
        }
      }
      repair()
    }
  }, [imgError, game.id, imgRepairAttempted])

  // Aktualizuj obrazek i status DLC jeśli prop się zmieni
  useEffect(() => {
    setCurrentImg(game.capsuleImage)
    setIsDlc(game.isDlc || false)
    setImgError(false)
    setImgRepairAttempted(false)
    setDlcCheckAttempted(false)
  }, [game.capsuleImage, game.isDlc])

  return (
    <motion.div
      className={`game-card ${isDlc ? 'is-dlc' : ''}`}
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -5 }}
      transition={{ type: 'spring', stiffness: 300 }}
      data-testid={isDlc ? 'dlc-card' : 'game-card'}
    >
      <div className="game-card-image-wrapper">
        {isDlc && (
          <div className="dlc-badge" style={{ zIndex: 100 }}>
            <span>DLC</span>
          </div>
        )}
        {!imgError ? (
          <img
            src={currentImg}
            alt={game.title}
            className="game-card-image"
            loading="lazy"
            onLoad={() => console.log(`Loaded image for ${game.id}: ${currentImg}`)}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              // Próbujemy różnych wariantów zanim się poddamy (dla starych struktur)
              if (target.src.includes('header.jpg') && !target.src.includes('store_item_assets')) {
                // Jeśli stary header nie działa, spróbuj nowszy format (bez hasha jeszcze)
                target.src = target.src.replace('/steam/apps/', '/store_item_assets/steam/apps/')
              } else if (target.src.includes('header.jpg')) {
                // Jeśli header nie działa, spróbuj capsule_616x353
                target.src = target.src.replace('header.jpg', 'capsule_616x353.jpg')
              } else if (target.src.includes('capsule_616x353.jpg')) {
                // Ostateczna próba: mały obrazek
                target.src = target.src.replace('capsule_616x353.jpg', 'capsule_184x69.jpg')
              } else {
                setImgError(true)
              }
            }}
          />
        ) : (
          <div className="game-card-placeholder">
            <div className="placeholder-content">
              <span>{game.title}</span>
            </div>
          </div>
        )}
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
