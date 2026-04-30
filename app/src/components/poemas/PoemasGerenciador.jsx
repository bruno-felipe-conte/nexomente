import { useState, useCallback, useMemo } from 'react';
import { 
  Search, Plus, ArrowLeft, Book, Edit3, Trash2, 
  Sparkles, List, FileText, Check, Clock, Tag,
  ExternalLink, Trash, Save, Wand2, ChevronLeft, Loader2,
  Download, Upload, CheckSquare, Square, X, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { usePoemas } from '../../hooks/useMaterias';
import * as aiProvider from '../../lib/ai/aiProvider';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';

export default function PoemasGerenciador({ onLeitura, onSelectPoema }) {
  const { poemas, create, createMany, update, remove, loading } = usePoemas();
  
  const [abaAtiva, setAbaAtiva] = useState('gerenciador'); // 'gerenciador' | 'processador' | 'editar'
  const [textoParaProcessar, setTextoParaProcessar] = useState('');
  const [processando, setProcessando] = useState(false);
  const [poemasDetectados, setPoemasDetectados] = useState([]);
  const [busca, setBusca] = useState('');
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

  const selecionarTodos = () => {
    if (selecionados.length === poemasFiltrados.length) setSelecionados([]);
    else setSelecionados(poemasFiltrados.map(p => p.id));
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

  const importarJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const dados = JSON.parse(event.target.result);
        if (Array.isArray(dados)) {
          createMany(dados);
          toast.success(`${dados.length} poemas importados!`);
        }
      } catch (err) {
        toast.error('Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
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
    if (editForm.id) {
      update(editForm.id, editForm);
      toast.success('Poema atualizado!');
    } else {
      create(editForm);
      toast.success('Poema criado!');
    }
    setAbaAtiva('gerenciador');
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
    
    // Pequeno delay para garantir que o banco sincronizou a versão antes de trocar a aba
    setTimeout(() => {
      setPoemasDetectados([]);
      setTextoParaProcessar('');
      setAbaAtiva('gerenciador');
    }, 100);
  };

  const poemasFiltrados = poemas.filter(p =>
    p.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    (p.autor && p.autor.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-hidden">
      {/* Header Fixo */}
      <div className="px-8 py-6 border-b border-white/5 bg-bg-secondary/30 backdrop-blur-xl flex-none">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onLeitura}
              className="p-2 hover:bg-white/5 rounded-full text-text-lo transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text-hi tracking-tight">Biblioteca Poética</h1>
              <p className="text-[10px] text-text-lo/40 uppercase font-black tracking-widest mt-1">Gerenciamento e Importação Inteligente</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {abaAtiva === 'gerenciador' && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setModoSelecao(!modoSelecao); setSelecionados([]); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${modoSelecao ? 'bg-accent-main text-white' : 'bg-bg-tertiary text-text-lo hover:bg-white/5'}`}
                >
                  {modoSelecao ? <X size={14} /> : <CheckSquare size={14} />} 
                  {modoSelecao ? 'Cancelar' : 'Seleção Múltipla'}
                </button>
              </div>
            )}
            <button 
              onClick={() => setAbaAtiva('gerenciador')}
              className={`p-2 rounded-xl transition-all ${abaAtiva === 'gerenciador' ? 'text-accent-main bg-accent-main/10' : 'text-text-lo hover:text-text-hi'}`}
              title="Ver Lista"
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {abaAtiva === 'gerenciador' && (
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-xl">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-lo/40" />
              <input 
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar poemas, autores, temas..."
                className="w-full bg-bg-secondary/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-text-hi placeholder-text-lo/30 focus:ring-1 focus:ring-accent-main outline-none transition-all shadow-xl"
              />
            </div>
            
            <div className="flex gap-2">
               <button 
                onClick={() => { setEditForm({ id: null, titulo: '', autor: '', corpo: '', tema: [], forma: '' }); setAbaAtiva('editar'); }}
                className="px-6 py-3 bg-accent-main text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-accent-main/20"
              >
                <Plus size={16} /> Novo Poema
              </button>
              <button 
                onClick={() => { setAbaAtiva('processador'); setPoemasDetectados([]); }}
                className="px-6 py-3 bg-bg-tertiary text-text-hi rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-white/5 transition-all"
              >
                <Sparkles size={16} className="text-accent-main" /> Importar com IA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo Principal com Scroll Interno */}
      <div className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          {abaAtiva === 'gerenciador' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-6xl mx-auto w-full"
            >
              {modoSelecao && selecionados.length > 0 && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mb-8 bg-accent-main p-4 rounded-2xl flex items-center justify-between shadow-2xl"
                >
                  <span className="text-xs font-black text-white ml-2">{selecionados.length} ITENS SELECIONADOS</span>
                  <div className="flex gap-2">
                    <button onClick={() => exportarSelecionados('json')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-white flex items-center gap-2">
                      <Download size={14} /> JSON
                    </button>
                    <button onClick={() => exportarSelecionados('md')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-white flex items-center gap-2">
                      <Download size={14} /> MD
                    </button>
                    <button onClick={excluirSelecionados} className="px-3 py-1.5 bg-danger/20 hover:bg-danger/40 rounded-lg text-[10px] font-bold text-white flex items-center gap-2">
                      <Trash size={14} /> EXCLUIR
                    </button>
                  </div>
                </motion.div>
              )}

              {poemasFiltrados.length === 0 ? (
                <div className="py-20 flex flex-col items-center text-center opacity-40">
                  <Book size={48} className="mb-4" />
                  <h3 className="text-xl font-bold">Nenhum poema encontrado</h3>
                  <p className="text-sm">Tente mudar sua busca ou adicione novos poemas.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Cabeçalho da Lista */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-text-lo/30">
                    <div className="col-span-1 flex items-center justify-center">#</div>
                    <div className="col-span-4">Título</div>
                    <div className="col-span-3">Autor</div>
                    <div className="col-span-2 text-center">Forma / Época</div>
                    <div className="col-span-2 text-right">Ações</div>
                  </div>

                  {poemasFiltrados.map((p, idx) => (
                    <motion.div 
                      key={p.id}
                      onClick={() => modoSelecao && toggleSelecao(p.id)}
                      className={`grid grid-cols-12 gap-4 items-center px-6 py-4 bg-bg-secondary/40 border rounded-2xl transition-all cursor-pointer group ${selecionados.includes(p.id) ? 'border-accent-main bg-accent-main/5' : 'border-white/5 hover:border-white/10 hover:bg-bg-secondary'}`}
                    >
                      <div className="col-span-1 flex items-center justify-center">
                        {modoSelecao ? (
                          selecionados.includes(p.id) ? <CheckSquare size={16} className="text-accent-main" /> : <Square size={16} className="text-text-lo/20" />
                        ) : (
                          <span className="text-xs font-mono text-text-lo/20">{idx + 1}</span>
                        )}
                      </div>
                      
                      <div className="col-span-4 min-w-0">
                        <h4 className="text-sm font-bold text-text-hi truncate">{p.titulo}</h4>
                        <div className="flex gap-1 mt-1">
                          {p.tema?.slice(0, 2).map(t => (
                            <span key={t} className="text-[9px] text-text-lo/40">#{t}</span>
                          ))}
                        </div>
                      </div>

                      <div className="col-span-3 text-xs text-text-lo font-medium truncate">
                        {p.autor || '—'}
                      </div>

                      <div className="col-span-2 flex flex-col items-center gap-1">
                        <span className="px-2 py-0.5 bg-accent-main/10 text-accent-main rounded text-[9px] font-black uppercase">{p.forma || 'N/A'}</span>
                        <span className="text-[9px] text-text-lo/30 font-medium truncate">{p.epoca || '—'}</span>
                      </div>

                      <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                          onClick={(e) => { e.stopPropagation(); iniciarEdicao(p); }}
                          className="p-2 hover:bg-accent-main/10 rounded-lg text-text-lo hover:text-accent-main transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onSelectPoema(p); }}
                          className="p-2 hover:bg-success/10 rounded-lg text-text-lo hover:text-success transition-all"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {abaAtiva === 'processador' && (
            <motion.div 
              key="processor"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-full flex flex-col gap-6 max-w-5xl mx-auto w-full"
            >
              <div className="flex-none bg-bg-secondary border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent-main/10 flex items-center justify-center text-accent-main">
                      <Wand2 size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text-hi">Extração de Poemas</h2>
                      <p className="text-xs text-text-lo/40">O motor de IA irá separar o texto em obras individuais e extrair metadados.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setAbaAtiva('gerenciador')}
                      className="px-6 py-3 bg-bg-tertiary rounded-xl text-xs font-bold text-text-hi hover:bg-white/5 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={processarComIA}
                      disabled={processando || !textoParaProcessar.trim()}
                      className="flex items-center gap-2 px-8 py-3 bg-accent-main rounded-xl font-bold text-white shadow-lg shadow-accent-main/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 text-xs"
                    >
                      {processando ? (
                        <> <Loader2 size={18} className="animate-spin" /> Analisando Texto...</>
                      ) : (
                        <> <Sparkles size={18} /> Iniciar Processamento IA</>
                      )}
                    </button>
                  </div>
                </div>

                <textarea 
                  value={textoParaProcessar}
                  onChange={e => setTextoParaProcessar(e.target.value)}
                  placeholder="Cole aqui poemas soltos, antologias ou páginas de livros..."
                  className="w-full h-56 bg-bg-tertiary/50 border border-white/5 rounded-3xl p-6 text-sm text-text-hi placeholder-text-lo/20 focus:ring-2 focus:ring-accent-main outline-none resize-none font-serif leading-relaxed"
                />
              </div>

              {poemasDetectados.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="font-bold text-text-hi text-sm flex items-center gap-2">
                      <Check size={18} className="text-success" /> 
                      Análise concluída: {poemasDetectados.length} poemas identificados
                    </h3>
                    <button 
                      onClick={salvarPoemasIA}
                      className="px-8 py-3 bg-success rounded-xl text-white font-bold text-xs shadow-lg shadow-success/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Save size={16} /> Confirmar e Salvar Tudo
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pb-10 pr-2">
                    {poemasDetectados.map((p, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={i} 
                        className="bg-bg-secondary/40 border border-white/5 rounded-2xl p-6 flex gap-6"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-bold text-text-hi">{p.titulo}</h4>
                            <span className="text-[9px] bg-accent-main/10 text-accent-main px-2 py-0.5 rounded uppercase font-black">{p.forma}</span>
                          </div>
                          <p className="text-[10px] text-text-lo/40 mb-4">{p.autor} · {p.epoca}</p>
                          <pre className="text-[11px] text-text-lo/60 line-clamp-3 font-serif leading-relaxed italic opacity-80 border-l border-white/10 pl-4">
                            {p.corpo}
                          </pre>
                        </div>
                        <div className="flex flex-wrap content-start gap-1 w-32">
                          {p.tema?.map(t => <span key={t} className="text-[8px] bg-white/5 px-2 py-1 rounded-full text-text-lo/60">#{t}</span>)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {abaAtiva === 'editar' && (
            <motion.div 
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="max-w-4xl mx-auto w-full pb-20"
            >
              <div className="bg-bg-secondary border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-text-hi">{editForm.id ? 'Editar Poema' : 'Novo Poema'}</h2>
                  <button onClick={() => setAbaAtiva('gerenciador')} className="p-2 hover:bg-white/5 rounded-full text-text-lo"><X size={24} /></button>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-lo/40 ml-1">Título</label>
                    <input 
                      value={editForm.titulo}
                      onChange={e => setEditForm({...editForm, titulo: e.target.value})}
                      className="w-full bg-bg-tertiary border border-white/5 rounded-2xl py-4 px-6 text-text-hi focus:ring-2 focus:ring-accent-main outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-lo/40 ml-1">Autor</label>
                    <input 
                      value={editForm.autor}
                      onChange={e => setEditForm({...editForm, autor: e.target.value})}
                      className="w-full bg-bg-tertiary border border-white/5 rounded-2xl py-4 px-6 text-text-hi focus:ring-2 focus:ring-accent-main outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-8">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-lo/40">Corpo do Poema</label>
                    <button onClick={reformatarComIA} disabled={processando} className="text-[9px] font-bold text-accent-main flex items-center gap-1 hover:underline">
                      <Wand2 size={10} /> RE-FORMATAR COM IA
                    </button>
                  </div>
                  <textarea 
                    value={editForm.corpo}
                    onChange={e => setEditForm({...editForm, corpo: e.target.value})}
                    className="w-full h-80 bg-bg-tertiary border border-white/5 rounded-3xl p-8 text-lg font-serif leading-loose text-text-hi focus:ring-2 focus:ring-accent-main outline-none resize-none"
                  />
                </div>

                <div className="space-y-2 mb-10">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-lo/40 ml-1">Notas de Estudo</label>
                  <textarea 
                    value={editForm.notas_usuario}
                    onChange={e => setEditForm({...editForm, notas_usuario: e.target.value})}
                    className="w-full h-24 bg-bg-tertiary border border-white/5 rounded-2xl p-6 text-sm text-text-hi focus:ring-2 focus:ring-accent-main outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => setAbaAtiva('gerenciador')} className="px-8 py-4 bg-bg-tertiary rounded-2xl font-bold text-text-lo">Cancelar</button>
                  <button onClick={salvarEdicao} className="px-10 py-4 bg-accent-main rounded-2xl font-bold text-white shadow-lg shadow-accent-main/20">Salvar Poema</button>
                </div>
              </div>
            </motion.div>
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
