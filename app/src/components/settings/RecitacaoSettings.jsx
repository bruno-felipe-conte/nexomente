// src/components/settings/RecitacaoSettings.jsx
import { useState } from 'react'
import PropTypes from 'prop-types'

export const LANGUAGES = [
  { value: 'portuguese', label: 'Português', flag: '🇧🇷' },
  { value: 'english',    label: 'English',   flag: '🇺🇸' },
  { value: 'italian',    label: 'Italiano',  flag: '🇮🇹' },
  { value: 'spanish',    label: 'Español',   flag: '🇪🇸' },
]

export const THRESHOLDS = [
  { value: 60, label: 'Fácil — 60%' },
  { value: 75, label: 'Normal — 75%' },
  { value: 85, label: 'Difícil — 85%' },
  { value: 95, label: 'Perfeito — 95%' },
]

const DEFAULTS = {
  defaultLanguage: 'portuguese',
  usePoemLanguage: true,
  threshold: 75,
  showLineByDefault: true,
  autoAdvance: false,
}

function loadSettings() {
  try {
    const saved = localStorage.getItem('recitacao-settings')
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

function saveSettings(settings) {
  localStorage.setItem('recitacao-settings', JSON.stringify(settings))
}

export function useRecitacaoSettings() {
  const [settings, setSettings] = useState(loadSettings)

  const update = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      return next
    })
  }

  return { settings, update }
}

export default function RecitacaoSettings() {
  const { settings, update } = useRecitacaoSettings()

  const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: '0.5px solid var(--color-border-tertiary)',
  }
  
  const labelStyle = {
    fontSize: '14px',
    color: 'var(--color-text-primary)',
    fontWeight: '500',
  }
  
  const hintStyle = {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    marginTop: '2px',
  }
  
  const cardStyle = {
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: '12px',
    padding: '0 1.25rem',
    marginBottom: '16px',
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Cabeçalho da seção */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          Recitação de Poemas (Dojo AI)
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Aperfeiçoe sua memorização com reconhecimento de voz offline.
        </p>
      </div>

      {/* Card: Idioma */}
      <div style={cardStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>Usar idioma do poema</p>
            <p style={hintStyle}>Cada poema usa seu próprio idioma para o reconhecimento</p>
          </div>
          <Toggle
            checked={settings.usePoemLanguage ?? true}
            onChange={v => update('usePoemLanguage', v)}
          />
        </div>

        <div style={{ ...rowStyle, opacity: settings.usePoemLanguage ? 0.4 : 1, borderBottom: 'none' }}>
          <div>
            <p style={labelStyle}>Idioma padrão</p>
            <p style={hintStyle}>Usado quando o poema não define um idioma</p>
          </div>
          <select
            disabled={settings.usePoemLanguage}
            value={settings.defaultLanguage}
            onChange={e => update('defaultLanguage', e.target.value)}
            className="bg-bg-secondary text-text-primary border border-border-subtle rounded-lg px-2 py-1 text-sm outline-none"
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>
                {l.flag} {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card: Dificuldade */}
      <div style={cardStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>Precisão mínima para avançar</p>
            <p style={hintStyle}>Percentual de palavras corretas necessário por verso</p>
          </div>
          <select
            value={settings.threshold}
            onChange={e => update('threshold', Number(e.target.value))}
            className="bg-bg-secondary text-text-primary border border-border-subtle rounded-lg px-2 py-1 text-sm outline-none"
          >
            {THRESHOLDS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <div>
            <p style={labelStyle}>Avançar automaticamente</p>
            <p style={hintStyle}>Pula para o próximo verso ao atingir a precisão</p>
          </div>
          <Toggle
            checked={settings.autoAdvance ?? false}
            onChange={v => update('autoAdvance', v)}
          />
        </div>
      </div>

      {/* Card: Exibição */}
      <div style={cardStyle}>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <div>
            <p style={labelStyle}>Mostrar verso ao praticar</p>
            <p style={hintStyle}>Exibe o texto do verso por padrão</p>
          </div>
          <Toggle
            checked={settings.showLineByDefault ?? true}
            onChange={v => update('showLineByDefault', v)}
          />
        </div>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '40px',
        height: '22px',
        borderRadius: '11px',
        background: checked ? 'var(--color-accent-main)' : 'var(--color-background-tertiary)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background .2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: '3px',
        left: checked ? '21px' : '3px',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: '#fff',
        transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

Toggle.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func,
}
