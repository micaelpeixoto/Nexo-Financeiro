import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Check,
  Paperclip,
  X,
  Wallet
} from 'lucide-react';
import {
  Lancamento,
  Categoria,
  Conta,
  DateFilterPreset
} from '../types';
import { formatCurrency, formatDateBr } from '../utils/i18n';
import {
  filterTransactionsByDatePreset,
  isRealized,
  addMonthsSafe,
  calculatePreviousMonthsCarryover
} from '../utils/calculations';
import { CategoryIcon } from './CategoryIcon';
import { DatePresetBar } from './DatePresetBar';
import { InfoTipButton } from './InfoTipButton';

interface TransactionsViewProps {
  currentYM: string;
  transactions: Lancamento[];
  categories: Categoria[];
  accounts: Conta[];
  onOpenNewTransaction: () => void;
  onSelectTransaction: (tx: Lancamento) => void;
  onToggleStatus: (txId: string) => void;
  onDeleteTransaction: (txId: string) => void;
}

type TypeFilter = 'todos' | 'despesas' | 'receitas';
type StatusFilter = 'todos' | 'realizados' | 'pendentes';

export function TransactionsView({
  currentYM,
  transactions,
  categories,
  accounts,
  onOpenNewTransaction,
  onSelectTransaction,
  onToggleStatus
}: TransactionsViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('mes_atual');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [sortBy, setSortBy] = useState<'data_desc' | 'data_asc' | 'valor_desc' | 'valor_asc'>('data_desc');
  const [showExtraFilters, setShowExtraFilters] = useState<boolean>(true);
  const [selectedCatId, setSelectedCatId] = useState<string>('todas');
  const [selectedAccId, setSelectedAccId] = useState<string>('todas');
  const [visibleLimit, setVisibleLimit] = useState<number>(50);
  const [showCarryoverModal, setShowCarryoverModal] = useState<boolean>(false);

  useEffect(() => {
    setVisibleLimit(50);
  }, [datePreset, currentYM, searchTerm, typeFilter, statusFilter, selectedCatId, selectedAccId, sortBy]);

  // Mapeamentos rápidos
  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  // 1. Filtra pelo seletor de data unificado (Dia, Mês Atual, Mês Passado, Ano, Todos)
  const dateFiltered = useMemo(() => {
    return filterTransactionsByDatePreset(transactions, datePreset, currentYM);
  }, [transactions, datePreset, currentYM]);

  // 1b. Calcula sobra dos meses anteriores para visões mensais (Mês Atual / Mês Passado)
  const targetMonthYM = useMemo(() => {
    if (datePreset === 'mes_atual') return currentYM;
    if (datePreset === 'mes_passado') return addMonthsSafe(`${currentYM}-01`, -1).slice(0, 7);
    return null;
  }, [datePreset, currentYM]);

  const carryoverInfo = useMemo(() => {
    if (!targetMonthYM) return null;
    return calculatePreviousMonthsCarryover(transactions, targetMonthYM);
  }, [transactions, targetMonthYM]);

  const activeCarryoverAmount = useMemo(() => {
    if (!carryoverInfo || !targetMonthYM) return 0;
    if (statusFilter === 'pendentes') return 0;
    return statusFilter === 'realizados'
      ? carryoverInfo.realizedCarryover
      : carryoverInfo.projectedCarryover;
  }, [carryoverInfo, targetMonthYM, statusFilter]);

  const virtualCarryoverTx = useMemo(() => {
    if (!targetMonthYM || activeCarryoverAmount === 0) return null;
    if (selectedCatId !== 'todas' || selectedAccId !== 'todas') return null;

    const isPositive = activeCarryoverAmount > 0;
    if (typeFilter === 'receitas' && !isPositive) return null;
    if (typeFilter === 'despesas' && isPositive) return null;

    const absVal = Math.abs(activeCarryoverAmount);
    const title = isPositive ? 'Sobra do mês anterior' : 'Saldo negativo do mês anterior';

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const hay = `${title} saldo acumulado meses anteriores ${absVal}`.toLowerCase();
      if (!hay.includes(q)) return null;
    }

    const virtualItem: Lancamento & { isCarryover?: boolean } = {
      id: '__carryover__',
      data: `${targetMonthYM}-01`,
      tipo: isPositive ? 'receita' : 'despesa',
      descricao: title,
      valor: absVal,
      conta_id: '__carryover__',
      categoria_id: '__carryover__',
      status: isPositive ? 'recebido' : 'pago',
      origem: 'manual',
      created_at: '',
      updated_at: '',
      isCarryover: true
    };
    return virtualItem;
  }, [targetMonthYM, activeCarryoverAmount, selectedCatId, selectedAccId, typeFilter, searchTerm]);

  // 2. Filtros combinados (busca, tipo, status, categoria, conta)
  const filteredTransactions = useMemo(() => {
    const baseFiltered: (Lancamento & { isCarryover?: boolean })[] = dateFiltered.filter(t => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const catName = catMap.get(t.categoria_id)?.nome.toLowerCase() || '';
        const accName = accMap.get(t.conta_id)?.nome.toLowerCase() || '';
        const desc = t.descricao.toLowerCase();
        const obs = (t.observacao || '').toLowerCase();
        const valStr = t.valor.toString();
        const matches =
          desc.includes(query) ||
          obs.includes(query) ||
          catName.includes(query) ||
          accName.includes(query) ||
          valStr.includes(query);
        if (!matches) return false;
      }

      if (typeFilter === 'receitas' && t.tipo !== 'receita') return false;
      if (typeFilter === 'despesas' && t.tipo !== 'despesa') return false;

      if (statusFilter === 'realizados' && !isRealized(t.status)) return false;
      if (statusFilter === 'pendentes' && isRealized(t.status)) return false;

      if (selectedCatId !== 'todas' && t.categoria_id !== selectedCatId) return false;
      if (selectedAccId !== 'todas' && t.conta_id !== selectedAccId) return false;

      return true;
    });

    if (virtualCarryoverTx) {
      baseFiltered.push(virtualCarryoverTx);
    }

    return baseFiltered.sort((a, b) => {
      if (sortBy === 'data_desc') {
        const cmp = b.data.localeCompare(a.data);
        if (cmp !== 0) return cmp;
        return (a.isCarryover ? 1 : 0) - (b.isCarryover ? 1 : 0);
      }
      if (sortBy === 'data_asc') {
        const cmp = a.data.localeCompare(b.data);
        if (cmp !== 0) return cmp;
        return (a.isCarryover ? -1 : 0) - (b.isCarryover ? -1 : 0);
      }
      if (sortBy === 'valor_desc') return b.valor - a.valor;
      if (sortBy === 'valor_asc') return a.valor - b.valor;
      return 0;
    });
  }, [dateFiltered, virtualCarryoverTx, searchTerm, typeFilter, statusFilter, selectedCatId, selectedAccId, sortBy, catMap, accMap]);

  // Totais do período filtrado (Receitas, Despesas, Balanço — inclui sobra anterior quando visível)
  const totals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of filteredTransactions) {
      if (t.tipo === 'receita') inc += t.valor;
      else exp += t.valor;
    }
    const income = Math.round(inc * 100) / 100;
    const expense = Math.round(exp * 100) / 100;
    const balance = Math.round((income - expense) * 100) / 100;
    return {
      income,
      expense,
      balance,
      count: filteredTransactions.length
    };
  }, [filteredTransactions]);

  const visibleTransactions = useMemo(
    () => filteredTransactions.slice(0, visibleLimit),
    [filteredTransactions, visibleLimit]
  );

  // Agrupamento por dia (renderiza em blocos de 50 para fluidez no celular)
  const groupedByDay = useMemo(() => {
    const map = new Map<string, (Lancamento & { isCarryover?: boolean })[]>();
    for (const t of visibleTransactions) {
      const day = t.data;
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(t);
    }
    return Array.from(map.entries());
  }, [visibleTransactions]);

  const hasActiveFilters =
    selectedCatId !== 'todas' ||
    selectedAccId !== 'todas' ||
    statusFilter !== 'todos' ||
    typeFilter !== 'todos' ||
    sortBy !== 'data_desc';

  return (
    <div className="space-y-3.5 pb-28">
      {/* CARD UNIFICADO DE FILTROS E RESUMO (ESTILO DO PRINT DO USUÁRIO) */}
      <div className="bg-slate-900 rounded-3xl p-4 border border-pearl-border shadow-lg space-y-3">
        {/* Linha 1: Busca + Botão Filtros + InfoTip */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por descrição, anotação ou..."
              className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowExtraFilters(!showExtraFilters)}
            className={`px-3 py-2.5 rounded-2xl border flex items-center space-x-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
              showExtraFilters || hasActiveFilters
                ? 'bg-pearl-soft border-pearl-border text-white'
                : 'bg-slate-950/90 border-slate-800 text-slate-300'
            }`}
          >
            <Filter size={13} />
            <span>Filtros</span>
          </button>

          <InfoTipButton
            title="Filtros do Extrato"
            description="Combine o seletor rápido de período com filtros de tipo, status, categoria e conta para encontrar qualquer movimentação."
            details={[
              'Os totais de Receitas, Despesas e Balanço na base do cartão acompanham exatamente os filtros aplicados.',
              'Toque no ícone ✓ ao lado de qualquer item para marcar como pago/recebido ou pendente.'
            ]}
          />
        </div>

        {/* Linha 2: Barra de Período 5 Opções (Dia, Mês Atual, Mês Passado, Ano, Todos) */}
        <DatePresetBar value={datePreset} onChange={setDatePreset} currentYM={currentYM} />

        {/* Linha 3: Tipo (Todos | Despesas | Receitas) + Status Dropdown */}
        {showExtraFilters && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="flex items-center p-1 rounded-2xl bg-slate-950/90 border border-pearl-border text-[11px] flex-1 min-w-0">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'despesas', label: 'Despesas' },
                  { id: 'receitas', label: 'Receitas' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTypeFilter(tab.id as TypeFilter)}
                    className={`flex-1 py-1.5 px-1 rounded-xl font-semibold transition-colors whitespace-nowrap ${
                      typeFilter === tab.id
                        ? 'bg-pearl-bg text-pearl-ink shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                aria-label="Filtrar por Status"
                className="w-[116px] shrink-0 px-2 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 text-[11px] font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="todos">Status: Todos</option>
                <option value="realizados">Status: Pagos</option>
                <option value="pendentes">Status: Pendentes</option>
              </select>
            </div>

            {/* Linha 4: Selects compactos de Categoria, Conta e Ordenação sem overflow */}
            <div className="space-y-2">
              <select
                value={selectedCatId}
                onChange={e => setSelectedCatId(e.target.value)}
                aria-label="Filtrar por Categoria"
                className="w-full min-w-0 px-3 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs font-medium text-slate-200 outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="todas">Categoria: Todas</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    Categoria: {c.nome} ({c.tipo === 'despesa' ? 'Despesa' : 'Receita'})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedAccId}
                  onChange={e => setSelectedAccId(e.target.value)}
                  aria-label="Filtrar por Conta"
                  className="w-full min-w-0 px-2.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs font-medium text-slate-200 outline-none focus:ring-2 focus:ring-brand-500 truncate"
                >
                  <option value="todas">Conta: Todas</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      Conta: {a.nome}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  aria-label="Ordenar lançamentos"
                  className="w-full min-w-0 px-2.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs font-medium text-slate-300 outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="data_desc">Mais recentes</option>
                  <option value="data_asc">Mais antigos</option>
                  <option value="valor_desc">Maior valor</option>
                  <option value="valor_asc">Menor valor</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('todos');
                    setStatusFilter('todos');
                    setSelectedCatId('todas');
                    setSelectedAccId('todas');
                    setSortBy('data_desc');
                  }}
                  className="text-[11px] font-semibold text-brand-400 hover:underline"
                >
                  Limpar filtros aplicados
                </button>
              </div>
            )}
          </div>
        )}

        {/* Indicação rápida quando há sobra de meses anteriores incluída */}
        {virtualCarryoverTx && (
          <div
            data-testid="extrato-carryover-badge"
            className="px-3 py-2 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-between text-[11px] tabular-nums"
          >
            <span className="text-slate-300">
              {activeCarryoverAmount > 0 ? 'Inclui sobra anterior:' : 'Inclui déficit anterior:'}
            </span>
            <span
              className={`font-bold ${
                activeCarryoverAmount > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(activeCarryoverAmount, true)}
            </span>
          </div>
        )}

        {/* Rodapé Resumo em 3 Colunas (Receitas / Despesas / Balanço) */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 tabular-nums">
          <div>
            <span className="text-[11px] text-slate-400 block">Receitas:</span>
            <span
              data-testid="transactions-summary-income"
              className="text-sm font-extrabold text-emerald-400 block mt-0.5"
            >
              {formatCurrency(totals.income)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Despesas:</span>
            <span
              data-testid="transactions-summary-expense"
              className="text-sm font-extrabold text-red-400 block mt-0.5"
            >
              {formatCurrency(totals.expense)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Balanço:</span>
            <span
              data-testid="transactions-summary-balance"
              className={`text-sm font-extrabold block mt-0.5 ${
                totals.balance >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(totals.balance, true)}
            </span>
          </div>
        </div>
      </div>

      {/* LISTA DE LANÇAMENTOS AGRUPADOS */}
      {groupedByDay.length === 0 ? (
        <div className="text-center py-14 bg-slate-900 rounded-3xl border border-dashed border-slate-800 p-6">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Search size={22} />
          </div>
          <h4 className="text-sm font-bold text-slate-200 mb-1">
            Nenhum lançamento encontrado
          </h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
            Nenhum item corresponde aos filtros e período selecionados.
          </p>
          <button
            type="button"
            onClick={onOpenNewTransaction}
            className="px-4 py-2 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-xs"
          >
            + Criar Lançamento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedByDay.map(([dateStr, items]) => {
            const dayTotal = items.reduce((acc, it) => {
              return it.tipo === 'receita' ? acc + it.valor : acc - it.valor;
            }, 0);

            return (
              <div key={dateStr} className="space-y-1.5">
                {/* Header do Dia */}
                <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-semibold text-slate-400">
                  <span>{formatDateBr(dateStr)}</span>
                  <span className={`tabular-nums ${dayTotal >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    Dia: {dayTotal >= 0 ? '+' : ''}
                    {formatCurrency(dayTotal)}
                  </span>
                </div>

                {/* Itens do Dia */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xs divide-y divide-slate-800/80 overflow-hidden">
                  {items.map(t => {
                    if (t.isCarryover) {
                      const isPositive = t.tipo === 'receita';
                      return (
                        <div
                          key={t.id}
                          data-testid="extrato-carryover-item"
                          onClick={() => setShowCarryoverModal(true)}
                          className="p-3 bg-slate-900/95 hover:bg-slate-800/60 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0 mr-2">
                            <div
                              className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                                isPositive
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-red-500/15 text-red-400 border-red-500/30'
                              }`}
                            >
                              <Wallet size={17} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-slate-100 truncate block">
                                {t.descricao}
                              </span>
                              <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-0.5">
                                <span>Saldo acumulado</span>
                                <span>•</span>
                                <span>Automático</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <div
                              className={`text-xs font-bold tabular-nums ${
                                isPositive ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {isPositive ? '+' : '-'}
                              {formatCurrency(t.valor)}
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md inline-block bg-slate-800 text-slate-300 border border-slate-700">
                              SALDO ANTERIOR
                            </span>
                          </div>
                        </div>
                      );
                    }

                    const cat = catMap.get(t.categoria_id);
                    const acc = accMap.get(t.conta_id);
                    const isIncome = t.tipo === 'receita';
                    const isPaid = isRealized(t.status);

                    return (
                      <div
                        key={t.id}
                        className="p-3 hover:bg-slate-800/40 transition-colors flex items-center justify-between group"
                      >
                        {/* Clique no corpo abre detalhes */}
                        <div
                          onClick={() => onSelectTransaction(t)}
                          className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer mr-2"
                        >
                          <CategoryIcon
                            name={cat?.icone || 'HelpCircle'}
                            color={cat?.cor || '#64748B'}
                            size={18}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-semibold text-slate-100 truncate">
                                {t.descricao}
                              </span>
                              {t.anexo_path && (
                                <Paperclip size={12} className="text-slate-400 flex-shrink-0" />
                              )}
                            </div>

                            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mt-0.5">
                              <span>{cat?.nome || 'Geral'}</span>
                              <span>•</span>
                              <span>{acc?.nome || 'Conta'}</span>
                              {t.parcela_numero && t.parcela_total && (
                                <>
                                  <span>•</span>
                                  <span className="text-purple-400 font-medium">
                                    {t.parcela_numero}/{t.parcela_total}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Valor formatado e ação rápida de status */}
                        <div className="flex items-center space-x-2.5">
                          <div className="text-right">
                            <div
                              className={`text-xs font-bold tabular-nums ${
                                isIncome ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {isIncome ? '+' : '-'}
                              {formatCurrency(t.valor)}
                            </div>
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md inline-block ${
                                isPaid
                                  ? 'bg-emerald-950/70 text-emerald-300'
                                  : 'bg-amber-950/70 text-amber-300'
                              }`}
                            >
                              {t.status === 'a_receber' ? 'A RECEBER' : t.status.toUpperCase()}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onToggleStatus(t.id)}
                            className={`p-1.5 rounded-xl border transition-colors ${
                              isPaid
                                ? 'border-emerald-800 text-emerald-400 hover:bg-emerald-950'
                                : 'border-slate-700 text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                            }`}
                            title={isPaid ? 'Marcar como pendente' : 'Marcar como pago'}
                            aria-label={`Alternar status do lançamento ${t.descricao}`}
                          >
                            <Check size={14} strokeWidth={isPaid ? 3 : 2} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredTransactions.length > visibleLimit && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleLimit(prev => prev + 50)}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-brand-400 transition-colors"
              >
                Mostrar mais ({filteredTransactions.length - visibleLimit} restantes)
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL INFORMATIVO DO SALDO ANTERIOR */}
      {showCarryoverModal && (
        <div
          onClick={() => setShowCarryoverModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-800 space-y-3"
          >
            <div className="flex items-center space-x-2.5">
              <div
                className={`w-9 h-9 rounded-2xl border flex items-center justify-center ${
                  activeCarryoverAmount >= 0
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/15 border-red-500/30 text-red-400'
                }`}
              >
                <Wallet size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">
                  {activeCarryoverAmount >= 0 ? 'Sobra do mês anterior' : 'Saldo negativo anterior'}
                </h4>
                <span
                  className={`text-xs font-extrabold tabular-nums ${
                    activeCarryoverAmount >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(activeCarryoverAmount, true)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Este valor é calculado automaticamente somando tudo o que entrou menos tudo o que saiu nos meses anteriores ao mês selecionado.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Se você adicionar, editar ou pagar algum lançamento de meses passados, essa sobra será recalculada na hora — tanto aqui no Extrato quanto na Carteira do Mês.
            </p>

            <button
              type="button"
              onClick={() => setShowCarryoverModal(false)}
              className="w-full py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
