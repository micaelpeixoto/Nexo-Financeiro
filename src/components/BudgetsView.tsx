import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Save,
  Sliders,
  Wand2,
  X,
  TrendingUp,
  ShieldCheck,
  Target,
  Lock,
  Percent
} from 'lucide-react';
import {
  Orcamento,
  Categoria,
  Lancamento,
  BudgetConfig,
  BudgetControlProfileId
} from '../types';
import {
  calculateBudgetUsage,
  isRealized,
  resolveMonthBudgets,
  getMonthBudgetBaseIncome,
  computeDynamicCategoryPercentages,
  BUDGET_ASSISTANT_PROFILES,
  DEFAULT_FALLBACK_INCOME
} from '../utils/calculations';
import { STANDARD_503020_EXPENSE_CATEGORIES } from '../utils/storage';
import { formatCurrency, formatMonthYear } from '../utils/i18n';
import { CategoryIcon } from './CategoryIcon';
import { InfoTipButton } from './InfoTipButton';

interface BudgetsViewProps {
  currentYM: string;
  budgets: Orcamento[];
  budgetConfig?: BudgetConfig;
  categories: Categoria[];
  transactions: Lancamento[];
  onSaveFixedBudget: (categoriaId: string, referenceYM: string, targetValue: number) => void;
  onSaveCategoryPercentage: (categoriaId: string, pct: number) => void;
  onClearCategoryFixedOverride: (categoriaId: string) => void;
  onApplyBudgetAssistant: (
    profileId: Exclude<BudgetControlProfileId, 'personalizado'>,
    fallbackIncome: number,
    referenceYM: string,
    simplifyToThreeCategories?: boolean
  ) => void;
  onToggleBudgetMode: (modo: 'percentual' | 'fixo', referenceYM: string) => void;
}

export function BudgetsView({
  currentYM,
  budgets,
  budgetConfig,
  categories,
  transactions,
  onSaveFixedBudget,
  onSaveCategoryPercentage,
  onClearCategoryFixedOverride,
  onApplyBudgetAssistant,
  onToggleBudgetMode
}: BudgetsViewProps) {
  const [periodType, setPeriodType] = useState<'mensal' | 'anual'>('mensal');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'percentual' | 'fixo'>('fixo');
  const [editValue, setEditValue] = useState<string>('');
  const [showSavedToast, setShowSavedToast] = useState<string | null>(null);
  const [showAssistantModal, setShowAssistantModal] = useState<boolean>(false);

  // Estado do Assistente de Orçamento
  const [selectedProfile, setSelectedProfile] = useState<Exclude<BudgetControlProfileId, 'personalizado'>>(
    budgetConfig?.perfil_ativo && budgetConfig.perfil_ativo !== 'personalizado'
      ? budgetConfig.perfil_ativo
      : 'equilibrado_50_30_20'
  );
  const [assistantFallback, setAssistantFallback] = useState<string>(
    String(budgetConfig?.renda_padrao_fallback || DEFAULT_FALLBACK_INCOME)
  );
  const [simplifyCategories, setSimplifyCategories] = useState<boolean>(false);

  const expenseCategories = categories.filter(c => c.tipo === 'despesa' && c.incluir_no_orcamento);
  const hasMoreThanThreeExpenseCats = expenseCategories.length > 3;
  const currentYear = currentYM.slice(0, 4);
  const isDynamicPercentageMode = budgetConfig?.modo === 'percentual';

  const baseIncomeInfo = getMonthBudgetBaseIncome(
    transactions,
    currentYM,
    budgetConfig?.renda_padrao_fallback || DEFAULT_FALLBACK_INCOME
  );

  const resolvedList = resolveMonthBudgets(
    categories,
    currentYM,
    budgets,
    transactions,
    budgetConfig
  );
  const resolvedMap = new Map(resolvedList.map(r => [r.categoria_id, r]));

  // Gastos comprometidos no período (inclui contas pagas + pendentes para planejamento fiel)
  const getSpentBreakdown = (catId: string) => {
    let paid = 0;
    let pending = 0;
    for (const t of transactions) {
      if (t.tipo !== 'despesa' || t.categoria_id !== catId) continue;
      const inPeriod =
        periodType === 'mensal' ? t.data.startsWith(currentYM) : t.data.startsWith(currentYear);
      if (!inPeriod) continue;
      if (isRealized(t.status)) {
        paid += t.valor;
      } else {
        pending += t.valor;
      }
    }
    return {
      total: Math.round((paid + pending) * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      pending: Math.round(pending * 100) / 100
    };
  };

  const getSpent = (catId: string) => getSpentBreakdown(catId).total;

  // Meta resolvida (dinâmica ou fixa recorrente)
  const getTarget = (catId: string) => {
    if (periodType === 'mensal') {
      return resolvedMap.get(catId)?.target || 0;
    }
    // No anual, soma a resolução de todos os 12 meses do ano selecionado!
    let yearTotal = 0;
    for (let m = 1; m <= 12; m++) {
      const ym = `${currentYear}-${String(m).padStart(2, '0')}`;
      const mResolved = resolveMonthBudgets(categories, ym, budgets, transactions, budgetConfig);
      const found = mResolved.find(r => r.categoria_id === catId);
      yearTotal += found ? found.target : 0;
    }
    return Math.round(yearTotal * 100) / 100;
  };

  const triggerToast = (msg: string) => {
    setShowSavedToast(msg);
    setTimeout(() => setShowSavedToast(null), 3500);
  };

  const handleStartEdit = (catId: string) => {
    const resolved = resolvedMap.get(catId);
    setEditingCatId(catId);
    if (isDynamicPercentageMode && resolved?.source === 'percentual' && periodType === 'mensal') {
      setEditMode('percentual');
      setEditValue(String(resolved.percentageOfIncome ?? 0));
    } else {
      setEditMode('fixo');
      const currentTarget = getTarget(catId);
      setEditValue(currentTarget > 0 ? String(currentTarget) : '');
    }
  };

  const handleSaveInline = (catId: string) => {
    const val = parseFloat(editValue.replace(',', '.'));
    const safeVal = isNaN(val) || val < 0 ? 0 : Math.round(val * 100) / 100;

    if (editMode === 'percentual' && isDynamicPercentageMode) {
      onSaveCategoryPercentage(catId, Math.min(100, safeVal));
      triggerToast(`Porcentagem (${safeVal}%) salva para todos os meses automaticamente.`);
    } else {
      const monthlyVal = periodType === 'anual' ? Math.round((safeVal / 12) * 100) / 100 : safeVal;
      onSaveFixedBudget(catId, currentYM, monthlyVal);
      triggerToast(`Teto de ${formatCurrency(monthlyVal)} salvo para ${formatMonthYear(currentYM)} e meses seguintes.`);
    }
    setEditingCatId(null);
  };

  const handleConfirmAssistant = () => {
    const parsedFallback = parseFloat(assistantFallback.replace(',', '.'));
    const safeFallback =
      !isNaN(parsedFallback) && parsedFallback > 0 ? parsedFallback : DEFAULT_FALLBACK_INCOME;
    onApplyBudgetAssistant(
      selectedProfile,
      safeFallback,
      currentYM,
      hasMoreThanThreeExpenseCats ? simplifyCategories : false
    );
    setShowAssistantModal(false);
    triggerToast('Orçamento dinâmico aplicado! As porcentagens se adaptam à renda de cada mês.');
  };

  const totalSpent = expenseCategories.reduce((acc, c) => acc + getSpent(c.id), 0);
  const totalPendingSpent = expenseCategories.reduce((acc, c) => acc + getSpentBreakdown(c.id).pending, 0);
  const totalTarget = expenseCategories.reduce((acc, c) => acc + getTarget(c.id), 0);
  const overallUsage = calculateBudgetUsage(totalSpent, totalTarget);

  const activeProfileObj = BUDGET_ASSISTANT_PROFILES.find(
    p => p.id === budgetConfig?.perfil_ativo
  );

  const previewProfile =
    BUDGET_ASSISTANT_PROFILES.find(p => p.id === selectedProfile) || BUDGET_ASSISTANT_PROFILES[0];
  const previewFallbackNum =
    parseFloat(assistantFallback.replace(',', '.')) || DEFAULT_FALLBACK_INCOME;
  const previewBaseIncome =
    baseIncomeInfo.detectedIncome > 0 ? baseIncomeInfo.detectedIncome : previewFallbackNum;
  const previewCategoriesList =
    hasMoreThanThreeExpenseCats && simplifyCategories
      ? STANDARD_503020_EXPENSE_CATEGORIES
      : expenseCategories;
  const previewPercentagesMap = computeDynamicCategoryPercentages(
    previewCategoriesList,
    previewProfile.id
  );

  return (
    <div className="space-y-4 pb-28">
      {/* CABEÇALHO DE CONTROLES: MÊS/ANO + BOTÃO ASSISTENTE */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-1 p-1 rounded-2xl bg-slate-900 border border-pearl-border text-xs font-semibold">
          <button
            onClick={() => setPeriodType('mensal')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              periodType === 'mensal'
                ? 'bg-pearl-bg text-pearl-ink shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mês
          </button>
          <button
            onClick={() => setPeriodType('anual')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              periodType === 'anual'
                ? 'bg-pearl-bg text-pearl-ink shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ano ({currentYear})
          </button>
        </div>

        <button
          onClick={() => setShowAssistantModal(true)}
          data-testid="open-budget-assistant"
          className="flex items-center space-x-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-3.5 py-2 rounded-xl shadow-md shadow-brand-500/25 transition-all"
        >
          <Wand2 size={14} />
          <span>Assistente</span>
        </button>
      </div>

      {/* BANNER DO MODO DINÂMICO ATUAL */}
      <div className="bg-slate-900 p-4 rounded-3xl border border-pearl-border space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-pearl-soft border border-pearl-border text-pearl-text flex items-center justify-center">
              {isDynamicPercentageMode ? <Percent size={16} /> : <Sliders size={16} />}
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <h4 className="text-xs font-bold text-white">
                  {isDynamicPercentageMode
                    ? activeProfileObj
                      ? `Dinâmico: ${activeProfileObj.titulo}`
                      : 'Modo Dinâmico (% da Renda)'
                    : 'Tetos Fixos Recorrentes'}
                </h4>
                <InfoTipButton
                  title="Orçamento Dinâmico vs Fixo"
                  description="No modo Dinâmico (%), os limites escalam automaticamente com base na renda de cada mês."
                  details={[
                    'Se o mês não tiver receitas lançadas, o sistema usa o valor padrão configurado (R$ 2.400,00).',
                    'Ao criar novas categorias em Mais → Categorias, o sistema redistribui o percentual do grupo escolhido (Essenciais, Lazer ou Reserva).',
                    'No modo Fixo, qualquer alteração em um teto fica salva para este mês e todos os seguintes.'
                  ]}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {isDynamicPercentageMode
                  ? baseIncomeInfo.isFallback
                    ? `Sem receita no mês — usando padrão de ${formatCurrency(baseIncomeInfo.baseIncome)}`
                    : `Calculado sobre ${formatCurrency(baseIncomeInfo.baseIncome)} de receita do mês`
                  : 'Alterações valem para este mês e todos os seguintes'}
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              onToggleBudgetMode(isDynamicPercentageMode ? 'fixo' : 'percentual', currentYM)
            }
            className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-pearl-soft text-white border border-pearl-border hover:border-brand-500/50 transition-colors whitespace-nowrap"
          >
            {isDynamicPercentageMode ? 'Usar Fixos' : 'Usar %'}
          </button>
        </div>
      </div>

      {/* TOAST DE CONFIRMAÇÃO */}
      {showSavedToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{showSavedToast}</span>
        </div>
      )}

      {/* CARD CONSUMO GERAL DO TETO */}
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800/90 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Consumo Geral ({periodType === 'mensal' ? formatMonthYear(currentYM) : currentYear})
            </span>
            <InfoTipButton
              title="Consumo Geral do Teto"
              description="Soma despesas já pagas e contas pendentes (a pagar) no período selecionado contra o total dos tetos planejados, dando uma visão real de planejamento."
            />
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              overallUsage.level === 'ok'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/40'
                : overallUsage.level === 'atencao'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-700/40'
                : 'bg-red-950/80 text-red-300 border border-red-700/40'
            }`}
          >
            {overallUsage.badgeLabel}
          </span>
        </div>

        <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
          <span className="text-2xl font-extrabold text-white tabular-nums">
            {formatCurrency(totalSpent)}
          </span>
          <span className="text-xs text-slate-400 tabular-nums">
            de {formatCurrency(totalTarget)} ({overallUsage.percentage}%)
            {totalPendingSpent > 0 && (
              <span className="text-amber-300/90">
                {' '}• inclui {formatCurrency(totalPendingSpent)} a pagar
              </span>
            )}
          </span>
        </div>

        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overallUsage.level === 'ok'
                ? 'bg-emerald-500'
                : overallUsage.level === 'atencao'
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, overallUsage.percentage)}%` }}
          />
        </div>
      </div>

      {/* LISTA DE CATEGORIAS COM METAS DINÂMICAS E EDIÇÃO INLINE */}
      <div className="space-y-3">
        {expenseCategories.map(cat => {
          const spentBreakdown = getSpentBreakdown(cat.id);
          const spent = spentBreakdown.total;
          const target = getTarget(cat.id);
          const resolved = resolvedMap.get(cat.id);
          const usage = calculateBudgetUsage(spent, target);
          const isEditing = editingCatId === cat.id;

          return (
            <div
              key={cat.id}
              className="bg-slate-900 p-4 rounded-3xl border border-slate-800/90 shadow-xs space-y-3 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CategoryIcon name={cat.icone} color={cat.cor} size={18} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-slate-100">{cat.nome}</h4>
                      {resolved?.percentageOfIncome !== null &&
                        resolved?.percentageOfIncome !== undefined &&
                        resolved.percentageOfIncome > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-pearl-soft text-slate-100 border border-pearl-border">
                            {resolved.percentageOfIncome}% da renda
                          </span>
                        )}
                      {isDynamicPercentageMode && resolved?.source === 'fixo_recorrente' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 inline-flex items-center space-x-1">
                          <Lock size={9} />
                          <span>Fixo</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {formatCurrency(spent)} gastos
                      {spentBreakdown.pending > 0 && (
                        <span className="text-amber-300/90">
                          {' '}(inclui {formatCurrency(spentBreakdown.pending)} a pagar)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    usage.level === 'ok'
                      ? 'bg-emerald-950/70 text-emerald-300'
                      : usage.level === 'atencao'
                      ? 'bg-amber-950/70 text-amber-300'
                      : 'bg-red-950/70 text-red-300'
                  }`}
                >
                  {usage.badgeLabel}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    usage.level === 'ok'
                      ? 'bg-emerald-500'
                      : usage.level === 'atencao'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, usage.percentage)}%` }}
                />
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-xs">
                {isEditing ? (
                  <div className="space-y-2.5">
                    {isDynamicPercentageMode && periodType === 'mensal' && (
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditMode('percentual');
                            setEditValue(String(resolved?.percentageOfIncome ?? 10));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                            editMode === 'percentual'
                              ? 'bg-brand-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          % da Renda (Dinâmico)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditMode('fixo');
                            setEditValue(String(target > 0 ? target : ''));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                            editMode === 'fixo'
                              ? 'bg-brand-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Fixar R$ (próximos meses)
                        </button>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-slate-400">
                        {editMode === 'percentual' ? '% da renda:' : 'Teto (R$):'}
                      </span>
                      <input
                        type="number"
                        step="0.5"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        placeholder="0"
                        autoFocus
                        className="w-24 px-2.5 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold outline-none focus:ring-1 focus:ring-brand-500 tabular-nums"
                      />
                      <button
                        onClick={() => handleSaveInline(cat.id)}
                        className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center space-x-1"
                      >
                        <Save size={12} />
                        <span>Salvar</span>
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="text-slate-400 hover:text-slate-200 text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                    {editMode === 'percentual' && (
                      <span className="text-[10px] text-slate-400 block">
                        Equivale a{' '}
                        <strong className="text-brand-400">
                          {formatCurrency(
                            Math.round(
                              baseIncomeInfo.baseIncome *
                                ((parseFloat(editValue.replace(',', '.')) || 0) / 100) *
                                100
                            ) / 100
                          )}
                        </strong>{' '}
                        neste mês e se ajusta automaticamente nos próximos meses.
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Teto: <strong className="text-slate-100">{formatCurrency(target)}</strong> ({usage.percentage}%)
                    </span>
                    <div className="flex items-center space-x-3">
                      {isDynamicPercentageMode && resolved?.source === 'fixo_recorrente' && (
                        <button
                          onClick={() => {
                            onClearCategoryFixedOverride(cat.id);
                            triggerToast(`${cat.nome} voltou a acompanhar a % da renda.`);
                          }}
                          className="text-[11px] text-slate-400 hover:text-brand-400 underline"
                        >
                          Voltar p/ %
                        </button>
                      )}
                      <button
                        onClick={() => handleStartEdit(cat.id)}
                        className="text-brand-400 hover:underline font-semibold text-xs"
                      >
                        Ajustar teto
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DO ASSISTENTE DE ORÇAMENTO (3 OPÇÕES DE OBJETIVO DE CONTROLE) */}
      {showAssistantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Assistente de Orçamento</h3>
                  <p className="text-[11px] text-slate-400">
                    Escolha seu estilo de controle dinâmico
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAssistantModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* 3 Opções de Tipo de Objetivo de Controle */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                1. Escolha seu objetivo de controle
              </label>

              {BUDGET_ASSISTANT_PROFILES.map((profile, idx) => {
                const isSelected = selectedProfile === profile.id;
                const Icon = idx === 0 ? TrendingUp : idx === 1 ? ShieldCheck : Target;

                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedProfile(profile.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-950/40 shadow-md shadow-brand-500/10'
                        : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-2 rounded-xl mt-0.5 flex-shrink-0 ${
                          isSelected ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">{profile.titulo}</span>
                          {isSelected && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-600 text-white">
                              Ativo
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-brand-400 block mt-0.5">
                          {profile.regraLabel}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          {profile.descricao}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Base Automática e Fallback R$ 2.400 */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                2. Renda padrão quando o mês estiver vazio (R$)
              </label>
              <input
                type="number"
                value={assistantFallback}
                onChange={e => setAssistantFallback(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-bold outline-none focus:ring-1 focus:ring-brand-500 tabular-nums"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Cada mês usa automaticamente o total de receitas lançadas nele. Quando um mês ainda não tiver receitas, o app usa{' '}
                <strong className="text-brand-400">{formatCurrency(previewFallbackNum)}</strong> como base.
              </p>
            </div>

            {/* Opção para simplificar para as 3 categorias padrão caso tenha muitas */}
            {hasMoreThanThreeExpenseCats && (
              <label className="flex items-start space-x-2.5 p-3 rounded-2xl bg-slate-800/50 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simplifyCategories}
                  onChange={e => setSimplifyCategories(e.target.checked)}
                  className="mt-0.5 rounded text-brand-500 focus:ring-brand-400 accent-brand-600"
                />
                <span className="text-[11px] text-slate-300 leading-relaxed">
                  Simplificar para apenas 3 categorias padrão (<strong>Despesas</strong>, <strong>Lazer</strong> e <strong>Reserva e Metas</strong>), migrando lançamentos automaticamente.
                </span>
              </label>
            )}

            {/* Prévia dos Tetos Calculados */}
            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300">Prévia para {formatMonthYear(currentYM)}</span>
                <span className="text-brand-400 font-semibold">
                  Base: {formatCurrency(previewBaseIncome)}
                </span>
              </div>
              <div className="space-y-1.5 pt-1 max-h-44 overflow-y-auto pr-1">
                {previewCategoriesList.map(cat => {
                  const pct = previewPercentagesMap[cat.id] || 0;
                  const val = Math.round(previewBaseIncome * (pct / 100) * 100) / 100;
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 gap-2"
                    >
                      <span className="text-slate-300 truncate">
                        {cat.nome}{' '}
                        <span className="text-brand-400 font-semibold">({pct}%)</span>
                      </span>
                      <span className="font-bold text-white tabular-nums whitespace-nowrap">
                        {formatCurrency(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => setShowAssistantModal(false)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAssistant}
                data-testid="confirm-budget-assistant"
                className="flex-1 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-lg shadow-brand-500/25"
              >
                Aplicar em Todos os Meses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
