import { useState, useEffect } from 'react';
import { usePoemas } from '../hooks/useMaterias';
import PoemaLeitura from '../components/poemas/PoemaLeitura';
import PoemasGerenciador from '../components/poemas/PoemasGerenciador';

export default function PoemasPage() {
  const { getById } = usePoemas();
  const [tela, setTela] = useState('gerenciar'); // Default agora é gerenciar
  const [poemaSelecionado, setPoemaSelecionado] = useState(null);

  // Garante que se houve edição o poema selecionado seja atualizado
  useEffect(() => {
    if (poemaSelecionado && tela === 'leitura') {
      const p = getById(poemaSelecionado.id);
      if (p) {
        setPoemaSelecionado(p);
      }
    }
  }, [tela, getById]);

  if (tela === 'gerenciar') {
    return (
      <PoemasGerenciador 
        onLeitura={() => setTela('leitura')}
        onSelectPoema={(p) => {
          setPoemaSelecionado(p);
          setTela('leitura');
        }}
      />
    );
  }

  return (
    <PoemaLeitura 
      onManage={() => setTela('gerenciar')}
      poemaSelecionado={poemaSelecionado}
      setPoemaSelecionado={setPoemaSelecionado}
    />
  );
}