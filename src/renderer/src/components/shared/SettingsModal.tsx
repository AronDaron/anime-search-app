import React, { useState, useEffect } from 'react'
import { X, Settings, Key, Info } from 'lucide-react'
import { ApiKeyService } from '../../api/apiKeyService'
import './SettingsModal.css'

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [steamKey, setSteamKey] = useState('')
    const [openRouterKey, setOpenRouterKey] = useState('')
    const [isSaved, setIsSaved] = useState(false)

    useEffect(() => {
        if (isOpen) {
            // Załaduj aktualne klucze przy otwarciu (tylko te z localStorage, żeby nie pokazywać .env w inputach)
            const localSteam = localStorage.getItem('v_steam_api_key') || ''
            const localOpenRouter = localStorage.getItem('v_openrouter_api_key') || ''
            setSteamKey(localSteam)
            setOpenRouterKey(localOpenRouter)
            setIsSaved(false)
        }
    }, [isOpen])

    const handleSave = () => {
        ApiKeyService.setSteamKey(steamKey)
        ApiKeyService.setOpenRouterKey(openRouterKey)
        setIsSaved(true)
        setTimeout(() => {
            onClose()
        }, 500)
    }

    if (!isOpen) return null

    return (
        <div className="settings-modal-overlay" onClick={onClose}>
            <div className="settings-modal-content fade-in" onClick={(e) => e.stopPropagation()}>
                <div className="settings-modal-header">
                    <h2>
                        <Settings size={22} className="neon-text-blue" />
                        Ustawienia API
                    </h2>
                    <button className="settings-close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="settings-modal-body">
                    <div className="settings-field-group">
                        <label>
                            <Key size={16} /> Steam API Key
                        </label>
                        <div className="settings-input-wrapper">
                            <input
                                type="password"
                                className="settings-input"
                                placeholder="Wpisz klucz Steam..."
                                value={steamKey}
                                onChange={(e) => setSteamKey(e.target.value)}
                            />
                        </div>
                        <p className="settings-field-hint">
                            {ApiKeyService.isUserSetSteamKey() ? (
                                <span className="status-local">✓ Ustawiono przez użytkownika</span>
                            ) : import.meta.env.VITE_STEAM_API_KEY ? (
                                <span className="status-env">ℹ Korzystasz z klucza wbudowanego (.env)</span>
                            ) : (
                                <span>Brak skonfigurowanego klucza.</span>
                            )}
                        </p>
                    </div>

                    <div className="settings-field-group">
                        <label>
                            <Key size={16} /> OpenRouter API Key
                        </label>
                        <div className="settings-input-wrapper">
                            <input
                                type="password"
                                className="settings-input"
                                placeholder="sk-or-v1-..."
                                value={openRouterKey}
                                onChange={(e) => setOpenRouterKey(e.target.value)}
                            />
                        </div>
                        <p className="settings-field-hint">
                            {ApiKeyService.isUserSetOpenRouterKey() ? (
                                <span className="status-local">✓ Ustawiono przez użytkownika</span>
                            ) : import.meta.env.VITE_OPENROUTER_KEY ? (
                                <span className="status-env">ℹ Korzystasz z klucza wbudowanego (.env)</span>
                            ) : (
                                <span>Brak skonfigurowanego klucza.</span>
                            )}
                        </p>
                    </div>

                    <div className="settings-info-box glass-panel-inner" style={{ padding: '12px', marginTop: '12px', fontSize: '0.85rem', color: '#aaa', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <Info size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <p style={{ margin: 0 }}>
                                Klucze są przechowywane lokalnie w Twojej przeglądarce i nie są wysyłane na nasze serwery. Są używane wyłącznie do bezpośredniej komunikacji z API Steam i OpenRouter.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="settings-modal-footer">
                    <button className="settings-btn settings-btn-cancel" onClick={onClose}>
                        Anuluj
                    </button>
                    <button className="settings-btn settings-btn-save" onClick={handleSave}>
                        {isSaved ? 'Zapisano!' : 'Zapisz Ustawienia'}
                    </button>
                </div>
            </div>
        </div>
    )
}
