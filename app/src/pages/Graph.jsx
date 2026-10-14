import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUIStore } from '../store/useUIStore';
import { useNotes } from '../hooks/useNotes';
import cytoscape from 'cytoscape';
import { GitBranch, ZoomIn, ZoomOut, Maximize2, Filter, X, Search, ExternalLink } from 'lucide-react';

const tipoCores = {
  nota: '#6C63FF',
  livro: '#8B5CF6',
  ideia: '#EC4899',
  diario: '#10B981',
  biblia: '#F59E0B',
  estudo: '#3B82F6',
  lembrete: '#EF4444',
};

export default function Graph() {
  const { notas } = useNotes();
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const setPendingNoteAction = useUIStore((s) => s.setPendingNoteAction);

  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [layout, setLayout] = useState('cose');
  const [buscaNo, setBuscaNo] = useState('');
  const [totalArestas, setTotalArestas] = useState(0);
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
    if (!nota.tags) return [];
    return Array.isArray(nota.tags) ? nota.tags : JSON.parse(nota.tags || '[]');
  }, []);

  useEffect(() => {
    if (!containerRef.current || notas.length === 0) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const elementos = [];
    let arestasCount = 0;

    notas.forEach(nota => {
      if (!filtros[nota.tipo]) return;

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
    notas.forEach(nota => {
      const tags = extrairTags(nota);
      tags.forEach(tag => {
        if (!tagsMap[tag]) tagsMap[tag] = [];
        tagsMap[tag].push(nota.id);
      });
    });

    Object.values(tagsMap).forEach(notaIds => {
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

    notas.forEach(nota => {
      const links = extrairLinks(nota.conteudo);
      links.forEach(linkTexto => {
        const notaDestino = notas.find(n =>
          n.titulo?.toLowerCase() === linkTexto.toLowerCase()
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
            'transition-duration': '0.3s'
          },
        },
        ...Object.entries(tipoCores).map(([tipo, cor]) => ({
          selector: `node[tipo="${tipo}"]`,
          style: {
            'background-color': cor,
            'shadow-blur': 15,
            'shadow-color': cor,
            'shadow-opacity': 0.3
          },
        })),
        {
          selector: 'edge',
          style: {
            'width': 1,
            'line-color': 'rgba(255,255,255,0.1)',
            'curve-style': 'haystack',
            'overlay-opacity': 0
          }
        },
        {
          selector: 'edge[tipo="wikilink"]',
          style: {
            'width': 2,
            'line-color': '#7C6DFA',
            'line-style': 'solid',
            'opacity': 0.6,
            'curve-style': 'bezier',
            'target-arrow-shape': 'vee',
            'target-arrow-color': '#7C6DFA'
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
      ],
      layout: { name: layout },
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nota = notas.find(n => n.id === node.id());
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
    const targetNode = cyRef.current.nodes().find(node =>
      node.data('label')?.toLowerCase().includes(lower)
    );

    if (targetNode) {
      cyRef.current.nodes().unselect();
      targetNode.select();
      cyRef.current.animate({
        center: { eles: targetNode },
        zoom: 1.5,
        duration: 400
      });
      const nota = notas.find(n => n.id === targetNode.id());
      if (nota) setNotaSelecionada(nota);
    }
  };

  const abrirNoEditor = (nota) => {
    if (!nota) return;
    setPendingNoteAction({ noteId: nota.id });
    setActiveTab('notes');
  };

  const totalNotas = useMemo(() => {
    return notas.filter(n => filtros[n.tipo]).length;
  }, [notas, filtros]);

  return (
    <div className="h-full flex flex-col font-ui">
      <div className="p-4 border-b border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Grafo de Conhecimento</h1>
          <p className="text-xs md:text-sm text-text-secondary">
            {totalNotas} notas visíveis • {totalArestas} conexões ativas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar nó..."
              value={buscaNo}
              onChange={(e) => handleBuscarNo(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-bg-secondary border border-border-subtle rounded-lg text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-main w-36 md:w-48 transition-all"
            />
          </div>

          <button onClick={zoomIn} aria-label="Aumentar zoom" title="Aumentar zoom" className="p-2 bg-bg-secondary border border-border-subtle rounded-lg hover:border-accent-main transition-all cursor-pointer">
            <ZoomIn size={18} />
          </button>
          <button onClick={zoomOut} aria-label="Diminuir zoom" title="Diminuir zoom" className="p-2 bg-bg-secondary border border-border-subtle rounded-lg hover:border-accent-main transition-all cursor-pointer">
            <ZoomOut size={18} />
          </button>
          <button onClick={reset} aria-label="Centralizar visão" title="Centralizar visão" className="p-2 bg-bg-secondary border border-border-subtle rounded-lg hover:border-accent-main transition-all cursor-pointer">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-border-subtle flex flex-wrap items-center gap-2 bg-bg-secondary/40">
        <select
          value={layout}
          onChange={(e) => setLayout(e.target.value)}
          aria-label="Layout do grafo"
          className="px-3 py-1 bg-bg-secondary border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none cursor-pointer"
        >
          <option value="cose">COSE (Força Gravitacional)</option>
          <option value="circle">Círculo</option>
          <option value="grid">Grade</option>
          <option value="concentric">Concêntrico</option>
          <option value="breadthfirst">Hierarquia (Árvore)</option>
        </select>

        <div className="h-4 w-[1px] bg-border-subtle mx-1" />

        <Filter size={14} className="text-text-muted" />
        {Object.keys(filtros).map(tipo => (
          <button
            key={tipo}
            onClick={() => setFiltros(f => ({ ...f, [tipo]: !f[tipo] }))}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              filtros[tipo]
                ? 'text-white'
                : 'opacity-40 text-text-muted hover:opacity-70'
            }`}
            style={{
              backgroundColor: filtros[tipo] ? tipoCores[tipo] || '#6C63FF' : '#252338',
              border: `1px solid ${tipoCores[tipo] || '#6C63FF'}40`
            }}
          >
            {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </button>
        ))}
      </div>

      {notaSelecionada && (
        <div className="absolute top-24 right-4 w-80 bg-bg-secondary/95 backdrop-blur-md border border-border-subtle rounded-2xl p-4 shadow-2xl z-20 animate-fadeIn">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-white"
                style={{ backgroundColor: tipoCores[notaSelecionada.tipo] || '#6C63FF' }}
              >
                {notaSelecionada.tipo || 'nota'}
              </span>
              <h3 className="font-bold text-sm text-text-primary mt-1">{notaSelecionada.titulo}</h3>
            </div>
            <button onClick={() => setNotaSelecionada(null)} aria-label="Fechar detalhes da nota" title="Fechar" className="text-text-muted hover:text-text-primary">
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-text-secondary line-clamp-3 mb-3 leading-relaxed">
            {(notaSelecionada.conteudo || '').replace(/<[^>]*>/g, '').substring(0, 180) || 'Nota sem conteúdo...'}
          </p>
          {extrairTags(notaSelecionada).length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {extrairTags(notaSelecionada).map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-accent-main/20 text-accent-main rounded-md text-[10px] font-mono">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={() => abrirNoEditor(notaSelecionada)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-accent-main hover:bg-accent-main/90 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <ExternalLink size={13} />
            Abrir no Editor
          </button>
        </div>
      )}

      {notas.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-muted">
          <div className="text-center">
            <GitBranch size={48} className="mx-auto mb-4 opacity-30 text-accent-main" />
            <p className="text-lg font-bold text-text-primary">Nenhuma nota ainda</p>
            <p className="text-sm text-text-muted">Crie notas para ver suas conexões no grafo</p>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 bg-nx-void" />
      )}
    </div>
  );
}