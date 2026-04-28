// src/components/poemas/PoemaRecitacao.jsx
import { useState, useEffect } from 'react'
import { useWhisper } from '../../hooks/useWhisper'
import { useRecitacaoSettings } from '../settings/RecitacaoSettings'
import { POEMAS, LANGUAGE_LABELS } from '../../data/poemas'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, CheckCircle2, XCircle, Loader2, BookOpen, Trophy, Settings } from 'lucide-react'
import { useTamagotchiStore } from '../../store/useTamagotchiStore'

// --- Utilitários de comparação ---
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

// --- Sub-componentes ---
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
        fill={color} fontSize="16" fontWeight="bold">
        {value}%
      </text>
    </svg>
  )
}

function WordDiff({ spoken, expected }) {
  const spokenWords = normalize(spoken).split(' ')
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {expected.split(' ').map((word, i) => {
        const found = spokenWords.includes(normalize(word))
        return (
          <span key={i} className={`px-3 py-1 rounded-lg text-sm font-serif italic border transition-all ${
            found 
              ? 'bg-success/20 text-success border-success/30' 
              : 'bg-color-error/10 text-color-error border-color-error/20'
          }`}>
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
    idle:       { text: 'Inicializando…', color: 'text-text-lo/40' },
    loading:    { text: `Carregando Modelo… ${avg}%`, color: 'text-color-warning' },
    ready:      { text: 'Whisper Offline Pronto', color: 'text-success' },
    recording:  { text: '● Gravando Voz…', color: 'text-color-error' },
    processing: { text: 'Transcrevendo…', color: 'text-accent-main' },
    error:      { text: 'Erro no Microfone', color: 'text-color-error' },
  }
  const current = map[status] ?? map.idle
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 border border-white/10 ${current.color}`}>
      {current.text}
    </span>
  )
}

export default function PoemaRecitacao({ poemaExterno, onFinish }) {
  const { settings } = useRecitacaoSettings()
  const { ganharXP } = useTamagotchiStore()

  const [selectedPoem,   setSelectedPoem]   = useState(() => {
    if (poemaExterno) return -1 // -1 significa que estamos usando um poema de fora
    return 0
  })
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

  const poem = selectedPoem === -1 ? {
    id: poemaExterno.id,
    title: poemaExterno.titulo,
    author: poemaExterno.autor,
    language: poemaExterno.idioma || 'portuguese',
    xpReward: 100,
    threshold: 75,
    lines: poemaExterno.corpo.split('\n').filter(l => l.trim().length > 0)
  } : POEMAS[selectedPoem]

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
        setTimeout(() => handleNextLine(score), 1500)
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
        ganharXP(poem.xpReward)
        if (onFinish) setTimeout(onFinish, 3000)
      }
    }
  }

  const startPractice = () => {
    setCurrentLine(0); setLineResults({}); setTranscript('')
    setLineScore(null); setPracticePhase('read')
    setShowLine(settings.showLineByDefault ?? true)
    setMode('practice')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Header com Status do Whisper */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-6 rounded-[2rem] border border-white/5 backdrop-blur-xl">
        <div className="space-y-1">
          <h2 className="text-2xl font-serif font-bold text-text-hi">Dojo de Recitação</h2>
          <div className="flex items-center gap-3">
            <StatusBadge status={status} downloadProgress={downloadProgress} />
            <span className="text-[10px] text-text-lo/40 font-bold uppercase tracking-widest">
              {LANGUAGE_LABELS[activeLanguage]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="px-4 py-2 bg-accent-main/10 border border-accent-main/20 rounded-2xl text-accent-main flex items-center gap-2 shadow-lg">
             <Trophy size={16} />
             <span className="text-sm font-black">{totalXP} XP</span>
           </div>
        </div>
      </div>

      {/* Seletor de Poemas (Estilo Cápsula) */}
      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
        {POEMAS.map((p, i) => (
          <button 
            key={p.id}
            onClick={() => { setSelectedPoem(i); setMode('study'); setCurrentLine(0); setLineResults({}); }}
            className={`flex-shrink-0 px-6 py-3 rounded-2xl text-xs font-bold transition-all border flex items-center gap-3 ${
              i === selectedPoem 
                ? 'bg-accent-main text-white border-accent-main shadow-xl scale-105' 
                : 'bg-white/5 text-text-lo border-white/5 hover:bg-white/10'
            }`}
          >
            {completedPoems.has(p.id) && <CheckCircle2 size={14} className="text-success" />}
            {p.title}
          </button>
        ))}
      </div>

      {/* MODO ESTUDO */}
      {mode === 'study' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="glass-panel p-10 md:p-16 rounded-[3rem] border-white/5 text-center space-y-8">
            <div className="space-y-2">
              <h3 className="text-4xl md:text-5xl font-serif font-bold text-text-hi tracking-tight">{poem.title}</h3>
              <p className="text-text-lo/60 italic text-lg">{poem.author} · {LANGUAGE_LABELS[poem.language]}</p>
            </div>
            
            <div className="w-full h-px bg-white/5 max-w-xs mx-auto" />

            <div className="space-y-4 py-8">
              {poem.lines.map((line, i) => (
                <p key={i} className="text-xl md:text-2xl font-serif italic text-text-hi/90 leading-relaxed opacity-80">{line}</p>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
            <div className="flex items-center gap-6 text-sm font-bold text-text-lo/40 uppercase tracking-widest">
              <span>Mínimo: <b className="text-color-warning">{activeThreshold}%</b></span>
              <span>Recompensa: <b className="text-success">+{poem.xpReward} XP</b></span>
            </div>
            <button 
              onClick={startPractice}
              disabled={['loading', 'idle'].includes(status)}
              className="w-full md:w-auto px-12 py-5 bg-text-hi text-bg-primary rounded-[2rem] font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-2xl disabled:opacity-50"
            >
              {status === 'loading' ? 'Carregando IA...' : 'Iniciar Dojo de Prática →'}
            </button>
          </div>
        </motion.div>
      )}

      {/* MODO PRÁTICA */}
      {mode === 'practice' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          {/* Progresso do Poema */}
          <div className="space-y-2 px-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-text-lo/40">
              <span>Verso {currentLine + 1} de {poem.lines.length}</span>
              <span>{poem.title}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-accent-main"
                initial={{ width: 0 }}
                animate={{ width: `${((currentLine + 1) / poem.lines.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Versos Anteriores (Histórico Suave) */}
          {currentLine > 0 && (
            <div className="opacity-30 space-y-1 px-8">
              {poem.lines.slice(Math.max(0, currentLine - 2), currentLine).map((l, i) => (
                <p key={i} className="text-sm font-serif italic text-text-lo">{l}</p>
              ))}
            </div>
          )}

          {/* Verso Atual (O Grande Foco) */}
          <div className={`glass-panel p-12 md:p-20 rounded-[3rem] transition-all duration-700 border-2 ${
            practicePhase === 'recording' ? 'border-color-error/40 bg-color-error/5 shadow-error'
            : lineScore !== null ? (lineScore >= activeThreshold ? 'border-success/40 bg-success/5' : 'border-color-error/30 bg-color-error/5')
            : 'border-accent-main/20 shadow-glow'
          }`}>
            <div className="flex justify-between items-center mb-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-text-lo/40">Foco do Treinamento</span>
              <button 
                onClick={() => setShowLine(!showLine)}
                className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-text-lo hover:bg-white/10 transition-all uppercase tracking-widest"
              >
                {showLine ? 'Ocultar Texto' : 'Mostrar Texto'}
              </button>
            </div>

            <p className={`text-2xl md:text-4xl font-serif italic text-center transition-all duration-700 leading-tight ${
              showLine ? 'text-text-hi' : 'text-transparent blur-2xl select-none'
            }`}>
              {poem.lines[currentLine]}
            </p>

            {/* Feedback da IA */}
            <AnimatePresence>
              {practicePhase === 'feedback' && transcript && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-16 pt-12 border-t border-white/5">
                  <p className="text-[10px] font-black text-text-lo/40 uppercase tracking-widest mb-4">A IA ouviu:</p>
                  <p className="text-xl font-serif italic text-text-hi/80 italic">"{transcript}"</p>
                  <WordDiff spoken={transcript} expected={poem.lines[currentLine]} />
                </motion.div>
              )}
            </AnimatePresence>
            
            {status === 'processing' && (
              <div className="mt-12 flex items-center justify-center gap-3 text-accent-main animate-pulse">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest">Sintonizando Rede Neural...</span>
              </div>
            )}
          </div>

          {/* Resultado do Verso */}
          {lineScore !== null && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-8 rounded-[2rem] border-white/5 flex items-center gap-10">
              <CircleProgress value={lineScore} size={90} />
              <div className="space-y-1">
                <p className="text-xl font-bold text-text-hi">
                  {lineScore >= 90 ? 'Mestria Absoluta!' : lineScore >= activeThreshold ? 'Excelente Verso!' : 'Quase lá, Guerreiro'}
                </p>
                <p className="text-sm text-text-lo/60 font-medium">
                  {lineScore >= activeThreshold ? 'Sua voz ressoou corretamente.' : `Você precisa de ${activeThreshold}% para avançar.`}
                </p>
              </div>
            </motion.div>
          )}

          {/* Controles de Prática */}
          <div className="flex flex-col md:flex-row gap-4 px-2 pt-4">
            {practicePhase !== 'feedback' ? (
              <button 
                onClick={status === 'recording' ? stopRecording : startRecording}
                disabled={['loading', 'processing', 'idle'].includes(status)}
                className={`flex-1 py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 transition-all shadow-2xl ${
                  status === 'recording' ? 'bg-color-error text-white animate-pulse' : 'bg-accent-main text-white hover:scale-105'
                }`}
              >
                <Mic size={20} />
                {status === 'recording' ? 'Parar Recitação' : 'Pressionar para Recitar'}
              </button>
            ) : (
              <div className="flex flex-col md:flex-row gap-4 w-full">
                {lineScore < activeThreshold && (
                  <button 
                    onClick={() => { setTranscript(''); setLineScore(null); setPracticePhase('read'); }}
                    className="flex-1 py-6 bg-white/5 border border-white/10 text-text-hi rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                  >
                    Tentar Novamente
                  </button>
                )}
                <button 
                  onClick={() => handleNextLine()}
                  disabled={lineScore < activeThreshold}
                  className={`flex-1 py-6 bg-text-hi text-bg-primary rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-2xl ${
                    lineScore < activeThreshold ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-105'
                  }`}
                >
                  {currentLine < poem.lines.length - 1 ? 'Próximo Verso →' : 'Ver Resultado Final →'}
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => setMode('study')} 
            className="w-full text-center text-[10px] font-black text-text-lo/30 uppercase tracking-[0.3em] hover:text-text-hi transition-colors pt-4"
          >
            ← Abandonar Prática e Voltar ao Estudo
          </button>
        </motion.div>
      )}

      {/* MODO RESULTADOS */}
      {mode === 'results' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-8 py-10">
          <div className="glass-panel p-16 rounded-[4rem] border-white/5 text-center space-y-8 relative overflow-hidden shadow-hero">
            <div className="absolute inset-0 bg-gradient-to-b from-accent-main/10 to-transparent pointer-events-none" />
            
            <div className="flex justify-center relative">
              <CircleProgress value={overallScore()} size={120} />
              {overallScore() >= activeThreshold && (
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-xp-gold rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                  <Trophy size={24} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-3xl font-serif font-bold text-text-hi">
                {overallScore() >= activeThreshold ? 'Domínio Poético!' : 'Prática Concluída'}
              </h3>
              <p className="text-text-lo/60 font-medium">{poem.title} · {poem.author}</p>
            </div>

            {overallScore() >= activeThreshold && (
              <div className="inline-flex items-center gap-4 bg-xp-gold/20 border border-xp-gold/30 px-8 py-4 rounded-3xl text-xp-gold shadow-glow">
                <span className="text-xl font-black">+{poem.xpReward} XP</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">Recompensa Desbloqueada</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={startPractice} className="py-5 bg-white/5 border border-white/10 text-text-hi rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">Praticar Novamente</button>
            <button onClick={() => setMode('study')} className="py-5 bg-accent-main text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:scale-105 shadow-xl transition-all">Escolher Outro Poema</button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
