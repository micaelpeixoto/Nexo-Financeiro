import React, { useState, useMemo } from 'react';
import {
  Share2,
  Sparkles,
  FileSpreadsheet,
  Table,
  Download
} from 'lucide-react';
import { Lancamento, Categoria, Conta, DateFilterPreset } from '../types';
import {
  calculateMonthRealized,
  calculateSavingsRate,
  filterTransactionsByDatePreset,
  isRealized
} from '../utils/calculations';
import { formatCurrency, formatShortDateBr } from '../utils/i18n';
import { exportTransactionsToCSV } from '../utils/export';
import { DatePresetBar } from './DatePresetBar';
import { InfoTipButton } from './InfoTipButton';

interface ReportsViewProps {
  currentYM: string;
  transactions: Lancamento[];
  categories: Categoria[];
  accounts: Conta[];
  onOpenShareMonth: () => void;
  onOpenYearWrapped: () => void;
}

type SheetStatusFilter = 'todos' | 'realizados' | 'pendentes';

const PRESET_LABEL: Record<DateFilterPreset, string> = {
  dia: 'Hoje',
  mes_atual: 'Mês Atual',
  mes_passado: 'Mês Passado',
  ano: 'Ano',
  todos: 'Todo o Histórico'
};

export function ReportsView({
  currentYM,
  transactions,
  categories,
  accounts,
  onOpenShareMonth,
  onOpenYearWrapped
}: ReportsViewProps) {
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('mes_atual');
  const [activeTab, setActiveTab] = useState<'categorias' | 'evolucao' | 'planilha'>('categorias');
  const [sheetFilter, setSheetFilter] = useState<SheetStatusFilter>('todos');

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

  // Lançamentos do período selecionado pelo DatePresetBar
  const periodTransactions = useMemo(() => {
    return filterTransactionsByDatePreset(transactions, datePreset, currentYM);
  }, [transactions, datePreset, currentYM]);

  // Lançamentos realizados para gráficos/resumo oficial
  const filteredTransactions = useMemo(() => {
    return periodTransactions.filter(t => isRealized(t.status));
  }, [periodTransactions]);

  // Lançamentos para a planilha (suporta todos, realizados ou pendentes)
  const spreadsheetTransactions = useMemo(() => {
    return periodTransactions
      .filter(t => {
        if (sheetFilter === 'realizados') return isRealized(t.status);
        if (sheetFilter === 'pendentes') return !isRealized(t.status);
        return true;
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [periodTransactions, sheetFilter]);

  const spreadsheetTotals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of spreadsheetTransactions) {
      if (t.tipo === 'receita') inc += t.valor;
      else exp += t.valor;
    }
    return {
      income: Math.round(inc * 100) / 100,
      expense: Math.round(exp * 100) / 100,
      balance: Math.round((inc - exp) * 100) / 100
    };
  }, [spreadsheetTransactions]);

  // Totais agregados do período (realizados)
  const totals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of filteredTransactions) {
      if (t.tipo === 'receita') inc += t.valor;
      else exp += t.valor;
    }
    const bal = inc - exp;
    return {
      income: Math.round(inc * 100) / 100,
      expense: Math.round(exp * 100) / 100,
      balance: Math.round(bal * 100) / 100,
      savingsRate: calculateSavingsRate(inc, bal)
    };
  }, [filteredTransactions]);

  // Totais por categoria de despesas
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filteredTransactions) {
      if (t.tipo === 'despesa') {
        map.set(t.categoria_id, (map.get(t.categoria_id) || 0) + t.valor);
      }
    }

    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = catMap.get(catId);
        const pct = totals.expense > 0 ? Math.round((amount / totals.expense) * 100) : 0;
        return {
          id: catId,
          nome: cat?.nome || 'Outros',
          cor: cat?.cor || '#64748B',
          icone: cat?.icone || 'HelpCircle',
          amount: Math.round(amount * 100) / 100,
          percentage: pct
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, totals.expense, catMap]);

  // Meses relevantes para evolução mensal
  const relevantMonths = useMemo(() => {
    const set = new Set<string>();
    for (const t of periodTransactions) {
      set.add(t.data.slice(0, 7));
    }
    if (set.size === 0) {
      if (datePreset === 'ano') {
        const y = currentYM.slice(0, 4);
        return Array.from({ length: 12 }, (_, idx) => `${y}-${String(idx + 1).padStart(2, '0')}`);
      }
      return [currentYM];
    }
    return Array.from(set).sort();
  }, [periodTransactions, datePreset, currentYM]);

  // Evolução mês a mês para gráfico de barras
  const monthlySeries = useMemo(() => {
    return relevantMonths.map(ym => {
      const sum = calculateMonthRealized(transactions, ym);
      const [, m] = ym.split('-');
      const monthNamesShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return {
        ym,
        label: `${monthNamesShort[parseInt(m, 10) - 1]}/${ym.slice(2, 4)}`,
        income: sum.income,
        expense: sum.expense,
        balance: sum.balance
      };
    });
  }, [relevantMonths, transactions]);

  const maxSeriesVal = Math.max(1, ...monthlySeries.map(s => Math.max(s.income, s.expense)));

  const handleExportCSV = () => {
    const itemsToExport =
      activeTab === 'planilha' ? spreadsheetTransactions : filteredTransactions;
    exportTransactionsToCSV(
      itemsToExport,
      categories,
      accounts,
      `relatorio_planilha_${datePreset}.csv`
    );
  };

  return (
    <div className="space-y-4 pb-28">
      {/* SELEÇÃO DO PERÍODO IGUAL AO PRINT + RETROSPECTIVA */}
      <div className="bg-slate-900 p-3.5 rounded-3xl border border-slate-800/90 shadow-md space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Período do Relatório
            </span>
            <InfoTipButton
              title="Relatórios e Planilha"
              description="Filtre rapidamente seus resultados por Dia, Mês Atual, Mês Passado, Ano ou Todos."
              details={[
                'As abas Por Categorias e Evolução Mensal consideram apenas lançamentos já realizados (pagos/recebidos).',
                'Na aba Planilha você pode alternar entre Todos, Realizados ou Pendentes e exportar em .CSV para Excel.'
              ]}
            />
          </div>

          <button
            type="button"
            onClick={onOpenYearWrapped}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900 text-purple-300 font-bold text-xs border border-purple-700/50 transition-colors whitespace-nowrap"
          >
            <Sparkles size={13} />
            <span>Retrospectiva</span>
          </button>
        </div>

        <DatePresetBar value={datePreset} onChange={setDatePreset} currentYM={currentYM} />
      </div>

      {/* CARD DE RESUMO CONSOLIDADO DO PERÍODO */}
      <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800/90 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">
            Resumo Realizado • {datePreset === 'ano' ? `Ano ${currentYM.slice(0, 4)}` : PRESET_LABEL[datePreset]}
          </span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
            {totals.savingsRate} economizado
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="p-2.5 rounded-2xl bg-slate-800/70">
            <span className="text-[10px] text-slate-400 block">Receitas</span>
            <span className="text-xs font-bold text-emerald-400 tabular-nums block mt-0.5">
              {formatCurrency(totals.income)}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-800/70">
            <span className="text-[10px] text-slate-400 block">Despesas</span>
            <span className="text-xs font-bold text-red-400 tabular-nums block mt-0.5">
              {formatCurrency(totals.expense)}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-800/70">
            <span className="text-[10px] text-slate-400 block">Balanço</span>
            <span
              className={`text-xs font-bold tabular-nums block mt-0.5 ${
                totals.balance >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(totals.balance, true)}
            </span>
          </div>
        </div>
      </div>

      {/* AÇÕES RÁPIDAS: COMPARTILHAR, PLANILHA NA TELA, EXPORTAR CSV */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onOpenShareMonth}
          className="py-2.5 px-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs"
        >
          <Share2 size={14} />
          <span>Compartilhar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('planilha')}
          className={`py-2.5 px-2.5 rounded-2xl border font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors ${
            activeTab === 'planilha'
              ? 'bg-brand-950/70 border-brand-500 text-brand-300'
              : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Table size={14} />
          <span>Ver Planilha</span>
        </button>

        <button
          type="button"
          onClick={handleExportCSV}
          className="py-2.5 px-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1.5 hover:bg-slate-800"
        >
          <FileSpreadsheet size={14} />
          <span>Baixar CSV</span>
        </button>
      </div>

      {/* TABS DE VISUALIZAÇÃO: POR CATEGORIA / EVOLUÇÃO / PLANILHA */}
      <div className="flex items-center space-x-4 border-b border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('categorias')}
          className={`pb-2 px-1 border-b-2 transition-all ${
            activeTab === 'categorias'
              ? 'border-brand-500 text-brand-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Por Categorias
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('evolucao')}
          className={`pb-2 px-1 border-b-2 transition-all ${
            activeTab === 'evolucao'
              ? 'border-brand-500 text-brand-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Evolução Mensal
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('planilha')}
          data-testid="reports-spreadsheet-tab"
          className={`pb-2 px-1 border-b-2 transition-all ${
            activeTab === 'planilha'
              ? 'border-brand-500 text-brand-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Planilha
        </button>
      </div>

      {/* TAB 1: POR CATEGORIAS */}
      {activeTab === 'categorias' && (
        <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800/90 shadow-md space-y-3">
          <h4 className="text-xs font-bold text-slate-200">Despesas por Categoria</h4>

          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              Nenhuma despesa realizada neste período.
            </p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map(cat => (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.cor }}
                      />
                      <span className="font-semibold text-slate-200">{cat.nome}</span>
                    </div>
                    <div className="flex items-center space-x-2 tabular-nums">
                      <span className="font-bold text-white">{formatCurrency(cat.amount)}</span>
                      <span className="text-[10px] text-slate-400">({cat.percentage}%)</span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.cor
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EVOLUÇÃO MENSAL */}
      {activeTab === 'evolucao' && (
        <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800/90 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200">Entradas × Saídas no Período</h4>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
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

          <div className="h-44 flex items-end justify-between pt-4 pb-1 border-b border-slate-800 overflow-x-auto no-scrollbar gap-2">
            {monthlySeries.map(item => {
              const incH = Math.max(6, (item.income / maxSeriesVal) * 120);
              const expH = Math.max(6, (item.expense / maxSeriesVal) * 120);

              return (
                <div key={item.ym} className="flex flex-col items-center flex-1 min-w-[42px] h-full justify-end">
                  <div className="flex items-end space-x-1 h-32 justify-center w-full">
                    <div
                      className="w-2.5 rounded-t-sm bg-emerald-500 transition-all duration-300"
                      style={{ height: `${incH}px` }}
                      title={`Entradas: ${formatCurrency(item.income)}`}
                    />
                    <div
                      className="w-2.5 rounded-t-sm bg-red-400 transition-all duration-300"
                      style={{ height: `${expH}px` }}
                      title={`Saídas: ${formatCurrency(item.expense)}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium mt-1 truncate">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: RELATÓRIO EM PLANILHA */}
      {activeTab === 'planilha' && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800/90 shadow-md overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Table size={14} className="text-brand-400" />
                <span>Relatório em Planilha ({spreadsheetTransactions.length} itens)</span>
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Deslize horizontalmente para ver todas as colunas ou exporte para Excel (.csv).
              </p>
            </div>

            <div className="flex items-center space-x-1.5">
              {(['todos', 'realizados', 'pendentes'] as SheetStatusFilter[]).map(sf => (
                <button
                  key={sf}
                  type="button"
                  onClick={() => setSheetFilter(sf)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition-colors ${
                    sheetFilter === sf
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sf}
                </button>
              ))}
            </div>
          </div>

          {spreadsheetTransactions.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-slate-400">
              Nenhum lançamento encontrado neste período/filtro.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-800">
                      <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">Data</th>
                      <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">Descrição</th>
                      <th className="py-2.5 px-2.5 font-bold text-right whitespace-nowrap">Valor</th>
                      <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">Categoria</th>
                      <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">Conta</th>
                      <th className="py-2.5 px-2.5 font-bold whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {spreadsheetTransactions.map((tx, idx) => {
                      const cat = catMap.get(tx.categoria_id);
                      const acc = accMap.get(tx.conta_id);
                      const isInc = tx.tipo === 'receita';
                      const realizedTx = isRealized(tx.status);

                      return (
                        <tr
                          key={tx.id}
                          className={idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/30'}
                        >
                          <td className="py-2 px-2.5 text-slate-400 whitespace-nowrap tabular-nums">
                            {formatShortDateBr(tx.data)}
                          </td>
                          <td className="py-2 px-2.5 font-semibold text-slate-100 max-w-[135px] truncate">
                            {tx.descricao}
                          </td>
                          <td
                            className={`py-2 px-2.5 text-right font-bold whitespace-nowrap tabular-nums ${
                              isInc ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {isInc ? '+' : '-'}
                            {formatCurrency(tx.valor)}
                          </td>
                          <td className="py-2 px-2.5 text-slate-300 whitespace-nowrap">
                            {cat?.nome || 'Outros'}
                          </td>
                          <td className="py-2 px-2.5 text-slate-400 whitespace-nowrap">
                            {acc?.nome || 'Conta'}
                          </td>
                          <td className="py-2 px-2.5 whitespace-nowrap">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                realizedTx
                                  ? 'bg-emerald-950/70 text-emerald-300'
                                  : 'bg-amber-950/70 text-amber-300'
                              }`}
                            >
                              {tx.status === 'a_receber' ? 'A receber' : tx.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Barra fixa de totais da planilha */}
              <div className="bg-slate-800/70 border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-200 block">
                    Total ({spreadsheetTransactions.length} {spreadsheetTransactions.length === 1 ? 'item' : 'itens'})
                  </span>
                  <span className="text-[10px] text-slate-400 tabular-nums">
                    +{formatCurrency(spreadsheetTotals.income)} / -{formatCurrency(spreadsheetTotals.expense)}
                  </span>
                </div>
                <span
                  className={`font-extrabold text-sm tabular-nums ${
                    spreadsheetTotals.balance >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(spreadsheetTotals.balance, true)}
                </span>
              </div>
            </>
          )}

          <div className="p-3 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center space-x-1.5"
            >
              <Download size={13} />
              <span>Exportar Planilha para Excel (.CSV)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
