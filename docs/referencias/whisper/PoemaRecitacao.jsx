// src/components/PoemaRecitacao.jsx
import { useState } from 'react'
import { useWhisper } from '../hooks/useWhisper'
import { useRecitacaoSettings } from './RecitacaoSettings'
import { POEMAS, LANGUAGE_LABELS } from '../data/poemas'

// ─── Utilitários de comparação ────────────────────────────────────────────────

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreMatch(spoken, expected) {
  const sw = normalize(spoken).split(' ').filter(Boolean)
  const ew = normalize(expected).split(' ').filter(Boolean)
  if (!ew.length) return 100
  let matches = 0
  const used = new Set()
  sw.forEach(w => {
    ew.forEach((e, i) => {
      if (!used.has(i) && e === w) { matches++; used.add(i) }
    })
  })
  return Math.round((matches / ew.length) * 100)
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function CircleProgress({ value, size = 80 }) {
  const r    = 32
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  const color = value >= 80 ? '#1D9E75' : value >= 50 ? '#EF9F27' : '#E24B4A'
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none"
        stroke="rgba(128,128,128,0.12)" strokeWidth="6" />
      <circle cx="40" cy="40" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dasharray .5s ease' }} />
      <text x="40" y="45" textAnchor="middle"
        fill={color} fontSize="16" fontWeight="600">
        {value}%
      </text>
    </svg>
  )
}

function WordDiff({ spoken, expected }) {
  const spokenWords = normalize(spoken).split(' ')
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
      {expected.split(' ').map((word, i) => {
        const found = spokenWords.includes(normalize(word))
        return (
          <span key={i} style={{
            padding: '2px 9px', borderRadius: '4px',
            fontSize: '14px', fontFamily: 'Georgia, serif',
            background: found ? 'rgba(29,158,117,.18)' : 'rgba(226,75,74,.15)',
            color:      found ? '#1D9E75' : '#E24B4A',
            border: `1px solid ${found ? 'rgba(29,158,117,.35)' : 'rgba(226,75,74,.3)'}`,
          }}>
            {word}
          </span>
        )
      })}
    </div>
  )
}

function StatusBadge({ status, downloadProgress }) {
  const vals  = Object.values(downloadProgress)
  const avg   = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  const map = {
    idle:       ['Inicializando…',        '#888780'],
    loading:    [`Carregando… ${avg}%`,   '#EF9F27'],
    ready:      ['Whisper pronto',         '#1D9E75'],
    recording:  ['● Gravando…',           '#E24B4A'],
    processing: ['Transcrevendo…',        '#378ADD'],
    error:      ['Erro no microfone',     '#E24B4A'],
  }
  const [text, color] = map[status] ?? map.idle
  return (
    <span style={{
      fontSize: '11px', fontWeight: '500', color,
      background: color + '18', border: `1px solid ${color}40`,
      borderRadius: '4px', padding: '2px 8px',
    }}>{text}</span>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PoemaRecitacao({ onXpGain }) {
  const { settings } = useRecitacaoSettings()

  const [selectedPoem,   setSelectedPoem]   = useState(0)
  const [mode,           setMode]           = useState('study')
  const [currentLine,    setCurrentLine]    = useState(0)
  const [lineResults,    setLineResults]    = useState({})
  const [transcript,     setTranscript]     = useState('')
  const [lineScore,      setLineScore]      = useState(null)
  const [practicePhase,  setPracticePhase]  = useState('read')
  const [showLine,       setShowLine]       = useState(true)
  const [completedPoems, setCompletedPoems] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('poemas-completados') ?? '[]')) }
    catch { return new Set() }
  })
  const [totalXP, setTotalXP] = useState(
    () => Number(localStorage.getItem('poemas-xp') ?? 0)
  )

  const poem = POEMAS[selectedPoem]

  const activeLanguage  = (settings.usePoemLanguage ?? true)
    ? poem.language : (settings.defaultLanguage ?? 'portuguese')
  const activeThreshold = settings.threshold ?? poem.threshold ?? 75

  const { status, startRecording, stopRecording, downloadProgress } = useWhisper({
    language: activeLanguage,
    onResult: (text) => {
      const score = scoreMatch(text, poem.lines[currentLine])
      setTranscript(text)
      setLineScore(score)
      setLineResults(prev => ({ ...prev, [currentLine]: { text, score } }))
      setPracticePhase('feedback')
      if (settings.autoAdvance && score >= activeThreshold) {
        setTimeout(() => handleNextLine(score), 1200)
      }
    },
  })

  const overallScore = () => {
    const scores = Object.values(lineResults).map(r => r.score)
    if (!scores.length) return 0
    return Math.round(scores.reduce((a, b) => a + b, 0) / poem.lines.length)
  }

  const handleNextLine = (forceScore = null) => {
    const score = forceScore ?? lineScore
    if (currentLine < poem.lines.length - 1) {
      setCurrentLine(p => p + 1)
      setTranscript('')
      setLineScore(null)
      setPracticePhase('read')
      setShowLine(settings.showLineByDefault ?? true)
    } else {
      setMode('results')
      const final = overallScore()
      if (final >= activeThreshold && !completedPoems.has(poem.id)) {
        const nc  = new Set([...completedPoems, poem.id])
        const nxp = totalXP + poem.xpReward
        setCompletedPoems(nc)
        setTotalXP(nxp)
        localStorage.setItem('poemas-completados', JSON.stringify([...nc]))
        localStorage.setItem('poemas-xp', String(nxp))
        onXpGain?.(poem.xpReward, 'poem_recitation')
      }
    }
  }

  const startPractice = () => {
    setCurrentLine(0); setLineResults({}); setTranscript('')
    setLineScore(null); setPracticePhase('read')
    setShowLine(settings.showLineByDefault ?? true)
    setMode('practice')
  }

  const card = (extra = {}) => ({
    background: 'var(--color-background-secondary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: '12px', padding: '1.25rem', marginBottom: '12px', ...extra,
  })

  const btn = (v = 'default') => ({
    padding: '12px 20px', borderRadius: '8px',
    fontSize: '14px', fontWeight: '500', cursor: 'pointer',
    border: v === 'primary' ? '1px solid rgba(29,158,117,.5)'
          : v === 'danger'  ? '1px solid rgba(226,75,74,.4)'
          : v === 'accent'  ? '1px solid rgba(239,159,39,.5)'
          : '0.5px solid var(--color-border-secondary)',
    background: v === 'primary' ? 'rgba(29,158,117,.14)'
              : v === 'danger'  ? 'rgba(226,75,74,.1)'
              : v === 'accent'  ? 'rgba(239,159,39,.12)'
              : 'var(--color-background-primary)',
    color: v === 'primary' ? '#1D9E75' : v === 'danger' ? '#E24B4A'
         : v === 'accent'  ? '#BA7517' : 'var(--color-text-secondary)',
  })

  return (
    <div style={{ fontFamily: 'var(--font-sans)', maxWidth: '700px', margin: '0 auto', padding: '1rem 0' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
            Recitação de Poemas
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <StatusBadge status={status} downloadProgress={downloadProgress} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
              offline · {LANGUAGE_LABELS[activeLanguage] ?? activeLanguage}
            </span>
          </div>
        </div>
        <div style={{ background: 'rgba(239,159,39,.12)', border: '1px solid rgba(239,159,39,.3)', borderRadius: '8px', padding: '6px 14px', fontSize: '14px', fontWeight: '500', color: '#BA7517' }}>
          +{totalXP} XP
        </div>
      </div>

      {/* Seletor de poemas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {POEMAS.map((p, i) => {
          const done = completedPoems.has(p.id)
          const sel  = i === selectedPoem
          return (
            <button key={p.id}
              onClick={() => { setSelectedPoem(i); setMode('study'); setCurrentLine(0); setLineResults({}) }}
              style={{ flexShrink: 0, padding: '7px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                border: sel ? '1px solid rgba(53,130,220,.5)' : '0.5px solid var(--color-border-secondary)',
                background: sel ? 'rgba(53,130,220,.1)' : 'var(--color-background-primary)',
                color: sel ? '#378ADD' : 'var(--color-text-secondary)',
              }}>
              {done && <span style={{ color: '#1D9E75', fontSize: '11px' }}>✓</span>}
              {p.title}
              <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'var(--color-background-secondary)', color: 'var(--color-text-tertiary)' }}>
                {LANGUAGE_LABELS[p.language]?.slice(0, 2) ?? '??'}
              </span>
            </button>
          )
        })}
      </div>

      {/* ESTUDO */}
      {mode === 'study' && (
        <>
          <div style={card()}>
            <h3 style={{ margin: '0 0 2px', fontSize: '22px', fontWeight: '400', fontFamily: 'Georgia, serif', color: 'var(--color-text-primary)' }}>
              {poem.title}
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {poem.author} · {LANGUAGE_LABELS[poem.language]}
            </p>
            <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '1rem' }}>
              {poem.lines.map((line, i) => (
                <p key={i} style={{ margin: '0 0 5px', fontSize: '15px', lineHeight: '1.7', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: 'var(--color-text-primary)' }}>
                  {line}
                </p>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Mínimo: <strong style={{ color: '#EF9F27' }}>{activeThreshold}%</strong>
              &nbsp;·&nbsp;Recompensa: <strong style={{ color: '#1D9E75' }}>+{poem.xpReward} XP</strong>
            </span>
            <button style={btn('primary')} onClick={startPractice}
              disabled={status === 'loading' || status === 'idle'}>
              {status === 'loading' ? 'Carregando modelo…' : 'Praticar recitação →'}
            </button>
          </div>
        </>
      )}

      {/* PRÁTICA */}
      {mode === 'practice' && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              <span>Verso {currentLine + 1} de {poem.lines.length}</span>
              <span>{poem.title} · {LANGUAGE_LABELS[activeLanguage]}</span>
            </div>
            <div style={{ height: '4px', background: 'var(--color-background-secondary)', borderRadius: '2px' }}>
              <div style={{ height: '4px', borderRadius: '2px', background: '#1D9E75', width: `${(currentLine / poem.lines.length) * 100}%`, transition: 'width .4s' }} />
            </div>
          </div>

          {currentLine > 0 && (
            <div style={{ ...card(), padding: '.75rem 1.25rem', opacity: .5 }}>
              {poem.lines.slice(Math.max(0, currentLine - 2), currentLine).map((l, i) => (
                <p key={i} style={{ margin: '2px 0', fontSize: '13px', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>{l}</p>
              ))}
            </div>
          )}

          <div style={{
            ...card(),
            border: `1px solid ${
              practicePhase === 'recording' ? 'rgba(226,75,74,.5)'
              : lineScore !== null ? (lineScore >= activeThreshold ? 'rgba(29,158,117,.5)' : 'rgba(226,75,74,.4)')
              : 'rgba(53,130,220,.35)'
            }`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Verso atual</span>
              <button onClick={() => setShowLine(p => !p)} style={{ background: 'none', border: '0.5px solid var(--color-border-secondary)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                {showLine ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '18px', lineHeight: '1.6', fontFamily: 'Georgia, serif', fontStyle: 'italic', transition: 'filter .3s, color .3s',
              color: showLine ? 'var(--color-text-primary)' : 'transparent',
              filter: showLine ? 'none' : 'blur(6px)',
              userSelect: showLine ? 'auto' : 'none',
            }}>
              {poem.lines[currentLine]}
            </p>

            {practicePhase === 'feedback' && transcript && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>Whisper transcreveu:</p>
                <p style={{ margin: '0 0 8px', fontSize: '15px', fontFamily: 'Georgia, serif', color: 'var(--color-text-primary)' }}>"{transcript}"</p>
                <WordDiff spoken={transcript} expected={poem.lines[currentLine]} />
              </div>
            )}
            {status === 'processing' && (
              <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Transcrevendo com Whisper…</p>
            )}
          </div>

          {lineScore !== null && (
            <div style={{ ...card(), display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <CircleProgress value={lineScore} />
              <div>
                <p style={{ margin: 0, fontWeight: '500', fontSize: '15px', color: 'var(--color-text-primary)' }}>
                  {lineScore >= 90 ? 'Perfeito!' : lineScore >= activeThreshold ? 'Muito bem!' : lineScore >= 50 ? 'Quase lá…' : 'Tente novamente'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  {lineScore >= activeThreshold ? 'Pode avançar.' : `Precisa de ${activeThreshold}% para avançar.`}
                </p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
            {practicePhase !== 'feedback' ? (
              <button style={{ ...btn(status === 'recording' ? 'danger' : 'accent'), flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={status === 'recording' ? stopRecording : startRecording}
                disabled={['loading','processing','idle'].includes(status)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  {status === 'recording'
                    ? <rect x="6" y="6" width="12" height="12" rx="2"/>
                    : <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zm-1 19.93V23h2v-2.07A8 8 0 0 0 20 13h-2a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93z"/>}
                </svg>
                {status === 'recording' ? 'Parar gravação' : status === 'processing' ? 'Transcrevendo…' : status === 'loading' ? 'Carregando…' : 'Recitar este verso'}
              </button>
            ) : (
              <>
                {lineScore < activeThreshold && (
                  <button style={btn()} onClick={() => { setTranscript(''); setLineScore(null); setPracticePhase('read') }}>
                    Tentar novamente
                  </button>
                )}
                <button style={{ ...btn(lineScore >= activeThreshold ? 'primary' : 'default'), flex: 1, opacity: lineScore >= activeThreshold ? 1 : .45, cursor: lineScore >= activeThreshold ? 'pointer' : 'not-allowed' }}
                  onClick={() => handleNextLine()} disabled={lineScore < activeThreshold}>
                  {currentLine < poem.lines.length - 1 ? 'Próximo verso →' : 'Ver resultado →'}
                </button>
              </>
            )}
          </div>

          <button onClick={() => setMode('study')} style={{ marginTop: '10px', width: '100%', padding: '8px', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', fontSize: '13px', cursor: 'pointer' }}>
            ← Voltar para o poema
          </button>
        </>
      )}

      {/* RESULTADOS */}
      {mode === 'results' && (
        <>
          <div style={{ ...card(), textAlign: 'center', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <CircleProgress value={overallScore()} size={96} />
            </div>
            <h3 style={{ margin: '1rem 0 4px', fontSize: '20px', fontWeight: '400', fontFamily: 'Georgia, serif', color: 'var(--color-text-primary)' }}>
              {overallScore() >= activeThreshold ? 'Poema dominado!' : 'Continue praticando'}
            </h3>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              {poem.title} · {poem.author}
            </p>
            {overallScore() >= activeThreshold && (
              <div style={{ marginTop: '1rem', display: 'inline-block', background: 'rgba(239,159,39,.15)', border: '1px solid rgba(239,159,39,.4)', borderRadius: '8px', padding: '8px 20px', color: '#BA7517', fontSize: '16px', fontWeight: '500' }}>
                +{poem.xpReward} XP desbloqueado!
              </div>
            )}
          </div>

          <div style={card()}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Resultado por verso</p>
            {poem.lines.map((line, i) => {
              const score = lineResults[i]?.score ?? 0
              const color = score >= activeThreshold ? '#1D9E75' : '#E24B4A'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <span style={{ width: '36px', height: '20px', borderRadius: '4px', background: `${color}22`, border: `1px solid ${color}55`, fontSize: '11px', fontWeight: '600', color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {score}%
                  </span>
                  <p style={{ margin: 0, fontSize: '13px', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {line}
                  </p>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={{ ...btn(), flex: 1, padding: '12px' }} onClick={startPractice}>Praticar novamente</button>
            <button style={{ ...btn('primary'), flex: 1, padding: '12px' }} onClick={() => setMode('study')}>Escolher outro poema</button>
          </div>
        </>
      )}
    </div>
  )
}
