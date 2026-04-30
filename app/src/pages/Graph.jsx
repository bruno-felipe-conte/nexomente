import { useState, useEffect, useRef, useMemo } from 'react';
import { useUIStore } from '../store/useUIStore';
import cytoscape from 'cytoscape';
import { GitBranch, ZoomIn, ZoomOut, Maximize2, Filter, Search, X } from 'lucide-react';

const tipoCores = {
  nota: '#6C63FF',
  livro: '#8B5CF6',
  ideia: '#EC4899',
  diario: '#10B981',
  biblia: '#F59E0B',
  estudo: '#3B82F6',
  lembrete: '#EF4444',
};

// Defined outside component — never recreated on render
const CYTO_STYLES = [
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'background-color': '#7C6DFA',
      'color': '#F2F0FF',
      'font-family': 'Syne, sans-serif',
      'font-weight': '700',
      'font-size': '10px',
      'text-valign': 'bottom',
      'text-margin-y': 10,
      'width': 30,
      'height': 30,
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
      'width': 1,
      'line-color': 'rgba(255,255,255,0.1)',
      'curve-style': 'haystack',
      'overlay-opacity': 0,
    },
  },
  {
    selector: 'edge[tipo="wikilink"]',
    style: {
      'width': 2,
      'line-color': '#7C6DFA',
      'line-style': 'solid',
      'opacity': 0.4,
      'curve-style': 'bezier',
      'target-arrow-shape': 'vee',
      'target-arrow-color': '#7C6DFA',
    },
  },
  {
    selector: 'node:selected',
    style: {
      'width': 45,
      'height': 45,
      'border-width': 4,
      'border-color': '#FFF',
      'font-size': '12px',
      'text-margin-y': 14,
    },
  },
  { selector: 'node.hidden', style: { 'display': 'none' } },
  { selector: 'edge.hidden', style: { 'display': 'none' } },
];

// Hide labels below this zoom level — large perf gain with 1000+ nodes
const LABEL_ZOOM_THRESHOLD = 0.6;

function extrairLinks(conteudo) {
  if (!conteudo) return [];
  const regex = /\[\[([^\]]+)\]\]/g;
  const links = [];
  let match;
  while ((match = regex.exec(conteudo)) !== null) links.push(match[1]);
  return links;
}

function extrairTags(nota) {
  if (!nota.tags) return [];
  try {
    return Array.isArray(nota.tags) ? nota.tags : JSON.parse(nota.tags || '[]');
  } catch {
    return [];
  }
}

export default function Graph() {
  const uiState = useUIStore();
  const Notas = uiState.Notas;
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const notas = useMemo(() => Notas?.getAll() ?? [], [Notas]);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [layout, setLayout] = useState('cose');
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({
    nota: true, livro: true, ideia: true,
    diario: true, biblia: true, estudo: true, lembrete: true,
  });

  // Pre-compute all elements once — O(n) with O(1) title lookup instead of O(n²)
  const elementos = useMemo(() => {
    if (notas.length === 0) return [];

    const nodes = notas.map(nota => ({
      data: {
        id: nota.id,
        label: nota.titulo || 'Sem título',
        tipo: nota.tipo || 'nota',
        tags: extrairTags(nota),
      },
    }));

    const edges = [];

    // Tag-based connections
    const tagsMap = {};
    notas.forEach(nota => {
      extrairTags(nota).forEach(tag => {
        if (!tagsMap[tag]) tagsMap[tag] = [];
        tagsMap[tag].push(nota.id);
      });
    });
    Object.values(tagsMap).forEach(ids => {
      for (let i = 0; i < ids.length - 1; i++) {
        edges.push({ data: { source: ids[i], target: ids[i + 1], tipo: 'tag' } });
      }
    });

    // Wikilink connections — title→id map avoids O(n) find() per link
    const tituloMap = {};
    notas.forEach(n => { tituloMap[(n.titulo || '').toLowerCase()] = n.id; });
    notas.forEach(nota => {
      extrairLinks(nota.conteudo).forEach(texto => {
        const targetId = tituloMap[texto.toLowerCase()];
        if (targetId && targetId !== nota.id) {
          edges.push({ data: { source: nota.id, target: targetId, tipo: 'wikilink' } });
        }
      });
    });

    return [...nodes, ...edges];
  }, [notas]);

  const totalConexoes = useMemo(
    () => elementos.filter(e => e.data.source !== undefined).length,
    [elementos]
  );

  // Rebuild Cytoscape only when note data changes, not on filter/layout changes
  useEffect(() => {
    if (!containerRef.current || elementos.length === 0) return;
    if (cyRef.current) cyRef.current.destroy();

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elementos,
      style: CYTO_STYLES,
      layout: { name: layout },
      minZoom: 0.1,
      maxZoom: 5,
      wheelSensitivity: 0.3,
    });

    // Level of Detail: skip label rendering when zoomed out far
    cyRef.current.on('zoom', () => {
      const z = cyRef.current.zoom();
      cyRef.current.nodes().style('label', z >= LABEL_ZOOM_THRESHOLD ? 'data(label)' : '');
    });

    cyRef.current.on('tap', 'node', evt => {
      const nota = notas.find(n => n.id === evt.target.id());
      if (nota) setNotaSelecionada(nota);
    });

    return () => { if (cyRef.current) cyRef.current.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementos]);

  // Apply filter + search via CSS class toggle — no graph rebuild needed
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const buscaLower = busca.toLowerCase();
    cy.batch(() => {
      cy.nodes().forEach(node => {
        const visible =
          filtros[node.data('tipo')] !== false &&
          (buscaLower === '' || node.data('label').toLowerCase().includes(buscaLower));
        node.toggleClass('hidden', !visible);
      });
      cy.edges().forEach(edge => {
        edge.toggleClass('hidden', edge.source().hasClass('hidden') || edge.target().hasClass('hidden'));
      });
    });
  }, [filtros, busca]);

  // Re-run layout without rebuilding Cytoscape
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.layout({ name: layout, animate: true, animationDuration: 400 }).run();
  }, [layout]);

  const zoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.2);
  const zoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() / 1.2);
  const reset = () => cyRef.current?.fit();

  const notasVisiveis = useMemo(
    () => notas.filter(n => filtros[n.tipo] !== false).length,
    [notas, filtros]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Grafo</h1>
          <p className="text-text-secondary">
            {notasVisiveis}/{notas.length} notas • {totalConexoes} conexões
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar nó..."
              aria-label="Buscar nó no grafo"
              className="pl-7 pr-3 py-1 bg-bg-secondary border border-border-subtle rounded-lg text-sm w-40 focus:outline-none focus:border-accent-main"
            />
          </div>
          <button onClick={zoomIn} aria-label="Aumentar zoom" title="Aumentar zoom" className="p-2 bg-bg-secondary border border-border-subtle rounded-lg hover:border-accent-main">
            <ZoomIn size={20} />
          </button>
          <button onClick={zoomOut} aria-label="Diminuir zoom" title="Diminuir zoom" className="p-2 bg-bg-secondary border border-border-subtle rounded-lg hover:border-accent-main">
            <ZoomOut size={20} />
          </button>
          <button onClick={reset} aria-label="Centralizar visão" title="Centralizar visão" className="p-2 bg-bg-secondary border border-border-subtle rounded-lg hover:border-accent-main">
            <Maximize2 size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-border-subtle flex gap-2 flex-wrap items-center">
        <select
          value={layout}
          onChange={e => setLayout(e.target.value)}
          aria-label="Layout do grafo"
          className="px-3 py-1 bg-bg-secondary border border-border-subtle rounded-lg text-sm"
        >
          <option value="cose">COSE (automático)</option>
          <option value="circle">Círculo</option>
          <option value="grid">Grade</option>
          <option value="concentric">Concêntrico</option>
          <option value="breadthfirst">Árvore</option>
        </select>

        <Filter size={16} className="text-text-muted" />
        {Object.keys(filtros).map(tipo => (
          <button
            key={tipo}
            onClick={() => setFiltros(f => ({ ...f, [tipo]: !f[tipo] }))}
            className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${!filtros[tipo] ? 'opacity-50' : ''}`}
            style={{
              backgroundColor: filtros[tipo] ? tipoCores[tipo] || '#6C63FF' : '#252338',
              border: `1px solid ${tipoCores[tipo] || '#6C63FF'}40`,
            }}
          >
            {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </button>
        ))}
      </div>

      {notaSelecionada && (
        <div className="absolute top-20 right-4 w-80 bg-bg-secondary border border-border-subtle rounded-xl p-4 shadow-xl z-10">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold">{notaSelecionada.titulo}</h3>
            <button onClick={() => setNotaSelecionada(null)} aria-label="Fechar detalhes da nota" title="Fechar">
              <X size={16} />
            </button>
          </div>
          <p className="text-sm text-text-secondary line-clamp-4">
            {notaSelecionada.conteudo?.substring(0, 200)}
          </p>
          {extrairTags(notaSelecionada).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {extrairTags(notaSelecionada).map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-accent-main/20 text-accent-main rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {notas.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-muted">
          <div className="text-center">
            <GitBranch size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">Nenhuma nota ainda</p>
            <p className="text-sm">Crie notas para ver as conexões</p>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 bg-bg-primary" />
      )}
    </div>
  );
}
