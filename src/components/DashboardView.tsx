import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Info,
  Flame,
  Wallet,
  Clock,
  Bell,
  X,
  TrendingUp
} from 'lucide-react';
import {
  Lancamento,
  Orcamento,
  Categoria,
  Conta,
  Meta,
  BudgetConfig
} from '../types';
import {
  calculateMonthRealized,
  calculateMonthProjected,
  calculateMonthBudgetSpent,
  calculateMonthWalletWithCarryover,
  calculateSavingsRate,
  calculateBudgetUsage,
  generateSmartInsights,
  addMonthsSafe,
  calculateDaysToDue,
  resolveMonthBudgets,
  getMonthBudgetBaseIncome,
  computeMonthDailySpendOverview,
  inferBudgetGroup,
  isRealized
} from '../utils/calculations';
import { formatCurrency, formatShortDateBr } from '../utils/i18n';
import { CategoryIcon } from './CategoryIcon';
import { InfoTipButton } from './InfoTipButton';

interface DashboardViewProps {
  currentYM: string;
  transactions: Lancamento[];
  budgets: Orcamento[];
  budgetConfig?: BudgetConfig;
  categories: Categoria[];
  accounts: Conta[];
  metas: Meta[];
  userName: string;
  onOpenNewTransaction: (type?: 'receita' | 'despesa') => void;
  onOpenGoals: () => void;
  onOpenBudgets: () => void;
  onOpenTransactions: () => void;
  onSelectTransaction: (tx: Lancamento) => void;
  onMarkAsPaid: (txId: string) => void;
}

export function DashboardView({
  currentYM,
  transactions,
  budgets,
  budgetConfig,
  categories,
  metas,
  onOpenNewTransaction,
  onOpenGoals,
  onOpenBudgets,
  onOpenTransactions,
  onSelectTransaction,
  onMarkAsPaid
}: DashboardViewProps) {
  const [showBalanceModal, setShowBalanceModal] = useState<boolean>(false);
  const [dismissedInsightIds, setDismissedInsightIds] = useState<string[]>([]);

  // Cálculos do mês (Realizado vs Carteira Dinâmica acumulada com sobra anterior) memoizados
  const realized = useMemo(() => calculateMonthRealized(transactions, currentYM), [transactions, currentYM]);
  const projected = useMemo(() => calculateMonthProjected(transactions, currentYM), [transactions, currentYM]);
  const wallet = useMemo(
    () => calculateMonthWalletWithCarryover(transactions, currentYM),
    [transactions, currentYM]
  );
  const pendingIncome = Math.max(0, Math.round((projected.income - realized.income) * 100) / 100);
  const pendingExpense = Math.max(0, Math.round((projected.expense - realized.expense) * 100) / 100);
  const availableBaseFunds = projected.income + Math.max(0, wallet.carryoverProjected);
  const dynamicSavingsRate = calculateSavingsRate(availableBaseFunds, wallet.walletTotalProjected);

  // Orçamento total resolvido dinamicamente (mensal recorrente ou % pela renda / fallback R$ 2.400)
  const resolvedBudgets = useMemo(
    () => resolveMonthBudgets(categories, currentYM, budgets, transactions, budgetConfig),
    [categories, currentYM, budgets, transactions, budgetConfig]
  );
  const totalBudgetTarget = useMemo(
    () => resolvedBudgets.reduce((acc, b) => acc + b.target, 0),
    [resolvedBudgets]
  );
  const budgetSpentInfo = useMemo(
    () => calculateMonthBudgetSpent(transactions, categories, currentYM),
    [transactions, categories, currentYM]
  );
  const budgetUsage = useMemo(
    () => calculateBudgetUsage(budgetSpentInfo.totalSpent, totalBudgetTarget),
    [budgetSpentInfo.totalSpent, totalBudgetTarget]
  );
  const baseIncomeInfo = useMemo(
    () => getMonthBudgetBaseIncome(transactions, currentYM, budgetConfig?.renda_padrao_fallback),
    [transactions, currentYM, budgetConfig?.renda_padrao_fallback]
  );

  // Sobra por dia útil & dia corrido: considera contas pagas + a pagar e preserva Reserva e Metas
  const dailyOverview = useMemo(
    () => computeMonthDailySpendOverview(categories, transactions, budgets, currentYM, budgetConfig, new Date()),
    [categories, transactions, budgets, currentYM, budgetConfig]
  );
  const dailySpend = dailyOverview.dailySpend;

  // Meta ativa em destaque
  const activeGoal = metas.find(m => m.status === 'ativa');
  const goalProgress =
    activeGoal && activeGoal.valor_alvo > 0
      ? Math.min(100, Math.round((activeGoal.valor_atual / activeGoal.valor_alvo) * 100))
      : 0;

  // Próximos vencimentos pendentes do mês atual ou atrasados (ordenados por data)
  const upcomingBills = useMemo(
    () =>
      transactions
        .filter(t => t.tipo === 'despesa' && !isRealized(t.status))
        .sort((a, b) => a.data.localeCompare(b.data))
        .slice(0, 4),
    [transactions]
  );

  // Inteligência do Momento (alertas e notificações contextuais)
  const allInsights = useMemo(
    () => generateSmartInsights(transactions, budgets, categories, metas, new Date(), currentYM, budgetConfig),
    [transactions, budgets, categories, metas, currentYM, budgetConfig]
  );
  const smartInsights = useMemo(
    () => allInsights.filter(i => !dismissedInsightIds.includes(i.id)),
    [allInsights, dismissedInsightIds]
  );

  // Mini gráfico de evolução dos últimos 6 meses
  const last6MonthsData = useMemo(() => {
    const monthShorts = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const items = [];
    for (let i = 5; i >= 0; i--) {
      const ym = addMonthsSafe(`${currentYM}-01`, -i).slice(0, 7);
      const sum = calculateMonthRealized(transactions, ym);
      const [, m] = ym.split('-');
      items.push({
        ym,
        label: monthShorts[parseInt(m, 10) - 1],
        income: sum.income,
        expense: sum.expense,
        balance: sum.balance
      });
    }
    return items;
  }, [transactions, currentYM]);
  const maxBarValue = Math.max(1, ...last6MonthsData.map(d => Math.max(d.income, d.expense)));

  const budgetHealthText =
    budgetUsage.level === 'ok'
      ? `Tranquilo (${budgetUsage.percentage}%)`
      : budgetUsage.level === 'atencao'
      ? `Atenção (${budgetUsage.percentage}%)`
      : `Estourou (${budgetUsage.percentage}%)`;

  return (
    <div className="space-y-4 pb-28">
      {/* 1. CARD PRINCIPAL: CARTEIRA DINÂMICA (A RECEBER - A PAGAR SEM PRECISAR MARCAR PAGO) */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 border border-pearl-border shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-brand-500/10 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              Carteira do Mês
            </span>
            <button
              onClick={() => setShowBalanceModal(true)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-full hover:bg-white/5 transition-colors"
              aria-label="Como o saldo é calculado"
              title="Como o saldo dinâmico é calculado"
            >
              <Info size={13} />
            </button>
          </div>

          <div className="w-9 h-9 rounded-2xl bg-pearl-soft border border-pearl-border flex items-center justify-center text-pearl-text">
            <Wallet size={18} />
          </div>
        </div>

        {/* Valor principal dinâmico: Sobra de meses anteriores + A receber - A pagar */}
        <div className="flex items-baseline flex-wrap gap-2 mt-1">
          <span
            data-testid="wallet-dynamic-balance"
            className={`text-3xl font-extrabold tracking-tight tabular-nums ${
              wallet.walletTotalProjected >= 0 ? 'text-white' : 'text-red-400'
            }`}
          >
            {formatCurrency(wallet.walletTotalProjected, true)}
          </span>
          {dynamicSavingsRate !== '—' && (
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                wallet.walletTotalProjected >= 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {dynamicSavingsRate} livre
            </span>
          )}
        </div>

        {/* Sobra (ou déficit) acumulada dos meses anteriores */}
        {wallet.carryoverProjected !== 0 && (
          <div
            data-testid="wallet-carryover-row"
            className="mt-3 px-3 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs tabular-nums"
          >
            <span className="text-slate-300">
              {wallet.carryoverProjected > 0 ? 'Sobra de meses anteriores:' : 'Déficit de meses anteriores:'}
            </span>
            <span
              className={`font-bold ${
                wallet.carryoverProjected > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(wallet.carryoverProjected, true)}
            </span>
          </div>
        )}

        {/* Resumo direto de Entradas Totais x Saídas Totais do mês (recebido + a receber / pago + a pagar) */}
        <div className="grid grid-cols-2 gap-3 mt-3 text-xs tabular-nums">
          <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">A receber + recebido (mês)</span>
            <span className="text-sm font-bold text-emerald-400 block mt-0.5">
              +{formatCurrency(projected.income)}
            </span>
            {pendingIncome > 0 && (
              <span className="text-[10px] text-emerald-300/75 block">
                {formatCurrency(pendingIncome)} pendente
              </span>
            )}
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">A pagar + pago (mês)</span>
            <span className="text-sm font-bold text-red-400 block mt-0.5">
              -{formatCurrency(projected.expense)}
            </span>
            {pendingExpense > 0 && (
              <span className="text-[10px] text-red-300/75 block">
                {formatCurrency(pendingExpense)} a pagar
              </span>
            )}
          </div>
        </div>

        {/* Rodapé do Card: Saldo já liquidado (acumulado) */}
        <div className="flex items-center justify-between text-xs text-slate-300 mt-4 pt-3 border-t border-pearl-border">
          <span className="text-slate-400">Já realizado (pago/recebido):</span>
          <span
            data-testid="wallet-realized-balance"
            className="font-bold text-white tabular-nums"
          >
            {formatCurrency(wallet.walletTotalRealized, true)}
          </span>
        </div>
      </div>

      {/* AÇÕES RÁPIDAS */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => onOpenNewTransaction('despesa')}
          className="py-3 px-3 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-semibold flex items-center justify-center space-x-1.5 shadow-md shadow-brand-500/25 text-xs transition-all"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Despesa</span>
        </button>

        <button
          onClick={() => onOpenNewTransaction('receita')}
          className="py-3 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-semibold flex items-center justify-center space-x-1.5 border border-pearl-border text-xs transition-all"
        >
          <ArrowDownLeft size={16} />
          <span>Receita</span>
        </button>

        <button
          onClick={() => onOpenNewTransaction('despesa')}
          className="py-3 px-3 rounded-2xl bg-pearl-bg hover:opacity-95 text-pearl-ink font-bold flex items-center justify-center space-x-1.5 border border-pearl-border text-xs shadow-xs transition-all"
          title="Novo lançamento com comprovante"
        >
          <Camera size={16} />
          <span>Comprovante</span>
        </button>
      </div>

      {/* 2. CARD DE ORÇAMENTO PLANEJADO (LARGURA TOTAL, LEGÍVEL) */}
      <div
        onClick={onOpenBudgets}
        className="bg-slate-900 p-5 rounded-3xl border border-pearl-border shadow-md cursor-pointer hover:border-brand-500/40 transition-all space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
              Orçamento Planejado
            </span>
            <InfoTipButton
              title="Orçamento Planejado"
              description="Mostra quanto do seu teto mensal já está comprometido no mês selecionado, somando contas pagas e contas pendentes (a pagar)."
              details={[
                'Incluir as contas não pagas ajuda a enxergar desde já quanto ainda cabe no seu planejamento sem surpresas.',
                'No modo dinâmico (50/30/20 ou outro perfil), os tetos são recalculados automaticamente com base nas receitas do mês (ou R$ 2.400,00 padrão se ainda não houver entradas).',
                'Verde (até 70%): ritmo tranquilo. Amarelo (71% a 100%): atenção. Vermelho (acima de 100%): teto ultrapassado.'
              ]}
            />
          </div>
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              budgetUsage.level === 'ok'
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/40'
                : budgetUsage.level === 'atencao'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-700/40'
                : 'bg-red-950/80 text-red-400 border border-red-700/40'
            }`}
          >
            {budgetUsage.percentage}% usado
          </span>
        </div>

        <div>
          <div className="text-2xl font-extrabold text-white tabular-nums">
            {formatCurrency(budgetSpentInfo.totalSpent)}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalBudgetTarget > 0
              ? `de ${formatCurrency(totalBudgetTarget)} planejados`
              : 'Defina tetos de orçamento no Assistente'}
            {budgetSpentInfo.pendingSpent > 0 && (
              <span className="text-amber-300/90 tabular-nums">
                {' '}• inclui {formatCurrency(budgetSpentInfo.pendingSpent)} a pagar
              </span>
            )}
            {budgetConfig?.modo === 'percentual' && totalBudgetTarget > 0 && (
              <span className="text-slate-500">
                {' '}
                • base {baseIncomeInfo.isFallback ? 'padrão R$ 2.400' : formatCurrency(baseIncomeInfo.baseIncome)}
              </span>
            )}
          </p>
        </div>

        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              budgetUsage.level === 'ok'
                ? 'bg-emerald-500'
                : budgetUsage.level === 'atencao'
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, budgetUsage.percentage)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-slate-400 font-medium">{budgetHealthText}</span>
          <span className="text-pearl-text font-bold flex items-center space-x-1">
            <span>Ver limites</span>
            <ChevronRight size={14} />
          </span>
        </div>
      </div>

      {/* 3. CARD SOBRA POR DIA ÚTIL (LARGURA TOTAL, REVISADO) */}
      <div className="bg-slate-900 p-5 rounded-3xl border border-pearl-border shadow-md space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
              Sobra por Dia Útil
            </span>
            <InfoTipButton
              title="Como calculamos a Sobra por Dia"
              description="Para não misturar dinheiro de Reserva e Metas nem contar com valores já comprometidos em dívidas, o cálculo segue 4 passos:"
              details={[
                dailyOverview.reservedBudgetTarget > 0
                  ? `1. Proteção de Reserva e Metas: do orçamento total de ${formatCurrency(totalBudgetTarget)} (${baseIncomeInfo.isFallback ? 'base padrão' : 'receitas do mês'}), separamos ${formatCurrency(dailyOverview.reservedBudgetTarget)} para guardar. O teto para gastos fica em ${formatCurrency(dailyOverview.spendingBudgetTarget)}.`
                  : `1. Teto de gastos do mês: ${formatCurrency(dailyOverview.spendingBudgetTarget)} definidos para suas categorias de despesa.`,
                `2. Contas e dívidas descontadas: subtraímos ${formatCurrency(dailyOverview.committedSpendingExpense)} (somando despesas já pagas e as que ainda estão a pagar no mês).`,
                `3. Sobra livre para gastar: ${formatCurrency(dailyOverview.spendingBudgetTarget)} − ${formatCurrency(dailyOverview.committedSpendingExpense)} = ${formatCurrency(dailySpend.remainingAmount)}.`,
                dailySpend.monthStatus !== 'past' && dailySpend.remainingCalendarDays > 0
                  ? `4. Divisão pelos dias restantes: ${formatCurrency(dailySpend.remainingAmount)} ÷ ${dailySpend.remainingBusinessDays} dias úteis (seg–sex) = ${formatCurrency(dailySpend.dailyBusinessAllowance || 0)}/dia útil, ou ÷ ${dailySpend.remainingCalendarDays} dias corridos = ${formatCurrency(dailySpend.dailyCalendarAllowance || 0)}/dia corrido.`
                  : '4. Média diária: dividimos o que sobra pelos dias úteis (seg–sex) e pelos dias corridos restantes do mês.'
              ]}
            />
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
            <Clock size={16} />
          </div>
        </div>

        {!dailySpend.hasBudget ? (
          <div>
            <div className="text-lg font-bold text-slate-200">Defina seu orçamento</div>
            <p className="text-xs text-slate-400 mt-1">
              Use o Assistente de Orçamento na aba Orçamento para calcular sua sobra diária.
            </p>
          </div>
        ) : dailySpend.isOverBudget ? (
          <div>
            <div className="text-lg font-bold text-red-400 flex items-center space-x-1.5">
              <AlertCircle size={18} />
              <span>Orçamento estourado</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Excedeu em {formatCurrency(Math.abs(dailySpend.remainingAmount))} o valor de teto de{' '}
              {formatCurrency(dailyOverview.spendingBudgetTarget)} para gastos.
            </p>
          </div>
        ) : dailySpend.monthStatus === 'past' ? (
          <div>
            <div className="text-2xl font-extrabold text-emerald-400 tabular-nums">
              {formatCurrency(dailySpend.remainingAmount)}
              <span className="text-xs text-slate-400 font-normal ml-1.5">de folga final</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{dailySpend.message}</p>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span
                data-testid="daily-business-allowance"
                className="text-2xl font-extrabold text-white tabular-nums"
              >
                {formatCurrency(dailySpend.dailyBusinessAllowance || 0)}
              </span>
              <span className="text-xs text-slate-400 font-medium">/dia útil</span>
            </div>

            {dailySpend.dailyCalendarAllowance !== null && (
              <p
                data-testid="daily-calendar-allowance"
                className="text-xs text-slate-400 mt-1 tabular-nums"
              >
                ou {formatCurrency(dailySpend.dailyCalendarAllowance)} por dia corrido (
                {dailySpend.remainingBusinessDays} úteis / {dailySpend.remainingCalendarDays} corridos)
              </p>
            )}

            <p className="text-[11px] text-slate-400 pt-2 leading-relaxed tabular-nums">
              Restam <strong className="text-slate-200">{formatCurrency(dailySpend.remainingAmount)}</strong> para gastar no mês, respeitando o valor de teto de{' '}
              <strong className="text-slate-200">{formatCurrency(dailyOverview.spendingBudgetTarget)}</strong>
              {dailyOverview.committedSpendingExpense > 0 && (
                <> (já descontando {formatCurrency(dailyOverview.committedSpendingExpense)} em contas/dívidas)</>
              )}
              {dailyOverview.reservedBudgetTarget > 0 && (
                <> e preservando {formatCurrency(dailyOverview.reservedBudgetTarget)} de Reserva e Metas</>
              )}.
            </p>
          </div>
        )}
      </div>

      {/* 4. CARD META PRINCIPAL (COM ANEL CIRCULAR À DIREITA) */}
      <div
        onClick={onOpenGoals}
        className="bg-slate-900 p-5 rounded-3xl border border-slate-800/90 shadow-md cursor-pointer hover:border-brand-500/40 transition-all"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Meta Principal
              </span>
              <InfoTipButton
                title="Meta Principal"
                description="Destaca sua primeira meta financeira ativa e o percentual já conquistado."
                details={[
                  'Toque no card para fazer aportes, criar novas metas ou explorar a aba de Metas Sugeridas.'
                ]}
              />
            </div>
            <h4 className="text-base font-bold text-white truncate mt-1">
              {activeGoal ? activeGoal.nome : 'Criar sua primeira meta'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 tabular-nums">
              {activeGoal
                ? `${formatCurrency(activeGoal.valor_atual)} de ${formatCurrency(activeGoal.valor_alvo)}`
                : 'Toque para acompanhar reserva, viagem ou objetivos'}
            </p>
          </div>

          <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.2"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500 transition-all duration-500"
                strokeDasharray={`${goalProgress}, 100`}
                strokeWidth="3.2"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-bold text-slate-100 tabular-nums">
              {goalProgress}%
            </span>
          </div>
        </div>
      </div>

      {/* 5. INTELIGÊNCIA DO MOMENTO (NOTIFICAÇÕES E RADAR INTELIGENTE) */}
      {smartInsights.length > 0 && (
        <section className="space-y-2.5" aria-label="Inteligência do Momento">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <Sparkles size={14} className="text-brand-400" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Inteligência do Momento
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {smartInsights.length} {smartInsights.length === 1 ? 'aviso' : 'avisos'}
            </span>
          </div>

          <div className="space-y-2.5">
            {smartInsights.map(insight => {
              const handleInsightAction = () => {
                if (insight.acaoDestino === 'budgets') onOpenBudgets();
                else if (insight.acaoDestino === 'goals') onOpenGoals();
                else if (insight.acaoDestino === 'transactions') onOpenTransactions();
              };

              return (
                <div
                  key={insight.id}
                  className={`p-4 rounded-3xl border transition-all relative ${
                    insight.tipo === 'alerta'
                      ? 'bg-amber-950/35 border-amber-800/50 text-amber-100'
                      : insight.tipo === 'sucesso'
                      ? 'bg-emerald-950/35 border-emerald-800/50 text-emerald-100'
                      : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                >
                  <button
                    onClick={() => setDismissedInsightIds(prev => [...prev, insight.id])}
                    className="absolute top-3.5 right-3.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Dispensar aviso"
                  >
                    <X size={13} />
                  </button>

                  <div className="flex items-start space-x-3 pr-5">
                    <div
                      className={`p-2 rounded-2xl flex-shrink-0 mt-0.5 ${
                        insight.tipo === 'alerta'
                          ? 'bg-amber-500/20 text-amber-400'
                          : insight.tipo === 'sucesso'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-brand-500/20 text-brand-400'
                      }`}
                    >
                      {insight.tipo === 'alerta' ? (
                        <Bell size={16} />
                      ) : insight.tipo === 'sucesso' ? (
                        <Flame size={16} />
                      ) : (
                        <TrendingUp size={16} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block">
                        {insight.tag}
                      </span>
                      <h5 className="text-xs font-bold mt-0.5">{insight.titulo}</h5>
                      <p className="text-xs opacity-85 leading-relaxed mt-1">
                        {insight.mensagem}
                      </p>

                      {insight.acaoTexto && insight.acaoDestino && (
                        <button
                          onClick={handleInsightAction}
                          className="mt-2 inline-flex items-center space-x-1 text-[11px] font-bold text-brand-400 hover:underline"
                        >
                          <span>{insight.acaoTexto}</span>
                          <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. PRÓXIMOS VENCIMENTOS (Lista com botão 1-tap "Pagar") */}
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800/90 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Próximos Vencimentos
            </span>
            {upcomingBills.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 text-[10px] font-bold border border-amber-700/40">
                {upcomingBills.length}
              </span>
            )}
          </div>
        </div>

        {upcomingBills.length === 0 ? (
          <div className="text-center py-5 text-slate-400">
            <CheckCircle2 size={30} className="mx-auto text-emerald-500/60 mb-2" />
            <p className="text-xs">Tudo em dia! Nenhuma conta pendente próxima.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingBills.map(bill => {
              const cat = categories.find(c => c.id === bill.categoria_id);
              const daysToDue = calculateDaysToDue(bill.data);
              const billGroup = cat ? inferBudgetGroup(cat) : 'essenciais';
              const billTypeBadge =
                billGroup === 'lazer'
                  ? { label: 'Lazer', cls: 'bg-purple-950/80 text-purple-300 border border-purple-700/40' }
                  : billGroup === 'reserva'
                  ? { label: 'Reserva', cls: 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/40' }
                  : { label: 'Despesa', cls: 'bg-rose-950/80 text-rose-300 border border-rose-700/40' };

              let dueBadge = `${daysToDue} dias`;
              let dueBadgeColor = 'text-slate-300 bg-slate-800';

              if (daysToDue === 0) {
                dueBadge = 'Vence hoje!';
                dueBadgeColor = 'bg-amber-950 text-amber-300 border border-amber-700/50';
              } else if (daysToDue < 0) {
                dueBadge = `Atrasado ${Math.abs(daysToDue)}d`;
                dueBadgeColor = 'bg-red-950 text-red-300 border border-red-700/50';
              } else if (daysToDue <= 3) {
                dueBadge = `Vence em ${daysToDue}d`;
                dueBadgeColor = 'bg-amber-950 text-amber-300 border border-amber-700/50';
              }

              return (
                <div
                  key={bill.id}
                  data-testid="upcoming-bill-item"
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition-all"
                >
                  <div
                    onClick={() => onSelectTransaction(bill)}
                    className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0 mr-2"
                  >
                    <CategoryIcon
                      name={cat?.icone || 'HelpCircle'}
                      color={cat?.cor || '#64748B'}
                      size={17}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {bill.descricao}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${dueBadgeColor}`}>
                          {dueBadge}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5">
                        <span>{formatShortDateBr(bill.data)}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-200 tabular-nums">
                          {formatCurrency(bill.valor)}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${billTypeBadge.cls}`}
                        >
                          {billTypeBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onMarkAsPaid(bill.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center space-x-1 shadow-xs transition-colors"
                    title="Marcar como pago"
                  >
                    <CheckCircle2 size={13} />
                    <span>Pagar</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. HISTÓRICO DOS ÚLTIMOS 6 MESES */}
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800/90 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Últimos 6 Meses
          </span>
          <div className="flex items-center space-x-3 text-[10px] text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Receitas</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              <span>Despesas</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2 h-28 items-end pt-2 pb-1 border-b border-slate-800">
          {last6MonthsData.map(item => {
            const incH = Math.max(6, (item.income / maxBarValue) * 85);
            const expH = Math.max(6, (item.expense / maxBarValue) * 85);
            const isCurrent = item.ym === currentYM;

            return (
              <div key={item.ym} className="flex flex-col items-center h-full justify-end">
                <div className="flex items-end space-x-1 w-full justify-center h-20">
                  <div
                    className={`w-2.5 rounded-t-sm transition-all duration-300 ${
                      isCurrent ? 'bg-emerald-500' : 'bg-emerald-400/70'
                    }`}
                    style={{ height: `${incH}px` }}
                    title={`Receita ${item.label}: ${formatCurrency(item.income)}`}
                  />
                  <div
                    className={`w-2.5 rounded-t-sm transition-all duration-300 ${
                      isCurrent ? 'bg-red-500' : 'bg-red-400/70'
                    }`}
                    style={{ height: `${expH}px` }}
                    title={`Despesa ${item.label}: ${formatCurrency(item.expense)}`}
                  />
                </div>
                <span
                  className={`text-[10px] mt-1.5 font-medium ${
                    isCurrent ? 'text-brand-400 font-bold' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE DETALHES DO CÁLCULO DA CARTEIRA */}
      {showBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
          <div className="w-full max-w-sm bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 mb-3">
              Como a Carteira Dinâmica funciona
            </h3>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <span className="font-bold text-white block mb-1">
                  1. Carteira do Mês ({formatCurrency(wallet.walletTotalProjected, true)})
                </span>
                <span>
                  Soma o saldo que sobrou dos meses anteriores ({formatCurrency(wallet.carryoverProjected, true)}) com tudo o que você tem a <strong>receber</strong> ({formatCurrency(projected.income)}) menos tudo o que tem a <strong>pagar</strong> ({formatCurrency(projected.expense)}) neste mês. Assim, o dinheiro economizado continua na sua carteira ao virar o mês.
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                <span className="font-bold text-white block mb-1">
                  2. Já Realizado ({formatCurrency(wallet.walletTotalRealized, true)})
                </span>
                <span>
                  Considera apenas o que já teve baixa efetiva: {formatCurrency(wallet.carryoverRealized, true)} de saldo anterior realizado mais {formatCurrency(realized.income)} recebidos menos {formatCurrency(realized.expense)} pagos neste mês.
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowBalanceModal(false)}
              className="w-full mt-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
