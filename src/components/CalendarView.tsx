import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Lancamento, Categoria, Conta } from '../types';
import { formatCurrency, formatMonthYear, formatDateBr, WEEKDAYS_SHORT } from '../utils/i18n';
import { addMonthsSafe, toISODate, isRealized, calculateDaysToDue } from '../utils/calculations';
import { CategoryIcon } from './CategoryIcon';

interface CalendarViewProps {
  currentYM: string;
  transactions: Lancamento[];
  categories: Categoria[];
  accounts: Conta[];
  onSelectTransaction: (tx: Lancamento) => void;
  onToggleStatus: (txId: string) => void;
}

export function CalendarView({
  currentYM,
  transactions,
  categories,
  accounts,
  onSelectTransaction,
  onToggleStatus
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(`${currentYM}-01`);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Dias da grade do calendário do mês
  const calendarDays = useMemo(() => {
    const [year, month] = currentYM.split('-').map(Number);
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Domingo
    const totalDays = new Date(year, month, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Dias vazios do mês anterior
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dateStr: '', dayNum: 0, isCurrentMonth: false });
    }

    // Dias do mês atual
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYM}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    return days;
  }, [currentYM]);

  // Mapeamento de transações por dia
  const dayTxMap = useMemo(() => {
    const map = new Map<string, Lancamento[]>();
    for (const t of transactions) {
      if (!map.has(t.data)) map.set(t.data, []);
      map.get(t.data)!.push(t);
    }
    return map;
  }, [transactions]);

  // Itens do dia selecionado
  const selectedDayItems = useMemo(() => {
    return dayTxMap.get(selectedDate) || [];
  }, [dayTxMap, selectedDate]);

  // Próximos 10 compromissos futuros ou pendentes
  const upcomingCommitments = useMemo(() => {
    const todayISO = toISODate(new Date());
    return transactions
      .filter(t => t.tipo === 'despesa' && (t.status === 'pendente' || t.data >= todayISO))
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 10);
  }, [transactions]);

  return (
    <div className="space-y-4 pb-24">
      {/* GRADE DO CALENDÁRIO */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
            <CalendarIcon size={14} className="text-brand-400" />
            <span>Calendário Financeiro</span>
          </span>
          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Receita</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Pendente</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>Despesa</span>
            </span>
          </div>
        </div>

        {/* Nomes dos dias da semana */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-bold text-slate-400">
          {WEEKDAYS_SHORT.map((wd, i) => (
            <div key={i} className="py-1">
              {wd}
            </div>
          ))}
        </div>

        {/* Grade de dias */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((item, idx) => {
            if (!item.isCurrentMonth) {
              return <div key={idx} className="h-10 rounded-xl bg-transparent" />;
            }

            const items = dayTxMap.get(item.dateStr) || [];
            const hasIncome = items.some(t => t.tipo === 'receita');
            const hasPending = items.some(t => t.status === 'pendente' || t.status === 'a_receber');
            const hasExpensePaid = items.some(t => t.tipo === 'despesa' && (t.status === 'pago' || t.status === 'recebido'));

            const isSelected = selectedDate === item.dateStr;
            const isToday = item.dateStr === toISODate(new Date());

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(item.dateStr)}
                className={`h-11 rounded-2xl flex flex-col items-center justify-center relative transition-all ${
                  isSelected
                    ? 'bg-brand-600 text-white font-bold shadow-md shadow-brand-500/25'
                    : isToday
                    ? 'bg-brand-950/50 text-brand-300 font-bold border border-brand-500/50'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="text-xs">{item.dayNum}</span>

                {/* Bolinhas indicadoras de status/tipo */}
                <div className="flex items-center space-x-0.5 mt-0.5">
                  {hasIncome && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                  )}
                  {hasPending && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-amber-200' : 'bg-amber-500'}`} />
                  )}
                  {hasExpensePaid && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-red-200' : 'bg-red-500'}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* LANÇAMENTOS DO DIA SELECIONADO */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Lançamentos em {formatDateBr(selectedDate)}
          </span>
          <span className="text-[11px] text-slate-400">
            {selectedDayItems.length} {selectedDayItems.length === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {selectedDayItems.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            Nenhum compromisso financeiro para esta data.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedDayItems.map(t => {
              const cat = catMap.get(t.categoria_id);
              const isIncome = t.tipo === 'receita';
              const isPaid = isRealized(t.status);

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                >
                  <div
                    onClick={() => onSelectTransaction(t)}
                    className="flex items-center space-x-2.5 cursor-pointer flex-1 min-w-0 mr-2"
                  >
                    <CategoryIcon name={cat?.icone || 'HelpCircle'} color={cat?.cor || '#64748B'} size={16} />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                        {t.descricao}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {cat?.nome || 'Geral'} • {t.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(t.valor)}
                    </span>
                    <button
                      onClick={() => onToggleStatus(t.id)}
                      className={`p-1 rounded-lg border text-xs ${
                        isPaid
                          ? 'border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950'
                          : 'border-slate-200 text-slate-400 hover:text-emerald-500'
                      }`}
                    >
                      <CheckCircle2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PRÓXIMOS 10 COMPROMISSOS FINANCEIROS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Próximos 10 Compromissos Financeiros
        </h4>

        {upcomingCommitments.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            Sem compromissos agendados.
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingCommitments.map(item => {
              const cat = catMap.get(item.categoria_id);
              const days = calculateDaysToDue(item.data);

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectTransaction(item)}
                  className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <CategoryIcon name={cat?.icone || 'HelpCircle'} color={cat?.cor || '#64748B'} size={15} />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate block">
                        {item.descricao}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateBr(item.data)} ({days === 0 ? 'Hoje' : days > 0 ? `em ${days} dias` : `atrasado ${Math.abs(days)}d`})
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-red-600 dark:text-red-400 tabular-nums ml-2">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
