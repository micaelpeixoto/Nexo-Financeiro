import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Trash2
} from 'lucide-react';
import { formatMonthYear } from '../utils/i18n';
import { addMonthsSafe } from '../utils/calculations';

interface HeaderProps {
  currentYM: string;
  onChangeYM: (newYM: string) => void;
  hasDemoData: boolean;
  onClearDemoData: () => void;
  userName?: string;
}

export function Header({
  currentYM,
  onChangeYM,
  hasDemoData,
  onClearDemoData,
  userName = 'Carlos'
}: HeaderProps) {
  const handlePrevMonth = () => {
    const prev = addMonthsSafe(`${currentYM}-01`, -1).slice(0, 7);
    onChangeYM(prev);
  };

  const handleNextMonth = () => {
    const next = addMonthsSafe(`${currentYM}-01`, 1).slice(0, 7);
    onChangeYM(next);
  };

  return (
    <header className="sticky top-0 z-30 bg-[var(--app-bg)]/98 pt-safe border-b border-slate-800/90">
      <div className="max-w-md mx-auto px-4 py-2.5">
        {/* Linha superior: Marca, Offline status e Saudação */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 min-w-0">
            <img
              src="./assets/nexo-icon.png"
              alt="Nexo Financeiro"
              className="w-7 h-7 rounded-lg object-cover border border-pearl-border shadow-xs flex-shrink-0"
            />
            <span className="font-extrabold text-base tracking-tight text-white truncate">
              Nexo <span className="text-brand-400">Financeiro</span>
            </span>
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-300/40 dark:border-emerald-700/40 flex-shrink-0">
              <ShieldCheck size={11} />
              <span>Offline</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Olá, <span className="font-semibold text-white">{userName}</span>
            </span>
          </div>
        </div>

        {/* Seletor do Mês de Referência */}
        <div className="flex items-center justify-between bg-slate-900 rounded-2xl p-1.5 shadow-xs border border-pearl-border">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-200 transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center space-x-2">
            <Calendar size={15} className="text-pearl-text" />
            <span className="font-semibold text-sm text-white capitalize">
              {formatMonthYear(currentYM)}
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-200 transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Banner discreto quando dados de demonstração estão ativos */}
        {hasDemoData && (
          <div className="mt-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs">
            <div className="flex items-center space-x-1.5">
              <Sparkles size={14} className="text-amber-500 flex-shrink-0" />
              <span>Exibindo dados de demonstração</span>
            </div>
            <button
              onClick={onClearDemoData}
              className="flex items-center space-x-1 font-semibold text-red-600 dark:text-red-400 hover:underline ml-2"
              title="Excluir dados demo"
            >
              <Trash2 size={12} />
              <span>Limpar</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
