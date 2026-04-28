// src/components/RecitacaoSettings.jsx
// Insira este componente dentro da sua aba Settings existente
//
// Exemplo de uso:
//   import RecitacaoSettings from './RecitacaoSettings'
//   // dentro da sua Settings page:
//   <RecitacaoSettings />

import { useState, useEffect } from 'react'

const LANGUAGES = [
  { value: 'portuguese', label: 'Português', flag: '🇧🇷' },
  { value: 'english',    label: 'English',   flag: '🇺🇸' },
  { value: 'italian',    label: 'Italiano',  flag: '🇮🇹' },
  { value: 'spanish',    label: 'Español',   flag: '🇪🇸' },
]

const THRESHOLDS = [
  { value: 60, label: 'Fácil — 60%' },
  { value: 75, label: 'Normal — 75%' },
  { value: 85, label: 'Difícil — 85%' },
  { value: 95, label: 'Perfeito — 95%' },
]

const DEFAULTS = {
  defaultLanguage: 'portuguese',
  usePoемLanguage: true,   // usa o idioma definido no poema, ignora defaultLanguage
  threshold: 75,
  showLineByDefault: true,
  autoAdvance: false,       // avança automaticamente ao atingir o threshold
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

  const row = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: '0.5px solid var(--color-border-tertiary)',
  }
  const label = {
    fontSize: '14px',
    color: 'var(--color-text-primary)',
    fontWeight: '500',
  }
  const hint = {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    marginTop: '2px',
  }
  const card = {
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: '12px',
    padding: '0 1.25rem',
    marginBottom: '16px',
  }

  return (
    <div style={{ maxWidth: '560px' }}>

      {/* Cabeçalho da seção */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
          Recitação de Poemas
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Configurações de idioma, reconhecimento e dificuldade
        </p>
      </div>

      {/* Card: Idioma */}
      <div style={card}>

        {/* Toggle: usar idioma do poema */}
        <div style={row}>
          <div>
            <p style={label}>Usar idioma do poema</p>
            <p style={hint}>Cada poema usa seu próprio idioma para o reconhecimento</p>
          </div>
          <Toggle
            checked={settings.usePoemLanguage ?? true}
            onChange={v => update('usePoemLanguage', v)}
          />
        </div>

        {/* Idioma padrão — desabilitado se usePoemLanguage estiver ativo */}
        <div style={{ ...row, opacity: settings.usePoemLanguage ? 0.4 : 1, borderBottom: 'none' }}>
          <div>
            <p style={label}>Idioma padrão</p>
            <p style={hint}>Usado quando o poema não define um idioma próprio</p>
          </div>
          <select
            disabled={settings.usePoemLanguage}
            value={settings.defaultLanguage}
            onChange={e => update('defaultLanguage', e.target.value)}
            style={{ fontSize: '13px', padding: '6px 10px', borderRadius: '8px' }}
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
      <div style={card}>
        <div style={row}>
          <div>
            <p style={label}>Precisão mínima para avançar</p>
            <p style={hint}>Percentual de palavras corretas necessário por verso</p>
          </div>
          <select
            value={settings.threshold}
            onChange={e => update('threshold', Number(e.target.value))}
            style={{ fontSize: '13px', padding: '6px 10px', borderRadius: '8px' }}
          >
            {THRESHOLDS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div style={{ ...row, borderBottom: 'none' }}>
          <div>
            <p style={label}>Avançar automaticamente</p>
            <p style={hint}>Vai para o próximo verso assim que atingir a precisão mínima</p>
          </div>
          <Toggle
            checked={settings.autoAdvance ?? false}
            onChange={v => update('autoAdvance', v)}
          />
        </div>
      </div>

      {/* Card: Exibição */}
      <div style={card}>
        <div style={{ ...row, borderBottom: 'none' }}>
          <div>
            <p style={label}>Mostrar verso ao praticar</p>
            <p style={hint}>Exibe o texto do verso por padrão (pode ocultar manualmente)</p>
          </div>
          <Toggle
            checked={settings.showLineByDefault ?? true}
            onChange={v => update('showLineByDefault', v)}
          />
        </div>
      </div>

      {/* Info sobre o modelo */}
      <div style={{
        background: 'rgba(53,130,220,0.08)',
        border: '1px solid rgba(53,130,220,0.2)',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '13px',
        color: 'var(--color-text-secondary)',
      }}>
        <strong style={{ color: '#185FA5' }}>Whisper Small</strong> · Reconhecimento offline
        · Suporta Português, English, Italiano, Español
        · Modelo empacotado no app (~240MB)
      </div>
    </div>
  )
}

// Componente toggle reutilizável
function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '40px',
        height: '22px',
        borderRadius: '11px',
        background: checked ? '#1D9E75' : 'var(--color-border-secondary)',
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
