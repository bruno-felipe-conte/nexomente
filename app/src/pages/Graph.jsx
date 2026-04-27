import { useState, useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '../store/useUIStore';
import cytoscape from 'cytoscape';
import { GitBranch, ZoomIn, ZoomOut, Maximize2, Filter, Layout, Eye, EyeOff, X } from 'lucide-react';

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
  const Notas = useUIStore.getState().Notas;
  const Pastas = useUIStore.getState().Pastas;
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [notas, setNotas] = useState([]);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [layout, setLayout] = useState('cose');
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
    setNotas(Notas.getAll());
  }, [Notas]);

  useEffect(() => {
    if (!containerRef.current || notas.length === 0) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const elementos = [];

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
        }
      });
    });

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elementos,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'background-color': '#6C63FF',
            'color': '#F2F0FF',
            'font-size': '12px',
            'text-valign': 'bottom',
            'text-margin-y': 8,
            'width': 40,
            'height': 40,
          },
        },
        ...Object.entries(tipoCores).map(([tipo, cor]) => ({
          selector: `node[tipo="${tipo}"]`,
          style: { 'background-color': cor },
        })),
        {
          selector: 'edge[tipo="wikilink"]',
          style: {
            'width': 3,
            'line-color': '#6C63FF',
            'target-arrow-color': '#6C63FF',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'edge[tipo="tag"]',
          style: {
            'width': 1,
            'line-color': '#4A4A6A',
            'target-arrow-color': '#4A4A6A',
            'target-arrow-shape': 'triangle',
            'line-style': 'dashed',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#F2F0FF',
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

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Grafo</h1>
          <p className="text-text-secondary">{notas.length} notas • {notas.filter(n => extrairLinks(n.conteudo).length)} conexões</p>
        </div>
        
        <div className="flex items-center gap-2">
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

      <div className="p-4 border-b border-border-subtle flex gap-2">
        <select 
          value={layout} 
          onChange={(e) => setLayout(e.target.value)}
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
            className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 ${
              filtros[tipo] 
                ? '' 
                : 'opacity-50'
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