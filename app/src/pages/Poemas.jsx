import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Settings,
  Plus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { usePoemas } from '../hooks/useMaterias';
import { useTamagotchiStore } from '../store/useTamagotchiStore';
import { useTranslation } from '../lib/i18n';
import PoemaLeitura from '../components/poemas/PoemaLeitura';
import PoemasGerenciador from '../components/poemas/PoemasGerenciador';
import PoemaRecitacao from '../components/poemas/PoemaRecitacao';
import toast from 'react-hot-toast';

const POEMA_CLASSICO_PADRAO = {
  id: 'tabacaria_pessoa',
  titulo: 'Tabacaria',
  autor: 'Álvaro de Campos (Fernando Pessoa)',
  ano: '1928',
  epoca: 'Modernismo Português',
  forma: 'Ode / Verso Livre',
  streak_recitacao: 12,
  corpo: [
    'Não sou nada.',
    'Nunca serei nada.',
    'Não posso querer ser nada.',
    'À parte isso, tenho em mim todos os sonhos do mundo.',
    'Janelas do meu quarto,',
    'Do meu quarto de um dos milhões do mundo que ninguém sabe quem é...',
  ].join('\n'),
};

const ESPECTRO_ALTURAS = [
  14, 22, 34, 46, 56, 40, 28, 48, 60, 52, 38, 20,
  30, 50, 62, 54, 42, 26, 18, 36, 52, 58, 44, 30,
  20, 38, 48, 36, 24, 16, 28, 42, 34, 22, 16, 12,
];

export default function PoemasPage() {
  const { poemas = [], getById, registrarRecitacao, proximoPoema, poemaAnterior } = usePoemas();
  const { t } = useTranslation();

  const addBonusXp = useTamagotchiStore((s) => s.addBonusXp);

  // 'dojo' (protótipo padrão) | 'gerenciar' | 'leitura'
  const [tela, setTela] = useState('dojo');
  const [poemaSelecionado, setPoemaSelecionado] = useState(null);
  const [indiceLinhaAtiva, setIndiceLinhaAtiva] = useState(3);
  const [escutandoSimulado, setEscutandoSimulado] = useState(true);
  const [modalVoskAberto, setModalVoskAberto] = useState(false);
  const [acuraciaSessao, setAcuraciaSessao] = useState(96.4);
  const [tokensRevisados, setTokensRevisados] = useState({});

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

  useEffect(() => {
    if (indiceLinhaAtiva >= versos.length) {
      setIndiceLinhaAtiva(0);
    }
  }, [versos.length, indiceLinhaAtiva]);

  const versoAtualTexto = versos[indiceLinhaAtiva] || versos[0] || '';
  const palavrasVersoAtual = useMemo(() => {
    return versoAtualTexto.split(/\s+/).filter(Boolean);
  }, [versoAtualTexto]);

  const navegarPoema = useCallback(
    (direcao) => {
      if (poemas.length === 0) return;
      const atualId = poemaAtivo?.id || poemas[0].id;
      const proximo = direcao === 'prox' ? proximoPoema(atualId) : poemaAnterior(atualId);
      if (proximo) {
        setPoemaSelecionado(proximo);
        setIndiceLinhaAtiva(0);
        setTokensRevisados({});
      }
    },
    [poemas, poemaAtivo, proximoPoema, poemaAnterior]
  );

  // Optimistic UI ao clicar num token para alternar pronúncia ou avançar estrofe
  const alternarToken = (idx) => {
    setTokensRevisados((prev) => {
      const estadoAtual = prev[idx] || 'ok';
      const proximoEstado = estadoAtual === 'ok' ? 'warn' : 'ok';
      return { ...prev, [idx]: proximoEstado };
    });
    setAcuraciaSessao((prev) => Number(Math.min(99.8, prev + 0.2).toFixed(1)));
  };

  const avancarEstrofe = () => {
    if (indiceLinhaAtiva < versos.length - 1) {
      setIndiceLinhaAtiva((i) => i + 1);
      setTokensRevisados({});
      try {
        addBonusXp?.(15, 'Estrofe recitada no Dojo');
      } catch {
        // Silencioso se store indisponivel
      }
      toast.success('+15 XP • Estrofe validada com sucesso!');
    } else {
      setIndiceLinhaAtiva(0);
      if (poemaAtivo?.id && poemaAtivo.id !== 'tabacaria_pessoa') {
        registrarRecitacao(poemaAtivo.id);
      }
      try {
        addBonusXp?.(45, 'Poema completo no Dojo');
      } catch {
        // Silencioso
      }
      toast.success('Poema concluído no Dojo! +45 XP Sincronizados');
    }
  };

  const reiniciarVerso = () => {
    setTokensRevisados({});
    toast('Verso reiniciado para nova tomada fonética', { icon: '🎙️' });
  };

  // Circunferência do Donut SVG (r = 56 => 2 * PI * 56 = 351.858)
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
              onClick={() => setTela('dojo')}
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
            onLeitura={() => setTela('dojo')}
            onSelectPoema={(p) => {
              setPoemaSelecionado(p);
              setIndiceLinhaAtiva(0);
              setTela('dojo');
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
              onClick={() => setTela('dojo')}
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
    <div className="min-h-full bg-[#0A0B0F] text-[#EEF0F6] p-6 flex flex-col gap-5 select-none">
      {/* Barra Superior de Seleção de Poema & Alternância de Modos (Rótulos Claros em Ícones) */}
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
              aria-label="Selecionar Poema para Recitação"
              value={poemaAtivo?.id || ''}
              onChange={(e) => {
                const encontrado = poemas.find((p) => String(p.id) === e.target.value);
                if (encontrado) {
                  setPoemaSelecionado(encontrado);
                  setIndiceLinhaAtiva(0);
                }
              }}
              className="bg-[#161923] border border-white/[0.08] rounded-lg px-3 py-1 text-xs font-semibold text-[#EEF0F6] focus:outline-none focus:border-[#5B7CF4] cursor-pointer"
            >
              {poemas.length === 0 ? (
                <option value={POEMA_CLASSICO_PADRAO.id}>
                  {POEMA_CLASSICO_PADRAO.titulo} — {POEMA_CLASSICO_PADRAO.autor}
                </option>
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
              title="Próximo Poema"
              className="px-2 py-1 rounded-md bg-[#161923] hover:bg-[#1E2130] text-[#9499B3] hover:text-[#EEF0F6] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Próximo</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalVoskAberto(true)}
            className="px-3 py-1.5 rounded-lg bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/35 text-[#38BDF8] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Mic size={13} />
            <span>Captura Vosk em Tela Cheia</span>
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

      {/* Layout Principal de 2 Colunas (Fiel ao preview-screen-2.png) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1">
        {/* Coluna Esquerda (7 cols): Arena de Recitação Fonética */}
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
                  {poemaAtivo?.autor || POEMA_CLASSICO_PADRAO.autor} •{' '}
                  {poemaAtivo?.epoca || 'Verso Livre'} • Estrofe {indiceLinhaAtiva + 1} de {versos.length}
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-full bg-[#22C55E]/12 border border-[#22C55E]/35 flex items-center gap-2 shrink-0">
                <span
                  className={`w-2 h-2 rounded-full ${
                    escutandoSimulado ? 'bg-[#22C55E] animate-pulse' : 'bg-[#F59E0B]'
                  }`}
                />
                <span className="text-[11px] font-bold text-[#22C55E]">
                  {t('poems.vosk_listening')}
                </span>
              </div>
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
                      className="bg-[#5B7CF4]/12 border border-[#5B7CF4]/45 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#38BDF8]">
                          {t('poems.active_line')}
                        </span>
                        <span className="text-[11px] font-mono text-[#9499B3]">
                          Linha {idx + 1}/{versos.length}
                        </span>
                      </div>
                      <p className="text-base font-bold text-[#EEF0F6] leading-relaxed">
                        “{linha}”
                      </p>
                    </motion.div>
                  );
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setIndiceLinhaAtiva(idx)}
                    className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold shrink-0 ${
                        concluida
                          ? 'bg-[#22C55E]/15 text-[#22C55E]'
                          : 'bg-[#1E2130] text-[#5C6178]'
                      }`}
                    >
                      {concluida ? '100%' : '•••'}
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

            {/* Análise Fonética Token por Token */}
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#5C6178] mb-2.5">
                {t('poems.phonetic_tokens')}
              </p>
              <div className="flex flex-wrap gap-2">
                {palavrasVersoAtual.map((palavra, idx) => {
                  const statusCustom = tokensRevisados[idx];
                  const isWarn =
                    statusCustom === 'warn' || (!statusCustom && idx === 3 && palavrasVersoAtual.length > 4);
                  const score = isWarn ? '84%' : idx % 2 === 0 ? '100%' : '98%';

                  return (
                    <button
                      key={`${palavra}-${idx}`}
                      type="button"
                      onClick={() => alternarToken(idx)}
                      title="Clique para recalibrar fonema (Optimistic UI)"
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isWarn
                          ? 'bg-[#F59E0B]/12 border-[#F59E0B]/40 text-[#F59E0B]'
                          : 'bg-[#22C55E]/12 border-[#22C55E]/35 text-[#22C55E]'
                      }`}
                    >
                      <span>{palavra}</span>
                      <span className="font-mono text-[10px] opacity-85">{score}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Espectro de Voz Vosk (36 Barras) + Controles do Dojo */}
          <div className="space-y-4">
            <div className="bg-[#10121A] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#9499B3] mb-3">
                <span>{t('poems.spectrum')}</span>
                <span className="text-[#38BDF8]">{t('poems.latency')}: 12ms • 96.4% Match</span>
              </div>
              <div className="h-14 flex items-center gap-1.5 overflow-hidden">
                {ESPECTRO_ALTURAS.map((h, i) => {
                  const alturaAtiva = escutandoSimulado ? h : Math.max(8, Math.round(h * 0.25));
                  const corBarra =
                    i % 3 === 0 ? '#5B7CF4' : i % 3 === 1 ? '#38BDF8' : '#22C55E';
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-full transition-all duration-300"
                      style={{
                        height: `${alturaAtiva}px`,
                        backgroundColor: corBarra,
                        opacity: escutandoSimulado ? 0.9 : 0.35,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setEscutandoSimulado((v) => !v)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                  escutandoSimulado
                    ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
                    : 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                }`}
              >
                {escutandoSimulado ? <MicOff size={15} /> : <Mic size={15} />}
                <span>
                  {escutandoSimulado ? t('poems.pause_listen') : 'Retomar Escuta Neural'}
                </span>
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

        {/* Coluna Direita (5 cols): Acurácia Fonética Global + Evolução do Pet em Tempo Real */}
        <div className="xl:col-span-5 flex flex-col gap-5">
          {/* Card 1: Precisão Fonética Global (Donut Gauge) */}
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
                    Excelente
                  </span>
                </div>
              </div>

              {/* Métricas de Prosódia Lateral */}
              <div className="flex-1 w-full space-y-3">
                {[
                  { label: 'Dicção & Fonemas', val: '98.2%', cor: '#22C55E' },
                  { label: 'Cadência Poética', val: '94.0%', cor: '#38BDF8' },
                  { label: 'Fidelidade Lexical', val: '97.1%', cor: '#5B7CF4' },
                  { label: 'Bônus de Sessão', val: '+45 XP', cor: '#F59E0B' },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center justify-between py-1.5 border-b border-white/[0.05] last:border-none"
                  >
                    <span className="text-xs text-[#9499B3]">{m.label}</span>
                    <span
                      className="text-xs font-bold font-mono"
                      style={{ color: m.cor }}
                    >
                      {m.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Estrutura Métrica & Índice de Versos (navegação direta pelo poema ativo) */}
          <div className="bg-[#161923] border border-white/[0.07] rounded-2xl p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#EEF0F6]">Estrutura Métrica &amp; Índice de Versos</h3>
                <p className="text-xs text-[#9499B3] mt-0.5">
                  {poemaAtivo?.titulo} • {versos.length} versos
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-[#38BDF8]/15 border border-[#38BDF8]/35 text-[#38BDF8] text-[11px] font-bold font-mono shrink-0">
                VERSO {indiceLinhaAtiva + 1}/{versos.length}
              </span>
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[300px] pr-1">
              {versos.map((v, i) => {
                const concluido = i < indiceLinhaAtiva;
                const ativo = i === indiceLinhaAtiva;
                return (
                  <button
                    key={`${i}-${v}`}
                    type="button"
                    onClick={() => {
                      setIndiceLinhaAtiva(i);
                      setTokensRevisados({});
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                      ativo
                        ? 'bg-[#5B7CF4]/15 border-[#5B7CF4]/50 text-[#EEF0F6]'
                        : concluido
                          ? 'bg-[#22C55E]/8 border-[#22C55E]/25 text-[#9499B3]'
                          : 'bg-[#10121A] border-white/[0.05] text-[#9499B3] hover:text-[#EEF0F6]'
                    }`}
                  >
                    <span className="font-mono text-[10px] w-5 shrink-0 text-[#5C6178]">{i + 1}</span>
                    <span className="truncate flex-1">{v}</span>
                    {concluido && <span className="text-[#22C55E] text-[10px] font-bold shrink-0">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Vosk Real quando acionado */}
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