/**
 * Dicionário de strings e formatação localizada para Português do Brasil (pt-BR)
 * Moeda: Real (R$), Formato: 1.234,56
 * Datas: dd/mm/aaaa
 */

export const MONTH_NAMES_FULL = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

export const MONTH_NAMES_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez'
];

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Formata um valor numérico para Moeda Brasileira (R$ 1.234,56)
 */
export function formatCurrency(value: number, showSign: boolean = false): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }

  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (showSign) {
    if (value > 0) return `+R$ ${formatted}`;
    if (value < 0) return `-R$ ${formatted}`;
    return `R$ ${formatted}`;
  }

  return `${value < 0 ? '-' : ''}R$ ${formatted}`;
}

/**
 * Formata valor sem o prefixo R$ (ex: "1.234,56")
 */
export function formatNumberBr(value: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0,00';
  }
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Converte data ISO YYYY-MM-DD para formato brasileiro dd/mm/aaaa
 */
export function formatDateBr(isoDate: string): string {
  if (!isoDate || isoDate.length < 10) return '';
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Retorna data curta, ex.: "09 nov" ou "09 de nov"
 */
export function formatShortDateBr(isoDate: string): string {
  if (!isoDate || isoDate.length < 10) return '';
  const [, month, day] = isoDate.slice(0, 10).split('-');
  const monthIdx = parseInt(month, 10) - 1;
  const monthShort = MONTH_NAMES_SHORT[monthIdx] || '';
  return `${day} ${monthShort.toLowerCase()}`;
}

/**
 * Retorna nome do mês e ano formatado, ex: "Novembro de 2026"
 */
export function formatMonthYear(yearMonth: string): string {
  if (!yearMonth || yearMonth.length < 7) return '';
  const [year, month] = yearMonth.slice(0, 7).split('-');
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = MONTH_NAMES_FULL[monthIdx] || '';
  return `${monthName} de ${year}`;
}

export const STRINGS = {
  app_name: 'Nexo Financeiro',
  tagline: 'Controle financeiro pessoal descomplicado e seguro',
  nav: {
    dashboard: 'Início',
    transactions: 'Lançamentos',
    budgets: 'Orçamentos',
    goals: 'Metas',
    more: 'Menu'
  },
  status: {
    pago: 'Pago',
    pendente: 'Pendente',
    recebido: 'Recebido',
    a_receber: 'A receber'
  },
  types: {
    receita: 'Receita',
    despesa: 'Despesa'
  },
  accounts: {
    corrente: 'Conta Corrente',
    digital: 'Conta Digital',
    cartao: 'Cartão de Crédito',
    dinheiro: 'Dinheiro Físico',
    poupanca: 'Poupança / Reserva'
  },
  messages: {
    empty_transactions: 'Nenhum lançamento ainda. Toque em + e registre o primeiro.',
    empty_goals: 'Nenhuma meta criada. Defina um objetivo para acompanhar seu progresso.',
    empty_budgets: 'Nenhum teto de gastos definido para as categorias deste mês.',
    saved_success: 'Registrado ✓ — aparece no dashboard',
    updated_success: 'Atualizado com sucesso ✓',
    deleted_success: 'Lançamento excluído ✓',
    backup_exported: 'Backup exportado com sucesso',
    backup_imported: 'Dados restaurados com sucesso ✓',
    import_error: 'Não conseguimos ler esse arquivo. Ele precisa estar no formato CSV ou JSON de backup deste app.',
    offline_notice: 'Modo Offline: todos os seus dados ficam salvos em segurança no seu aparelho.'
  }
};
