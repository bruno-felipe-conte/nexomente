import { useState } from 'react';
import { usePoemas } from '../hooks/useMaterias';
import PoemaLeitura from '../components/poemas/PoemaLeitura';
import PoemasGerenciador from '../components/poemas/PoemasGerenciador';

export default function PoemasPage() {
  const { getById } = usePoemas();
  const [tela, setTela] = useState('gerenciar'); // Default agora é gerenciar
  const [poemaSelecionado, setPoemaSelecionado] = useState(null);

  // Se houve edição recente, obtém a versão atualizada do banco
  const poemaAtual = (poemaSelecionado && tela === 'leitura')
    ? (getById(poemaSelecionado.id) || poemaSelecionado)
    : poemaSelecionado;

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
      poemaSelecionado={poemaAtual}
      setPoemaSelecionado={setPoemaSelecionado}
    />
  );
}