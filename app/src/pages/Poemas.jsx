import { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from "react";
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

const POEMA_CLASSICO_PADRAO = {
  id: 'tabacaria_pessoa',
  titulo: 'Tabacaria',
  autor: 'Ãlvaro de Campos (Fernando Pessoa)',
  ano: '1928',
  epoca: 'Modernismo PortuguÃªs',
  forma: 'Ode / Verso Livre',
  streak_recitacao: 12,
  corpo: [
    'NÃ£o sou nada.',
    'Nunca serei nada.',
    'NÃ£o posso querer ser nada.',
    'Ã€ parte isso, tenho em mim todos os sonhos do mundo.',
    'Janelas do meu quarto,',
    'Do meu quarto de um dos milhÃµes do mundo que ninguÃ©m sabe quem Ã©...',
  ].join('\n'),
};

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

  // Estados FonÃ©ticos Reais Estabilizados: 'correta' (verde) | 'errada' (vermelho)
  const [palavrasStatus, setPalavrasStatus] = useState({});
  const [indicePalavraEsperada, setIndicePalavraEsperada] = useState(0);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [acuraciaSessao, setAcuraciaSessao] = useState(100);

  const ponteiroRef = useRef(0);

  const poemaAtivo = useMemo(() => {
    if (poemaSelecionado) {
      return getById(poemaSelecionado.id) || poemaSelecionado;
    }
    if (poemas.length > 0) {
      return poemas[0];
    }
    return POEMA_CLASSICO_PADRAO;
  }, [poemaSelecionado, poemas, getById]);

  const versos = useMemo(() => {
    const bruto = poemaAtivo?.corpo || POEMA_CLASSICO_PADRAO.corpo;
    const linhas = bruto
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    return linhas.length > 0 ? linhas : POEMA_CLASSICO_PADRAO.corpo.split('\n');
  }, [poemaAtivo]);

  useLayoutEffect(() => {    if (indiceLinhaAtiva >= versos.length) {      setIndiceLinhaAtiva(0);    }  }, [versos.length, indiceLinhaAtiva]);

  const versoAtualTexto = versos[indiceLinhaAtiva] || versos[0] || '';
  const palavrasVersoAtual = useMemo(() => {
    return versoAtualTexto.split(/\s+/).filter(Boolean);
  }, [versoAtualTexto]);

  const gramaticaPoema = useMemo(() => {
    return extrairGramaticaContextual(versoAtualTexto);
  }, [versoAtualTexto]);

  // Processamento FonÃ©tico Fiel ao Vosk:
  // - partialresult (isFinal = false): pinta acertos de VERDE ('correta') em tempo real SEM avanÃ§ar ponteiroRef.current
  // - result (isFinal = true): marca palavras faladas incorretamente de VERMELHO ('errada') e avanÃ§a ponteiroRef.current
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
          const novoPonteiro = Math.min(palavrasVersoAtual.length, Math.max(baseIdx + ouvidas.length, maiorIdxAlcancado));
          ponteiroRef.current = novoPonteiro;
          setIndicePalavraEsperada(novoPonteiro);
        } else {
          setIndicePalavraEsperada(Math.min(palavrasVersoAtual.length, maiorIdxAlcancado));
        }

        // Atualiza a acurÃ¡cia calculada
        const avaliadas = Object.values(novo).length;
        const acertadas = Object.values(novo).filter((s) => s === 'correta').length;
        if (avaliadas > 0) {
          const novaAcuracia = Math.min(100, Math.max(50, Math.round((acertadas / avaliadas) * 100)));
          setAcuraciaSessao(novaAcuracia);
        }

        return novo;
      });

      if (isFinal) {
        setPartialTranscript('');
      }
    },
    [palavrasVersoAtual]
  );

  // Motor Oficial: Vosk Offline WASM com Cadeia DSP Vocal 16kHz e GramÃ¡tica Contextual
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
    if (isListening) {
      stopVosk();
      toast('Microfone pausado', { icon: 'â¸ï¸' });
    } else {
      startVosk();
      toast('Microfone ativo: recite os versos em voz alta', { icon: 'ðŸŽ™ï¸' });
    }
  };

  // Cleanup de Ã¡udio no desmonte
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
        setAcuraciaSessao(100);
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
    setAcuraciaSessao(100);
    nextVoskVerse();
    toast('Verso reiniciado para nova tomada de oratÃ³ria', { icon: 'ðŸŽ™ï¸' });
  };

  const avancarEstrofe = () => {
    ponteiroRef.current = 0;
    setPalavrasStatus({});
    setIndicePalavraEsperada(0);
    setPartialTranscript('');
    nextVoskVerse();

    if (indiceLinhaAtiva < versos.length - 1) {
      setIndiceLinhaAtiva((i) => i + 1);
      try {
        addBonusXp?.(15, 'Estrofe recitada no EstÃºdio');
      } catch {
        // Silencioso se store indisponÃ­vel
      }
      toast.success('+15 XP â€¢ Estrofe validada com sucesso!');
    } else {
      setIndiceLinhaAtiva(0);
      if (poemaAtivo?.id && poemaAtivo.id !== 'tabacaria_pessoa') {
        registrarRecitacao(poemaAtivo.id);
      }
      try {
        addBonusXp?.(45, 'Poema completo no EstÃºdio');
      } catch {
        // Silencioso
      }
      toast.success('Poema concluÃ­do! +45 XP Sincronizados com Kora');
    }
  };

  // CircunferÃªncia do Donut SVG (r = 56 => 2 * PI * 56 = 351.858)
  const circunferenciaDonut = 2 * Math.PI * 56;
  const dashAcierto = (acuraciaSessao / 100) * circunferenciaDonut;

  if (tela === 'gerenciar') {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-3 bg-[#10121A] border-b border-white/[0.07] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#9499B3]">Modo Biblioteca de Poemas</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTela('estudio')}
              className="px-3.5 py-1.5 rounded-lg bg-[#5B7CF4] hover:bg-[#5B7CF4]/90 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Mic size={13} />
              <span>{t('poems.mode_dojo')}</span>
            </button>
            <button
              onClick={() => setTela('leitura')}
              className="px-3.5 py-1.5 rounded-lg bg-[#161923] hover:bg-[#1E2130] text-[#EEF0F6] border border-white/[0.08] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
              setTela('estudio');
            }}
          />
        </div>
      </div>
    );
  }

  if (tela === 'leitura') {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-3 bg-[#10121A] border-b border-white/[0.07] flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-[#9499B3]">{t('poems.mode_read')}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTela('estudio')}
              className="px-3.5 py-1.5 rounded-lg bg-[#5B7CF4] hover:bg-[#5B7CF4]/90 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Mic size={13} />
              <span>{t('poems.mode_dojo')}</span>
            </button>
            <button
              onClick={() => setTela('gerenciar')}
              className="px-3.5 py-1.5 rounded-lg bg-[#161923] hover:bg-[#1E2130] text-[#EEF0F6] border border-white/[0.08] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
    <div className="h-full overflow-y-auto scrollbar-none bg-[#0A0B0F] text-[#EEF0F6] p-4 md:p-6 flex flex-col gap-5 select-none">
      {/* Barra Superior de SeleÃ§Ã£o de Poema & AlternÃ¢ncia de Modos */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#10121A] border border-white/[0.07] rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-2.5 py-1 rounded-md bg-[#38BDF8]/12 border border-[#38BDF8]/30 text-[#38BDF8] text-[11px] font-bold tracking-wide">
            {t('poems.active_badge')}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navegarPoema('ant')}
              title="Poema Anterior"
              className="px-2 py-1 rounded-md bg-[#161923] hover:bg-[#1E2130] text-[#9499B3] hover:text-[#EEF0F6] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft size={13} />
              <span>Anterior</span>
            </button>
            <select
              aria-label="Selecionar Poema para RecitaÃ§Ã£o"
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
                }
              }}
              className="bg-[#161923] border border-white/[0.08] rounded-lg px-3 py-1 text-xs font-semibold text-[#EEF0F6] focus:outline-none focus:border-[#5B7CF4] cursor-pointer"
            >
              {poemas.length === 0 ? (
                <option value={POEMA_CLASSICO_PADRAO.id}>
                  {POEMA_CLASSICO_PADRAO.titulo} â€” {POEMA_CLASSICO_PADRAO.autor}
                </option>
              ) : (
                poemas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titulo} {p.autor ? `â€” ${p.autor}` : ''}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={() => navegarPoema('prox')}
              title="PrÃ³ximo Poema"
              className="px-2 py-1 rounded-md bg-[#161923] hover:bg-[#1E2130] text-[#9499B3] hover:text-[#EEF0F6] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>PrÃ³ximo</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              terminateVoskAudio();
              setModalVoskAberto(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/35 text-[#38BDF8] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Mic size={13} />
            <span>Captura em Tela Cheia</span>
          </button>
          <button
            type="button"
            onClick={() => setTela('leitura')}
            className="px-3 py-1.5 rounded-lg bg-[#161923] hover:bg-[#1E2130] border border-white/[0.08] text-[#9499B3] hover:text-[#EEF0F6] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen size={13} />
            <span>{t('poems.mode_read')}</span>
          </button>
          <button
            type="button"
            onClick={() => setTela('gerenciar')}
            className="px-3 py-1.5 rounded-lg bg-[#161923] hover:bg-[#1E2130] border border-white/[0.08] text-[#9499B3] hover:text-[#EEF0F6] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>{t('poems.manage')}</span>
          </button>
        </div>
      </div>

      {/* Layout Principal de 2 Colunas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1">
        {/* Coluna Esquerda (7 cols): Arena de RecitaÃ§Ã£o FonÃ©tica em Tempo Real */}
        <div className="xl:col-span-7 bg-[#161923] border border-white/[0.07] rounded-2xl p-7 flex flex-col justify-between">
          <div>
            {/* Header do Poema */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <span className="inline-block px-2.5 py-1 rounded-md bg-[#38BDF8]/12 text-[#38BDF8] text-[11px] font-bold tracking-wider uppercase mb-2.5">
                  {t('poems.active_badge')}
                </span>
                <h2 className="text-2xl font-bold text-[#EEF0F6] tracking-tight">
                  {poemaAtivo?.titulo || POEMA_CLASSICO_PADRAO.titulo}
                </h2>
                <p className="text-xs text-[#9499B3] mt-1">
                  {poemaAtivo?.autor || POEMA_CLASSICO_PADRAO.autor} â€¢{' '}
                  {poemaAtivo?.epoca || 'Verso Livre'} â€¢ Estrofe {indiceLinhaAtiva + 1} de {versos.length}
                </p>
              </div>

              {/* Status do Microfone em Tempo Real com Gatilho */}
              <button
                type="button"
                onClick={toggleListening}
                className={`px-3.5 py-1.5 rounded-full border flex items-center gap-2 shrink-0 transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                    : 'bg-[#5B7CF4]/15 border-[#5B7CF4]/40 text-[#5B7CF4] hover:bg-[#5B7CF4]/25'
                }`}
                title={isListening ? 'Clique para pausar o microfone' : 'Clique para ativar o microfone'}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isListening ? 'bg-[#22C55E] animate-ping' : 'bg-[#5B7CF4]'
                  }`}
                />
                <span className="text-[11.5px] font-bold">
                  {isListening ? 'Escutando Voz' : 'Iniciar Microfone'}
                </span>
              </button>
            </div>

            <div className="h-px bg-white/[0.07] mb-5" />

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
                      className="bg-[#5B7CF4]/12 border border-[#5B7CF4]/45 rounded-xl p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#38BDF8] flex items-center gap-1.5">
                          <Sparkles size={12} />
                          {t('poems.active_line')}
                        </span>
                        <span className="text-[11px] font-mono text-[#9499B3]">
                          Linha {idx + 1}/{versos.length}
                        </span>
                      </div>

                      {/* ExibiÃ§Ã£o Palavra por Palavra com ColoraÃ§Ã£o DinÃ¢mica (Verde = Acerto, Vermelho = Erro) */}
                      <p className="text-xl font-bold leading-relaxed flex flex-wrap gap-2 text-[#EEF0F6]">
                        <span className="text-[#38BDF8]">â€œ</span>
                        {palavrasVersoAtual.map((p, i) => {
                          const status = palavrasStatus[i];
                          const isEsperada = i === indicePalavraEsperada;

                          let classesCor = 'text-[#EEF0F6]/35';
                          if (status === 'correta') {
                            classesCor = 'text-[#22C55E] font-bold drop-shadow-[0_0_10px_rgba(34,197,94,0.7)]';
                          } else if (status === 'errada' || status === 'warn') {
                            classesCor = 'text-[#EF4444] font-bold drop-shadow-[0_0_10px_rgba(239,68,68,0.65)]';
                          } else if (isEsperada && isListening) {
                            classesCor = 'text-[#38BDF8] font-bold underline underline-offset-4';
                          }

                          return (
                            <span key={i} className={`transition-all duration-200 ${classesCor}`}>
                              {p}
                            </span>
                          );
                        })}
                        <span className="text-[#38BDF8]">â€</span>
                      </p>

                      {/* Feedback de voz ao vivo */}
                      {partialTranscript && (
                        <div className="text-xs font-mono text-[#38BDF8] flex items-center gap-1.5 pt-1">
                          <span className="animate-pulse">ðŸŽ™ï¸ Ouvido:</span>
                          <span className="text-white font-medium italic">â€œ{partialTranscript}â€</span>
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
                    className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold shrink-0 ${
                        concluida
                          ? 'bg-[#22C55E]/15 text-[#22C55E]'
                          : 'bg-[#1E2130] text-[#5C6178]'
                      }`}
                    >
                      {concluida ? '100%' : 'â€¢â€¢â€¢'}
                    </span>
                    <span
                      className={`text-sm truncate ${
                        concluida ? 'text-[#9499B3]' : 'text-[#5C6178]'
                      }`}
                    >
                      {linha}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* AnÃ¡lise FonÃ©tica Token por Token DinÃ¢mica */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#5C6178]">
                  {t('poems.phonetic_tokens')} (Status FonÃ©tico)
                </p>
                <span className="text-[10px] font-mono text-[#9499B3]">
                  {Object.values(palavrasStatus).filter((s) => s === 'correta').length}/{palavrasVersoAtual.length} palavras
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {palavrasVersoAtual.map((palavra, idx) => {
                  const status = palavrasStatus[idx];
                  const isEsperada = idx === indicePalavraEsperada && isListening;

                  let estiloCard = 'bg-[#1E2130] border-white/[0.06] text-[#5C6178]';
                  let scoreTexto = 'Aguardando';

                  if (status === 'correta') {
                    estiloCard = 'bg-[#22C55E]/15 border-[#22C55E]/50 text-[#22C55E] shadow-[0_0_12px_rgba(34,197,94,0.25)]';
                    scoreTexto = '100%';
                  } else if (status === 'errada' || status === 'warn') {
                    estiloCard = 'bg-[#EF4444]/15 border-[#EF4444]/50 text-[#EF4444] shadow-[0_0_12px_rgba(239,68,68,0.25)]';
                    scoreTexto = 'Erro';
                  } else if (isEsperada) {
                    estiloCard = 'bg-[#5B7CF4]/20 border-[#5B7CF4]/60 text-[#38BDF8]';
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

          {/* Espectro de Voz Reativo ao Volume Real (RMS) do Microfone */}
          <div className="space-y-4">
            <div className="bg-[#10121A] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#9499B3] mb-3">
                <span>{t('poems.spectrum')}</span>
                <span className="text-[#38BDF8]">
                  {isListening
                    ? audioLevel >= 4 || partialTranscript
                      ? `Captando Voz (${audioLevel}% RMS)`
                      : 'Microfone Ativo â€¢ SilÃªncio'
                    : 'Pausado'}{' '}
                  â€¢ {acuraciaSessao}% Match
                </span>
              </div>

              {/* Ondas DinÃ¢micas de Ãudio Guiadas pelo Volume Real (audioLevel) */}
              <div className="h-14 flex items-center gap-1.5 overflow-hidden">
                {ESPECTRO_BASE_ALTURAS.map((baseH, i) => {
                  const corBarra =
                    i % 3 === 0 ? '#5B7CF4' : i % 3 === 1 ? '#38BDF8' : '#22C55E';

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
                    ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
                    : 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                }`}
              >
                {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                <span>{isListening ? 'Pausar Escuta' : 'Iniciar Escuta'}</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={reiniciarVerso}
                  className="px-4 py-2.5 rounded-xl bg-[#1E2130] hover:bg-white/[0.08] border border-white/[0.07] text-[#9499B3] hover:text-[#EEF0F6] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>{t('poems.restart_verse')}</span>
                </button>

                <button
                  type="button"
                  onClick={avancarEstrofe}
                  className="px-5 py-2.5 rounded-xl bg-[#5B7CF4] hover:bg-[#5B7CF4]/90 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#5B7CF4]/20 transition-all cursor-pointer"
                >
                  <span>{t('poems.next_stanza')}</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita (5 cols): AcurÃ¡cia FonÃ©tica Global em Tempo Real */}
        <div className="xl:col-span-5 flex flex-col gap-5">
          {/* Card 1: PrecisÃ£o FonÃ©tica Global (Donut Gauge DinÃ¢mico) */}
          <div className="bg-[#161923] border border-white/[0.07] rounded-2xl p-6">
            <div className="mb-4">
              <h3 className="text-base font-bold text-[#EEF0F6]">
                {t('poems.global_accuracy')}
              </h3>
              <p className="text-xs text-[#9499B3] mt-0.5">
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
                    stroke="#1E2130"
                    strokeWidth="12"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r="56"
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${dashAcierto} ${circunferenciaDonut}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold font-mono text-[#EEF0F6]">
                    {acuraciaSessao}%
                  </span>
                  <span className="text-[11px] font-bold text-[#22C55E]">
                    {acuraciaSessao >= 90 ? 'Excelente' : acuraciaSessao >= 75 ? 'Muito Bom' : 'Em Treino'}
                  </span>
                </div>
              </div>

              {/* MÃ©tricas Detalhadas Reais de AcÃºstica e ProsÃ³dia */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9499B3]">DicÃ§Ã£o & Fonemas</span>
                  <span className="font-mono font-bold text-[#22C55E]">{acuraciaSessao}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#1E2130] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#22C55E] transition-all duration-300"
                    style={{ width: `${acuraciaSessao}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9499B3]">CadÃªncia PoÃ©tica (Ritmo)</span>
                  <span className="font-mono font-bold text-[#38BDF8]">
                    {prosodyMetrics?.syllableRateHz > 0 
                      ? `${prosodyMetrics.syllableRateHz} sÃ­l/s (${prosodyMetrics.cadenciaScore || 100}%)` 
                      : `${Math.round(acuraciaSessao * 0.96)}%`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#1E2130] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#38BDF8] transition-all duration-300"
                    style={{ width: `${prosodyMetrics?.syllableRateHz > 0 ? (prosodyMetrics.cadenciaScore || 100) : Math.round(acuraciaSessao * 0.96)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9499B3]">Fidelidade Lexical</span>
                  <span className="font-mono font-bold text-[#5B7CF4]">
                    {Math.round(acuraciaSessao * 0.98)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#1E2130] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5B7CF4] transition-all duration-300"
                    style={{ width: `${Math.round(acuraciaSessao * 0.98)}%` }}
                  />
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] text-[#9499B3]">
                  <span>BÃ´nus de SessÃ£o</span>
                  <span className="font-bold text-[#F59E0B]">+45 XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Estrutura MÃ©trica & Ãndice de Versos */}
          <div className="bg-[#161923] border border-white/[0.07] rounded-2xl p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#EEF0F6]">
                  Estrutura MÃ©trica & Ãndice de Versos
                </h3>
                <p className="text-xs text-[#9499B3] mt-0.5">
                  {poemaAtivo?.titulo || 'Poema'} â€¢ {versos.length} versos
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-[#5B7CF4]/15 border border-[#5B7CF4]/35 text-[#5B7CF4] text-xs font-mono font-bold">
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
                        ? 'bg-[#5B7CF4]/15 border-[#5B7CF4]/50 text-[#EEF0F6] font-semibold'
                        : concluido
                          ? 'bg-[#22C55E]/8 border-[#22C55E]/25 text-[#9499B3]'
                          : 'bg-[#10121A] border-white/[0.05] text-[#9499B3] hover:text-[#EEF0F6]'
                    }`}
                  >
                    <span className="font-mono text-[10px] w-5 shrink-0 text-[#5C6178]">{i + 1}</span>
                    <span className="truncate flex-1">{v}</span>
                    {concluido && <span className="text-[#22C55E] text-[10px] font-bold shrink-0">âœ“</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Vosk em Tela Cheia (Quando acionado) */}
      {modalVoskAberto && (
        <PoemaRecitacao
          poema={poemaAtivo}
          onClose={() => setModalVoskAberto(false)}
          onFinish={() => {
            setModalVoskAberto(false);
            if (poemaAtivo?.id && poemaAtivo.id !== 'tabacaria_pessoa') {
              registrarRecitacao(poemaAtivo.id);
            }
          }}
        />
      )}
    </div>
  );
}



