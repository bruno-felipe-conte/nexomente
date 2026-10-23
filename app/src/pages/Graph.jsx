import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUIStore } from '../store/useUIStore';
import { useNotes } from '../hooks/useNotes';
import { useTranslation } from '../lib/i18n';
import cytoscape from 'cytoscape';
import {
  GitBranch,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Search,
  ExternalLink,
  Sparkles,
  Link2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const tipoCores = {
  nota: '#5B7CF4',
  livro: '#8B5CF6',
  ideia: '#38BDF8',
  diario: '#22C55E',
  biblia: '#F59E0B',
  estudo: '#3B82F6',
  lembrete: '#EF4444',
};

export default function Graph() {
  const { notas } = useNotes();
  const { t } = useTranslation();
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const setPendingNoteAction = useUIStore((s) => s.setPendingNoteAction);

  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [layout, setLayout] = useState('cose');
  const [buscaNo, setBuscaNo] = useState('');
  const [totalArestas, setTotalArestas] = useState(0);
  const [clusterAtivo, setClusterAtivo] = useState('todos');
  const [filtros, setFiltros] = useState({
    nota: true,
    livro: true,
    ideia: true,
    diario: true,
    biblia: true,
    estudo: true,
  });



  const extrairLinks = useCallback((conteudo) => {
    if (!conteudo) return [];
    const regex = /\[\[([^\]]+)\]\]/g;
    const links = [];
    let match;
    while ((match = regex.exec(conteudo)) !== null) {
      links.push(match[1]);
    }
    return links;
  }, []);

  const extrairTags = useCallback((nota) => {
    if (!nota?.tags) return [];
    if (Array.isArray(nota.tags)) return nota.tags;
    try {
      return JSON.parse(nota.tags || '[]');
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || notas.length === 0) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const elementos = [];
    let arestasCount = 0;

    notas.forEach((nota) => {
      if (filtros[nota.tipo] === false) return;

      elementos.push({
        data: {
          id: nota.id,
          label: nota.titulo || 'Sem título',
          tipo: nota.tipo || 'nota',
          conteudo: nota.conteudo,
          tags: extrairTags(nota),
        },
      });
    });

    const tagsMap = {};
    notas.forEach((nota) => {
      const tags = extrairTags(nota);
      tags.forEach((tag) => {
        if (!tagsMap[tag]) tagsMap[tag] = [];
        tagsMap[tag].push(nota.id);
      });
    });

    Object.values(tagsMap).forEach((notaIds) => {
      if (notaIds.length > 1) {
        for (let i = 0; i < notaIds.length - 1; i++) {
          elementos.push({
            data: {
              source: notaIds[i],
              target: notaIds[i + 1],
              tipo: 'tag',
            },
          });
          arestasCount++;
        }
      }
    });

    notas.forEach((nota) => {
      const links = extrairLinks(nota.conteudo);
      links.forEach((linkTexto) => {
        const notaDestino = notas.find(
          (n) => n.titulo?.toLowerCase() === linkTexto.toLowerCase()
        );
        if (notaDestino && notaDestino.id !== nota.id) {
          elementos.push({
            data: {
              source: nota.id,
              target: notaDestino.id,
              tipo: 'wikilink',
            },
          });
          arestasCount++;
        }
      });
    });

    setTotalArestas(arestasCount);

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elementos,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': '#5B7CF4',
            color: '#EEF0F6',
            'font-family': 'Inter, sans-serif',
            'font-weight': '700',
            'font-size': '10px',
            'text-valign': 'bottom',
            'text-margin-y': 8,
            width: 28,
            height: 28,
            'overlay-opacity': 0,
            'transition-property': 'background-color, line-color, width, height',
            'transition-duration': '0.3s',
          },
        },
        ...Object.entries(tipoCores).map(([tipo, cor]) => ({
          selector: `node[tipo="${tipo}"]`,
          style: {
            'background-color': cor,
            'shadow-blur': 15,
            'shadow-color': cor,
            'shadow-opacity': 0.3,
          },
        })),
        {
          selector: 'edge',
          style: {
            width: 1.2,
            'line-color': 'rgba(148,153,179,0.2)',
            'curve-style': 'haystack',
            'overlay-opacity': 0,
          },
        },
        {
          selector: 'edge[tipo="wikilink"]',
          style: {
            width: 2,
            'line-color': '#5B7CF4',
            'line-style': 'solid',
            opacity: 0.7,
            'curve-style': 'bezier',
            'target-arrow-shape': 'vee',
            'target-arrow-color': '#5B7CF4',
          },
        },
        {
          selector: 'node:selected',
          style: {
            width: 42,
            height: 42,
            'border-width': 3,
            'border-color': '#EEF0F6',
            'font-size': '12px',
            'text-margin-y': 12,
          },
        },
      ],
      layout: { name: layout },
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nota = notas.find((n) => n.id === node.id());
      if (nota) {
        setNotaSelecionada(nota);
      }
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [notas, filtros, layout, extrairLinks, extrairTags]);

  const zoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.2);
  const zoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() / 1.2);
  const reset = () => cyRef.current?.fit();

  const handleBuscarNo = (termo) => {
    setBuscaNo(termo);
    if (!cyRef.current || !termo.trim()) return;

    const lower = termo.toLowerCase();
    const targetNode = cyRef.current.nodes().find((node) =>
      node.data('label')?.toLowerCase().includes(lower)
    );

    if (targetNode) {
      cyRef.current.nodes().unselect();
      targetNode.select();
      cyRef.current.animate({
        center: { eles: targetNode },
        zoom: 1.5,
        duration: 400,
      });
      const nota = notas.find((n) => n.id === targetNode.id());
      if (nota) setNotaSelecionada(nota);
    }
  };

  const abrirNoEditor = (nota) => {
    if (!nota?.id) {
      setPendingNoteAction({ action: 'create' });
      setActiveTab('notes');
      return;
    }
    setPendingNoteAction({ noteId: nota.id });
    setActiveTab('notes');
  };

  const totalNotas = useMemo(() => {
    return notas.filter((n) => filtros[n.tipo] !== false).length;
  }, [notas, filtros]);

  const noInspecionado = notaSelecionada || notas[0] || null;
  const backlinksExtraidos = useMemo(() => {
    if (!noInspecionado) return [];
    return extrairLinks(noInspecionado.conteudo);
  }, [noInspecionado, extrairLinks]);

  const tagsInspecionadas = useMemo(() => {
    if (!noInspecionado) return [];
    return extrairTags(noInspecionado);
  }, [noInspecionado, extrairTags]);



  return (
    <div className="h-full flex flex-col bg-[#0A0B0F] text-[#EEF0F6] font-ui p-6 gap-4 overflow-auto">
      {/* Header Principal mantendo título testável ("Grafo de Conhecimento") e controles acessíveis */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#10121A] border border-white/[0.07] rounded-xl px-4 py-3 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#EEF0F6]">
            Grafo de Conhecimento
          </h1>
          <p className="text-xs text-[#9499B3]">
            {totalNotas} notas visíveis • {totalArestas} conexões ativas • Topologia Zettelkasten
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#5C6178]" />
            <input
              type="text"
              placeholder="Buscar nó..."
              value={buscaNo}
              onChange={(e) => handleBuscarNo(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#161923] border border-white/[0.08] rounded-lg text-xs text-[#EEF0F6] placeholder-[#5C6178] focus:outline-none focus:border-[#5B7CF4] w-40 md:w-52 transition-all"
            />
          </div>

          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
            aria-label="Layout do grafo"
            className="px-3 py-1.5 bg-[#161923] border border-white/[0.08] rounded-lg text-xs text-[#EEF0F6] focus:outline-none cursor-pointer"
          >
            <option value="cose">COSE (Força Gravitacional)</option>
            <option value="circle">Círculo</option>
            <option value="grid">Grade</option>
            <option value="concentric">Concêntrico</option>
            <option value="breadthfirst">Hierarquia (Árvore)</option>
          </select>

          <button
            onClick={zoomIn}
            aria-label="Aumentar zoom"
            title="Aumentar zoom"
            className="px-2.5 py-1.5 bg-[#161923] border border-white/[0.08] rounded-lg hover:border-[#5B7CF4] text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
          >
            <ZoomIn size={15} />
            <span className="hidden sm:inline">Zoom +</span>
          </button>
          <button
            onClick={zoomOut}
            aria-label="Diminuir zoom"
            title="Diminuir zoom"
            className="px-2.5 py-1.5 bg-[#161923] border border-white/[0.08] rounded-lg hover:border-[#5B7CF4] text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
          >
            <ZoomOut size={15} />
            <span className="hidden sm:inline">Zoom -</span>
          </button>
          <button
            onClick={reset}
            aria-label="Centralizar visão"
            title="Centralizar visão"
            className="px-2.5 py-1.5 bg-[#161923] border border-white/[0.08] rounded-lg hover:border-[#5B7CF4] text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
          >
            <Maximize2 size={15} />
            <span className="hidden sm:inline">Ajustar</span>
          </button>
        </div>
      </div>

      {/* Layout Principal de 2 Colunas (Fiel ao preview-screen-4.png) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 min-h-[540px]">
        {/* Coluna Esquerda (7 cols): Canvas Interativo do Grafo Neural + Pílulas de Cluster + HUD Inferior */}
        <div className="xl:col-span-7 bg-[#161923] border border-white/[0.07] rounded-2xl relative flex flex-col overflow-hidden min-h-[480px]">
          {/* Barra Superior Flutuante de Clusters & Tipos */}
          <div className="p-3.5 border-b border-white/[0.06] bg-[#10121A]/90 flex flex-wrap items-center justify-between gap-2 z-10">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'todos', label: `${t('graph.all_clusters')} (${totalNotas})`, cor: '#5B7CF4' },
              ].map((cl) => {
                const ativo = clusterAtivo === cl.id;
                return (
                  <button
                    key={cl.id}
                    type="button"
                    onClick={() => setClusterAtivo(cl.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      ativo
                        ? 'bg-[#5B7CF4] text-white shadow-sm'
                        : 'bg-[#161923] border border-white/[0.07] text-[#9499B3] hover:text-[#EEF0F6]'
                    }`}
                  >
                    {cl.label}
                  </button>
                );
              })}
            </div>

            {/* Filtros por Tipo de Nota */}
            <div className="flex items-center gap-1">
              <Filter size={12} className="text-[#5C6178] mr-1" />
              {Object.keys(filtros).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltros((f) => ({ ...f, [tipo]: !f[tipo] }))}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                    filtros[tipo] ? 'text-white' : 'opacity-40 text-[#9499B3]'
                  }`}
                  style={{
                    backgroundColor: filtros[tipo] ? tipoCores[tipo] || '#5B7CF4' : '#1E2130',
                  }}
                >
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Cytoscape ou Estado Vazio Limpo quando Vault vazio */}
          {notas.length === 0 ? (
            <div className="flex-1 relative flex flex-col items-center justify-center bg-[#0A0B0F] p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#161923] border border-white/[0.08] flex items-center justify-center mb-3 text-[#5B7CF4]">
                <GitBranch size={26} />
              </div>
              <h3 className="text-sm font-bold text-[#EEF0F6] mb-1">
                Seu Grafo Neural está vazio
              </h3>
              <p className="text-xs text-[#9499B3] max-w-sm mb-4">
                Crie notas no Vault e conecte conceitos usando <code className="text-[#38BDF8] font-mono">[[WikiLinks]]</code> ou tags para visualizar suas sinapses aqui.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPendingNoteAction({ action: 'create' });
                  setActiveTab('notes');
                }}
                className="px-4 py-2 rounded-xl bg-[#5B7CF4] hover:bg-[#5B7CF4]/90 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                + Criar Primeira Nota
              </button>
            </div>
          ) : (
            <div ref={containerRef} className="flex-1 bg-[#0A0B0F] min-h-[380px]" />
          )}

          {/* HUD Inferior do Grafo */}
          <div className="px-4 py-2.5 bg-[#10121A] border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#9499B3]">
            <span>
              Nós: {totalNotas} • Conexões: {totalArestas}
            </span>
            <span className="text-[#38BDF8]">
              {notas.length > 0 ? 'Clique em qualquer nó para inspecionar' : 'Aguardando criação de notas'}
            </span>
          </div>
        </div>

        {/* Coluna Direita (5 cols): Inspetor do Nó Selecionado + Backlinks */}
        <div className="xl:col-span-5 flex flex-col gap-5">
          {/* Card 1: Inspetor de Nó & Backlinks Bidirecionais */}
          <div className="bg-[#161923] border border-white/[0.07] rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#5B7CF4]/15 text-[#5B7CF4] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  {t('graph.selected_node')}
                </span>
                <h3 className="text-lg font-bold text-[#EEF0F6]">
                  {noInspecionado ? noInspecionado.titulo || 'Sem título' : 'Nenhum nó selecionado'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => abrirNoEditor(noInspecionado)}
                className="px-3 py-1.5 rounded-xl bg-[#5B7CF4] hover:bg-[#5B7CF4]/90 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <ExternalLink size={13} />
                <span>{noInspecionado ? t('graph.open_note') : '+ Nova Nota'}</span>
              </button>
            </div>

            <p className="text-xs text-[#9499B3] leading-relaxed line-clamp-3 mb-4">
              {noInspecionado
                ? (noInspecionado.conteudo || '').replace(/<[^>]*>/g, '').substring(0, 220) || 'Nota sem conteúdo textual.'
                : 'Crie ou selecione uma nota no grafo para inspecionar seu conteúdo e suas conexões.'}
            </p>

            {/* Backlinks Bidirecionais [[WikiLinks]] */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C6178] mb-2 flex items-center gap-1">
                <Link2 size={11} />
                <span>
                  {t('graph.backlinks')} ({backlinksExtraidos.length})
                </span>
              </p>
              {backlinksExtraidos.length === 0 ? (
                <p className="text-[11px] text-[#5C6178] italic">
                  Nenhum [[WikiLink]] encontrado nesta nota.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {backlinksExtraidos.map((link) => (
                    <button
                      key={link}
                      type="button"
                      onClick={() => {
                        const encontrada = notas.find(
                          (n) => n.titulo?.toLowerCase() === link.toLowerCase()
                        );
                        if (encontrada) {
                          setNotaSelecionada(encontrada);
                        } else {
                          toast(`WikiLink [[${link}]] ainda não possui nota criada`, { icon: '🔗' });
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#10121A] hover:bg-[#1E2130] border border-white/[0.07] text-[#38BDF8] text-[11px] font-mono transition-colors cursor-pointer"
                    >
                      [[{link}]]
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Painel de Sinapses & Conexões Zettelkasten */}
          <div className="bg-[#161923] border border-white/[0.07] rounded-2xl p-6 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <GitBranch size={16} className="text-[#38BDF8]" />
                  <div>
                    <h3 className="text-sm font-bold text-[#EEF0F6]">
                      Sinapses & Topologia da Rede
                    </h3>
                    <p className="text-[11px] text-[#9499B3]">
                      {noInspecionado
                        ? `Exploração do nó [[${noInspecionado.titulo || 'Sem título'}]]`
                        : 'Topologia em tempo real'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] text-[10px] font-mono font-bold">
                  {backlinksExtraidos.length} SINAPSES
                </span>
              </div>

              <div className="space-y-3 mb-4 text-xs text-[#9499B3] leading-relaxed">
                <div className="p-3 rounded-xl bg-[#10121A] border border-white/[0.05]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6178] block mb-1">
                    Densidade Conceitual
                  </span>
                  <p className="text-[#EEF0F6]">
                    {noInspecionado ? (
                      <>
                        Este nó possui <strong>{backlinksExtraidos.length} conexões diretas</strong> na sua base de conhecimento.
                      </>
                    ) : (
                      'Adicione notas para calcular a densidade conceitual.'
                    )}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#10121A] border border-white/[0.05]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6178] block mb-1">
                    Tags Semânticas
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tagsInspecionadas.length > 0 ? (
                      tagsInspecionadas.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[#9499B3] text-[10px] font-mono">
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-[#5C6178] italic">Sem tags cadastradas</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ação rápida para o Copiloto Global */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] text-[#5C6178]">
                Deseja aprofundar com IA? Use <kbd className="px-1.5 py-0.5 rounded bg-[#10121A] text-[#EEF0F6] font-mono text-[10px]">Ctrl+J</kbd>
              </span>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('toggle-copilot'));
                }}
                className="px-3.5 py-2 rounded-xl bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/30 text-[#38BDF8] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles size={13} />
                <span>Consultar Copiloto</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}