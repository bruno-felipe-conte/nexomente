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

// 1. Utilitário de leitura das variáveis de design tokens do tema
const cssVar = (n, fallback = '') => {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fallback;
};

// 2. Estilo do Cytoscape refinado (Obsidian Style)
export const graphStyle = () => [
  {
    selector: 'node',
    style: {
      'background-color': cssVar('--nx-text', '#2E2722'),
      'background-opacity': 0.6,
      // Tamanho cresce com o número de conexões (como no Obsidian)
      width: 'mapData(degree, 0, 12, 10, 28)',
      height: 'mapData(degree, 0, 12, 10, 28)',
      label: 'data(label)',
      'font-family': 'Plus Jakarta Sans, sans-serif',
      'font-size': 10,
      'font-weight': '600',
      color: cssVar('--nx-text', '#2E2722'),
      'text-valign': 'bottom',
      'text-margin-y': 5,
      'text-opacity': 0, // Rótulo oculto por padrão (aparece com zoom, hover ou seleção)
      'text-wrap': 'ellipsis',
      'text-max-width': 110,
      'border-width': 0,
      'transition-property': 'background-color, background-opacity, opacity, width, height, border-width, border-color',
      'transition-duration': '0.18s',
    },
  },
  // Rótulos visíveis por zoom, hover ou seleção
  {
    selector: 'node.show-label',
    style: {
      'text-opacity': 0.88,
    },
  },
  // Nó selecionado
  {
    selector: 'node:selected',
    style: {
      'background-color': cssVar('--nx-primary', '#B85D43'),
      'background-opacity': 1,
      'border-width': 3,
      'border-color': cssVar('--nx-primary', '#B85D43'),
      'border-opacity': 0.45,
      'text-opacity': 1,
    },
  },

  // Cores por tipo de nota (sincronizadas com o design system Vanilla/Roasted)
  { selector: 'node[tipo="nota"]', style: { 'background-color': cssVar('--nx-primary', '#B85D43') } },
  { selector: 'node[tipo="livro"]', style: { 'background-color': cssVar('--nx-secondary', '#5A7D68') } },
  { selector: 'node[tipo="ideia"]', style: { 'background-color': cssVar('--nx-accent', '#B8832E') } },
  { selector: 'node[tipo="estudo"]', style: { 'background-color': '#4A6B82' } },
  { selector: 'node[tipo="biblia"]', style: { 'background-color': '#825E3B' } },
  { selector: 'node[tipo="diario"]', style: { 'background-color': '#8C6D58' } },
  { selector: 'node[tipo="lembrete"]', style: { 'background-color': '#A64B38' } },

  // Nós Fantasmas (Obsidian Ghost Nodes: links [[WikiLink]] cuja nota ainda não foi criada)
  {
    selector: 'node[?ghost]',
    style: {
      'background-color': cssVar('--nx-dim', '#5C5144'),
      'background-opacity': 0.22,
      'border-width': 1.5,
      'border-style': 'dashed',
      'border-color': cssVar('--nx-border', '#D2C5B0'),
      opacity: 0.55,
    },
  },

  // Arestas leves e limpas estilo Obsidian
  {
    selector: 'edge',
    style: {
      width: 1,
      'line-color': cssVar('--nx-border', '#D2C5B0'),
      'line-opacity': 0.8,
      'curve-style': 'haystack',
      'haystack-radius': 0,
      'transition-property': 'line-color, width, line-opacity',
      'transition-duration': '0.15s',
    },
  },
  {
    selector: 'edge[tipo="wikilink"]',
    style: {
      width: 1.4,
      'line-color': cssVar('--nx-primary', '#B85D43'),
      'line-opacity': 0.85,
    },
  },
  {
    selector: 'edge[tipo="tag"]',
    style: {
      width: 0.8,
      'line-color': cssVar('--nx-border', '#D2C5B0'),
      'line-opacity': 0.45,
    },
  },

  // Foco & Destaque (Dimming interativo)
  { selector: '.dim', style: { opacity: 0.12 } },
  {
    selector: 'edge.hl',
    style: {
      'line-color': cssVar('--nx-primary', '#B85D43'),
      width: 1.8,
      'line-opacity': 1,
    },
  },
  {
    selector: 'node.hl',
    style: {
      'background-opacity': 1,
      'text-opacity': 1,
    },
  },
];

// 3. Layout de Forças COSE afinado estilo galáxias do Obsidian (sempre centralizado no viewport)
export const forceLayout = (animate = true, shouldFit = true) => ({
  name: 'cose',
  animate,
  animationDuration: 500,
  randomize: false,
  fit: shouldFit,
  padding: 48,
  nodeRepulsion: () => 5000,
  idealEdgeLength: () => 65,
  edgeElasticity: () => 60,
  gravity: 1.2, // Gravidade reforçada para manter todos os clusters atraídos ao centro da visão
  gravityRange: 3.8,
  numIter: 1000,
  componentSpacing: 60, // Mantém nós sem conexão orbitando perto do centro, sem sair da tela
  coolingFactor: 0.95,
});

// 4. Aplicação do cálculo do grau dos nós
export function applyDegrees(cy) {
  if (!cy) return;
  cy.nodes().forEach((n) => {
    n.data('degree', n.degree());
  });
}

// 5. Interações estilo Obsidian (hover focado, rótulos adaptativos por zoom, física no drag)
export function wireGraphInteractions(cy) {
  if (!cy) return;

  const updateLabels = () => {
    if (!cy) return;
    cy.nodes().toggleClass('show-label', cy.zoom() > 1.25);
  };

  cy.on('mouseover', 'node', (e) => {
    const n = e.target;
    const hood = n.closedNeighborhood();
    cy.elements().addClass('dim');
    hood.removeClass('dim');
    hood.nodes().addClass('hl show-label');
    hood.edges().addClass('hl');
    if (cy.container()) cy.container().style.cursor = 'pointer';
  });

  cy.on('mouseout', 'node', () => {
    cy.elements().removeClass('dim hl');
    updateLabels();
    if (cy.container()) cy.container().style.cursor = 'default';
  });

  cy.on('zoom', updateLabels);
  updateLabels();

  cy.on('dragfree', 'node', () => {
    cy.layout(forceLayout(false, false)).run();
  });
}

const tipoCores = {
  nota: '#B85D43',
  livro: '#5A7D68',
  ideia: '#B8832E',
  diario: '#8C6D58',
  biblia: '#825E3B',
  estudo: '#4A6B82',
  lembrete: '#A64B38',
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

  // Extração robusta de [[WikiLinks]] (captura [[Nota]], [[Nota|alias]] e [[Nota#seção]])
  const extrairLinks = useCallback((conteudo) => {
    if (!conteudo) return [];
    const regex = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;
    const links = [];
    let match;
    while ((match = regex.exec(conteudo)) !== null) {
      const linkLimpo = match[1]?.trim();
      if (linkLimpo && !links.includes(linkLimpo)) {
        links.push(linkLimpo);
      }
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

  // Montagem e inicialização do Grafo Cytoscape
  useEffect(() => {
    if (!containerRef.current || notas.length === 0) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const elementos = [];
    let arestasCount = 0;
    const ghostMap = new Map();

    // 1. Adiciona nós existentes do Vault
    notas.forEach((nota) => {
      if (filtros[nota.tipo] === false) return;

      elementos.push({
        data: {
          id: nota.id,
          label: nota.titulo || 'Sem título',
          tipo: nota.tipo || 'nota',
          ghost: false,
          conteudo: nota.conteudo,
          tags: extrairTags(nota),
        },
      });
    });

    // 2. Conexões semânticas por Tags compartilhadas
    const tagsMap = {};
    notas.forEach((nota) => {
      if (filtros[nota.tipo] === false) return;
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
              id: `edge_tag_${notaIds[i]}_${notaIds[i + 1]}`,
              source: notaIds[i],
              target: notaIds[i + 1],
              tipo: 'tag',
            },
          });
          arestasCount++;
        }
      }
    });

    // 3. Conexões diretas por [[WikiLinks]] + Resolução de Nós Fantasmas (Obsidian)
    notas.forEach((nota) => {
      if (filtros[nota.tipo] === false) return;
      const links = extrairLinks(nota.conteudo);

      links.forEach((linkTexto) => {
        const linkLower = linkTexto.toLowerCase();

        // Resolução case-insensitive e com trim
        const notaDestino = notas.find(
          (n) => (n.titulo || '').trim().toLowerCase() === linkLower
        );

        if (notaDestino) {
          if (notaDestino.id !== nota.id && filtros[notaDestino.tipo] !== false) {
            elementos.push({
              data: {
                id: `edge_wl_${nota.id}_${notaDestino.id}`,
                source: nota.id,
                target: notaDestino.id,
                tipo: 'wikilink',
              },
            });
            arestasCount++;
          }
        } else {
          // Nó fantasma (link referenciado sem nota criada no Vault)
          const ghostId = `ghost_${linkLower.replace(/\s+/g, '_')}`;
          if (!ghostMap.has(ghostId)) {
            ghostMap.set(ghostId, true);
            elementos.push({
              data: {
                id: ghostId,
                label: linkTexto,
                tipo: 'fantasma',
                ghost: true,
                conteudo: '',
                tags: [],
              },
            });
          }
          elementos.push({
            data: {
              id: `edge_ghost_${nota.id}_${ghostId}`,
              source: nota.id,
              target: ghostId,
              tipo: 'wikilink',
            },
          });
          arestasCount++;
        }
      });
    });

    setTotalArestas(arestasCount);

    const cy = cytoscape({
      container: containerRef.current,
      elements: elementos,
      style: graphStyle(),
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.25,
    });

    cyRef.current = cy;

    // Ordem de montagem estrita
    applyDegrees(cy);
    if (layout === 'cose') {
      cy.layout(forceLayout(true, true)).run();
    } else {
      cy.layout({ name: layout, animate: true, animationDuration: 500, fit: true, padding: 48 }).run();
    }
    wireGraphInteractions(cy);

    // Garante que, ao terminar o layout físico, todos os clusters fiquem perfeitamente centralizados
    cy.on('layoutstop', () => {
      cy.animate({
        fit: { padding: 48 },
        duration: 300,
      });
    });

    // Observer para atualizar cores do grafo quando alternar entre Vanilla e Roasted
    const themeObserver = new MutationObserver(() => {
      cy.style(graphStyle());
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    // ResizeObserver: Garante que os clusters permaneçam centralizados caso a tela ou painel mude de tamanho
    const resizeObserver = new ResizeObserver(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit(undefined, 48);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Seleção de nós
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const data = node.data();
      if (data.ghost) {
        setNotaSelecionada({
          id: null,
          titulo: data.label,
          tipo: 'fantasma',
          ghost: true,
          conteudo: `Esta nota foi mencionada via [[${data.label}]], mas ainda não existe no seu Vault. Clique em "+ Criar Nota" para materializá-la.`,
          tags: [],
        });
      } else {
        const nota = notas.find((n) => n.id === node.id());
        if (nota) setNotaSelecionada(nota);
      }
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setNotaSelecionada(null);
      }
    });

    return () => {
      themeObserver.disconnect();
      resizeObserver.disconnect();
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [notas, filtros, layout, extrairLinks, extrairTags]);

  const zoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const zoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() / 1.25);
  const reset = () => {
    if (!cyRef.current) return;
    cyRef.current.fit(undefined, 48);
    cyRef.current.center();
  };

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
      const data = targetNode.data();
      if (data.ghost) {
        setNotaSelecionada({
          id: null,
          titulo: data.label,
          tipo: 'fantasma',
          ghost: true,
          conteudo: `Esta nota foi mencionada via [[${data.label}]], mas ainda não existe no seu Vault. Clique em "+ Criar Nota" para materializá-la.`,
          tags: [],
        });
      } else {
        const nota = notas.find((n) => n.id === targetNode.id());
        if (nota) setNotaSelecionada(nota);
      }
    }
  };

  const abrirNoEditor = (nota) => {
    if (!nota || !nota.id || nota.ghost) {
      setPendingNoteAction({ action: 'create', title: nota?.titulo || '' });
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
    <div className="h-full flex flex-col bg-nx-void text-nx-bright font-ui p-6 gap-4 overflow-auto">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 nx-sheet rounded-xl px-4 py-3 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-nx-bright font-display">
            Grafo de Conhecimento
          </h1>
          <p className="text-xs text-nx-dim">
            {totalNotas} notas visíveis • {totalArestas} conexões ativas • Topologia Zettelkasten
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-nx-dim" />
            <input
              type="text"
              placeholder="Buscar nó..."
              value={buscaNo}
              onChange={(e) => handleBuscarNo(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-nx-depth border border-nx-border rounded-lg text-xs text-nx-bright placeholder-nx-dim focus:outline-none focus:border-[var(--nx-accent)] w-40 md:w-52 transition-all"
            />
          </div>

          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
            aria-label="Layout do grafo"
            className="px-3 py-1.5 bg-nx-depth border border-nx-border rounded-lg text-xs text-nx-bright focus:outline-none cursor-pointer"
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
            className="px-2.5 py-1.5 nx-btn-secondary text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <ZoomIn size={15} />
            <span className="hidden sm:inline">Zoom +</span>
          </button>
          <button
            onClick={zoomOut}
            aria-label="Diminuir zoom"
            title="Diminuir zoom"
            className="px-2.5 py-1.5 nx-btn-secondary text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <ZoomOut size={15} />
            <span className="hidden sm:inline">Zoom -</span>
          </button>
          <button
            onClick={reset}
            aria-label="Centralizar visão"
            title="Centralizar visão"
            className="px-2.5 py-1.5 nx-btn-secondary text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <Maximize2 size={15} />
            <span className="hidden sm:inline">Ajustar</span>
          </button>
        </div>
      </div>

      {/* Layout Principal de 2 Colunas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 min-h-[540px]">
        {/* Coluna Esquerda (7 cols): Canvas Interativo do Grafo Neural */}
        <div className="xl:col-span-7 nx-sheet rounded-2xl relative flex flex-col overflow-hidden min-h-[480px]">
          {/* Barra Superior Flutuante de Clusters & Tipos */}
          <div className="p-3.5 border-b border-nx-border bg-nx-surface/90 flex flex-wrap items-center justify-between gap-2 z-10">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'todos', label: `${t('graph.all_clusters')} (${totalNotas})` },
              ].map((cl) => {
                const ativo = clusterAtivo === cl.id;
                return (
                  <button
                    key={cl.id}
                    type="button"
                    onClick={() => setClusterAtivo(cl.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      ativo
                        ? 'nx-btn-primary'
                        : 'bg-nx-depth border border-nx-border text-nx-dim hover:text-nx-bright'
                    }`}
                  >
                    {cl.label}
                  </button>
                );
              })}
            </div>

            {/* Filtros por Tipo de Nota */}
            <div className="flex items-center gap-1">
              <Filter size={12} className="text-nx-dim mr-1" />
              {Object.keys(filtros).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltros((f) => ({ ...f, [tipo]: !f[tipo] }))}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                    filtros[tipo] ? 'text-white shadow-xs' : 'opacity-40 text-nx-dim bg-nx-depth'
                  }`}
                  style={{
                    backgroundColor: filtros[tipo] ? tipoCores[tipo] || 'var(--nx-accent)' : undefined,
                  }}
                >
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Cytoscape com estilo Obsidian (.nx-graph-canvas) */}
          {notas.length === 0 ? (
            <div className="flex-1 relative flex flex-col items-center justify-center bg-nx-depth/40 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-nx-depth border border-nx-border flex items-center justify-center mb-3 text-[var(--nx-accent)]">
                <GitBranch size={26} />
              </div>
              <h3 className="text-sm font-bold text-nx-bright mb-1 font-display">
                Seu Grafo Neural está vazio
              </h3>
              <p className="text-xs text-nx-dim max-w-sm mb-4">
                Crie notas no Vault e conecte conceitos usando <code className="text-[var(--nx-accent)] font-mono">[[WikiLinks]]</code> ou tags para visualizar suas sinapses aqui.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPendingNoteAction({ action: 'create' });
                  setActiveTab('notes');
                }}
                className="px-4 py-2 rounded-xl nx-btn-primary text-xs font-bold transition-colors cursor-pointer"
              >
                + Criar Primeira Nota
              </button>
            </div>
          ) : (
            <div ref={containerRef} className="flex-1 nx-graph-canvas min-h-[380px] transition-colors" />
          )}

          {/* HUD Inferior do Grafo */}
          <div className="px-4 py-2.5 bg-nx-surface border-t border-nx-border flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-nx-dim">
            <span>
              Nós: {totalNotas} • Conexões: {totalArestas}
            </span>
            <span className="text-[var(--nx-accent)]">
              {notas.length > 0 ? 'Dica: Passe o mouse para focar conexões ou arraste para reorganizar' : 'Aguardando criação de notas'}
            </span>
          </div>
        </div>

        {/* Coluna Direita (5 cols): Inspetor do Nó Selecionado + Backlinks */}
        <div className="xl:col-span-5 flex flex-col gap-5">
          {/* Card 1: Inspetor de Nó & Backlinks Bidirecionais */}
          <div className="nx-sheet rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-1.5 border ${
                    noInspecionado?.ghost
                      ? 'bg-nx-depth text-nx-dim border-nx-border border-dashed'
                      : 'bg-[var(--nx-accent)]/15 text-[var(--nx-accent)] border-[var(--nx-accent)]/30'
                  }`}
                >
                  {noInspecionado?.ghost ? 'Nó Fantasma (Referenciado)' : t('graph.selected_node')}
                </span>
                <h3 className="text-lg font-bold text-nx-bright font-display">
                  {noInspecionado ? noInspecionado.titulo || 'Sem título' : 'Nenhum nó selecionado'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => abrirNoEditor(noInspecionado)}
                className="px-3 py-1.5 rounded-xl nx-btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <ExternalLink size={13} />
                <span>{noInspecionado?.ghost ? '+ Criar Esta Nota' : noInspecionado ? t('graph.open_note') : '+ Nova Nota'}</span>
              </button>
            </div>

            <p className="text-xs text-nx-dim leading-relaxed line-clamp-3 mb-4 font-display">
              {noInspecionado
                ? (noInspecionado.conteudo || '').replace(/<[^>]*>/g, '').substring(0, 220) || 'Nota sem conteúdo textual.'
                : 'Crie ou selecione uma nota no grafo para inspecionar seu conteúdo e suas conexões.'}
            </p>

            {/* Backlinks Bidirecionais [[WikiLinks]] */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-nx-dim mb-2 flex items-center gap-1">
                <Link2 size={11} />
                <span>
                  {t('graph.backlinks')} ({backlinksExtraidos.length})
                </span>
              </p>
              {backlinksExtraidos.length === 0 ? (
                <p className="text-[11px] text-nx-dim italic">
                  Nenhum [[WikiLink]] encontrado nesta nota.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {backlinksExtraidos.map((link) => (
                    <button
                      key={link}
                      type="button"
                      onClick={() => {
                        const linkLower = link.toLowerCase();
                        const encontrada = notas.find(
                          (n) => (n.titulo || '').trim().toLowerCase() === linkLower
                        );
                        if (encontrada) {
                          setNotaSelecionada(encontrada);
                        } else {
                          toast(`WikiLink [[${link}]] ainda não possui nota criada`, { icon: '🔗' });
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-nx-depth hover:bg-nx-surface border border-nx-border text-[var(--nx-accent)] text-[11px] font-mono transition-colors cursor-pointer"
                    >
                      [[{link}]]
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Painel de Sinapses & Conexões Zettelkasten */}
          <div className="nx-sheet rounded-2xl p-6 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-nx-border">
                <div className="flex items-center gap-2">
                  <GitBranch size={16} className="text-[var(--nx-accent)]" />
                  <div>
                    <h3 className="text-sm font-bold text-nx-bright font-display">
                      Sinapses & Topologia da Rede
                    </h3>
                    <p className="text-[11px] text-nx-dim">
                      {noInspecionado
                        ? `Exploração do nó [[${noInspecionado.titulo || 'Sem título'}]]`
                        : 'Topologia em tempo real'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[var(--nx-accent)]/15 text-[var(--nx-accent)] border border-[var(--nx-accent)]/30 text-[10px] font-mono font-bold">
                  {backlinksExtraidos.length} SINAPSES
                </span>
              </div>

              <div className="space-y-3 mb-4 text-xs text-nx-dim leading-relaxed">
                <div className="p-3 rounded-xl bg-nx-depth border border-nx-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-nx-dim block mb-1">
                    Densidade Conceitual
                  </span>
                  <p className="text-nx-bright">
                    {noInspecionado ? (
                      <>
                        Este nó possui <strong>{backlinksExtraidos.length} conexões diretas</strong> na sua base de conhecimento.
                      </>
                    ) : (
                      'Adicione notas para calcular a densidade conceitual.'
                    )}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-nx-depth border border-nx-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-nx-dim block mb-1">
                    Tags Semânticas
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tagsInspecionadas.length > 0 ? (
                      tagsInspecionadas.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-md bg-nx-surface border border-nx-border text-nx-dim text-[10px] font-mono">
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-nx-dim italic">Sem tags cadastradas</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ação rápida para o Copiloto Global */}
            <div className="pt-3 border-t border-nx-border flex items-center justify-between">
              <span className="text-[11px] text-nx-dim">
                Deseja aprofundar com IA? Use <kbd className="px-1.5 py-0.5 rounded bg-nx-depth border border-nx-border text-nx-bright font-mono text-[10px]">Ctrl+J</kbd>
              </span>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('toggle-copilot'));
                }}
                className="px-3.5 py-2 rounded-xl nx-btn-secondary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={13} className="text-[var(--nx-accent)]" />
                <span>Consultar Copiloto</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
