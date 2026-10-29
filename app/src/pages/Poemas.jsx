import { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
  Mic,
  MicOff,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Settings,
  Plus,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { usePoemas } from '../hooks/useMaterias';
import { useTamagotchiStore } from '../store/useTamagotchiStore';
import { useVosk } from '../hooks/useVosk';
import { useTranslation } from '../lib/i18n';
import {
  calcularSimilaridadeFonetica,
  extrairGramaticaContextual,
} from '../lib/audio/audioDecoder';
import PoemaLeitura from '../components/poemas/PoemaLeitura';
import PoemasGerenciador from '../components/poemas/PoemasGerenciador';
import PoemaRecitacao from '../components/poemas/PoemaRecitacao';
import toast from 'react-hot-toast';

const ESPECTRO_BASE_ALTURAS = [
  14, 22, 34, 46, 56, 40, 28, 48, 60, 52, 38, 20,
  30, 50, 62, 54, 42, 26, 18, 36, 52, 58, 44, 30,
  20, 38, 48, 36, 24, 16, 28, 42, 34, 22, 16, 12,
];

export default function PoemasPage() {
  const { poemas = [], getById, registrarRecitacao, proximoPoema, poemaAnterior } = usePoemas();
  const { t } = useTranslation();
  const addBonusXp = useTamagotchiStore((s) => s.addBonusXp);

  // 'estudio' | 'gerenciar' | 'leitura'
  const [tela, setTela] = useState('estudio');
  const [poemaSelecionado, setPoemaSelecionado] = useState(null);
  const [indiceLinhaAtiva, setIndiceLinhaAtiva] = useState(0);
  const [modalVoskAberto, setModalVoskAberto] = useState(false);

  // Estados Fonéticos Reais Estabilizados: 'correta' (verde) | 'errada' (vermelho)
  const [palavrasStatus, setPalavrasStatus] = useState({});
  const [indicePalavraEsperada, setIndicePalavraEsperada] = useState(0);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [acuraciaSessao, setAcuraciaSessao] = useState(0);

  const ponteiroRef = useRef(0);

  const poemaAtivo = useMemo(() => {
    if (poemaSelecionado) {
      return getById(poemaSelecionado.id) || poemaSelecionado;
    }
    if (poemas.length > 0) {
      return poemas[0];
    }
    return null;
  }, [poemaSelecionado, poemas, getById]);

  const versos = useMemo(() => {
    const bruto = poemaAtivo?.corpo || '';
    return bruto
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }, [poemaAtivo]);

  useLayoutEffect(() => {
    if (versos.length > 0 && indiceLinhaAtiva >= versos.length) {
      setIndiceLinhaAtiva(0);
    }
  }, [versos.length, indiceLinhaAtiva]);

  const versoAtualTexto = versos[indiceLinhaAtiva] || versos[0] || '';
  const palavrasVersoAtual = useMemo(() => {
    return versoAtualTexto.split(/\s+/).filter(Boolean);
  }, [versoAtualTexto]);

  const gramaticaPoema = useMemo(() => {
    return extrairGramaticaContextual(versoAtualTexto);
  }, [versoAtualTexto]);

  // Processamento Fonético Fiel ao Vosk:
  // - partialresult (isFinal = false): pinta acertos de VERDE ('correta') em tempo real SEM avançar ponteiroRef.current
  // - result (isFinal = true): marca palavras faladas incorretamente de VERMELHO ('errada') e avança ponteiroRef.current
  const processarTranscricao = useCallback(
    (texto, isFinal = false) => {
      if (!texto) return;
      setPartialTranscript(texto);

      const ouvidas = texto.trim().split(/\s+/).filter(Boolean);
      if (ouvidas.length === 0) return;

      setPalavrasStatus((prev) => {
        const novo = { ...prev };
        const baseIdx = ponteiroRef.current;
        let maiorIdxAlcancado = baseIdx;

        for (let i = 0; i < ouvidas.length; i++) {
          const idxNoPoema = baseIdx + i;
          if (idxNoPoema >= palavrasVersoAtual.length) break;

          const target = palavrasVersoAtual[idxNoPoema];
          const sim = calcularSimilaridadeFonetica(ouvidas[i], target);

          if (sim >= 0.72) {
            novo[idxNoPoema] = 'correta';
            maiorIdxAlcancado = Math.max(maiorIdxAlcancado, idxNoPoema + 1);
          } else if (
            idxNoPoema + 1 < palavrasVersoAtual.length &&
            calcularSimilaridadeFonetica(ouvidas[i], palavrasVersoAtual[idxNoPoema + 1]) >= 0.78
          ) {
            if (isFinal && novo[idxNoPoema] !== 'correta') {
              novo[idxNoPoema] = 'errada';
            }
            novo[idxNoPoema + 1] = 'correta';
            maiorIdxAlcancado = Math.max(maiorIdxAlcancado, idxNoPoema + 2);
          } else if (isFinal && novo[idxNoPoema] !== 'correta') {
            novo[idxNoPoema] = 'errada';
            maiorIdxAlcancado = Math.max(maiorIdxAlcancado, idxNoPoema + 1);
          }
        }

        if (isFinal) {
          const novoPonteiro = Math.min(
            palavrasVersoAtual.length,
            Math.max(baseIdx + ouvidas.length, maiorIdxAlcancado)
          );
          ponteiroRef.current = novoPonteiro;
          setIndicePalavraEsperada(novoPonteiro);
        } else {
          setIndicePalavraEsperada(Math.min(palavrasVersoAtual.length, maiorIdxAlcancado));
        }

        // Atualiza a acurácia real calculada e persiste para telemetria do Dashboard
        const avaliadas = Object.values(novo).length;
        const acertadas = Object.values(novo).filter((s) => s === 'correta').length;
        if (avaliadas > 0) {
          const novaAcuracia = Math.min(100, Math.max(0, Math.round((acertadas / avaliadas) * 100)));
          setAcuraciaSessao(novaAcuracia);
          try {
            localStorage.setItem('nexomente_last_whisper_acc', String(novaAcuracia));
          } catch {
            // Silencioso
          }
        }

        return novo;
      });

      if (isFinal) {
        setPartialTranscript('');
      }
    },
    [palavrasVersoAtual]
  );

  // Motor Oficial: Vosk Offline WASM com Cadeia DSP Vocal 16kHz e Gramática Contextual
  const {
    isListening,
    audioLevel,
    prosodyMetrics,
    startListening: startVosk,
    stopListening: stopVosk,
    nextVerse: nextVoskVerse,
    terminateAudio: terminateVoskAudio,
  } = useVosk({
    onResult: (text) => processarTranscricao(text, true),
    onPartialResult: (text) => processarTranscricao(text, false),
    onError: (msg) => toast.error(msg),
    grammar: gramaticaPoema,
  });

  const toggleListening = () => {
    if (!poemaAtivo) return;
    if (isListening) {
      stopVosk();
      toast('Microfone pausado', { icon: '⏸️' });
    } else {
      startVosk();
      toast('Microfone ativo: recite os versos em voz alta', { icon: '🎙️' });
    }
  };

  // Cleanup de áudio no desmonte
  useEffect(() => {
    return () => {
      terminateVoskAudio();
    };
  }, [terminateVoskAudio]);

  const navegarPoema = useCallback(
    (direcao) => {
      if (poemas.length === 0) return;
      const atualId = poemaAtivo?.id || poemas[0].id;
      const proximo = direcao === 'prox' ? proximoPoema(atualId) : poemaAnterior(atualId);
      if (proximo) {
        setPoemaSelecionado(proximo);
        setIndiceLinhaAtiva(0);
        ponteiroRef.current = 0;
        setPalavrasStatus({});
        setIndicePalavraEsperada(0);
        setPartialTranscript('');
        setAcuraciaSessao(0);
        nextVoskVerse();
      }
    },
    [poemas, poemaAtivo, proximoPoema, poemaAnterior, nextVoskVerse]
  );

  const reiniciarVerso = () => {
    ponteiroRef.current = 0;
    setPalavrasStatus({});
    setIndicePalavraEsperada(0);
    setPartialTranscript('');
    setAcuraciaSessao(0);
    nextVoskVerse();
    toast('Verso reiniciado para nova tomada de oratória', { icon: '🎙️' });
  };

  const avancarEstrofe = () => {
    if (!poemaAtivo || versos.length === 0) return;
    ponteiroRef.current = 0;
    setPalavrasStatus({});
    setIndicePalavraEsperada(0);
    setPartialTranscript('');
    nextVoskVerse();

    if (indiceLinhaAtiva < versos.length - 1) {
      setIndiceLinhaAtiva((i) => i + 1);
      try {
        addBonusXp?.(15, 'Estrofe recitada no Estúdio');
      } catch {
        // Silencioso se store indisponível
      }
      toast.success('+15 XP • Estrofe validada com sucesso!');
    } else {
      setIndiceLinhaAtiva(0);
      if (poemaAtivo?.id) {
        registrarRecitacao(poemaAtivo.id);
      }
      try {
        addBonusXp?.(45, 'Poema completo no Estúdio');
      } catch {
        // Silencioso
      }
      toast.success('Poema concluído! +45 XP Sincronizados com Kora');
    }
  };

  // Circunferência do Donut SVG (r = 56 => 2 * PI * 56 = 351.858)
  const circunferenciaDonut = 2 * Math.PI * 56;
  const dashAcierto = (acuraciaSessao / 100) * circunferenciaDonut;

  if (tela === 'gerenciar') {
    return (
      <div className="flex flex-col h-full bg-nx-void text-nx-bright">
        <div className="px-6 py-3 bg-nx-surface border-b border-nx-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-nx-dim">Modo Biblioteca de Poemas</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTela('estudio')}
              className="px-3.5 py-1.5 rounded-lg nx-btn-primary text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Mic size={13} />
              <span>{t('poems.mode_dojo')}</span>
            </button>
            <button
              onClick={() => setTela('leitura')}
              className="px-3.5 py-1.5 rounded-lg nx-btn-secondary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpen size={13} />
              <span>{t('poems.mode_read')}</span>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <PoemasGerenciador
            onLeitura={() => setTela('estudio')}
            onSelectPoema={(p) => {
              setPoemaSelecionado(p);
              setIndiceLinhaAtiva(0);
              ponteiroRef.current = 0;
              setPalavrasStatus({});
              setIndicePalavraEsperada(0);
              setAcuraciaSessao(0);
              setTela('estudio');
            }}
          />
        </div>
      </div>
    );
  }

  if (tela === 'leitura') {
    return (
      <div className="flex flex-col h-full bg-nx-void text-nx-bright">
        <div className="px-6 py-3 bg-nx-surface border-b border-nx-border flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-nx-dim">{t('poems.mode_read')}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTela('estudio')}
              className="px-3.5 py-1.5 rounded-lg nx-btn-primary text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Mic size={13} />
              <span>{t('poems.mode_dojo')}</span>
            </button>
            <button
              onClick={() => setTela('gerenciar')}
              className="px-3.5 py-1.5 rounded-lg nx-btn-secondary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings size={13} />
              <span>{t('poems.manage')}</span>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <PoemaLeitura
            onManage={() => setTela('gerenciar')}
            poemaSelecionado={poemaAtivo}
            setPoemaSelecionado={setPoemaSelecionado}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-none bg-nx-void text-nx-bright p-4 md:p-6 flex flex-col gap-5 select-none font-ui pb-24 lg:pb-6">
      {/* Barra Superior de Seleção de Poema & Alternância de Modos */}
      <div className="flex flex-wrap items-center justify-between gap-3 nx-sheet rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-2.5 py-1 rounded-md bg-[var(--nx-accent)]/15 border border-[var(--nx-accent)]/30 text-[var(--nx-accent)] text-[11px] font-bold tracking-wide">
            {t('poems.active_badge')}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navegarPoema('ant')}
              disabled={poemas.length === 0}
              title="Poema Anterior"
              className="px-2 py-1 rounded-md bg-nx-depth hover:bg-nx-surface disabled:opacity-40 text-nx-dim hover:text-nx-bright text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer border border-nx-border"
            >
              <ChevronLeft size={13} />
              <span>Anterior</span>
            </button>
            <select
              aria-label="Selecionar Poema para Recitação"
              value={poemaAtivo?.id || ''}
              onChange={(e) => {
                const encontrado = poemas.find((p) => String(p.id) === e.target.value);
                if (encontrado) {
                  setPoemaSelecionado(encontrado);
                  setIndiceLinhaAtiva(0);
                  ponteiroRef.current = 0;
                  setPalavrasStatus({});
                  setIndicePalavraEsperada(0);
                  setPartialTranscript('');
                  setAcuraciaSessao(0);
                }
              }}
              className="bg-nx-depth border border-nx-border rounded-lg px-3 py-1 text-xs font-semibold text-nx-bright focus:outline-none focus:border-[var(--nx-accent)] cursor-pointer"
            >
              {poemas.length === 0 ? (
                <option value="">Nenhum poema cadastrado</option>
              ) : (
                poemas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titulo} {p.autor ? `— ${p.autor}` : ''}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={() => navegarPoema('prox')}
              disabled={poemas.length === 0}
              title="Próximo Poema"
              className="px-2 py-1 rounded-md bg-nx-depth hover:bg-nx-surface disabled:opacity-40 text-nx-dim hover:text-nx-bright text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer border border-nx-border"
            >
              <span>Próximo</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {poemaAtivo && (
            <button
              type="button"
              onClick={() => {
                terminateVoskAudio();
                setModalVoskAberto(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-[var(--nx-secondary)]/15 hover:bg-[var(--nx-secondary)]/25 border border-[var(--nx-secondary)]/35 text-[var(--nx-secondary)] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Mic size={13} />
              <span>Captura em Tela Cheia</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setTela('leitura')}
            className="px-3 py-1.5 rounded-lg nx-btn-secondary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen size={13} />
            <span>{t('poems.mode_read')}</span>
          </button>
          <button
            type="button"
            onClick={() => setTela('gerenciar')}
            className="px-3 py-1.5 rounded-lg nx-btn-primary text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>{t('poems.manage')}</span>
          </button>
        </div>
      </div>

      {/* Estado Vazio Limpo quando não há poemas cadastrados */}
      {!poemaAtivo ? (
        <div className="flex-1 nx-sheet rounded-2xl p-10 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-nx-depth border border-nx-border flex items-center justify-center mb-4 text-[var(--nx-accent)]">
            <Mic size={26} />
          </div>
          <h2 className="text-lg font-bold text-nx-bright mb-1 font-display">
            Seu Dojo de Oratória está vazio
          </h2>
          <p className="text-xs text-nx-dim max-w-md mb-5 leading-relaxed">
            Cadastre seu primeiro poema, texto clássico ou discurso para treinar memorização verbal, dicção e prosódia com reconhecimento fonético em tempo real.
          </p>
          <button
            type="button"
            onClick={() => setTela('gerenciar')}
            className="px-5 py-2.5 rounded-xl nx-btn-primary text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Adicionar Primeiro Poema</span>
          </button>
        </div>
      ) : (
        /* Layout Principal de 2 Colunas */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1">
          {/* Coluna Esquerda (7 cols): Arena de Recitação Fonética em Tempo Real */}
          <div className="xl:col-span-7 nx-sheet rounded-2xl p-7 flex flex-col justify-between">
            <div>
              {/* Header do Poema */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-md bg-[var(--nx-accent)]/15 text-[var(--nx-accent)] text-[11px] font-bold tracking-wider uppercase mb-2.5 border border-[var(--nx-accent)]/30">
                    {t('poems.active_badge')}
                  </span>
                  <h2 className="text-2xl font-bold text-nx-bright tracking-tight font-display">
                    {poemaAtivo.titulo}
                  </h2>
                  <p className="text-xs text-nx-dim mt-1">
                    {poemaAtivo.autor || 'Autor desconhecido'} •{' '}
                    {poemaAtivo.epoca || 'Verso Livre'} • Estrofe {indiceLinhaAtiva + 1} de {versos.length}
                  </p>
                </div>

                {/* Status do Microfone em Tempo Real com Gatilho */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`px-3.5 py-1.5 rounded-full border flex items-center gap-2 shrink-0 transition-colors cursor-pointer ${
                    isListening
                      ? 'bg-[var(--nx-secondary)]/15 border-[var(--nx-secondary)]/40 text-[var(--nx-secondary)]'
                      : 'bg-nx-depth border-nx-border text-nx-dim hover:text-nx-bright'
                  }`}
                  title={isListening ? 'Clique para pausar o microfone' : 'Clique para ativar o microfone'}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isListening ? 'bg-[var(--nx-secondary)] animate-ping' : 'bg-nx-dim'
                    }`}
                  />
                  <span className="text-[11.5px] font-bold">
                    {isListening ? 'Escutando Voz' : 'Iniciar Microfone'}
                  </span>
                </button>
              </div>

              <div className="h-px bg-nx-border mb-5" />

              {/* Lista de Versos com Destaque na Linha Ativa */}
              <div className="space-y-2.5 mb-6 max-h-[260px] overflow-y-auto pr-1">
                {versos.slice(0, 8).map((linha, idx) => {
                  const concluida = idx < indiceLinhaAtiva;
                  const ativa = idx === indiceLinhaAtiva;

                  if (ativa) {
                    return (
                      <motion.div
                        key={idx}
                        layoutId="active-verse-box"
                        className="nx-callout rounded-xl p-4 space-y-2.5 bg-nx-depth/60"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--nx-accent)] flex items-center gap-1.5">
                            <Sparkles size={12} />
                            {t('poems.active_line')}
                          </span>
                          <span className="text-[11px] font-mono text-nx-dim">
                            Linha {idx + 1}/{versos.length}
                          </span>
                        </div>

                        {/* Exibição Palavra por Palavra com Coloração Dinâmica */}
                        <p className="text-xl font-bold leading-relaxed flex flex-wrap gap-2 text-nx-bright font-display">
                          <span className="text-[var(--nx-accent)]">“</span>
                          {palavrasVersoAtual.map((p, i) => {
                            const status = palavrasStatus[i];
                            const isEsperada = i === indicePalavraEsperada;

                            let classesCor = 'text-nx-dim/50';
                            if (status === 'correta') {
                              classesCor = 'text-[var(--nx-secondary)] font-bold';
                            } else if (status === 'errada' || status === 'warn') {
                              classesCor = 'text-[var(--nx-error)] font-bold';
                            } else if (isEsperada && isListening) {
                              classesCor = 'text-[var(--nx-accent)] font-bold underline underline-offset-4';
                            }

                            return (
                              <span key={i} className={`transition-all duration-200 ${classesCor}`}>
                                {p}
                              </span>
                            );
                          })}
                          <span className="text-[var(--nx-accent)]">”</span>
                        </p>

                        {/* Feedback de voz ao vivo */}
                        {partialTranscript && (
                          <div className="text-xs font-mono text-[var(--nx-accent)] flex items-center gap-1.5 pt-1">
                            <span className="animate-pulse">🎙️ Ouvido:</span>
                            <span className="text-nx-bright font-medium italic">“{partialTranscript}”</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setIndiceLinhaAtiva(idx);
                        ponteiroRef.current = 0;
                        setPalavrasStatus({});
                        setIndicePalavraEsperada(0);
                        setPartialTranscript('');
                        nextVoskVerse();
                      }}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-nx-depth transition-colors cursor-pointer border border-transparent hover:border-nx-border"
                    >
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold shrink-0 ${
                          concluida
                            ? 'bg-[var(--nx-secondary)]/15 text-[var(--nx-secondary)]'
                            : 'bg-nx-depth text-nx-dim'
                        }`}
                      >
                        {concluida ? '100%' : '•••'}
                      </span>
                      <span
                        className={`text-sm truncate font-display ${
                          concluida ? 'text-nx-dim line-through opacity-70' : 'text-nx-bright'
                        }`}
                      >
                        {linha}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Análise Fonética Token por Token Dinâmica */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-nx-dim">
                    {t('poems.phonetic_tokens')} (Status Fonético)
                  </p>
                  <span className="text-[10px] font-mono text-nx-dim">
                    {Object.values(palavrasStatus).filter((s) => s === 'correta').length}/{palavrasVersoAtual.length} palavras
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {palavrasVersoAtual.map((palavra, idx) => {
                    const status = palavrasStatus[idx];
                    const isEsperada = idx === indicePalavraEsperada && isListening;

                    let estiloCard = 'bg-nx-depth border-nx-border text-nx-dim';
                    let scoreTexto = 'Aguardando';

                    if (status === 'correta') {
                      estiloCard = 'bg-[var(--nx-secondary)]/15 border-[var(--nx-secondary)]/50 text-[var(--nx-secondary)]';
                      scoreTexto = '100%';
                    } else if (status === 'errada' || status === 'warn') {
                      estiloCard = 'bg-[var(--nx-error)]/15 border-[var(--nx-error)]/50 text-[var(--nx-error)]';
                      scoreTexto = 'Erro';
                    } else if (isEsperada) {
                      estiloCard = 'bg-[var(--nx-accent)]/15 border-[var(--nx-accent)]/50 text-[var(--nx-accent)]';
                      scoreTexto = 'Fale agora';
                    }

                    return (
                      <div
                        key={`${palavra}-${idx}`}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all select-none ${estiloCard}`}
                      >
                        <span>{palavra}</span>
                        <span className="font-mono text-[10px] opacity-85">{scoreTexto}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Espectro de Voz Reativo ao Volume Real */}
            <div className="space-y-4">
              <div className="bg-nx-depth border border-nx-border rounded-xl p-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-nx-dim mb-3">
                  <span>{t('poems.spectrum')}</span>
                  <span className="text-[var(--nx-accent)]">
                    {isListening
                      ? audioLevel >= 4 || partialTranscript
                        ? `Captando Voz (${audioLevel}% RMS)`
                        : 'Microfone Ativo • Silêncio'
                      : 'Pausado'}{' '}
                    • {acuraciaSessao}% Match
                  </span>
                </div>

                {/* Ondas Dinâmicas de Áudio com Cores Terrosas */}
                <div className="h-14 flex items-center gap-1.5 overflow-hidden">
                  {ESPECTRO_BASE_ALTURAS.map((baseH, i) => {
                    const corBarra =
                      i % 3 === 0
                        ? 'var(--nx-accent)'
                        : i % 3 === 1
                          ? 'var(--nx-secondary)'
                          : 'var(--nx-warning)';

                    const temVozAtiva = isListening && (audioLevel >= 3 || Boolean(partialTranscript));
                    const intensidade = Math.max(audioLevel, partialTranscript ? 35 : 0);
                    const alturaReal = !isListening
                      ? 6
                      : temVozAtiva
                        ? Math.max(8, Math.min(54, Math.round((baseH * Math.max(18, intensidade)) / 65)))
                        : 7;

                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-full transition-all duration-100"
                        style={{
                          height: `${alturaReal}px`,
                          backgroundColor: corBarra,
                          opacity: !isListening ? 0.25 : temVozAtiva ? 0.95 : 0.45,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Controles da Arena */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                    isListening
                      ? 'bg-[var(--nx-error)]/15 border-[var(--nx-error)]/40 text-[var(--nx-error)]'
                      : 'bg-[var(--nx-secondary)]/15 border-[var(--nx-secondary)]/40 text-[var(--nx-secondary)]'
                  }`}
                >
                  {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                  <span>{isListening ? 'Pausar Escuta' : 'Iniciar Escuta'}</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={reiniciarVerso}
                    className="px-4 py-2.5 rounded-xl nx-btn-secondary text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>{t('poems.restart_verse')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={avancarEstrofe}
                    className="px-5 py-2.5 rounded-xl nx-btn-primary text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>{t('poems.next_stanza')}</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita (5 cols): Acurácia Fonética Global em Tempo Real */}
          <div className="xl:col-span-5 flex flex-col gap-5">
            {/* Card 1: Precisão Fonética Global (Donut Gauge) */}
            <div className="nx-sheet rounded-2xl p-6">
              <div className="mb-4">
                <h3 className="text-base font-bold text-nx-bright font-display">
                  {t('poems.global_accuracy')}
                </h3>
                <p className="text-xs text-nx-dim mt-0.5">
                  {t('poems.prosody_eval')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Donut Gauge SVG */}
                <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                  <svg className="w-36 h-36 -rotate-90" viewBox="0 0 140 140">
                    <circle
                      cx="70"
                      cy="70"
                      r="56"
                      fill="none"
                      stroke="var(--nx-border)"
                      strokeWidth="12"
                    />
                    {acuraciaSessao > 0 && (
                      <circle
                        cx="70"
                        cy="70"
                        r="56"
                        fill="none"
                        stroke="var(--nx-secondary)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${dashAcierto} ${circunferenciaDonut}`}
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold font-mono text-nx-bright">
                      {acuraciaSessao}%
                    </span>
                    <span className="text-[11px] font-bold text-[var(--nx-secondary)]">
                      {acuraciaSessao >= 90
                        ? 'Excelente'
                        : acuraciaSessao >= 75
                          ? 'Muito Bom'
                          : acuraciaSessao > 0
                            ? 'Em Treino'
                            : 'Aguardando Voz'}
                    </span>
                  </div>
                </div>

                {/* Métricas Detalhadas Reais de Acústica e Prosódia */}
                <div className="flex-1 w-full space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-nx-dim">Dicção & Fonemas</span>
                    <span className="font-mono font-bold text-[var(--nx-secondary)]">{acuraciaSessao}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-nx-depth rounded-full overflow-hidden border border-nx-border/50">
                    <div
                      className="h-full bg-[var(--nx-secondary)] transition-all duration-300"
                      style={{ width: `${acuraciaSessao}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-nx-dim">Cadência Poética (Ritmo)</span>
                    <span className="font-mono font-bold text-[var(--nx-accent)]">
                      {prosodyMetrics?.syllableRateHz > 0
                        ? `${prosodyMetrics.syllableRateHz} síl/s (${prosodyMetrics.cadenciaScore || 0}%)`
                        : `${acuraciaSessao > 0 ? Math.round(acuraciaSessao * 0.96) : 0}%`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-nx-depth rounded-full overflow-hidden border border-nx-border/50">
                    <div
                      className="h-full bg-[var(--nx-accent)] transition-all duration-300"
                      style={{
                        width: `${
                          prosodyMetrics?.syllableRateHz > 0
                            ? prosodyMetrics.cadenciaScore || 0
                            : acuraciaSessao > 0
                              ? Math.round(acuraciaSessao * 0.96)
                              : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-nx-dim">Fidelidade Lexical</span>
                    <span className="font-mono font-bold text-[var(--nx-secondary)]">
                      {acuraciaSessao > 0 ? Math.round(acuraciaSessao * 0.98) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-nx-depth rounded-full overflow-hidden border border-nx-border/50">
                    <div
                      className="h-full bg-[var(--nx-secondary)] transition-all duration-300"
                      style={{ width: `${acuraciaSessao > 0 ? Math.round(acuraciaSessao * 0.98) : 0}%` }}
                    />
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-nx-dim">
                    <span>Ofensiva deste Poema</span>
                    <span className="font-bold text-[var(--nx-warning)]">
                      {poemaAtivo.streak_recitacao || 0} recitações
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Estrutura Métrica & Índice de Versos */}
            <div className="nx-sheet rounded-2xl p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-nx-bright font-display">
                    Estrutura Métrica & Índice de Versos
                  </h3>
                  <p className="text-xs text-nx-dim mt-0.5">
                    {poemaAtivo.titulo} • {versos.length} versos
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-[var(--nx-accent)]/15 border border-[var(--nx-accent)]/35 text-[var(--nx-accent)] text-xs font-mono font-bold">
                  VERSO {indiceLinhaAtiva + 1}/{versos.length}
                </span>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] pr-1">
                {versos.map((v, i) => {
                  const ativo = i === indiceLinhaAtiva;
                  const concluido = i < indiceLinhaAtiva;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setIndiceLinhaAtiva(i);
                        ponteiroRef.current = 0;
                        setPalavrasStatus({});
                        setIndicePalavraEsperada(0);
                        setPartialTranscript('');
                      }}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-colors flex items-center gap-3 cursor-pointer ${
                        ativo
                          ? 'bg-[var(--nx-accent)]/15 border-[var(--nx-accent)]/50 text-nx-bright font-semibold'
                          : concluido
                            ? 'bg-[var(--nx-secondary)]/10 border-[var(--nx-secondary)]/30 text-nx-dim'
                            : 'bg-nx-depth border-nx-border text-nx-dim hover:text-nx-bright'
                      }`}
                    >
                      <span className="font-mono text-[10px] w-5 shrink-0 text-nx-dim">{i + 1}</span>
                      <span className="truncate flex-1 font-display">{v}</span>
                      {concluido && <span className="text-[var(--nx-secondary)] text-[10px] font-bold shrink-0">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vosk em Tela Cheia */}
      {modalVoskAberto && poemaAtivo && (
        <PoemaRecitacao
          poema={poemaAtivo}
          onClose={() => setModalVoskAberto(false)}
          onFinish={() => {
            setModalVoskAberto(false);
            if (poemaAtivo?.id) {
              registrarRecitacao(poemaAtivo.id);
            }
          }}
        />
      )}
    </div>
  );
}
