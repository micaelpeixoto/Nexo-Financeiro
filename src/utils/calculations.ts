import {
  Lancamento,
  Orcamento,
  Conta,
  Categoria,
  SubscriptionDetection,
  Meta,
  BudgetConfig,
  BudgetControlProfileId,
  BudgetCategoryGroup,
  DateFilterPreset
} from '../types';

export const DEFAULT_FALLBACK_INCOME = 2400;

export interface BudgetAssistantProfile {
  id: Exclude<BudgetControlProfileId, 'personalizado'>;
  titulo: string;
  subtitulo: string;
  regraLabel: string;
  descricao: string;
  essenciaisPct: number;
  estiloPct: number;
  metasReservaPct: number;
  percentuais: Record<string, number>;
}

export const EXPENSE_SUBCATEGORY_GROUPS: {
  id: BudgetCategoryGroup;
  titulo: string;
  resumo503020: string;
  subcategoriasExemplos: string[];
}[] = [
  {
    id: 'essenciais',
    titulo: 'Despesas Essenciais (50%)',
    resumo503020: 'Moradia, alimentação básica, saúde, transporte e contas fixas',
    subcategoriasExemplos: ['Moradia e Contas', 'Alimentação Básica', 'Transporte', 'Saúde e Farmácia', 'Educação']
  },
  {
    id: 'lazer',
    titulo: 'Lazer e Estilo de Vida (30%)',
    resumo503020: 'Restaurantes, streaming, passeios, compras pessoais e hobbies',
    subcategoriasExemplos: ['Lazer e Passeios', 'Restaurantes e Delivery', 'Assinaturas e Apps', 'Compras Pessoais', 'Viagens']
  },
  {
    id: 'reserva',
    titulo: 'Reserva e Metas (20%)',
    resumo503020: 'Guardar dinheiro, investimentos, reserva de emergência e quitação de dívidas',
    subcategoriasExemplos: ['Reserva de Emergência', 'Investimentos', 'Aportes em Metas', 'Quitação de Dívidas']
  }
];

/**
 * 3 opções de objetivos de controle para o Assistente de Orçamento
 */
export const BUDGET_ASSISTANT_PROFILES: BudgetAssistantProfile[] = [
  {
    id: 'equilibrado_50_30_20',
    titulo: 'Equilibrado (50/30/20)',
    subtitulo: 'Qualidade de vida + reserva constante',
    regraLabel: '50% Despesas • 30% Lazer • 20% Reserva e Metas',
    descricao: 'Usa 3 pilares claros: 50% para despesas essenciais, 30% para lazer e 20% para guardar dinheiro.',
    essenciaisPct: 50,
    estiloPct: 30,
    metasReservaPct: 20,
    percentuais: {
      cat_despesas: 50,
      cat_lazer: 30,
      cat_reserva: 20
    }
  },
  {
    id: 'quitar_dividas',
    titulo: 'Organizar e Quitar Dívidas',
    subtitulo: 'Prioriza essenciais e libera caixa para faturas',
    regraLabel: '55% Despesas • 20% Lazer • 25% Reserva/Quitação',
    descricao: 'Enxuga o lazer para 20% e direciona 25% todo mês para quitar dívidas e montar reserva.',
    essenciaisPct: 55,
    estiloPct: 20,
    metasReservaPct: 25,
    percentuais: {
      cat_despesas: 55,
      cat_lazer: 20,
      cat_reserva: 25
    }
  },
  {
    id: 'acelerar_metas',
    titulo: 'Foco em Economia Máxima',
    subtitulo: 'Acelerar reserva, investimentos e grandes sonhos',
    regraLabel: '45% Despesas • 20% Lazer • 35% Reserva e Metas',
    descricao: 'Mantém custo de vida enxuto (45%) e lazer em 20% para acelerar em 35% seus objetivos financeiros.',
    essenciaisPct: 45,
    estiloPct: 20,
    metasReservaPct: 35,
    percentuais: {
      cat_despesas: 45,
      cat_lazer: 20,
      cat_reserva: 35
    }
  }
];

/**
 * Infere em qual pilar do sistema (essenciais / lazer / reserva) uma categoria se encaixa,
 * usando o campo explícito `grupo_orcamento` ou identificando por nome/subcategoria/ID legado.
 */
export function inferBudgetGroup(cat: Categoria): BudgetCategoryGroup {
  if (cat.grupo_orcamento) return cat.grupo_orcamento;

  const text = `${cat.id} ${cat.nome} ${cat.subcategoria || ''}`.toLowerCase();
  if (
    text.includes('reserva') ||
    text.includes('invest') ||
    text.includes('poupan') ||
    text.includes('meta') ||
    text.includes('guardar') ||
    text.includes('dívida') ||
    text.includes('divida')
  ) {
    return 'reserva';
  }
  if (
    text.includes('lazer') ||
    text.includes('estilo') ||
    text.includes('assin') ||
    text.includes('viagem') ||
    text.includes('restaur') ||
    text.includes('compra') ||
    text.includes('cat_laze') ||
    text.includes('cat_assi') ||
    text.includes('cat_outr')
  ) {
    return 'lazer';
  }
  return 'essenciais';
}

/**
 * Distribui automaticamente as porcentagens do perfil escolhido (ex: 50/30/20)
 * entre todas as categorias de despesa ativas no orçamento do usuário,
 * usando o pilar/subcategoria de cada categoria.
 * Se algum pilar não tiver nenhuma categoria cadastrada, seu percentual é redistribuído
 * proporcionalmente entre os pilares com categorias para manter a soma correta.
 */
export function computeDynamicCategoryPercentages(
  categories: Categoria[],
  profileId: Exclude<BudgetControlProfileId, 'personalizado'> = 'equilibrado_50_30_20'
): Record<string, number> {
  const profile =
    BUDGET_ASSISTANT_PROFILES.find(p => p.id === profileId) || BUDGET_ASSISTANT_PROFILES[0];

  const budgeted = categories.filter(c => c.tipo === 'despesa' && c.incluir_no_orcamento);
  if (budgeted.length === 0) return {};

  const buckets: Record<BudgetCategoryGroup, Categoria[]> = {
    essenciais: [],
    lazer: [],
    reserva: []
  };

  for (const cat of budgeted) {
    buckets[inferBudgetGroup(cat)].push(cat);
  }

  const bucketTargets: Record<BudgetCategoryGroup, number> = {
    essenciais: profile.essenciaisPct,
    lazer: profile.estiloPct,
    reserva: profile.metasReservaPct
  };

  // Se algum pilar estiver vazio, redistribui seu percentual proporcionalmente nos pilares ativos
  const activeGroups = (['essenciais', 'lazer', 'reserva'] as BudgetCategoryGroup[]).filter(
    g => buckets[g].length > 0
  );
  const emptyTotal = (['essenciais', 'lazer', 'reserva'] as BudgetCategoryGroup[])
    .filter(g => buckets[g].length === 0)
    .reduce((acc, g) => acc + bucketTargets[g], 0);

  if (emptyTotal > 0 && activeGroups.length > 0) {
    const activeSum = activeGroups.reduce((acc, g) => acc + bucketTargets[g], 0);
    let distributed = 0;
    activeGroups.forEach((g, idx) => {
      if (idx === activeGroups.length - 1) {
        bucketTargets[g] = Math.round((bucketTargets[g] + (emptyTotal - distributed)) * 100) / 100;
      } else {
        const share = Math.round(((bucketTargets[g] / activeSum) * emptyTotal) * 10) / 10;
        bucketTargets[g] = Math.round((bucketTargets[g] + share) * 100) / 100;
        distributed += share;
      }
    });
  }

  const result: Record<string, number> = {};
  for (const group of activeGroups) {
    const cats = buckets[group];
    const groupTotal = bucketTargets[group];
    const perCatBase = Math.floor((groupTotal / cats.length) * 10) / 10;
    let allocated = 0;

    cats.forEach((cat, idx) => {
      if (idx === cats.length - 1) {
        result[cat.id] = Math.round((groupTotal - allocated) * 10) / 10;
      } else {
        result[cat.id] = perCatBase;
        allocated += perCatBase;
      }
    });
  }

  return result;
}

/**
 * Filtra lançamentos pelo seletor de data unificado (Dia, Mês Atual, Mês Passado, Ano, Todos)
 */
export function filterTransactionsByDatePreset(
  transactions: Lancamento[],
  preset: DateFilterPreset,
  currentYM: string,
  referenceDate: Date = new Date()
): Lancamento[] {
  const todayISO = toISODate(referenceDate);
  const prevYM = addMonthsSafe(`${currentYM}-01`, -1).slice(0, 7);
  const currentYear = currentYM.slice(0, 4);

  return transactions.filter(t => {
    if (preset === 'dia') return t.data === todayISO;
    if (preset === 'mes_atual') return t.data.startsWith(currentYM);
    if (preset === 'mes_passado') return t.data.startsWith(prevYM);
    if (preset === 'ano') return t.data.startsWith(currentYear);
    return true;
  });
}

/**
 * Calcula a renda base de um mês para dimensionar tetos percentuais.
 * Considera todas as receitas lançadas no mês (recebidas ou a receber).
 * Se não houver nenhuma receita no mês, usa o fallback padrão (R$ 2.400,00).
 */
export function getMonthBudgetBaseIncome(
  transactions: Lancamento[],
  yearMonth: string,
  fallbackIncome: number = DEFAULT_FALLBACK_INCOME
): { baseIncome: number; isFallback: boolean; detectedIncome: number } {
  let detectedIncome = 0;
  for (const t of transactions) {
    if (t.tipo === 'receita' && t.data.startsWith(yearMonth)) {
      detectedIncome += t.valor;
    }
  }
  detectedIncome = Math.round(detectedIncome * 100) / 100;
  if (detectedIncome > 0) {
    return {
      baseIncome: detectedIncome,
      isFallback: false,
      detectedIncome
    };
  }
  const safeFallback = fallbackIncome > 0 ? fallbackIncome : DEFAULT_FALLBACK_INCOME;
  return {
    baseIncome: safeFallback,
    isFallback: true,
    detectedIncome: 0
  };
}

export interface ResolvedCategoryBudget {
  categoria_id: string;
  target: number;
  percentageOfIncome: number | null;
  source: 'percentual' | 'fixo_recorrente' | 'manual_mes';
}

/**
 * Resolve o teto de uma categoria para qualquer mês (passado, atual ou futuro),
 * garantindo que alterações fiquem salvas nos meses seguintes e porcentagens
 * escalem automaticamente pela renda do mês (ou fallback R$ 2.400).
 */
export function resolveCategoryBudgetTarget(
  catId: string,
  targetYM: string,
  budgets: Orcamento[],
  transactions: Lancamento[],
  budgetConfig?: BudgetConfig
): ResolvedCategoryBudget {
  const effectiveSince = budgetConfig?.aplicado_desde || '0000-00';

  if (budgetConfig?.modo === 'percentual' && targetYM >= effectiveSince) {
    const fixedOverride = budgetConfig.tetos_fixos_desde?.[catId];
    if (fixedOverride && fixedOverride.desde <= targetYM) {
      return {
        categoria_id: catId,
        target: Math.round(fixedOverride.valor * 100) / 100,
        percentageOfIncome: null,
        source: 'fixo_recorrente'
      };
    }

    const pct = budgetConfig.percentuais_categoria?.[catId] ?? 0;
    const { baseIncome } = getMonthBudgetBaseIncome(
      transactions,
      targetYM,
      budgetConfig.renda_padrao_fallback
    );
    const calculatedTarget = pct > 0 ? Math.round(baseIncome * (pct / 100) * 100) / 100 : 0;

    return {
      categoria_id: catId,
      target: calculatedTarget,
      percentageOfIncome: pct,
      source: 'percentual'
    };
  }

  // Modo fixo recorrente: busca o registro mais recente com referencia <= targetYM
  const matching = budgets
    .filter(b => b.categoria_id === catId && b.referencia <= targetYM)
    .sort((a, b) => b.referencia.localeCompare(a.referencia));

  if (matching.length > 0) {
    return {
      categoria_id: catId,
      target: Math.round(matching[0].valor_meta * 100) / 100,
      percentageOfIncome: null,
      source: matching[0].referencia === targetYM ? 'manual_mes' : 'fixo_recorrente'
    };
  }

  return {
    categoria_id: catId,
    target: 0,
    percentageOfIncome: null,
    source: 'manual_mes'
  };
}

/**
 * Resolve todos os tetos das categorias de despesa incluídas no orçamento para um mês.
 */
export function resolveMonthBudgets(
  categories: Categoria[],
  targetYM: string,
  budgets: Orcamento[],
  transactions: Lancamento[],
  budgetConfig?: BudgetConfig
): ResolvedCategoryBudget[] {
  const expenseCats = categories.filter(c => c.tipo === 'despesa' && c.incluir_no_orcamento);
  return expenseCats.map(c =>
    resolveCategoryBudgetTarget(c.id, targetYM, budgets, transactions, budgetConfig)
  );
}

/**
 * Normaliza data para string YYYY-MM-DD
 */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna ano e mês na forma "YYYY-MM"
 */
export function getYearMonth(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * Verifica se um status é considerado "realizado"
 * Pago e Recebido = realizado. Pendente e A Receber = futuro/projetado.
 */
export function isRealized(status: string): boolean {
  return status === 'pago' || status === 'recebido';
}

/**
 * FÓRMULA 1: Resultado do Mês (Realizado)
 * Σ receitas (status pago/recebido) − Σ despesas (status pago)
 */
export function calculateMonthRealized(transactions: Lancamento[], yearMonth: string) {
  const monthItems = transactions.filter(t => t.data.startsWith(yearMonth));
  
  let incomeRealized = 0;
  let expenseRealized = 0;

  for (const t of monthItems) {
    if (isRealized(t.status)) {
      if (t.tipo === 'receita') {
        incomeRealized += t.valor;
      } else {
        expenseRealized += t.valor;
      }
    }
  }

  // Arredondamento monetário preciso para evitar erros de ponto flutuante
  incomeRealized = Math.round(incomeRealized * 100) / 100;
  expenseRealized = Math.round(expenseRealized * 100) / 100;
  const balanceRealized = Math.round((incomeRealized - expenseRealized) * 100) / 100;

  return {
    income: incomeRealized,
    expense: expenseRealized,
    balance: balanceRealized
  };
}

/**
 * FÓRMULA 2: Resultado Projetado do Mês
 * Soma todas as receitas (realizadas + pendentes/a receber) − todas as despesas (realizadas + pendentes)
 */
export function calculateMonthProjected(transactions: Lancamento[], yearMonth: string) {
  const monthItems = transactions.filter(t => t.data.startsWith(yearMonth));

  let incomeProjected = 0;
  let expenseProjected = 0;

  for (const t of monthItems) {
    if (t.tipo === 'receita') {
      incomeProjected += t.valor;
    } else {
      expenseProjected += t.valor;
    }
  }

  incomeProjected = Math.round(incomeProjected * 100) / 100;
  expenseProjected = Math.round(expenseProjected * 100) / 100;
  const balanceProjected = Math.round((incomeProjected - expenseProjected) * 100) / 100;

  return {
    income: incomeProjected,
    expense: expenseProjected,
    balance: balanceProjected
  };
}

/**
 * FÓRMULA 3: % Poupado
 * resultado ÷ receitas → percentual inteiro arredondado (ex.: 27%)
 * Regra: se receitas <= 0 ou divisão por zero → retorna "—"
 */
export function calculateSavingsRate(incomeRealized: number, balanceRealized: number): string {
  if (incomeRealized <= 0) {
    return '—';
  }
  const rate = (balanceRealized / incomeRealized) * 100;
  return `${Math.round(rate)}%`;
}

/**
 * FÓRMULA 4: Saldo Acumulado
 * Soma acumulada dos resultados realizados mês a mês,
 * começando do primeiro mês com movimento até o mês de referência.
 */
export function calculateCumulativeBalance(
  transactions: Lancamento[],
  upToYearMonth: string
): number {
  const monthsSet = new Set<string>();
  for (const t of transactions) {
    if (isRealized(t.status)) {
      const ym = getYearMonth(t.data);
      if (ym <= upToYearMonth) {
        monthsSet.add(ym);
      }
    }
  }

  const sortedMonths = Array.from(monthsSet).sort();
  let accumulated = 0;

  for (const ym of sortedMonths) {
    const summary = calculateMonthRealized(transactions, ym);
    accumulated += summary.balance;
  }

  return Math.round(accumulated * 100) / 100;
}

export interface MonthBudgetSpentSummary {
  totalSpent: number;
  paidSpent: number;
  pendingSpent: number;
}

/**
 * Soma os gastos comprometidos para orçamento no mês (ou ano),
 * incluindo tanto contas já pagas quanto contas pendentes ("a pagar"),
 * para que o usuário tenha visão fiel de planejamento.
 */
export function calculateMonthBudgetSpent(
  transactions: Lancamento[],
  categories: Categoria[],
  targetPrefix: string
): MonthBudgetSpentSummary {
  const catMap = new Map(categories.map(c => [c.id, c]));
  let paidSpent = 0;
  let pendingSpent = 0;

  for (const t of transactions) {
    if (t.tipo !== 'despesa' || !t.data.startsWith(targetPrefix)) continue;
    const cat = catMap.get(t.categoria_id);
    if (cat && cat.incluir_no_orcamento === false) continue;

    if (isRealized(t.status)) {
      paidSpent += t.valor;
    } else {
      pendingSpent += t.valor;
    }
  }

  return {
    totalSpent: Math.round((paidSpent + pendingSpent) * 100) / 100,
    paidSpent: Math.round(paidSpent * 100) / 100,
    pendingSpent: Math.round(pendingSpent * 100) / 100
  };
}

export interface MonthCarryoverInfo {
  projectedCarryover: number;
  realizedCarryover: number;
  hasPriorTransactions: boolean;
  lastPriorYM: string | null;
}

/**
 * Calcula a sobra (ou déficit) acumulada de todos os meses anteriores a `targetYM`.
 * Permite que o saldo que sobrou no mês anterior continue contando na Carteira do Mês
 * e apareça no Extrato do novo mês sem depender da quitação prévia de lançamentos.
 */
export function calculatePreviousMonthsCarryover(
  transactions: Lancamento[],
  targetYM: string
): MonthCarryoverInfo {
  let projInc = 0;
  let projExp = 0;
  let realInc = 0;
  let realExp = 0;
  let hasPriorTransactions = false;
  let lastPriorYM: string | null = null;

  for (const t of transactions) {
    const ym = getYearMonth(t.data);
    if (ym < targetYM) {
      hasPriorTransactions = true;
      if (!lastPriorYM || ym > lastPriorYM) {
        lastPriorYM = ym;
      }
      if (t.tipo === 'receita') {
        projInc += t.valor;
        if (isRealized(t.status)) realInc += t.valor;
      } else {
        projExp += t.valor;
        if (isRealized(t.status)) realExp += t.valor;
      }
    }
  }

  return {
    projectedCarryover: Math.round((projInc - projExp) * 100) / 100,
    realizedCarryover: Math.round((realInc - realExp) * 100) / 100,
    hasPriorTransactions,
    lastPriorYM
  };
}

export interface MonthWalletSummary {
  carryoverProjected: number;
  carryoverRealized: number;
  monthProjectedIncome: number;
  monthProjectedExpense: number;
  monthProjectedBalance: number;
  monthRealizedIncome: number;
  monthRealizedExpense: number;
  monthRealizedBalance: number;
  walletTotalProjected: number;
  walletTotalRealized: number;
  lastPriorYM: string | null;
}

/**
 * Calcula a Carteira do Mês somando a sobra trazida dos meses anteriores
 * com o movimento (receitas - despesas) do mês selecionado.
 */
export function calculateMonthWalletWithCarryover(
  transactions: Lancamento[],
  targetYM: string
): MonthWalletSummary {
  const carryover = calculatePreviousMonthsCarryover(transactions, targetYM);
  const projected = calculateMonthProjected(transactions, targetYM);
  const realized = calculateMonthRealized(transactions, targetYM);

  const walletTotalProjected = Math.round((carryover.projectedCarryover + projected.balance) * 100) / 100;
  const walletTotalRealized = Math.round((carryover.realizedCarryover + realized.balance) * 100) / 100;

  return {
    carryoverProjected: carryover.projectedCarryover,
    carryoverRealized: carryover.realizedCarryover,
    monthProjectedIncome: projected.income,
    monthProjectedExpense: projected.expense,
    monthProjectedBalance: projected.balance,
    monthRealizedIncome: realized.income,
    monthRealizedExpense: realized.expense,
    monthRealizedBalance: realized.balance,
    walletTotalProjected,
    walletTotalRealized,
    lastPriorYM: carryover.lastPriorYM
  };
}

export type BudgetUsageLevel = 'ok' | 'atencao' | 'estourado';

export interface BudgetStatus {
  spent: number;
  target: number;
  percentage: number;
  level: BudgetUsageLevel;
  badgeLabel: string;
  diff: number; // target - spent (positivo = sobrou, negativo = estourou)
}

/**
 * FÓRMULA 5: Uso do Orçamento
 * gasto realizado ÷ meta
 * Níveis:
 * - <= 70%: OK (verde)
 * - 70% < x <= 100%: atenção (amarelo)
 * - > 100%: estourou (vermelho)
 */
export function calculateBudgetUsage(spent: number, target: number): BudgetStatus {
  if (target <= 0) {
    return {
      spent,
      target,
      percentage: 0,
      level: spent > 0 ? 'estourado' : 'ok',
      badgeLabel: spent > 0 ? 'Sem teto' : 'OK',
      diff: -spent
    };
  }

  const ratio = (spent / target) * 100;
  const percentage = Math.round(ratio);
  const diff = Math.round((target - spent) * 100) / 100;

  let level: BudgetUsageLevel = 'ok';
  let badgeLabel = 'OK';

  if (ratio <= 70) {
    level = 'ok';
    badgeLabel = 'OK';
  } else if (ratio <= 100) {
    level = 'atencao';
    badgeLabel = 'Atenção';
  } else {
    level = 'estourado';
    badgeLabel = `Estourou em R$ ${Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return {
    spent,
    target,
    percentage,
    level,
    badgeLabel,
    diff
  };
}

/**
 * FÓRMULA 6: Sobra por dia (Revisada)
 * - Respeita o mês de referência (currentYM) selecionado no header
 * - Calcula tanto a sobra por DIA ÚTIL quanto por DIA CORRIDO
 * - Trata mês sem orçamento, mês passado, mês futuro e fim de semana sem divisão por zero
 */
export function countBusinessDaysInRange(year: number, monthIndex: number, startDay: number, endDay: number): number {
  let businessDays = 0;
  for (let day = startDay; day <= endDay; day++) {
    const dayOfWeek = new Date(year, monthIndex, day).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }
  return businessDays;
}

export function getRemainingBusinessDays(referenceDate: Date = new Date()): number {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return countBusinessDaysInRange(year, month, currentDay, lastDay);
}

export interface RemainingDailySpendResult {
  hasBudget: boolean;
  remainingAmount: number;
  remainingBusinessDays: number;
  remainingCalendarDays: number;
  dailyBusinessAllowance: number | null;
  dailyCalendarAllowance: number | null;
  dailyAllowance: number | null;
  isOverBudget: boolean;
  monthStatus: 'past' | 'current' | 'future';
  message: string;
}

export function calculateRemainingDailySpend(
  totalBudget: number,
  totalSpent: number,
  yearMonthOrDate: string | Date = new Date(),
  referenceDate: Date = new Date()
): RemainingDailySpendResult {
  const targetYM =
    typeof yearMonthOrDate === 'string'
      ? yearMonthOrDate
      : toISODate(yearMonthOrDate).slice(0, 7);
  const effectiveRefDate =
    yearMonthOrDate instanceof Date ? yearMonthOrDate : referenceDate;

  if (totalBudget <= 0) {
    return {
      hasBudget: false,
      remainingAmount: 0,
      remainingBusinessDays: 0,
      remainingCalendarDays: 0,
      dailyBusinessAllowance: null,
      dailyCalendarAllowance: null,
      dailyAllowance: null,
      isOverBudget: false,
      monthStatus: 'current',
      message: 'Defina tetos de orçamento para calcular a sobra por dia'
    };
  }

  const refYM = toISODate(effectiveRefDate).slice(0, 7);
  const [targetYearStr, targetMonthStr] = targetYM.split('-');
  const targetYear = parseInt(targetYearStr, 10);
  const targetMonthIndex = parseInt(targetMonthStr, 10) - 1;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonthIndex + 1, 0).getDate();

  let monthStatus: 'past' | 'current' | 'future' = 'current';
  let remainingCalendarDays = 0;
  let remainingBusinessDays = 0;

  if (targetYM < refYM) {
    monthStatus = 'past';
    remainingCalendarDays = 0;
    remainingBusinessDays = 0;
  } else if (targetYM > refYM) {
    monthStatus = 'future';
    remainingCalendarDays = lastDayOfTargetMonth;
    remainingBusinessDays = countBusinessDaysInRange(targetYear, targetMonthIndex, 1, lastDayOfTargetMonth);
  } else {
    monthStatus = 'current';
    const currentDay = effectiveRefDate.getDate();
    remainingCalendarDays = Math.max(1, lastDayOfTargetMonth - currentDay + 1);
    remainingBusinessDays = countBusinessDaysInRange(targetYear, targetMonthIndex, currentDay, lastDayOfTargetMonth);
  }

  const remainingAmount = Math.round((totalBudget - totalSpent) * 100) / 100;

  if (remainingAmount < 0) {
    return {
      hasBudget: true,
      remainingAmount,
      remainingBusinessDays,
      remainingCalendarDays,
      dailyBusinessAllowance: null,
      dailyCalendarAllowance: null,
      dailyAllowance: null,
      isOverBudget: true,
      monthStatus,
      message: 'Orçamento estourado neste mês'
    };
  }

  if (monthStatus === 'past') {
    return {
      hasBudget: true,
      remainingAmount,
      remainingBusinessDays: 0,
      remainingCalendarDays: 0,
      dailyBusinessAllowance: remainingAmount,
      dailyCalendarAllowance: remainingAmount,
      dailyAllowance: remainingAmount,
      isOverBudget: false,
      monthStatus,
      message: 'Mês encerrado dentro do orçamento'
    };
  }

  const dailyCalendarAllowance =
    remainingCalendarDays > 0
      ? Math.round((remainingAmount / remainingCalendarDays) * 100) / 100
      : null;

  const dailyBusinessAllowance =
    remainingBusinessDays > 0
      ? Math.round((remainingAmount / remainingBusinessDays) * 100) / 100
      : dailyCalendarAllowance;

  const message =
    remainingBusinessDays > 0
      ? `${remainingBusinessDays} ${remainingBusinessDays === 1 ? 'dia útil restante' : 'dias úteis restantes'} • ${remainingCalendarDays} corridos`
      : `${remainingCalendarDays} ${remainingCalendarDays === 1 ? 'dia corrido restante' : 'dias corridos restantes'} (fim de semana)`;

  return {
    hasBudget: true,
    remainingAmount,
    remainingBusinessDays,
    remainingCalendarDays,
    dailyBusinessAllowance,
    dailyCalendarAllowance,
    dailyAllowance: dailyBusinessAllowance,
    isOverBudget: false,
    monthStatus,
    message
  };
}

/**
 * Calcula a Sobra por Dia Útil e por Dia Corrido voltada para GASTOS REAIS DO DIA A DIA:
 * - Preserva o orçamento destinado à Reserva e Metas (grupo 'reserva'), usando como teto de gastos
 *   apenas Essenciais + Lazer (quando existem).
 * - Considera tanto despesas já pagas quanto contas/dívidas pendentes ("a pagar") do mês,
 *   para que você não gaste no dia a dia o dinheiro de uma conta que ainda vai vencer.
 */
export function computeMonthDailySpendOverview(
  categories: Categoria[],
  transactions: Lancamento[],
  budgets: Orcamento[],
  currentYM: string,
  budgetConfig?: BudgetConfig,
  referenceDate: Date = new Date()
) {
  const resolved = resolveMonthBudgets(categories, currentYM, budgets, transactions, budgetConfig);
  const catMap = new Map(categories.map(c => [c.id, c]));

  let totalBudgetTarget = 0;
  let spendingBudgetTarget = 0;
  let reservedBudgetTarget = 0;

  for (const b of resolved) {
    totalBudgetTarget += b.target;
    const cat = catMap.get(b.categoria_id);
    if (cat && inferBudgetGroup(cat) === 'reserva') {
      reservedBudgetTarget += b.target;
    } else {
      spendingBudgetTarget += b.target;
    }
  }

  // Caso não haja categorias fora de reserva, usa o total completo
  const effectiveSpendingTarget = spendingBudgetTarget > 0 ? spendingBudgetTarget : totalBudgetTarget;
  const effectiveReserved = spendingBudgetTarget > 0 ? Math.round(reservedBudgetTarget * 100) / 100 : 0;

  // Soma todas as despesas (pagas + pendentes) alocadas nas categorias de gastos (ou todas se não houver reserva separada)
  let committedSpendingExpense = 0;
  for (const t of transactions) {
    if (t.tipo === 'despesa' && t.data.startsWith(currentYM)) {
      const cat = catMap.get(t.categoria_id);
      const isReserveCat = cat && inferBudgetGroup(cat) === 'reserva';
      if (spendingBudgetTarget === 0 || !isReserveCat) {
        committedSpendingExpense += t.valor;
      }
    }
  }
  committedSpendingExpense = Math.round(committedSpendingExpense * 100) / 100;

  const dailySpend = calculateRemainingDailySpend(
    Math.round(effectiveSpendingTarget * 100) / 100,
    committedSpendingExpense,
    currentYM,
    referenceDate
  );

  return {
    dailySpend,
    spendingBudgetTarget: Math.round(effectiveSpendingTarget * 100) / 100,
    committedSpendingExpense,
    reservedBudgetTarget: effectiveReserved
  };
}

/**
 * FÓRMULA 7: Projeção de Fechamento do Mês
 * gasto realizado + (média diária dos últimos 30 dias × dias corridos restantes)
 * Card: "no ritmo atual você fechará em ~R$ X (−Y% vs orçamento)"
 */
export function calculateMonthClosingProjection(
  transactions: Lancamento[],
  totalBudget: number,
  referenceDate: Date = new Date()
) {
  const currentYearMonth = toISODate(referenceDate).slice(0, 7);
  const currentSummary = calculateMonthRealized(transactions, currentYearMonth);
  const spentRealized = currentSummary.expense;

  // Dias corridos restantes do mês atual
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const currentDay = referenceDate.getDate();
  const remainingCalendarDays = Math.max(0, lastDay - currentDay);

  // Média diária dos últimos 30 dias de despesas realizadas
  const ms30Days = 30 * 24 * 60 * 60 * 1000;
  const refTime = referenceDate.getTime();
  const startTime = refTime - ms30Days;

  let expensesLast30Days = 0;
  for (const t of transactions) {
    if (t.tipo === 'despesa' && isRealized(t.status)) {
      const tTime = new Date(t.data + 'T12:00:00').getTime();
      if (tTime >= startTime && tTime <= refTime) {
        expensesLast30Days += t.valor;
      }
    }
  }

  // Média diária real (se houver histórico nos 30 dias, usa /30, senão usa média do próprio mês até hoje)
  let dailyAvg = expensesLast30Days > 0 ? expensesLast30Days / 30 : currentDay > 0 ? spentRealized / currentDay : 0;
  dailyAvg = Math.round(dailyAvg * 100) / 100;

  const projectedClosing = Math.round((spentRealized + (dailyAvg * remainingCalendarDays)) * 100) / 100;
  
  let diffPercent = 0;
  if (totalBudget > 0) {
    diffPercent = Math.round(((projectedClosing - totalBudget) / totalBudget) * 100);
  }

  return {
    spentRealized,
    dailyAvg,
    remainingCalendarDays,
    projectedClosing,
    diffPercent,
    isOverBudget: totalBudget > 0 && projectedClosing > totalBudget
  };
}

/**
 * FÓRMULA 8: Disponibilidade do Cartão de Crédito
 * limite − fatura aberta atual
 * fatura aberta = Σ despesas no cartão do ciclo aberto (entre fechamentos)
 */
export function calculateCardAvailability(
  account: Conta,
  transactions: Lancamento[],
  referenceDate: Date = new Date()
) {
  if (account.tipo !== 'cartao' || !account.limite) {
    return null;
  }

  const closingDay = account.dia_fechamento || 1;
  const currentDay = referenceDate.getDate();
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  // Determina período da fatura aberta
  let cycleStartDate: Date;
  let cycleEndDate: Date;

  if (currentDay >= closingDay) {
    // Ciclo atual abriu no dia do fechamento deste mês e fecha no próximo mês
    cycleStartDate = new Date(year, month, closingDay);
    cycleEndDate = new Date(year, month + 1, closingDay - 1, 23, 59, 59);
  } else {
    // Ciclo abriu no mês anterior
    cycleStartDate = new Date(year, month - 1, closingDay);
    cycleEndDate = new Date(year, month, closingDay - 1, 23, 59, 59);
  }

  const cycleStartISO = toISODate(cycleStartDate);
  const cycleEndISO = toISODate(cycleEndDate);

  let openInvoiceTotal = 0;
  for (const t of transactions) {
    if (t.conta_id === account.id && t.tipo === 'despesa') {
      if (t.data >= cycleStartISO && t.data <= cycleEndISO) {
        openInvoiceTotal += t.valor;
      }
    }
  }

  openInvoiceTotal = Math.round(openInvoiceTotal * 100) / 100;
  const availableLimit = Math.max(0, Math.round((account.limite - openInvoiceTotal) * 100) / 100);

  return {
    limit: account.limite,
    openInvoiceTotal,
    availableLimit,
    closingDay,
    dueDay: account.dia_vencimento || closingDay + 7,
    cycleStartISO,
    cycleEndISO
  };
}

/**
 * FÓRMULA 9: Meta de Poupança — Contribuição Sugerida
 * Se taxa_rendimento_anual > 0: usar inversa de juros compostos:
 * PMT = FV · i / ((1 + i)^n − 1)
 * onde FV = (alvo − atual), i = taxa mensal (taxa_anual / 12), n = meses restantes
 * Senão: divisão simples (alvo − atual) ÷ meses restantes
 */
export function calculateGoalMonthlyContribution(
  target: number,
  current: number,
  targetDateStr: string,
  referenceDate: Date = new Date(),
  annualInterestRate: number = 0
): {
  remainingValue: number;
  monthsRemaining: number;
  suggestedMonthly: number;
  isCompleted: boolean;
} {
  const remainingValue = Math.max(0, target - current);
  if (remainingValue <= 0) {
    return {
      remainingValue: 0,
      monthsRemaining: 0,
      suggestedMonthly: 0,
      isCompleted: true
    };
  }

  const targetDate = new Date(targetDateStr + 'T12:00:00');
  const yearDiff = targetDate.getFullYear() - referenceDate.getFullYear();
  const monthDiff = targetDate.getMonth() - referenceDate.getMonth();
  const totalMonths = Math.max(1, (yearDiff * 12) + monthDiff);

  if (annualInterestRate > 0) {
    const monthlyRate = annualInterestRate / 12;
    const compound = Math.pow(1 + monthlyRate, totalMonths) - 1;
    if (compound > 0) {
      const pmt = (remainingValue * monthlyRate) / compound;
      return {
        remainingValue: Math.round(remainingValue * 100) / 100,
        monthsRemaining: totalMonths,
        suggestedMonthly: Math.round(pmt * 100) / 100,
        isCompleted: false
      };
    }
  }

  // Divisão simples
  const suggested = remainingValue / totalMonths;
  return {
    remainingValue: Math.round(remainingValue * 100) / 100,
    monthsRemaining: totalMonths,
    suggestedMonthly: Math.round(suggested * 100) / 100,
    isCompleted: false
  };
}

/**
 * FÓRMULA 10: Dias até Vencimento
 * vencimento − hoje (calendário real, ignorando horas)
 */
export function calculateDaysToDue(dueDateStr: string, referenceDate: Date = new Date()): number {
  const [dY, dM, dD] = dueDateStr.split('-').map(Number);
  const due = new Date(dY, dM - 1, dD).getTime();
  
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  ).getTime();

  const diffTime = due - today;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Utilitário para adicionar meses a uma data respeitando o último dia do mês
 * (Ex.: 31 de janeiro + 1 mês = 28 ou 29 de fevereiro)
 */
export function addMonthsSafe(dateStr: string, monthsToAdd: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetMonthIndex = month - 1 + monthsToAdd;
  
  const newYear = year + Math.floor(targetMonthIndex / 12);
  const newMonth = ((targetMonthIndex % 12) + 12) % 12; // 0 a 11
  
  // Quantidade de dias no mês destino
  const daysInTargetMonth = new Date(newYear, newMonth + 1, 0).getDate();
  const safeDay = Math.min(day, daysInTargetMonth);
  
  const y = String(newYear);
  const m = String(newMonth + 1).padStart(2, '0');
  const d = String(safeDay).padStart(2, '0');
  
  return `${y}-${m}-${d}`;
}

/**
 * Geração de Lançamentos Parcelados
 * Divide valor em N parcelas com anotação "Parcela X/N".
 * Parcela 1 no mês atual (ou data da compra), demais nos meses subsequentes.
 * Mantém a soma exata ajustando centavos na primeira parcela se houver dízima.
 */
export function generateInstallmentTransactions(
  baseTransaction: Omit<Lancamento, 'id' | 'created_at' | 'updated_at' | 'parcela_numero' | 'parcela_total'>,
  totalInstallments: number
): Omit<Lancamento, 'id' | 'created_at' | 'updated_at'>[] {
  if (totalInstallments <= 1) {
    return [{
      ...baseTransaction,
      parcela_numero: null,
      parcela_total: null,
      origem: 'manual'
    }];
  }

  const results: Omit<Lancamento, 'id' | 'created_at' | 'updated_at'>[] = [];
  const baseValue = Math.floor((baseTransaction.valor / totalInstallments) * 100) / 100;
  const remainder = Math.round((baseTransaction.valor - (baseValue * totalInstallments)) * 100) / 100;

  for (let i = 1; i <= totalInstallments; i++) {
    // Parcela 1 absorve eventuais centavos de arredondamento
    const installmentValue = i === 1 ? Math.round((baseValue + remainder) * 100) / 100 : baseValue;
    const installmentDate = addMonthsSafe(baseTransaction.data, i - 1);
    
    results.push({
      ...baseTransaction,
      valor: installmentValue,
      data: installmentDate,
      descricao: `${baseTransaction.descricao} (Parcela ${i}/${totalInstallments})`,
      status: i === 1 ? baseTransaction.status : 'pendente',
      parcela_numero: i,
      parcela_total: totalInstallments,
      origem: 'parcelamento'
    });
  }

  return results;
}

/**
 * Detecção Inteligente de Assinaturas e Recorrências
 * Agrupa despesas repetidas com descrições similares pagas nos últimos meses.
 */
export function detectSubscriptions(transactions: Lancamento[]): SubscriptionDetection[] {
  const expenseMap = new Map<string, Lancamento[]>();

  for (const t of transactions) {
    if (t.tipo === 'despesa') {
      const normDesc = t.descricao.toLowerCase().trim()
        .replace(/\s+/g, ' ')
        .replace(/\(parcela \d+\/\d+\)/gi, '')
        .trim();
      
      if (!expenseMap.has(normDesc)) {
        expenseMap.set(normDesc, []);
      }
      expenseMap.get(normDesc)!.push(t);
    }
  }

  const detections: SubscriptionDetection[] = [];

  for (const [desc, items] of expenseMap.entries()) {
    if (items.length >= 2) {
      // Ordena por data decrescente
      const sorted = [...items].sort((a, b) => b.data.localeCompare(a.data));
      const latest = sorted[0];
      const previous = sorted[1];

      // Checa se o intervalo entre datas tem padrão mensal (~25 a 35 dias)
      const d1 = new Date(latest.data + 'T12:00:00').getTime();
      const d2 = new Date(previous.data + 'T12:00:00').getTime();
      const diffDays = Math.abs(Math.round((d1 - d2) / (1000 * 60 * 60 * 24)));

      if (diffDays >= 20 && diffDays <= 40) {
        const [, , day] = latest.data.split('-').map(Number);
        const nextDate = addMonthsSafe(latest.data, 1);

        const priceHistory = sorted.slice(0, 6).map(it => ({
          data: it.data,
          valor: it.valor
        }));

        detections.push({
          id: `sub_${desc.replace(/\s+/g, '_')}`,
          descricao: latest.descricao.replace(/\(parcela \d+\/\d+\)/gi, '').trim(),
          categoria_id: latest.categoria_id,
          valor_atual: latest.valor,
          dia_cobranca: day,
          frequencia_estimada: 'mensal',
          proxima_data_estimada: nextDate,
          historico_precos: priceHistory,
          ativo: true
        });
      }
    }
  }

  return detections;
}

/**
 * Gera os Insights e Notificações "Inteligência do Momento" (Home)
 */
export interface InsightCard {
  id: string;
  tag: string;
  tipo: 'alerta' | 'sucesso' | 'info';
  titulo: string;
  mensagem: string;
  acaoTexto?: string;
  acaoDestino?: 'budgets' | 'transactions' | 'goals';
  prioridade: number; // 1 = mais alta
}

export function generateSmartInsights(
  transactions: Lancamento[],
  budgets: Orcamento[],
  categories: Categoria[],
  metas: Meta[],
  referenceDate: Date = new Date(),
  targetYM?: string,
  budgetConfig?: BudgetConfig
): InsightCard[] {
  const insights: InsightCard[] = [];
  const currentYM = targetYM || toISODate(referenceDate).slice(0, 7);
  const prevYM = addMonthsSafe(`${currentYM}-01`, -1).slice(0, 7);

  // 1. Termômetro geral do orçamento resolvido dinamicamente (inclui contas pagas e pendentes)
  const resolvedBudgets = resolveMonthBudgets(categories, currentYM, budgets, transactions, budgetConfig);
  const totalTarget = resolvedBudgets.reduce((acc, r) => acc + r.target, 0);
  const budgetSpentSummary = calculateMonthBudgetSpent(transactions, categories, currentYM);
  const monthProjected = calculateMonthProjected(transactions, currentYM);

  if (totalTarget > 0) {
    const overallUsage = calculateBudgetUsage(budgetSpentSummary.totalSpent, totalTarget);
    if (overallUsage.level === 'estourado') {
      insights.push({
        id: `thermometer_over_${currentYM}`,
        tag: 'TERMÔMETRO DO ORÇAMENTO',
        tipo: 'alerta',
        titulo: `Orçamento ultrapassado (${overallUsage.percentage}%)`,
        mensagem: `Você já comprometeu R$ ${budgetSpentSummary.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (pagas + pendentes) de R$ ${totalTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} planejados.`,
        acaoTexto: 'Revisar tetos',
        acaoDestino: 'budgets',
        prioridade: 1
      });
    } else if (overallUsage.level === 'atencao') {
      insights.push({
        id: `thermometer_warn_${currentYM}`,
        tag: 'TERMÔMETRO DO ORÇAMENTO',
        tipo: 'alerta',
        titulo: `Atenção: ${overallUsage.percentage}% do plano utilizado`,
        mensagem: `Restam R$ ${Math.max(0, overallUsage.diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} dentro do teto mensal (já considerando contas a pagar).`,
        acaoTexto: 'Ver limites',
        acaoDestino: 'budgets',
        prioridade: 2
      });
    } else {
      insights.push({
        id: `thermometer_ok_${currentYM}`,
        tag: 'DENTRO DO PLANO',
        tipo: 'sucesso',
        titulo: 'Termômetro do Orçamento saudável',
        mensagem: `Ritmo tranquilo com ${overallUsage.percentage}% do teto mensal consumido até aqui.`,
        acaoTexto: 'Ver limites',
        acaoDestino: 'budgets',
        prioridade: 3
      });
    }
  }

  // 2. Fixos & Parcelas / Contas Pendentes a vencer
  const pendingExpenses = transactions.filter(
    t => t.tipo === 'despesa' && t.data.startsWith(currentYM) && !isRealized(t.status)
  );
  if (pendingExpenses.length > 0) {
    const totalPending = pendingExpenses.reduce((acc, t) => acc + t.valor, 0);
    const urgent = pendingExpenses.filter(t => calculateDaysToDue(t.data, referenceDate) <= 3);
    insights.push({
      id: `upcoming_bills_${currentYM}`,
      tag: urgent.length > 0 ? 'VENCIMENTO PRÓXIMO' : 'FIXOS & PARCELAS',
      tipo: urgent.length > 0 ? 'alerta' : 'info',
      titulo:
        urgent.length > 0
          ? `${urgent.length} ${urgent.length === 1 ? 'conta vence em breve' : 'contas vencem em breve'}`
          : `${pendingExpenses.length} cobranças previstas no mês`,
      mensagem: `Total pendente de R$ ${totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Projeção final do mês já considerada na carteira.`,
      acaoTexto: 'Ver extrato',
      acaoDestino: 'transactions',
      prioridade: urgent.length > 0 ? 1 : 2
    });
  }

  // 3. Categoria específica estourada
  for (const rb of resolvedBudgets) {
    if (rb.target <= 0) continue;
    const cat = categories.find(c => c.id === rb.categoria_id);
    if (!cat) continue;

    const catSpent = transactions
      .filter(t => t.data.startsWith(currentYM) && t.categoria_id === rb.categoria_id && t.tipo === 'despesa')
      .reduce((acc, t) => acc + t.valor, 0);

    const usage = calculateBudgetUsage(catSpent, rb.target);
    if (usage.level === 'estourado') {
      insights.push({
        id: `budget_blown_${rb.categoria_id}`,
        tag: 'ALERTA DE CATEGORIA',
        tipo: 'alerta',
        titulo: `${cat.nome} acima do limite`,
        mensagem: `Estourou em R$ ${Math.abs(usage.diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} sobre o teto de R$ ${rb.target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        acaoTexto: 'Ajustar teto',
        acaoDestino: 'budgets',
        prioridade: 1
      });
      break;
    }
  }

  // 4. Maior mudança absoluta em categoria vs mês anterior (mínimo R$ 50)
  let maxDiff = 0;
  let maxCatName = '';
  let isHigher = true;

  for (const cat of categories.filter(c => c.tipo === 'despesa')) {
    const currCatSpent = transactions
      .filter(t => t.data.startsWith(currentYM) && t.categoria_id === cat.id && isRealized(t.status))
      .reduce((acc, t) => acc + t.valor, 0);

    const prevCatSpent = transactions
      .filter(t => t.data.startsWith(prevYM) && t.categoria_id === cat.id && isRealized(t.status))
      .reduce((acc, t) => acc + t.valor, 0);

    const diff = Math.abs(currCatSpent - prevCatSpent);
    if (diff > 50 && diff > maxDiff) {
      maxDiff = diff;
      maxCatName = cat.nome;
      isHigher = currCatSpent > prevCatSpent;
    }
  }

  if (maxDiff > 0 && prevYM) {
    const formattedDiff = `R$ ${maxDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    insights.push({
      id: 'insight_cat_change',
      tag: 'RADAR DE HÁBITOS',
      tipo: 'info',
      titulo: 'Mudança de padrão detectada',
      mensagem: `${maxCatName} está ${formattedDiff} ${isHigher ? 'acima' : 'abaixo'} em relação ao mês passado.`,
      prioridade: 4
    });
  }

  // 5. Conquista ou progresso de meta
  for (const m of metas) {
    if (m.valor_alvo > 0) {
      const pct = (m.valor_atual / m.valor_alvo) * 100;
      if (pct >= 100) {
        insights.push({
          id: `goal_completed_${m.id}`,
          tag: 'CONQUISTA',
          tipo: 'sucesso',
          titulo: 'Meta alcançada!',
          mensagem: `Você atingiu 100% da meta "${m.nome}".`,
          acaoTexto: 'Ver metas',
          acaoDestino: 'goals',
          prioridade: 1
        });
        break;
      }
    }
  }

  // 6. Saldo projetado positivo / aviso negativo
  if (monthProjected.income > 0 && monthProjected.balance < 0) {
    insights.push({
      id: `proj_negative_${currentYM}`,
      tag: 'ATENÇÃO AO FLUXO',
      tipo: 'alerta',
      titulo: 'Saídas superam entradas previstas',
      mensagem: `Considerando o que falta receber e pagar, o mês fecha negativo em R$ ${Math.abs(monthProjected.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      prioridade: 1
    });
  }

  return insights.sort((a, b) => a.prioridade - b.prioridade).slice(0, 4);
}
