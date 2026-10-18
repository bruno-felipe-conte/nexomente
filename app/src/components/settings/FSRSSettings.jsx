import React from 'react';
import { Layers, Sliders, Zap, ShieldAlert, RotateCcw, Info } from 'lucide-react';
import { useFSRSConfigStore } from '../../store/useFSRSConfigStore';
import FieldHelp from '../ui/FieldHelp';
import toast from 'react-hot-toast';

export default function FSRSSettings() {
  const config = useFSRSConfigStore();
  const updateConfig = useFSRSConfigStore((s) => s.updateConfig);
  const resetToDefaults = useFSRSConfigStore((s) => s.resetToDefaults);

  const handleReset = () => {
    resetToDefaults();
    toast.success('Parâmetros FSRS restaurados para os padrões!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Cabeçalho do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h3 className="text-xl font-serif font-bold text-text-hi flex items-center gap-2.5">
            <Layers className="text-accent-main" size={22} />
            Parâmetros Avançados de Flashcards & FSRS
          </h3>
          <p className="text-xs text-text-lo/60 mt-1">
            Controle fino de retenção de memória, intervalos de repetição espaçada e filtros de sanguessugas (leech). Passe o mouse sobre o <strong>(?)</strong> de cada campo para ver exemplos.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-lo/70 hover:text-text-hi text-xs font-semibold border border-white/10 transition-all self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw size={14} />
          Restaurar Padrões
        </button>
      </div>

      {/* Grid de Seções */}
      <div className="grid grid-cols-1 gap-6">

        {/* 1. Algoritmo e Taxa de Retenção */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-hi font-bold text-sm">
              <Zap size={16} className="text-amber-400" />
              <span>Taxa de Retenção Desejada (FSRS)</span>
              <FieldHelp
                title="Taxa de Retenção Desejada"
                description="A probabilidade matemática mínima de você conseguir se lembrar do conteúdo de um card no exato dia em que ele for agendado para revisão."
                example="Se definir em 90%, o algoritmo agenda a revisão para quando sua memória estiver prestes a esquecer (com 90% de chance de acerto). 80% reduz drasticamente as revisões mas você errará mais; 97% exige estudar todo dia."
                recommendation="90%"
                position="bottom"
                align="left"
              />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent-main/20 text-accent-main border border-accent-main/30">
              {Math.round(config.desiredRetention * 100)}%
            </span>
          </div>

          <div className="space-y-2">
            <input
              type="range"
              min="0.80"
              max="0.97"
              step="0.01"
              value={config.desiredRetention}
              onChange={(e) => updateConfig({ desiredRetention: parseFloat(e.target.value) })}
              className="w-full accent-accent-main cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-text-lo/40 font-mono">
              <span>80% (Menos revisões, mais esquecimento)</span>
              <span>90% (Recomendado)</span>
              <span>97% (Máxima retenção, alto volume)</span>
            </div>
          </div>

          <p className="text-xs text-text-lo/60 leading-relaxed bg-black/20 p-3.5 rounded-xl border border-white/5 flex items-start gap-2.5">
            <Info size={16} className="text-accent-main shrink-0 mt-0.5" />
            <span>
              O algoritmo otimiza o espaçamento entre revisões com base na probabilidade matemática de recordar a informação. 90% é o equilíbrio ideal comprovado pela neurociência da aprendizagem.
            </span>
          </p>
        </div>

        {/* 2. Passos de Aprendizado e Graduação */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-6">
          <div className="flex items-center gap-2 text-text-hi font-bold text-sm">
            <Sliders size={16} className="text-blue-400" />
            Fases de Aprendizado & Intervalos
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-text-hi">Passos de Aprendizado (minutos)</label>
                <FieldHelp
                  title="Passos de Aprendizado"
                  description="Intervalos curtos (em minutos) pelos quais um card recém-criado deve passar antes de virar um card graduado (com intervalos em dias)."
                  example="Com '1, 10', ao ver um card novo e acertar, ele volta em 1 minuto; acertando de novo, volta em 10 minutos. Ao passar desses dois passos, ele é promovido para amanhã."
                  recommendation="1, 10 min"
                  position="bottom"
                  align="left"
                />
              </div>
              <input
                type="text"
                value={config.learningSteps}
                onChange={(e) => updateConfig({ learningSteps: e.target.value })}
                placeholder="ex: 1, 10"
                className="w-full bg-bg-secondary border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-text-hi focus:border-accent-main focus:outline-none"
              />
              <span className="text-[10px] text-text-lo/40">Separados por vírgula (ex: 1, 10 minutos).</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-text-hi">Passos de Reaprendizado (Lapse)</label>
                <FieldHelp
                  title="Passos de Reaprendizado (Lapse)"
                  description="Tempo de espera imediato (em minutos) quando você erra um card que já estava memorizado e maduro."
                  example="Se você colocar '10', ao errar um card antigo na sessão de estudos, ele voltará após 10 minutos na mesma sessão para refrescar a memória antes de você encerrar."
                  recommendation="10 min"
                  position="bottom"
                  align="left"
                />
              </div>
              <input
                type="text"
                value={config.relearningSteps}
                onChange={(e) => updateConfig({ relearningSteps: e.target.value })}
                placeholder="ex: 10"
                className="w-full bg-bg-secondary border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-text-hi focus:border-accent-main focus:outline-none"
              />
              <span className="text-[10px] text-text-lo/40">Tempo para rever após esquecer um card maduro.</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-text-hi">Intervalo de Graduação (Dias)</label>
                <FieldHelp
                  title="Intervalo de Graduação"
                  description="Número de dias até a primeira revisão de longo prazo após você concluir com sucesso todos os passos de aprendizado."
                  example="Se estiver '1', assim que você vencer os passos de 1 e 10 minutos hoje, o card só voltará a ser revisado amanhã."
                  recommendation="1 dia"
                  position="top"
                  align="left"
                />
              </div>
              <input
                type="number"
                min="1"
                max="30"
                value={config.graduatingInterval}
                onChange={(e) => updateConfig({ graduatingInterval: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-bg-secondary border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-text-hi focus:border-accent-main focus:outline-none"
              />
              <span className="text-[10px] text-text-lo/40">Dias para primeira revisão após completar os passos.</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-text-hi">Intervalo Fácil (Dias)</label>
                <FieldHelp
                  title="Intervalo Fácil"
                  description="Intervalo em dias concedido quando você clica em 'Fácil' logo na primeira vez que vê um card inédito."
                  example="Se você estiver estudando um termo básico que já domina completamente e clicar em 'Fácil', o card pula os passos de minutos e só reaparece daqui a 4 dias."
                  recommendation="4 dias"
                  position="top"
                  align="left"
                />
              </div>
              <input
                type="number"
                min="1"
                max="60"
                value={config.easyInterval}
                onChange={(e) => updateConfig({ easyInterval: parseInt(e.target.value, 10) || 4 })}
                className="w-full bg-bg-secondary border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-text-hi focus:border-accent-main focus:outline-none"
              />
              <span className="text-[10px] text-text-lo/40">Salto imediato se marcado Fácil no primeiro contato.</span>
            </div>
          </div>
        </div>

        {/* 3. Limites Diários & Sanguessugas (Leech) */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-6">
          <div className="flex items-center gap-2 text-text-hi font-bold text-sm">
            <ShieldAlert size={16} className="text-rose-400" />
            Limites Diários & Detecção de Sanguessugas (Leech)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-text-hi">Novos Cards por Dia</label>
                <FieldHelp
                  title="Novos Cards por Dia"
                  description="O teto máximo de flashcards inéditos que o sistema libera para estudo a cada 24 horas."
                  example="Se você criar ou importar 200 cards hoje e o limite for 20, você estudará apenas 20 novos hoje, 20 amanhã, etc., evitando um efeito 'bola de neve' de revisões nos próximos dias."
                  recommendation="20 a 30"
                  position="top"
                  align="left"
                />
              </div>
              <input
                type="number"
                min="0"
                max="200"
                value={config.maxNewCardsPerDay}
                onChange={(e) => updateConfig({ maxNewCardsPerDay: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-bg-secondary border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-text-hi focus:border-accent-main focus:outline-none"
              />
              <span className="text-[10px] text-text-lo/40">Teto diário para introdução de novos conteúdos.</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-text-hi">Revisões Máximas por Dia</label>
                <FieldHelp
                  title="Revisões Máximas por Dia"
                  description="O limite diário de cards agendados para revisão que você aceita responder em um único dia."
                  example="Se você passou uma semana sem estudar e acumulou 300 revisões, mas seu teto é 100, o sistema só cobrará 100 hoje para evitar cansaço e frustração mental."
                  recommendation="100 a 200"
                  position="top"
                  align="left"
                />
              </div>
              <input
                type="number"
                min="0"
                max="1000"
                value={config.maxReviewsPerDay}
                onChange={(e) => updateConfig({ maxReviewsPerDay: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-bg-secondary border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-text-hi focus:border-accent-main focus:outline-none"
              />
              <span className="text-[10px] text-text-lo/40">Protege contra fadiga mental em dias sobrecarregados.</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-text-hi">Limite de Falhas (Leech Threshold)</label>
                <FieldHelp
                  title="Limite de Falhas (Leech)"
                  description="Total de vezes que você pode errar o mesmo card antes que o sistema o classifique como uma 'Sanguessuga' (card problemático)."
                  example="Se você errar um card 8 vezes, significa que a pergunta é longa, confusa ou mal formulada. O sistema detecta isso para você reescrever o card em vez de continuar decorando à força."
                  recommendation="8 falhas"
                  position="top"
                  align="left"
                />
              </div>
              <input
                type="number"
                min="3"
                max="20"
                value={config.leechThreshold}
                onChange={(e) => updateConfig({ leechThreshold: parseInt(e.target.value, 10) || 8 })}
                className="w-full bg-bg-secondary border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-text-hi focus:border-accent-main focus:outline-none"
              />
              <span className="text-[10px] text-text-lo/40">Número de erros para identificar um card com atrito de retenção.</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-text-hi">Ação para Sanguessuga</label>
                <FieldHelp
                  title="Ação para Sanguessuga"
                  description="O comportamento automático do aplicativo assim que um card atinge o limite de falhas."
                  example="'Apenas Etiquetar' adiciona a tag #leech no card para você filtrar depois. 'Suspender' pausa o card imediatamente, tirando-o do fluxo de revisões até você editá-lo."
                  recommendation="Apenas Etiquetar"
                  position="top"
                  align="left"
                />
              </div>
              <select
                value={config.leechAction}
                onChange={(e) => updateConfig({ leechAction: e.target.value })}
                className="w-full bg-bg-secondary border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-medium text-text-hi focus:border-accent-main focus:outline-none"
              >
                <option value="tag">Apenas Etiquetar (Tag #leech)</option>
                <option value="suspend">Suspender Card Automaticamente</option>
              </select>
              <span className="text-[10px] text-text-lo/40">Cards suspensos não drenam tempo até serem reformulados.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
