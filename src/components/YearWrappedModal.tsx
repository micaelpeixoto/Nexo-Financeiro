import React, { useMemo } from 'react';
import {
  X,
  Sparkles,
  Trophy,
  TrendingUp,
  Flame,
  Award,
  Crown,
  Share2
} from 'lucide-react';
import { Lancamento, Categoria, Meta } from '../types';
import {
  calculateMonthRealized,
  isRealized
} from '../utils/calculations';
import { formatCurrency, formatMonthYear, formatDateBr } from '../utils/i18n';
import { CategoryIcon } from './CategoryIcon';

interface YearWrappedModalProps {
  year: string; // "2026"
  userName: string;
  transactions: Lancamento[];
  categories: Categoria[];
  metas: Meta[];
  onClose: () => void;
  onShare: () => void;
}

export function YearWrappedModal({
  year,
  userName,
  transactions,
  categories,
  metas,
  onClose,
  onShare
}: YearWrappedModalProps) {
  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Filtra lançamentos estritamente do próprio ano
  const yearTransactions = useMemo(() => {
    return transactions.filter(t => t.data.startsWith(year) && isRealized(t.status));
  }, [transactions, year]);

  // 1. Maior gasto do ano
  const biggestExpense = useMemo(() => {
    const expenses = yearTransactions.filter(t => t.tipo === 'despesa');
    if (expenses.length === 0) return null;
    return [...expenses].sort((a, b) => b.valor - a.valor)[0];
  }, [yearTransactions]);

  // 2. Categoria campeã em despesas
  const topCategory = useMemo(() => {
    const expenses = yearTransactions.filter(t => t.tipo === 'despesa');
    const map = new Map<string, number>();
    for (const t of expenses) {
      map.set(t.categoria_id, (map.get(t.categoria_id) || 0) + t.valor);
    }
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    const cat = catMap.get(sorted[0][0]);
    return {
      nome: cat?.nome || 'Geral',
      cor: cat?.cor || '#EF4444',
      icone: cat?.icone || 'HelpCircle',
      total: sorted[0][1]
    };
  }, [yearTransactions, catMap]);

  // 3. Meses economizados (resultado positivo)
  const positiveMonthsCount = useMemo(() => {
    let count = 0;
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, '0')}`;
      const sum = calculateMonthRealized(transactions, ym);
      if (sum.income > 0 && sum.balance > 0) {
        count++;
      }
    }
    return count;
  }, [transactions, year]);

  // 4. Principal conquista de meta
  const topGoalAchievement = useMemo(() => {
    return metas.find(m => m.valor_alvo > 0 && m.valor_atual >= m.valor_alvo) || metas[0] || null;
  }, [metas]);

  // Totais do ano
  const yearIncome = yearTransactions.filter(t => t.tipo === 'receita').reduce((a, b) => a + b.valor, 0);
  const yearExpense = yearTransactions.filter(t => t.tipo === 'despesa').reduce((a, b) => a + b.valor, 0);
  const yearSavings = Math.max(0, yearIncome - yearExpense);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-[var(--app-bg)] to-brand-950 text-white rounded-3xl p-6 shadow-2xl border border-brand-500/30 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Topo: Fechar e Título comemorativo */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-brand-500/20 text-brand-400">
              <Sparkles size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
              Retrospectiva {year}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="text-center my-3">
          <h2 className="text-2xl font-extrabold tracking-tight">
            Seu Ano em Números, {userName}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Veja as principais conquistas e marcos que construíram seu ano financeiro.
          </p>
        </div>

        {/* CARDS ESTILO WRAPPED */}
        <div className="space-y-3 my-4">
          {/* Card 1: Meses Economizados */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Flame size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Consistência Financeira
              </span>
              <h4 className="text-sm font-bold text-white">
                {positiveMonthsCount} de 12 meses no azul!
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Você fechou com sobra e construiu segurança ao longo do ano.
              </p>
            </div>
          </div>

          {/* Card 2: Categoria Campeã */}
          {topCategory && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                <Crown size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                  Categoria Mais Presente
                </span>
                <h4 className="text-sm font-bold text-white truncate">
                  {topCategory.nome}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 tabular-nums">
                  Total de {formatCurrency(topCategory.total)} alocados aqui neste ano.
                </p>
              </div>
            </div>
          )}

          {/* Card 3: Maior Gasto Individual */}
          {biggestExpense && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Trophy size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Maior Despesa Registrada
                </span>
                <h4 className="text-sm font-bold text-white truncate">
                  {biggestExpense.descricao}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 tabular-nums">
                  {formatCurrency(biggestExpense.valor)} em {formatDateBr(biggestExpense.data)}
                </p>
              </div>
            </div>
          )}

          {/* Card 4: Principal Conquista de Meta */}
          {topGoalAchievement && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Award size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Destaque em Metas
                </span>
                <h4 className="text-sm font-bold text-white truncate">
                  {topGoalAchievement.nome}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 tabular-nums">
                  {formatCurrency(topGoalAchievement.valor_atual)} acumulados com foco.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé e Ação de Compartilhar */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              onClose();
              onShare();
            }}
            className="w-full py-3 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/30 transition-all"
          >
            <Share2 size={15} />
            <span>Compartilhar Meu Ano</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-colors"
          >
            Fechar Retrospectiva
          </button>
        </div>
      </div>
    </div>
  );
}
