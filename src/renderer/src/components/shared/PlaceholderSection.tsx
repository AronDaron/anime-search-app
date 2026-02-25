import React from 'react'

interface PlaceholderSectionProps {
  title: string
  colorClass: string
}

export const PlaceholderSection: React.FC<PlaceholderSectionProps> = ({ title, colorClass }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '60vh',
        textAlign: 'center'
      }}
    >
      <h1 className={`neon-text ${colorClass}`} style={{ fontSize: '4rem', marginBottom: '1rem' }}>
        {title}
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>
        Ta sekcja jest w przygotowaniu. Wkrótce dodamy tu nową zawartość!
      </p>
    </div>
  )
}
