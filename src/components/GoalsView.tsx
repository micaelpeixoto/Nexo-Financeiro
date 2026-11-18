import React, { useState } from 'react';
import {
  Target,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  X,
  Coins,
  ShieldCheck,
  CreditCard,
  HeartPulse,
  Palmtree,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Meta } from '../types';
import {
  calculateGoalMonthlyContribution,
  addMonthsSafe,
  toISODate
} from '../utils/calculations';
import { formatCurrency, formatDateBr } from '../utils/i18n';
import { InfoTipButton } from './InfoTipButton';

interface GoalsViewProps {
  metas: Meta[];
  onSaveGoal: (goal: Omit<Meta, 'id' | 'criada_em'>) => void;
  onAddContribution: (goalId: string, amount: number, note?: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

interface PresetGoalTemplate {
  id: string;
  nome: string;
  resumo: string;
  valor_alvo: number;
  mesesPrazo: number;
  taxa_anual: number;
  cor: string;
  icon: React.ElementType;
  infoTitulo: string;
  infoDescricao: string;
  infoDicas: string[];
}

const PRESET_GOALS: PresetGoalTemplate[] = [
  {
    id: 'preset_reserva_3m',
    nome: 'Reserva de Emergência (3 meses)',
    resumo: 'Primeiro colchão de segurança para imprevistos',
    valor_alvo: 5000,
    mesesPrazo: 12,
    taxa_anual: 10,
    cor: '#10B981',
    icon: ShieldCheck,
    infoTitulo: 'Por que começar pela Reserva de 3 meses?',
    infoDescricao:
      'É a meta mais recomendada para quem está organizando as finanças: garante 3 meses de contas básicas pagas sem depender de empréstimos ou rotativo do cartão.',
    infoDicas: [
      'Deixe em aplicação de liquidez diária (CDB 100% CDI ou Tesouro Selic) para sacar quando precisar.',
      'Você pode editar o valor alvo conforme seu custo mensal essencial.'
    ]
  },
  {
    id: 'preset_quitar_dividas',
    nome: 'Quitar Dívidas e Cartão',
    resumo: 'Reunir fôlego para negociar descontos à vista',
    valor_alvo: 2500,
    mesesPrazo: 6,
    taxa_anual: 0,
    cor: '#EF4444',
    icon: CreditCard,
    infoTitulo: 'Como funciona a meta de Quitação de Dívidas?',
    infoDescricao:
      'Ao juntar um valor específico todo mês antes de negociar, você consegue quitar parcelamentos ou acordos à vista com descontos expressivos e parar de pagar juros.',
    infoDicas: [
      'Priorize sempre dívidas com juros mais altos (cartão de crédito e cheque especial).',
      'Use o perfil "Organizar e Quitar Dívidas" na aba Planos para separar 25% da renda.'
    ]
  },
  {
    id: 'preset_imprevistos_saude',
    nome: 'Fundo Saúde & Manutenções',
    resumo: 'Evita surpresas com carro, casa ou remédios',
    valor_alvo: 2000,
    mesesPrazo: 8,
    taxa_anual: 10,
    cor: '#06B6D4',
    icon: HeartPulse,
    infoTitulo: 'Para que serve o Fundo de Imprevistos?',
    infoDescricao:
      'Pequenos acidentes como pneu furado, consulta particular ou conserto doméstico costumam estourar o mês. Este fundo absorve essas despesas sem mexer na sua reserva principal.',
    infoDicas: [
      'Aportes mensais pequenos já blindam o orçamento do dia a dia.',
      'Após atingir o alvo, mantenha apenas repondo quando usar.'
    ]
  },
  {
    id: 'preset_reserva_6m',
    nome: 'Reserva Completa (6 meses)',
    resumo: 'Tranquilidade total para você e sua família',
    valor_alvo: 15000,
    mesesPrazo: 24,
    taxa_anual: 10,
    cor: '#3B82F6',
    icon: ShieldCheck,
    infoTitulo: 'Quando escolher a Reserva de 6 meses?',
    infoDescricao:
      'Ideal para quem já deu o primeiro passo, autônomos ou quem busca estabilidade sólida contra perda de renda ou troca de carreira.',
    infoDicas: [
      'Calculada em cima de ~R$ 2.500/mês de despesas básicas por 6 meses.',
      'Com 10% a.a. de rendimento, os juros ajudam a diminuir o aporte necessário.'
    ]
  },
  {
    id: 'preset_viagem',
    nome: 'Viagem / Lazer Sem Dívidas',
    resumo: 'Viajar pagando à vista e voltar sem faturas',
    valor_alvo: 3500,
    mesesPrazo: 10,
    taxa_anual: 10,
    cor: '#8B5CF6',
    icon: Palmtree,
    infoTitulo: 'Por que planejar lazer com meta própria?',
    infoDescricao:
      'Separar o valor da viagem antes garante tranquilidade: você aproveita promoções pagando à vista e não compromete o orçamento dos meses seguintes.',
    infoDicas: [
      'Ajuste o valor e a data limite para a época das suas férias.',
      'Todo aporte feito na meta também pode ser acompanhado direto no extrato.'
    ]
  },
  {
    id: 'preset_curso_equip',
    nome: 'Curso, Notebook ou Entrada',
    resumo: 'Investir em carreira, estudos ou bem à vista',
    valor_alvo: 6000,
    mesesPrazo: 15,
    taxa_anual: 10,
    cor: '#F59E0B',
    icon: GraduationCap,
    infoTitulo: 'Objetivo de Crescimento Pessoal',
    infoDescricao:
      'Guardar para ferramentas de trabalho, especialização ou entrada de um bem evita juros altos de financiamento e acelera sua renda futura.',
    infoDicas: [
      'Combine com bônus, 13º ou renda extra para alcançar mais rápido.',
      'Altere prazo e rendimento como preferir antes de salvar.'
    ]
  }
];

export function GoalsView({
  metas,
  onSaveGoal,
  onAddContribution,
  onDeleteGoal
}: GoalsViewProps) {
  const [activeTab, setActiveTab] = useState<'minhas' | 'sugeridas'>('minhas');
  const [showNewGoalModal, setShowNewGoalModal] = useState<boolean>(false);
  const [selectedGoalForAporte, setSelectedGoalForAporte] = useState<Meta | null>(null);

  // Form states
  const [goalName, setGoalName] = useState<string>('');
  const [goalTargetStr, setGoalTargetStr] = useState<string>('');
  const [goalCurrentStr, setGoalCurrentStr] = useState<string>('0');
  const [goalDate, setGoalDate] = useState<string>('');
  const [annualRateStr, setAnnualRateStr] = useState<string>('10');
  const [goalColor, setGoalColor] = useState<string>('#10B981');
  const [formError, setFormError] = useState<string | null>(null);

  // Aporte modal state
  const [aporteAmountStr, setAporteAmountStr] = useState<string>('');
  const [aporteNote, setAporteNote] = useState<string>('');

  const handleOpenEmptyModal = () => {
    setFormError(null);
    setGoalName('');
    setGoalTargetStr('');
    setGoalCurrentStr('0');
    setGoalDate(addMonthsSafe(toISODate(new Date()), 12));
    setAnnualRateStr('10');
    setGoalColor('#10B981');
    setShowNewGoalModal(true);
  };

  const handleUsePreset = (preset: PresetGoalTemplate) => {
    setFormError(null);
    setGoalName(preset.nome);
    setGoalTargetStr(String(preset.valor_alvo));
    setGoalCurrentStr('0');
    setGoalDate(addMonthsSafe(toISODate(new Date()), preset.mesesPrazo));
    setAnnualRateStr(String(preset.taxa_anual));
    setGoalColor(preset.cor);
    setShowNewGoalModal(true);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(goalTargetStr.replace(',', '.'));
    const current = parseFloat(goalCurrentStr.replace(',', '.')) || 0;
    const rate = (parseFloat(annualRateStr.replace(',', '.')) || 0) / 100;

    if (!goalName.trim() || isNaN(target) || target <= 0 || !goalDate) {
      setFormError('Preencha nome, valor alvo válido e data limite.');
      return;
    }

    setFormError(null);
    onSaveGoal({
      nome: goalName.trim(),
      valor_alvo: target,
      valor_atual: current,
      data_alvo: goalDate,
      taxa_rendimento_anual: rate,
      cor: goalColor,
      status: 'ativa'
    });

    setShowNewGoalModal(false);
    setActiveTab('minhas');
  };

  const handleConfirmAporte = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForAporte) return;
    const amount = parseFloat(aporteAmountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    const wasBelow = selectedGoalForAporte.valor_atual < selectedGoalForAporte.valor_alvo;
    const willReach = selectedGoalForAporte.valor_atual + amount >= selectedGoalForAporte.valor_alvo;

    onAddContribution(selectedGoalForAporte.id, amount, aporteNote.trim() || undefined);
    setSelectedGoalForAporte(null);
    setAporteAmountStr('');
    setAporteNote('');

    if (wasBelow && willReach) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* HEADER DA SEÇÃO COM INFO E BOTÃO NOVO */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center space-x-1">
            <h2 className="text-base font-bold text-slate-100">
              Metas de Poupança
            </h2>
            <InfoTipButton
              title="Como funcionam as Metas e o Orçamento"
              description="Defina objetivos financeiros e acompanhe quanto poupar por mês até a data escolhida, integrado diretamente ao orçamento Reserva e Metas."
              details={[
                'Ao tocar em "Adicionar Aporte", o app soma na meta e cria automaticamente um lançamento pago na categoria Reserva e Metas do seu Orçamento e Extrato (sem precisar lançar duas vezes).',
                'Já o campo "Já guardado (R$)" ao criar a meta representa dinheiro antigo que você já tinha antes, sem consumir o orçamento deste mês.',
                'Se informar uma taxa de rendimento anual (ex.: 10% a.a. em CDI), a sugestão mensal já desconta o ganho dos juros compostos.'
              ]}
            />
          </div>
          <span className="text-xs text-slate-400">
            Objetivos claros com aporte mensal sugerido
          </span>
        </div>

        <button
          onClick={handleOpenEmptyModal}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md shadow-brand-500/25 transition-all whitespace-nowrap"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Nova Meta</span>
        </button>
      </div>

      {/* ABAS: MINHAS METAS / METAS SUGERIDAS (PRÉ-FEITAS) */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900 border border-pearl-border text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('minhas')}
          className={`py-2 rounded-xl transition-colors ${
            activeTab === 'minhas'
              ? 'bg-pearl-bg text-pearl-ink shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Minhas Metas ({metas.length})
        </button>
        <button
          type="button"
          data-testid="goals-presets-tab"
          onClick={() => setActiveTab('sugeridas')}
          className={`py-2 rounded-xl transition-colors flex items-center justify-center space-x-1.5 ${
            activeTab === 'sugeridas'
              ? 'bg-pearl-bg text-pearl-ink shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles size={13} className="text-brand-500" />
          <span>Metas Sugeridas</span>
        </button>
      </div>

      {/* ABA 1: MINHAS METAS */}
      {activeTab === 'minhas' && (
        <>
          {metas.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 rounded-3xl border border-dashed border-slate-800 p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-brand-950/60 flex items-center justify-center mx-auto text-brand-400">
                <Target size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-200">
                Nenhuma meta cadastrada ainda
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Crie uma meta própria ou escolha um modelo pronto na aba de metas sugeridas.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={handleOpenEmptyModal}
                  className="px-4 py-2 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs"
                >
                  + Criar Meta
                </button>
                <button
                  onClick={() => setActiveTab('sugeridas')}
                  className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-brand-300 font-semibold text-xs border border-slate-700"
                >
                  Ver Sugestões
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {metas.map(meta => {
                const progress =
                  meta.valor_alvo > 0
                    ? Math.min(100, Math.round((meta.valor_atual / meta.valor_alvo) * 100))
                    : 0;

                const calc = calculateGoalMonthlyContribution(
                  meta.valor_alvo,
                  meta.valor_atual,
                  meta.data_alvo,
                  new Date(),
                  meta.taxa_rendimento_anual || 0
                );

                const isDone = calc.isCompleted;

                return (
                  <div
                    key={meta.id}
                    className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0"
                          style={{ backgroundColor: meta.cor || '#10B981' }}
                        >
                          <Target size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">{meta.nome}</h4>
                          <span className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Calendar size={12} />
                            <span>
                              Alvo até {formatDateBr(meta.data_alvo)} ({calc.monthsRemaining} meses)
                            </span>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteGoal(meta.id)}
                        aria-label={`Excluir meta ${meta.nome}`}
                        className="p-1.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-2xl">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Acumulado</span>
                        <div className="text-base font-extrabold text-slate-100 tabular-nums">
                          {formatCurrency(meta.valor_atual)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Alvo: {formatCurrency(meta.valor_alvo)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 block">
                          {progress}% concluído
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Faltam {formatCurrency(calc.remainingValue)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-emerald-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      {isDone ? (
                        <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                          <CheckCircle2 size={16} />
                          <span>Meta alcançada com sucesso!</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-slate-400">Sugerido: </span>
                          <strong className="text-slate-200 tabular-nums">
                            {formatCurrency(calc.suggestedMonthly)}/mês
                          </strong>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setSelectedGoalForAporte(meta);
                          setAporteAmountStr('');
                          setAporteNote('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 font-semibold text-xs flex items-center space-x-1 transition-colors"
                      >
                        <Coins size={13} />
                        <span>Adicionar Aporte</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ABA 2: METAS SUGERIDAS (PRÉ-FEITAS PARA INICIANTES) */}
      {activeTab === 'sugeridas' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              Sem ideia de por onde começar? Escolha uma meta comum abaixo e ajuste valor ou prazo se quiser.
            </p>
            <InfoTipButton
              title="Metas comuns ao iniciar"
              description="Esses modelos seguem as principais prioridades recomendadas em planejamento financeiro pessoal: primeiro proteção contra imprevistos e dívidas, depois conquistas planejadas."
            />
          </div>

          {PRESET_GOALS.map(preset => {
            const Icon = preset.icon;
            const monthlyEst = Math.round((preset.valor_alvo / preset.mesesPrazo) * 100) / 100;

            return (
              <div
                key={preset.id}
                className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: preset.cor }}
                    >
                      <Icon size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1">
                        <h4 className="text-sm font-bold text-white truncate">{preset.nome}</h4>
                        <InfoTipButton
                          title={preset.infoTitulo}
                          description={preset.infoDescricao}
                          details={preset.infoDicas}
                          ariaLabel={`Informação sobre ${preset.nome}`}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug">{preset.resumo}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <div className="tabular-nums">
                    <span className="font-bold text-slate-100">
                      {formatCurrency(preset.valor_alvo)}
                    </span>
                    <span className="text-slate-400">
                      {' '}
                      • {preset.mesesPrazo} meses (~{formatCurrency(monthlyEst)}/mês)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUsePreset(preset)}
                    className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs whitespace-nowrap transition-colors"
                  >
                    Escolher Meta
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL NOVA META */}
      {showNewGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
          <div className="w-full max-w-sm bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">Criar Nova Meta</h3>
              <button
                onClick={() => setShowNewGoalModal(false)}
                aria-label="Fechar modal meta"
                className="p-1 rounded-full text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3 pt-3">
              {formError && (
                <p className="text-xs text-red-300 bg-red-950/60 border border-red-800 rounded-xl p-2">
                  {formError}
                </p>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nome do objetivo
                </label>
                <input
                  type="text"
                  value={goalName}
                  onChange={e => setGoalName(e.target.value)}
                  placeholder="Ex: Viagem, Reserva, Quitar Dívidas"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Valor Alvo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={goalTargetStr}
                    onChange={e => setGoalTargetStr(e.target.value)}
                    placeholder="5000"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Já guardado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={goalCurrentStr}
                    onChange={e => setGoalCurrentStr(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 font-medium tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Data Limite Desejada
                </label>
                <input
                  type="date"
                  value={goalDate}
                  onChange={e => setGoalDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Rendimento Estimado (% ao ano)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={annualRateStr}
                  onChange={e => setAnnualRateStr(e.target.value)}
                  placeholder="Ex: 10 (CDI/Poupança)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Calcula a contribuição sugerida considerando juros compostos.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR APORTE */}
      {selectedGoalForAporte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
          <div className="w-full max-w-sm bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">
                Aporte para: {selectedGoalForAporte.nome}
              </h3>
              <button
                onClick={() => setSelectedGoalForAporte(null)}
                aria-label="Fechar modal aporte"
                className="p-1 rounded-full text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmAporte} className="space-y-3 pt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Valor do Aporte (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={aporteAmountStr}
                  onChange={e => setAporteAmountStr(e.target.value)}
                  placeholder="500,00"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 font-extrabold tabular-nums"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nota / Origem (Opcional)
                </label>
                <input
                  type="text"
                  value={aporteNote}
                  onChange={e => setAporteNote(e.target.value)}
                  placeholder="Ex: Sobra do salário, 13º, economia"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <p className="text-[11px] text-emerald-300/90 bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-2.5 leading-relaxed">
                Ao confirmar, este valor entra na sua meta e também é registrado automaticamente na categoria <strong>Reserva e Metas</strong> do orçamento e no extrato.
              </p>

              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors"
                >
                  Confirmar Aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
