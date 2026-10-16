import { useState, useMemo } from 'react';
import { Search, Plus, Sparkles, ChevronLeft, CheckSquare, X, Star } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { usePoemas } from '../../hooks/useMaterias';
import * as aiProvider from '../../lib/ai/aiProvider';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import PoemasListaTab from './PoemasListaTab';
import PoemasProcessadorTab from './PoemasProcessadorTab';
import PoemaFormTab from './PoemaFormTab';

export default function PoemasGerenciador({ onLeitura, onSelectPoema }) {
  const { poemas, create, createMany, update, remove } = usePoemas();

  const [abaAtiva, setAbaAtiva] = useState('gerenciador'); // 'gerenciador' | 'processador' | 'editar'
  const [textoParaProcessar, setTextoParaProcessar] = useState('');
  const [processando, setProcessando] = useState(false);
  const [poemasDetectados, setPoemasDetectados] = useState([]);
  const [busca, setBusca] = useState('');
  const [apenasFavoritos, setApenasFavoritos] = useState(false);
  const [favoritos, setFavoritos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nexomente_poemas_favs') || '[]');
    } catch {
      return [];
    }
  });

  const toggleFavorito = (id) => {
    setFavoritos(prev => {
      const novo = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      try {
        localStorage.setItem('nexomente_poemas_favs', JSON.stringify(novo));
      } catch {
        // Silencioso se localstorage falhar
      }
      return novo;
    });
  };

  const [selecionados, setSelecionados] = useState([]);
  const [modoSelecao, setModoSelecao] = useState(false);

  const [editForm, setEditForm] = useState({
    id: null, titulo: '', autor: '', epoca: '', corpo: '',
    tema: [], forma: '', tags: [], notas_usuario: '', ano: ''
  });

  const toggleSelecao = (id) => {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const exportarSelecionados = (formato) => {
    const dados = poemas.filter(p => selecionados.includes(p.id));
    let conteudo;
    let fileName = `nexomente_poemas_${new Date().getTime()}`;

    if (formato === 'json') {
      conteudo = JSON.stringify(dados, null, 2);
      fileName += '.json';
    } else if (formato === 'md') {
      conteudo = dados.map(p =>
        `# ${p.titulo}\n**Autor:** ${p.autor || 'Desconhecido'}\n**Tags:** #${(p.tema || []).join(' #')}\n\n${p.corpo}\n\n---\n*Notas:* ${p.notas_usuario || ''}`
      ).join('\n\n\n');
      fileName += '.md';
    } else {
      conteudo = dados.map(p =>
        `${p.titulo.toUpperCase()}\n${p.autor || ''}\n\n${p.corpo}\n\n`
      ).join('\n' + '='.repeat(20) + '\n\n');
      fileName += '.txt';
    }

    const blob = new Blob([conteudo], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportado ${dados.length} poemas em ${formato.toUpperCase()}`);
  };

  const excluirSelecionados = () => {
    if (!window.confirm(`Excluir ${selecionados.length} poemas?`)) return;
    selecionados.forEach(id => remove(id));
    setSelecionados([]);
    setModoSelecao(false);
    toast.success('Itens excluídos.');
  };

  const iniciarEdicao = (poema) => {
    setEditForm({
      id: poema.id,
      titulo: poema.titulo,
      autor: poema.autor || '',
      epoca: poema.epoca || '',
      corpo: poema.corpo || '',
      tema: poema.tema || [],
      forma: poema.forma || '',
      tags: poema.tags || [],
      notas_usuario: poema.notas_usuario || '',
      ano: poema.ano || '',
    });
    setAbaAtiva('editar');
  };

  const salvarEdicao = () => {
    if (!editForm.titulo?.trim() || !editForm.corpo?.trim()) {
      toast.error('Preencha o título e o corpo do poema.');
      return;
    }
    if (editForm.id) {
      update(editForm.id, editForm);
      toast.success('Poema atualizado!');
    } else {
      create(editForm);
      toast.success('Poema criado!');
    }
    setAbaAtiva('gerenciador');
  };

  const excluirPoema = (poema) => {
    if (!window.confirm(`Excluir o poema "${poema.titulo}"?`)) return;
    remove(poema.id);
    toast.success('Poema excluído.');
  };

  const processarComIA = async () => {
    if (!textoParaProcessar.trim()) return;
    setProcessando(true);

    const prompt = `Você é um especialista em literatura. Analise o texto abaixo e extraia os poemas encontrados.

TEXTO PARA ANÁLISE:
"${textoParaProcessar}"

REGRAS DE RESPOSTA:
1. Identifique cada poema separadamente.
2. Extraia: titulo, autor, epoca, tema (lista de palavras), forma e o corpo (texto) do poema.
3. Responda EXCLUSIVAMENTE com um JSON no formato do exemplo abaixo, sem textos explicativos.

EXEMPLO DE FORMATO:
[
  {
    "titulo": "Nome do Poema",
    "autor": "Nome do Autor",
    "epoca": "Movimento Literário",
    "tema": ["Amor", "Natureza"],
    "forma": "Soneto",
    "corpo": "Versos do poema aqui..."
  }
]`;

    try {
      const res = await aiProvider.generate(prompt, {
        max_tokens: 2500,
        temperature: 0.2
      });

      if (res.success) {
        let rawContent = res.content || res.response;
        rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonStart = rawContent.indexOf('[');
        const jsonEnd = rawContent.lastIndexOf(']') + 1;

        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          const jsonString = rawContent.substring(jsonStart, jsonEnd);
          try {
            const detectados = JSON.parse(jsonString);
            setPoemasDetectados(Array.isArray(detectados) ? detectados : [detectados]);
            toast.success('Poemas extraídos com sucesso!');
          } catch (parseErr) {
            console.error('Erro de parse JSON:', parseErr, jsonString);
            toast.error('A IA gerou um JSON inválido.');
          }
        } else {
          toast.error('A IA não conseguiu estruturar os poemas.');
        }
      } else {
        toast.error(`Erro: ${res.error || 'Falha no motor de IA'}`);
      }
    } catch (e) {
      console.error('Erro crítico no processador IA:', e);
      toast.error('Erro de conexão ou motor de IA.');
    } finally {
      setProcessando(false);
    }
  };

  const reformatarComIA = async () => {
    if (!editForm.corpo.trim()) return;
    setProcessando(true);
    const prompt = `Re-formate este poema para melhor leitura. Texto:\n${editForm.corpo}\n\nResponda APENAS com o texto formatado.`;

    try {
      const res = await aiProvider.generate(prompt, { max_tokens: 1536 });
      if (res.success) {
        setEditForm(prev => ({ ...prev, corpo: res.content.trim() }));
        toast.success('IA re-formatou o poema!');
      }
    } finally {
      setProcessando(false);
    }
  };

  const salvarPoemasIA = () => {
    if (poemasDetectados.length === 0) return;
    createMany(poemasDetectados);
    toast.success(`${poemasDetectados.length} poemas adicionados!`);

    setTimeout(() => {
      setPoemasDetectados([]);
      setTextoParaProcessar('');
      setAbaAtiva('gerenciador');
    }, 100);
  };

  const poemasFiltrados = useMemo(() => {
    let lista = poemas;
    if (apenasFavoritos) {
      lista = lista.filter(p => favoritos.includes(p.id));
    }
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(p =>
        p.titulo.toLowerCase().includes(q) ||
        (p.autor && p.autor.toLowerCase().includes(q)) ||
        (p.tema && p.tema.some(t => t.toLowerCase().includes(q)))
      );
    }
    return lista;
  }, [poemas, busca, apenasFavoritos, favoritos]);

  return (
    <div className="flex flex-col h-full bg-nx-void overflow-hidden">
      {/* Header Fixo */}
      <div className="px-6 py-4 border-b border-nx-border bg-nx-surface/30 backdrop-blur-xl flex-none">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onLeitura}
              className="p-2 hover:bg-white/5 rounded-full text-nx-dim transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-nx-bright tracking-tight">Biblioteca Poética</h1>
              <p className="text-[10px] text-nx-dim/40 uppercase font-black tracking-widest mt-1">Gerenciamento e Importação Inteligente</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {abaAtiva === 'gerenciador' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setModoSelecao(!modoSelecao); setSelecionados([]); }}
                  className={`px-4 py-2 rounded-nx-sm text-xs font-bold transition-all flex items-center gap-2 ${modoSelecao ? 'bg-nx-primary text-white' : 'bg-nx-depth text-nx-dim hover:bg-white/5'}`}
                >
                  {modoSelecao ? <X size={14} /> : <CheckSquare size={14} />}
                  {modoSelecao ? 'Cancelar' : 'Seleção Múltipla'}
                </button>
              </div>
            )}
          </div>
        </div>

        {abaAtiva === 'gerenciador' && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-nx-dim/40" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar poemas, autores, temas..."
                className="w-full bg-nx-surface/50 border border-nx-border rounded-nx-md py-2 pl-10 pr-4 text-sm text-nx-bright placeholder-nx-dim/30 focus:ring-1 focus:ring-nx-primary outline-none transition-all shadow-xl"
              />
            </div>

            <button
              onClick={() => setApenasFavoritos(prev => !prev)}
              title={apenasFavoritos ? 'Mostrar todos os poemas' : 'Filtrar apenas favoritos'}
              className={`px-3 py-2 rounded-nx-sm text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                apenasFavoritos
                  ? 'bg-warning/20 border border-warning text-warning'
                  : 'bg-nx-depth text-nx-dim hover:text-nx-bright border border-transparent'
              }`}
            >
              <Star size={14} fill={apenasFavoritos ? 'currentColor' : 'none'} />
              <span>Favoritos</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => { setEditForm({ id: null, titulo: '', autor: '', epoca: '', corpo: '', tema: [], forma: '', tags: [], notas_usuario: '', ano: '' }); setAbaAtiva('editar'); }}
                className="px-4 py-2 bg-nx-primary text-white rounded-nx-sm text-xs font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-nx-primary/20"
              >
                <Plus size={16} /> Novo Poema
              </button>
              <button
                onClick={() => { setAbaAtiva('processador'); setPoemasDetectados([]); }}
                className="px-4 py-2 bg-nx-depth text-nx-bright rounded-nx-sm text-xs font-bold flex items-center gap-2 hover:bg-white/5 transition-all"
              >
                <Sparkles size={16} className="text-accent-main" /> Importar com IA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-hidden p-6">
        <AnimatePresence mode="wait">
          {abaAtiva === 'gerenciador' && (
            <PoemasListaTab
              modoSelecao={modoSelecao}
              selecionados={selecionados}
              exportarSelecionados={exportarSelecionados}
              excluirSelecionados={excluirSelecionados}
              poemasFiltrados={poemasFiltrados}
              toggleSelecao={toggleSelecao}
              iniciarEdicao={iniciarEdicao}
              onSelectPoema={onSelectPoema}
              favoritos={favoritos}
              onToggleFavorito={toggleFavorito}
              onExcluir={excluirPoema}
            />
          )}

          {abaAtiva === 'processador' && (
            <PoemasProcessadorTab
              setAbaAtiva={setAbaAtiva}
              processarComIA={processarComIA}
              processando={processando}
              textoParaProcessar={textoParaProcessar}
              setTextoParaProcessar={setTextoParaProcessar}
              poemasDetectados={poemasDetectados}
              salvarPoemasIA={salvarPoemasIA}
            />
          )}

          {abaAtiva === 'editar' && (
            <PoemaFormTab
              editForm={editForm}
              setEditForm={setEditForm}
              setAbaAtiva={setAbaAtiva}
              reformatarComIA={reformatarComIA}
              processando={processando}
              salvarEdicao={salvarEdicao}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

PoemasGerenciador.propTypes = {
  onLeitura: PropTypes.func,
  onSelectPoema: PropTypes.func,
};
