import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSavingsRate,
  calculateCumulativeBalance,
  calculateBudgetUsage,
  generateInstallmentTransactions,
  addMonthsSafe,
  calculateCardAvailability,
  calculateGoalMonthlyContribution,
  calculateDaysToDue,
  calculateMonthProjected,
  resolveCategoryBudgetTarget,
  getMonthBudgetBaseIncome,
  calculateRemainingDailySpend,
  computeDynamicCategoryPercentages,
  inferBudgetGroup,
  filterTransactionsByDatePreset,
  computeMonthDailySpendOverview,
  calculatePreviousMonthsCarryover,
  calculateMonthWalletWithCarryover,
  calculateMonthBudgetSpent,
  generateSmartInsights,
  DEFAULT_FALLBACK_INCOME
} from './calculations';
import { Lancamento, Conta, Orcamento, BudgetConfig, Categoria } from '../types';

test('Critério 6: % poupado com R$ 6.200 de receita e R$ 4.500 de despesa é 27%', () => {
  const income = 6200;
  const expense = 4500;
  const balance = income - expense; // 1700
  const rate = calculateSavingsRate(income, balance);
  assert.equal(rate, '27%');
});

test('Critério 6 (divisão por zero): Mês sem receitas retorna "—"', () => {
  assert.equal(calculateSavingsRate(0, -200), '—');
  assert.equal(calculateSavingsRate(0, 0), '—');
});

test('Critério 7: Saldo acumulado é cumulativo (novembro 1.700 + dezembro 500 = 2.200)', () => {
  const mockTransactions: Lancamento[] = [
    {
      id: '1',
      data: '2026-11-05',
      tipo: 'receita',
      descricao: 'Salário Nov',
      valor: 6200,
      conta_id: 'c1',
      categoria_id: 'cat1',
      status: 'pago',
      origem: 'manual',
      created_at: '',
      updated_at: ''
    },
    {
      id: '2',
      data: '2026-11-10',
      tipo: 'despesa',
      descricao: 'Despesas Nov',
      valor: 4500,
      conta_id: 'c1',
      categoria_id: 'cat2',
      status: 'pago',
      origem: 'manual',
      created_at: '',
      updated_at: ''
    },
    {
      id: '3',
      data: '2026-12-05',
      tipo: 'receita',
      descricao: 'Salário Dez',
      valor: 5000,
      conta_id: 'c1',
      categoria_id: 'cat1',
      status: 'pago',
      origem: 'manual',
      created_at: '',
      updated_at: ''
    },
    {
      id: '4',
      data: '2026-12-10',
      tipo: 'despesa',
      descricao: 'Despesas Dez',
      valor: 4500,
      conta_id: 'c1',
      categoria_id: 'cat2',
      status: 'pago',
      origem: 'manual',
      created_at: '',
      updated_at: ''
    }
  ];

  const novBalance = calculateCumulativeBalance(mockTransactions, '2026-11');
  assert.equal(novBalance, 1700);

  const dezBalance = calculateCumulativeBalance(mockTransactions, '2026-12');
  assert.equal(dezBalance, 2200);
});

test('Critério 3: Uso do orçamento e transições de faixa (OK <=70%, Atenção 70-100%, Estourou >100%)', () => {
  const okUsage = calculateBudgetUsage(600, 1000);
  assert.equal(okUsage.level, 'ok');
  assert.equal(okUsage.badgeLabel, 'OK');
  assert.equal(okUsage.percentage, 60);

  const atencaoUsage = calculateBudgetUsage(750, 1000);
  assert.equal(atencaoUsage.level, 'atencao');
  assert.equal(atencaoUsage.badgeLabel, 'Atenção');
  assert.equal(atencaoUsage.percentage, 75);

  const estouradoUsage = calculateBudgetUsage(1230, 1000);
  assert.equal(estouradoUsage.level, 'estourado');
  assert.ok(estouradoUsage.badgeLabel.includes('Estourou em R$ 230,00'));
});

test('Critério 5: Parcelar compra de R$ 1.200 em 4x gera 4 lançamentos mensais de R$ 300', () => {
  const baseTx: Omit<Lancamento, 'id' | 'created_at' | 'updated_at' | 'parcela_numero' | 'parcela_total'> = {
    data: '2026-03-15',
    tipo: 'despesa',
    descricao: 'Notebook Novo',
    valor: 1200,
    conta_id: 'cartao1',
    categoria_id: 'eletronicos',
    status: 'pago',
    origem: 'manual'
  };

  const installments = generateInstallmentTransactions(baseTx, 4);
  assert.equal(installments.length, 4);

  assert.equal(installments[0].valor, 300);
  assert.equal(installments[0].data, '2026-03-15');
  assert.equal(installments[0].parcela_numero, 1);
  assert.equal(installments[0].status, 'pago');
  assert.equal(installments[0].descricao, 'Notebook Novo (Parcela 1/4)');

  assert.equal(installments[1].valor, 300);
  assert.equal(installments[1].data, '2026-04-15');
  assert.equal(installments[1].parcela_numero, 2);
  assert.equal(installments[1].status, 'pendente');

  assert.equal(installments[2].data, '2026-05-15');
  assert.equal(installments[3].data, '2026-06-15');

  const total = installments.reduce((acc, it) => acc + it.valor, 0);
  assert.equal(total, 1200);
});

test('Critério 4: Rollover de datas no final do mês (31 de janeiro -> 28/29 de fevereiro)', () => {
  const nextMonthFromJan31 = addMonthsSafe('2026-01-31', 1);
  assert.equal(nextMonthFromJan31, '2026-02-28');

  const leapYearFeb = addMonthsSafe('2028-01-31', 1);
  assert.equal(leapYearFeb, '2028-02-29');

  const marchSafe = addMonthsSafe('2026-01-31', 2);
  assert.equal(marchSafe, '2026-03-31');
});

test('Critério 8: Disponibilidade do cartão e fatura aberta', () => {
  const card: Conta = {
    id: 'c_card',
    nome: 'Nubank',
    tipo: 'cartao',
    limite: 5000,
    dia_fechamento: 20,
    dia_vencimento: 27,
    cor: '#8B5CF6',
    icone: 'CreditCard',
    ordem: 1,
    ativo: true
  };

  const mockTx: Lancamento[] = [
    {
      id: 'tx1',
      data: '2026-11-21',
      tipo: 'despesa',
      descricao: 'Supermercado',
      valor: 850,
      conta_id: 'c_card',
      categoria_id: 'mercado',
      status: 'pago',
      origem: 'manual',
      created_at: '',
      updated_at: ''
    },
    {
      id: 'tx2',
      data: '2026-11-25',
      tipo: 'despesa',
      descricao: 'Combustível',
      valor: 250,
      conta_id: 'c_card',
      categoria_id: 'transporte',
      status: 'pago',
      origem: 'manual',
      created_at: '',
      updated_at: ''
    }
  ];

  const refDate = new Date('2026-11-26T12:00:00');
  const cardInfo = calculateCardAvailability(card, mockTx, refDate);
  assert.ok(cardInfo !== null);
  assert.equal(cardInfo.openInvoiceTotal, 1100);
  assert.equal(cardInfo.availableLimit, 3900);
});

test('Critério 9: Sugestão de contribuição mensal da meta', () => {
  const refDate = new Date('2026-01-01T12:00:00');
  const targetDate = '2026-11-01';

  const goal = calculateGoalMonthlyContribution(12000, 2000, targetDate, refDate);
  assert.equal(goal.remainingValue, 10000);
  assert.equal(goal.monthsRemaining, 10);
  assert.equal(goal.suggestedMonthly, 1000);
});

test('Dias até vencimento (calendário real)', () => {
  const ref = new Date('2026-11-10T15:00:00');
  assert.equal(calculateDaysToDue('2026-11-15', ref), 5);
  assert.equal(calculateDaysToDue('2026-11-10', ref), 0);
  assert.equal(calculateDaysToDue('2026-11-08', ref), -2);
});

test('Orçamento dinâmico: escala com receita do mês, usa fallback R$ 2.400 quando vazio e persiste nos meses seguintes', () => {
  const txs: Lancamento[] = [
    {
      id: 'r1',
      data: '2026-11-05',
      tipo: 'receita',
      descricao: 'Salário',
      valor: 5000,
      conta_id: 'acc_corrente',
      categoria_id: 'cat_sal',
      status: 'a_receber',
      origem: 'manual',
      created_at: '',
      updated_at: ''
    }
  ];

  const configPct: BudgetConfig = {
    modo: 'percentual',
    perfil_ativo: 'equilibrado_50_30_20',
    renda_padrao_fallback: DEFAULT_FALLBACK_INCOME,
    aplicado_desde: '2026-11',
    percentuais_categoria: { cat_alim: 20, cat_mora: 25 },
    tetos_fixos_desde: {}
  };

  // Mês com R$ 5.000 de receita -> Alimentação (20%) = R$ 1.000
  const novIncome = getMonthBudgetBaseIncome(txs, '2026-11');
  assert.equal(novIncome.baseIncome, 5000);
  assert.equal(novIncome.isFallback, false);
  const novAlim = resolveCategoryBudgetTarget('cat_alim', '2026-11', [], txs, configPct);
  assert.equal(novAlim.target, 1000);

  // Mês seguinte sem receita -> usa fallback R$ 2.400 -> Alimentação (20%) = R$ 480
  const dezIncome = getMonthBudgetBaseIncome(txs, '2026-12');
  assert.equal(dezIncome.baseIncome, 2400);
  assert.equal(dezIncome.isFallback, true);
  const dezAlim = resolveCategoryBudgetTarget('cat_alim', '2026-12', [], txs, configPct);
  assert.equal(dezAlim.target, 480);

  // Modo fixo recorrente: alteração em nov/2026 propaga para dez/2026 e jan/2027, preservando out/2026
  const fixedBudgets: Orcamento[] = [
    { id: 'b1', categoria_id: 'cat_alim', periodo_tipo: 'mensal', referencia: '2026-10', valor_meta: 600 },
    { id: 'b2', categoria_id: 'cat_alim', periodo_tipo: 'mensal', referencia: '2026-11', valor_meta: 950 }
  ];
  const fixedCfg: BudgetConfig = { ...configPct, modo: 'fixo' };
  assert.equal(resolveCategoryBudgetTarget('cat_alim', '2026-10', fixedBudgets, txs, fixedCfg).target, 600);
  assert.equal(resolveCategoryBudgetTarget('cat_alim', '2026-11', fixedBudgets, txs, fixedCfg).target, 950);
  assert.equal(resolveCategoryBudgetTarget('cat_alim', '2026-12', fixedBudgets, txs, fixedCfg).target, 950);
  assert.equal(resolveCategoryBudgetTarget('cat_alim', '2027-01', fixedBudgets, txs, fixedCfg).target, 950);
});

test('Carteira dinâmica: calcula (a receber + recebido) - (a pagar + pago) sem exigir quitação prévia', () => {
  const txs: Lancamento[] = [
    {
      id: 't1',
      data: '2026-11-05',
      tipo: 'receita',
      descricao: 'Salário Pendente',
      valor: 4000,
      conta_id: 'c1',
      categoria_id: 'cat_sal',
      status: 'a_receber',
      origem: 'manual',
      created_at: '',
      updated_at: ''
    },
    {
      id: 't2',
      data: '2026-11-10',
      tipo: 'despesa',
      descricao: 'Aluguel Pendente',
      valor: 1400,
      conta_id: 'c1',
      categoria_id: 'cat_mora',
      status: 'pendente',
      origem: 'manual',
      created_at: '',
      updated_at: ''
    }
  ];

  const dynamic = calculateMonthProjected(txs, '2026-11');
  assert.equal(dynamic.income, 4000);
  assert.equal(dynamic.expense, 1400);
  assert.equal(dynamic.balance, 2600);
});

test('Sobra por dia revisada: calcula dias úteis e dias corridos corretamente e respeita teto zerado', () => {
  // Sem teto -> hasBudget false
  const noBudget = calculateRemainingDailySpend(0, 0, '2026-11', new Date('2026-11-17T12:00:00'));
  assert.equal(noBudget.hasBudget, false);
  assert.equal(noBudget.dailyBusinessAllowance, null);

  // Terça 17/11/2026 até seg 30/11/2026:
  // Corridos = 14 (17..30), Úteis = 10 (17,18,19,20, 23,24,25,26,27, 30)
  // Sobra total = 3200 - 1800 = 1400 -> 140/dia útil e 100/dia corrido
  const current = calculateRemainingDailySpend(3200, 1800, '2026-11', new Date('2026-11-17T12:00:00'));
  assert.equal(current.hasBudget, true);
  assert.equal(current.remainingBusinessDays, 10);
  assert.equal(current.remainingCalendarDays, 14);
  assert.equal(current.dailyBusinessAllowance, 140);
  assert.equal(current.dailyCalendarAllowance, 100);
  assert.equal(current.isOverBudget, false);
});

test('50/30/20 automático: 3 categorias padrão e ajuste ao adicionar novas categorias com subcategoria', () => {
  const base3: Categoria[] = [
    { id: 'cat_despesas', nome: 'Despesas', tipo: 'despesa', cor: '#EF4444', icone: 'Home', incluir_no_orcamento: true, ordem: 1, grupo_orcamento: 'essenciais' },
    { id: 'cat_lazer', nome: 'Lazer', tipo: 'despesa', cor: '#8B5CF6', icone: 'Smile', incluir_no_orcamento: true, ordem: 2, grupo_orcamento: 'lazer' },
    { id: 'cat_reserva', nome: 'Reserva e Metas', tipo: 'despesa', cor: '#10B981', icone: 'ShieldCheck', incluir_no_orcamento: true, ordem: 3, grupo_orcamento: 'reserva' }
  ];

  const pct3 = computeDynamicCategoryPercentages(base3, 'equilibrado_50_30_20');
  assert.deepEqual(pct3, { cat_despesas: 50, cat_lazer: 30, cat_reserva: 20 });

  // Usuário cria nova categoria "Supermercado" no grupo Essenciais -> 50% divide automaticamente em 25% + 25%
  const withMarket: Categoria[] = [
    ...base3,
    { id: 'cat_mercado', nome: 'Supermercado', tipo: 'despesa', cor: '#F59E0B', icone: 'Utensils', incluir_no_orcamento: true, ordem: 4, grupo_orcamento: 'essenciais' }
  ];
  const pctWithMarket = computeDynamicCategoryPercentages(withMarket, 'equilibrado_50_30_20');
  assert.equal(pctWithMarket.cat_despesas, 25);
  assert.equal(pctWithMarket.cat_mercado, 25);
  assert.equal(pctWithMarket.cat_lazer, 30);
  assert.equal(pctWithMarket.cat_reserva, 20);

  // Perfil Quitar Dívidas (55 / 20 / 25)
  const pctDebt = computeDynamicCategoryPercentages(base3, 'quitar_dividas');
  assert.deepEqual(pctDebt, { cat_despesas: 55, cat_lazer: 20, cat_reserva: 25 });

  // Inferência para categorias legadas sem grupo_orcamento explícito
  assert.equal(
    inferBudgetGroup({ id: 'cat_x', nome: 'Investimentos', tipo: 'despesa', cor: '#000', icone: 'Wallet', incluir_no_orcamento: true, ordem: 1 }),
    'reserva'
  );
});

test('Filtro de data unificado: Dia, Mês Atual, Mês Passado, Ano e Todos', () => {
  const ref = new Date('2026-11-17T12:00:00');
  const txs: Lancamento[] = [
    { id: '1', data: '2026-11-17', tipo: 'despesa', descricao: 'Hoje', valor: 50, conta_id: 'c1', categoria_id: 'cat1', status: 'pago', origem: 'manual', created_at: '', updated_at: '' },
    { id: '2', data: '2026-11-05', tipo: 'despesa', descricao: 'Mês Atual', valor: 100, conta_id: 'c1', categoria_id: 'cat1', status: 'pago', origem: 'manual', created_at: '', updated_at: '' },
    { id: '3', data: '2026-10-12', tipo: 'despesa', descricao: 'Mês Passado', valor: 200, conta_id: 'c1', categoria_id: 'cat1', status: 'pago', origem: 'manual', created_at: '', updated_at: '' },
    { id: '4', data: '2025-12-01', tipo: 'despesa', descricao: 'Ano Anterior', valor: 300, conta_id: 'c1', categoria_id: 'cat1', status: 'pago', origem: 'manual', created_at: '', updated_at: '' }
  ];

  assert.deepEqual(filterTransactionsByDatePreset(txs, 'dia', '2026-11', ref).map(t => t.id), ['1']);
  assert.deepEqual(filterTransactionsByDatePreset(txs, 'mes_atual', '2026-11', ref).map(t => t.id), ['1', '2']);
  assert.deepEqual(filterTransactionsByDatePreset(txs, 'mes_passado', '2026-11', ref).map(t => t.id), ['3']);
  assert.deepEqual(filterTransactionsByDatePreset(txs, 'ano', '2026-11', ref).map(t => t.id), ['1', '2', '3']);
  assert.deepEqual(filterTransactionsByDatePreset(txs, 'todos', '2026-11', ref).map(t => t.id), ['1', '2', '3', '4']);
});

test('Sobra por dia em dezembro (50/30/20): salário R$ 6.200 com dívida pendente R$ 350 preserva 20% reserva e desconta a dívida', () => {
  const cats: Categoria[] = [
    { id: 'cat_despesas', nome: 'Despesas', tipo: 'despesa', cor: '#EF4444', icone: 'Home', incluir_no_orcamento: true, ordem: 1, grupo_orcamento: 'essenciais' },
    { id: 'cat_lazer', nome: 'Lazer', tipo: 'despesa', cor: '#8B5CF6', icone: 'Smile', incluir_no_orcamento: true, ordem: 2, grupo_orcamento: 'lazer' },
    { id: 'cat_reserva', nome: 'Reserva e Metas', tipo: 'despesa', cor: '#10B981', icone: 'ShieldCheck', incluir_no_orcamento: true, ordem: 3, grupo_orcamento: 'reserva' }
  ];
  const cfg: BudgetConfig = {
    modo: 'percentual',
    perfil_ativo: 'equilibrado_50_30_20',
    renda_padrao_fallback: DEFAULT_FALLBACK_INCOME,
    aplicado_desde: '2026-11',
    percentuais_categoria: { cat_despesas: 50, cat_lazer: 30, cat_reserva: 20 },
    tetos_fixos_desde: {}
  };
  const txs: Lancamento[] = [
    { id: 'r1', data: '2026-12-05', tipo: 'receita', descricao: 'Salário', valor: 6200, conta_id: 'c1', categoria_id: 'cat_sal', status: 'a_receber', origem: 'manual', created_at: '', updated_at: '' },
    { id: 'd1', data: '2026-12-10', tipo: 'despesa', descricao: 'Dívida Parcelada', valor: 350, conta_id: 'c1', categoria_id: 'cat_despesas', status: 'pendente', origem: 'manual', created_at: '', updated_at: '' }
  ];

  // 80% para gastos (Despesas 3.100 + Lazer 1.860) = 4.960; Reserva (20%) = 1.240
  // Menos R$ 350 da dívida pendente = R$ 4.610 restantes em dez/2026 (31 corridos, 23 úteis)
  const overview = computeMonthDailySpendOverview(cats, txs, [], '2026-12', cfg, new Date('2026-11-17T12:00:00'));
  assert.equal(overview.spendingBudgetTarget, 4960);
  assert.equal(overview.reservedBudgetTarget, 1240);
  assert.equal(overview.committedSpendingExpense, 350);
  assert.equal(overview.dailySpend.remainingAmount, 4610);
  assert.equal(overview.dailySpend.remainingCalendarDays, 31);
  assert.equal(overview.dailySpend.remainingBusinessDays, 23);
  assert.equal(overview.dailySpend.dailyCalendarAllowance, 148.71);
  assert.equal(overview.dailySpend.dailyBusinessAllowance, 200.43);
});

test('Sobra do mês anterior na Carteira do Mês: R$ 6.000 - R$ 2.000 = R$ 4.000 acumula com mais R$ 6.000 -> R$ 10.000 no novo mês', () => {
  const txs: Lancamento[] = [
    {
      id: 'm1_sal',
      data: '2026-11-05',
      tipo: 'receita',
      descricao: 'Salário Mês 1',
      valor: 6000,
      conta_id: 'c1',
      categoria_id: 'cat_sal',
      status: 'recebido',
      origem: 'manual',
      created_at: '',
      updated_at: ''
    },
    {
      id: 'm1_gasto',
      data: '2026-11-12',
      tipo: 'despesa',
      descricao: 'Gastos Mês 1',
      valor: 2000,
      conta_id: 'c1',
      categoria_id: 'cat_despesas',
      status: 'pago',
      origem: 'manual',
      created_at: '',
      updated_at: ''
    },
    {
      id: 'm2_sal',
      data: '2026-12-05',
      tipo: 'receita',
      descricao: 'Salário Mês 2',
      valor: 6000,
      conta_id: 'c1',
      categoria_id: 'cat_sal',
      status: 'a_receber',
      origem: 'manual',
      created_at: '',
      updated_at: ''
    }
  ];

  // Mês 1: não há meses anteriores -> Carteira = R$ 4.000
  const m1Wallet = calculateMonthWalletWithCarryover(txs, '2026-11');
  assert.equal(m1Wallet.carryoverProjected, 0);
  assert.equal(m1Wallet.walletTotalProjected, 4000);
  assert.equal(m1Wallet.walletTotalRealized, 4000);

  // Mês 2: entram os R$ 4.000 que sobraram + R$ 6.000 do novo salário = R$ 10.000
  const m2Carry = calculatePreviousMonthsCarryover(txs, '2026-12');
  assert.equal(m2Carry.projectedCarryover, 4000);
  assert.equal(m2Carry.realizedCarryover, 4000);

  const m2Wallet = calculateMonthWalletWithCarryover(txs, '2026-12');
  assert.equal(m2Wallet.carryoverProjected, 4000);
  assert.equal(m2Wallet.monthProjectedIncome, 6000);
  assert.equal(m2Wallet.walletTotalProjected, 10000);
  // Já realizado no Mês 2 (como salário está a_receber, mantém os R$ 4.000 realizados do mês 1)
  assert.equal(m2Wallet.walletTotalRealized, 4000);
});

test('Orçamento inclui contas não pagas (pendentes) para planejamento e alertas', () => {
  const cats: Categoria[] = [
    { id: 'cat_despesas', nome: 'Despesas', tipo: 'despesa', cor: '#EF4444', icone: 'Home', incluir_no_orcamento: true, ordem: 1, grupo_orcamento: 'essenciais' },
    { id: 'cat_lazer', nome: 'Lazer', tipo: 'despesa', cor: '#8B5CF6', icone: 'Smile', incluir_no_orcamento: true, ordem: 2, grupo_orcamento: 'lazer' },
    { id: 'cat_reserva', nome: 'Reserva e Metas', tipo: 'despesa', cor: '#10B981', icone: 'ShieldCheck', incluir_no_orcamento: true, ordem: 3, grupo_orcamento: 'reserva' }
  ];
  const cfg: BudgetConfig = {
    modo: 'percentual',
    perfil_ativo: 'equilibrado_50_30_20',
    renda_padrao_fallback: DEFAULT_FALLBACK_INCOME,
    aplicado_desde: '2026-11',
    percentuais_categoria: { cat_despesas: 50, cat_lazer: 30, cat_reserva: 20 },
    tetos_fixos_desde: {}
  };
  const txs: Lancamento[] = [
    { id: 'r1', data: '2026-11-05', tipo: 'receita', descricao: 'Salário', valor: 2000, conta_id: 'c1', categoria_id: 'cat_sal', status: 'recebido', origem: 'manual', created_at: '', updated_at: '' },
    { id: 'd1', data: '2026-11-10', tipo: 'despesa', descricao: 'Luz paga', valor: 400, conta_id: 'c1', categoria_id: 'cat_despesas', status: 'pago', origem: 'manual', created_at: '', updated_at: '' },
    { id: 'd2', data: '2026-11-25', tipo: 'despesa', descricao: 'Aluguel pendente', valor: 800, conta_id: 'c1', categoria_id: 'cat_despesas', status: 'pendente', origem: 'manual', created_at: '', updated_at: '' }
  ];

  const spent = calculateMonthBudgetSpent(txs, cats, '2026-11');
  assert.equal(spent.paidSpent, 400);
  assert.equal(spent.pendingSpent, 800);
  assert.equal(spent.totalSpent, 1200);

  // Teto de Despesas é 50% de 2000 = 1000. Com 400 pago + 800 pendente = 1200, deve alertar estouro em Despesas
  const insights = generateSmartInsights(txs, [], cats, [], new Date('2026-11-17T12:00:00'), '2026-11', cfg);
  assert.ok(insights.some(i => i.id === 'budget_blown_cat_despesas'));
});

