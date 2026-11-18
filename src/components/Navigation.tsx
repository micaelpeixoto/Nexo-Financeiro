import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  PieChart,
  Target,
  Menu
} from 'lucide-react';

export type TabType = 'dashboard' | 'transactions' | 'budgets' | 'goals' | 'menu';

interface NavigationProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenNewTransaction: () => void;
}

export function Navigation({
  activeTab,
  onSelectTab,
  onOpenNewTransaction
}: NavigationProps) {
  return (
    <nav
      aria-label="Navegação Principal"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 border-t border-pearl-border pb-safe shadow-lg"
    >
      <div className="max-w-md mx-auto px-2 h-16 grid grid-cols-6 items-center relative">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center h-full pt-1.5 pb-1 transition-all relative ${
            activeTab === 'dashboard'
              ? 'text-pearl-text font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Ir para tela de Início"
        >
          {activeTab === 'dashboard' && (
            <span className="absolute top-1.5 w-5 h-0.5 rounded-full bg-brand-500" />
          )}
          <LayoutDashboard size={21} strokeWidth={activeTab === 'dashboard' ? 2.4 : 2} />
          <span className="text-[10.5px] mt-1 tracking-tight leading-none">Início</span>
        </button>

        <button
          onClick={() => onSelectTab('transactions')}
          className={`flex flex-col items-center justify-center h-full pt-1.5 pb-1 transition-all relative ${
            activeTab === 'transactions'
              ? 'text-pearl-text font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Ir para tela de Lançamentos"
        >
          {activeTab === 'transactions' && (
            <span className="absolute top-1.5 w-5 h-0.5 rounded-full bg-brand-500" />
          )}
          <Receipt size={21} strokeWidth={activeTab === 'transactions' ? 2.4 : 2} />
          <span className="text-[10.5px] mt-1 tracking-tight leading-none">Extrato</span>
        </button>

        {/* Botão + no padrão da barra, sem ultrapassar a linha superior do menu */}
        <div className="flex items-center justify-center h-full">
          <button
            onClick={onOpenNewTransaction}
            className="w-12 h-12 rounded-full bg-fab-bg hover:opacity-95 active:scale-95 text-fab-ink ring-2 ring-fab-ring flex items-center justify-center shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-brand-500/35"
            aria-label="Criar novo lançamento"
          >
            <Plus size={25} strokeWidth={2.6} />
          </button>
        </div>

        <button
          onClick={() => onSelectTab('budgets')}
          className={`flex flex-col items-center justify-center h-full pt-1.5 pb-1 transition-all relative ${
            activeTab === 'budgets'
              ? 'text-pearl-text font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Ir para tela de Orçamentos"
        >
          {activeTab === 'budgets' && (
            <span className="absolute top-1.5 w-5 h-0.5 rounded-full bg-brand-500" />
          )}
          <PieChart size={21} strokeWidth={activeTab === 'budgets' ? 2.4 : 2} />
          <span className="text-[10.5px] mt-1 tracking-tight leading-none whitespace-nowrap">Orçamento</span>
        </button>

        <button
          onClick={() => onSelectTab('goals')}
          className={`flex flex-col items-center justify-center h-full pt-1.5 pb-1 transition-all relative ${
            activeTab === 'goals'
              ? 'text-pearl-text font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Ir para tela de Metas"
        >
          {activeTab === 'goals' && (
            <span className="absolute top-1.5 w-5 h-0.5 rounded-full bg-brand-500" />
          )}
          <Target size={21} strokeWidth={activeTab === 'goals' ? 2.4 : 2} />
          <span className="text-[10.5px] mt-1 tracking-tight leading-none">Metas</span>
        </button>

        <button
          onClick={() => onSelectTab('menu')}
          className={`flex flex-col items-center justify-center h-full pt-1.5 pb-1 transition-all relative ${
            activeTab === 'menu'
              ? 'text-pearl-text font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Abrir Menu com mais ferramentas"
        >
          {activeTab === 'menu' && (
            <span className="absolute top-1.5 w-5 h-0.5 rounded-full bg-brand-500" />
          )}
          <Menu size={21} strokeWidth={activeTab === 'menu' ? 2.4 : 2} />
          <span className="text-[10.5px] mt-1 tracking-tight leading-none">Mais</span>
        </button>
      </div>
    </nav>
  );
}
