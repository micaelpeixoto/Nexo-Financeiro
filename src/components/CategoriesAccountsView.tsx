import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  Landmark,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Categoria,
  Conta,
  Lancamento,
  TransactionType,
  AccountType,
  BudgetCategoryGroup
} from '../types';
import { EXPENSE_SUBCATEGORY_GROUPS, inferBudgetGroup } from '../utils/calculations';
import { formatCurrency } from '../utils/i18n';
import { CategoryIcon } from './CategoryIcon';
import { InfoTipButton } from './InfoTipButton';

interface CategoriesAccountsViewProps {
  categories: Categoria[];
  accounts: Conta[];
  transactions: Lancamento[];
  onSaveCategory: (cat: Categoria) => void;
  onDeleteCategory: (catId: string, migrateToCatId?: string) => void;
  onSaveAccount: (acc: Conta) => void;
  onDeleteAccount: (accId: string, migrateToAccId?: string) => void;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'
];

const PRESET_ICONS = [
  'Home', 'Utensils', 'Car', 'HeartPulse', 'Smile',
  'ShieldCheck', 'Tv', 'GraduationCap', 'ShoppingBag', 'Coins'
];

const GROUP_LABEL: Record<BudgetCategoryGroup, string> = {
  essenciais: 'Essenciais (50%)',
  lazer: 'Lazer (30%)',
  reserva: 'Reserva e Metas (20%)'
};

export function CategoriesAccountsView({
  categories,
  accounts,
  transactions,
  onSaveCategory,
  onDeleteCategory,
  onSaveAccount,
  onDeleteAccount
}: CategoriesAccountsViewProps) {
  const [section, setSection] = useState<'categorias' | 'contas'>('categorias');

  // Modal de edição / criação de Categoria
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [isNewCategory, setIsNewCategory] = useState<boolean>(false);
  const [catName, setCatName] = useState<string>('');
  const [catTipo, setCatTipo] = useState<TransactionType>('despesa');
  const [catGroup, setCatGroup] = useState<BudgetCategoryGroup>('essenciais');
  const [catColor, setCatColor] = useState<string>(PRESET_COLORS[0]);
  const [catIcon, setCatIcon] = useState<string>(PRESET_ICONS[0]);
  const [catIncludeBudget, setCatIncludeBudget] = useState<boolean>(true);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState<boolean>(false);

  // Modal de exclusão com migração
  const [deleteCatCandidate, setDeleteCatCandidate] = useState<Categoria | null>(null);
  const [migrateTargetCatId, setMigrateTargetCatId] = useState<string>('');

  // Modal de Conta
  const [editingAccount, setEditingAccount] = useState<Conta | null>(null);
  const [isNewAccount, setIsNewAccount] = useState<boolean>(false);
  const [accName, setAccName] = useState<string>('');
  const [accType, setAccType] = useState<AccountType>('corrente');
  const [accLimitStr, setAccLimitStr] = useState<string>('');
  const [accClosingDay, setAccClosingDay] = useState<number>(20);
  const [accDueDay, setAccDueDay] = useState<number>(27);

  const getCatTxCount = (catId: string) =>
    transactions.filter(t => t.categoria_id === catId).length;

  const getAccTxCount = (accId: string) =>
    transactions.filter(t => t.conta_id === accId).length;

  const handleOpenCatModal = (cat?: Categoria) => {
    setIsAppearanceOpen(false);
    if (cat) {
      setEditingCategory(cat);
      setIsNewCategory(false);
      setCatName(cat.nome);
      setCatTipo(cat.tipo);
      setCatGroup(cat.grupo_orcamento || inferBudgetGroup(cat));
      setCatColor(cat.cor);
      setCatIcon(cat.icone);
      setCatIncludeBudget(cat.incluir_no_orcamento);
    } else {
      setEditingCategory(null);
      setIsNewCategory(true);
      setCatName('');
      setCatTipo('despesa');
      setCatGroup('essenciais');
      setCatColor(PRESET_COLORS[0]);
      setCatIcon(PRESET_ICONS[0]);
      setCatIncludeBudget(true);
    }
  };

  const handleSaveCatForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const newCat: Categoria = {
      id: editingCategory ? editingCategory.id : `cat_${Date.now()}`,
      nome: catName.trim(),
      tipo: catTipo,
      cor: catColor,
      icone: catIcon,
      incluir_no_orcamento: catTipo === 'despesa' ? catIncludeBudget : false,
      ordem: editingCategory ? editingCategory.ordem : categories.length + 1,
      grupo_orcamento: catTipo === 'despesa' ? catGroup : undefined
    };

    onSaveCategory(newCat);
    setIsNewCategory(false);
    setEditingCategory(null);
  };

  const handleDeleteCatClick = (cat: Categoria) => {
    const count = getCatTxCount(cat.id);
    if (count > 0) {
      setDeleteCatCandidate(cat);
      const otherCats = categories.filter(c => c.id !== cat.id && c.tipo === cat.tipo);
      setMigrateTargetCatId(otherCats[0]?.id || '');
    } else {
      onDeleteCategory(cat.id);
    }
  };

  const handleConfirmMigrateDelete = () => {
    if (!deleteCatCandidate) return;
    onDeleteCategory(deleteCatCandidate.id, migrateTargetCatId || undefined);
    setDeleteCatCandidate(null);
  };

  const handleOpenAccModal = (acc?: Conta) => {
    if (acc) {
      setEditingAccount(acc);
      setIsNewAccount(false);
      setAccName(acc.nome);
      setAccType(acc.tipo);
      setAccLimitStr(acc.limite ? acc.limite.toString() : '');
      setAccClosingDay(acc.dia_fechamento || 20);
      setAccDueDay(acc.dia_vencimento || 27);
    } else {
      setEditingAccount(null);
      setIsNewAccount(true);
      setAccName('');
      setAccType('corrente');
      setAccLimitStr('');
      setAccClosingDay(20);
      setAccDueDay(27);
    }
  };

  const handleSaveAccForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    const limit = parseFloat(accLimitStr.replace(',', '.'));

    const newAcc: Conta = {
      id: editingAccount ? editingAccount.id : `acc_${Date.now()}`,
      nome: accName.trim(),
      tipo: accType,
      cor: '#3B82F6',
      icone: accType === 'cartao' ? 'CreditCard' : accType === 'dinheiro' ? 'Wallet' : 'Landmark',
      limite: accType === 'cartao' && !isNaN(limit) ? limit : undefined,
      dia_fechamento: accType === 'cartao' ? accClosingDay : undefined,
      dia_vencimento: accType === 'cartao' ? accDueDay : undefined,
      ordem: editingAccount ? editingAccount.ordem : accounts.length + 1,
      ativo: true
    };

    onSaveAccount(newAcc);
    setIsNewAccount(false);
    setEditingAccount(null);
  };

  const activeGroupSpec =
    EXPENSE_SUBCATEGORY_GROUPS.find(g => g.id === catGroup) || EXPENSE_SUBCATEGORY_GROUPS[0];

  return (
    <div className="space-y-4 pb-24">
      {/* SELETOR DE SEÇÃO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setSection('categorias')}
            className={`px-3 py-1.5 rounded-xl transition-colors ${
              section === 'categorias'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Categorias ({categories.length})
          </button>
          <button
            onClick={() => setSection('contas')}
            className={`px-3 py-1.5 rounded-xl transition-colors ${
              section === 'contas'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Contas ({accounts.length})
          </button>
        </div>

        <button
          onClick={() => {
            if (section === 'categorias') handleOpenCatModal();
            else handleOpenAccModal();
          }}
          data-testid="new-category-or-account-btn"
          className="flex items-center space-x-1 px-3 py-2 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-md shadow-brand-500/25"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Nova</span>
        </button>
      </div>

      {/* SEÇÃO 1: CATEGORIAS */}
      {section === 'categorias' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-slate-400">
              Categorias de despesa se ajustam ao método 50/30/20 automaticamente
            </span>
            <InfoTipButton
              title="Onde cada categoria entra no plano"
              description="Ao criar novas categorias de despesa, escolha se ela entra em Essenciais (50%), Lazer (30%) ou Reserva e Metas (20%)."
              details={[
                'O sistema divide automaticamente a porcentagem do pilar entre as categorias que você criar.',
                'Exemplo: se você criar "Mercado" dentro de Essenciais junto com "Despesas", os 50% são divididos em 25% + 25%.'
              ]}
            />
          </div>

          {categories.map(cat => {
            const count = getCatTxCount(cat.id);
            const group = cat.tipo === 'despesa' ? cat.grupo_orcamento || inferBudgetGroup(cat) : null;
            return (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <CategoryIcon name={cat.icone} color={cat.cor} size={18} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {cat.nome}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          cat.tipo === 'receita' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {cat.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
                      {count} {count === 1 ? 'lançamento' : 'lançamentos'}
                      {group && ` • ${GROUP_LABEL[group]}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenCatModal(cat)}
                    aria-label={`Editar categoria ${cat.nome}`}
                    className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteCatClick(cat)}
                    aria-label={`Excluir categoria ${cat.nome}`}
                    className="p-1.5 rounded-xl hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SEÇÃO 2: CONTAS */}
      {section === 'contas' && (
        <div className="space-y-2">
          {accounts.map(acc => {
            const count = getAccTxCount(acc.id);
            return (
              <div
                key={acc.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-200">
                    {acc.tipo === 'cartao' ? <CreditCard size={18} /> : <Landmark size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {acc.nome}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-400">
                        {acc.tipo}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
                      {count} {count === 1 ? 'lançamento' : 'lançamentos'}
                      {acc.tipo === 'cartao' && acc.limite && ` • Limite ${formatCurrency(acc.limite)}`}
                      {acc.tipo === 'cartao' && ` (Fecha ${acc.dia_fechamento || 1}, Vence ${acc.dia_vencimento || 10})`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenAccModal(acc)}
                    aria-label={`Editar conta ${acc.nome}`}
                    className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteAccount(acc.id)}
                    aria-label={`Excluir conta ${acc.nome}`}
                    className="p-1.5 rounded-xl hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL EDITAR / CRIAR CATEGORIA (COMPACTO E RÁPIDO) */}
      {(isNewCategory || editingCategory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
          <div className="w-full max-w-sm bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">
                {isNewCategory ? 'Nova Categoria' : 'Editar Categoria'}
              </h3>
              <button
                onClick={() => {
                  setIsNewCategory(false);
                  setEditingCategory(null);
                }}
                aria-label="Fechar modal categoria"
                className="p-1 rounded-full text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCatForm} className="space-y-3 pt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  placeholder="Ex: Supermercado, Academia, Investimentos"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatTipo('despesa')}
                    className={`py-1.5 rounded-xl text-xs font-semibold border ${
                      catTipo === 'despesa'
                        ? 'border-red-500 bg-red-950/40 text-red-300'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatTipo('receita')}
                    className={`py-1.5 rounded-xl text-xs font-semibold border ${
                      catTipo === 'receita'
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    Receita
                  </button>
                </div>
              </div>

              {/* Pilar do plano 50/30/20 (o próprio nome da categoria define o foco) */}
              {catTipo === 'despesa' && (
                <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-800">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Onde entra no plano (50/30/20 e parecidos)
                  </label>
                  <select
                    value={catGroup}
                    onChange={e => setCatGroup(e.target.value as BudgetCategoryGroup)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 font-semibold outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {EXPENSE_SUBCATEGORY_GROUPS.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.titulo}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 block mt-1.5">
                    {activeGroupSpec.resumo503020}
                  </span>
                </div>
              )}

              {/* Seletor COMPACTO e expansível de Cores e Ícones (evita travamentos) */}
              <div className="rounded-2xl bg-slate-800/50 border border-slate-800 p-2.5">
                <button
                  type="button"
                  aria-expanded={isAppearanceOpen}
                  onClick={() => setIsAppearanceOpen(prev => !prev)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center space-x-2.5">
                    <CategoryIcon name={catIcon} color={catColor} size={15} />
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">
                        Cor e Ícone
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Toque para escolher outro estilo
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 text-[11px] font-semibold text-brand-400">
                    <span>{isAppearanceOpen ? 'Fechar' : 'Alterar'}</span>
                    {isAppearanceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {isAppearanceOpen && (
                  <div className="pt-2.5 mt-2.5 border-t border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-1.5">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCatColor(c)}
                          aria-label={`Selecionar cor ${c}`}
                          className={`w-6 h-6 rounded-full flex-shrink-0 ${
                            catColor === c ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white' : ''
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                      {PRESET_ICONS.map(ic => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => setCatIcon(ic)}
                          aria-label={`Selecionar ícone ${ic}`}
                          className={`p-1.5 rounded-xl flex items-center justify-center border ${
                            catIcon === ic
                              ? 'border-brand-500 bg-brand-950/60'
                              : 'border-slate-800 bg-slate-900/60'
                          }`}
                        >
                          <CategoryIcon name={ic} color={catColor} size={14} circle={false} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {catTipo === 'despesa' && (
                <label className="flex items-center space-x-2 pt-0.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catIncludeBudget}
                    onChange={e => setCatIncludeBudget(e.target.checked)}
                    className="rounded text-brand-500 focus:ring-brand-400 accent-brand-600"
                  />
                  <span className="text-xs text-slate-300">
                    Incluir no orçamento dinâmico mensal
                  </span>
                </label>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIÁLOGO DE MIGRAÇÃO ANTES DE EXCLUIR CATEGORIA COM LANÇAMENTOS */}
      {deleteCatCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
          <div className="w-full max-w-sm bg-slate-900 rounded-3xl p-5 shadow-2xl border border-red-900/60">
            <div className="flex items-center space-x-2 text-red-400 mb-2">
              <AlertTriangle size={20} />
              <h3 className="text-sm font-bold">Proteção de Dados</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              A categoria <strong>{deleteCatCandidate.nome}</strong> possui{' '}
              <strong>{getCatTxCount(deleteCatCandidate.id)} lançamentos</strong>. Escolha para onde movê-los antes de excluir:
            </p>

            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Mover lançamentos para:
              </label>
              <select
                value={migrateTargetCatId}
                onChange={e => setMigrateTargetCatId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-800 text-slate-100 text-xs font-semibold outline-none"
              >
                {categories
                  .filter(c => c.id !== deleteCatCandidate.id && c.tipo === deleteCatCandidate.tipo)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setDeleteCatCandidate(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmMigrateDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs"
              >
                Mover e Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR / CRIAR CONTA */}
      {(isNewAccount || editingAccount) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
          <div className="w-full max-w-sm bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">
                {isNewAccount ? 'Nova Conta / Cartão' : 'Editar Conta'}
              </h3>
              <button
                onClick={() => {
                  setIsNewAccount(false);
                  setEditingAccount(null);
                }}
                aria-label="Fechar modal conta"
                className="p-1 rounded-full text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAccForm} className="space-y-3 pt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nome da Conta / Cartão
                </label>
                <input
                  type="text"
                  value={accName}
                  onChange={e => setAccName(e.target.value)}
                  placeholder="Ex: Nubank, Inter, Itaú, Carteira"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tipo
                </label>
                <select
                  value={accType}
                  onChange={e => setAccType(e.target.value as AccountType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-100 outline-none font-medium"
                >
                  <option value="corrente">Conta Corrente Tradicional</option>
                  <option value="digital">Conta Digital (Fintech)</option>
                  <option value="cartao">Cartão de Crédito</option>
                  <option value="dinheiro">Dinheiro Físico / Carteira</option>
                  <option value="poupanca">Poupança / Reserva</option>
                </select>
              </div>

              {accType === 'cartao' && (
                <div className="space-y-2 p-3 rounded-2xl bg-slate-800/40 border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Limite Total do Cartão (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={accLimitStr}
                      onChange={e => setAccLimitStr(e.target.value)}
                      placeholder="Ex: 5000"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 text-xs font-bold text-slate-100 outline-none tabular-nums"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Dia Fechamento</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={accClosingDay}
                        onChange={e => setAccClosingDay(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded-xl bg-slate-900 text-xs text-center font-bold text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Dia Vencimento</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={accDueDay}
                        onChange={e => setAccDueDay(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded-xl bg-slate-900 text-xs text-center font-bold text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
