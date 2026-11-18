import React, { useState, useMemo } from 'react';
import {
  X,
  Mail,
  ArrowRight,
  TrendingDown,
  ArrowLeftRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Categoria, Orcamento, Lancamento, Envelope } from '../types';
import { formatCurrency, formatMonthYear } from '../utils/i18n';
import { isRealized } from '../utils/calculations';
import { CategoryIcon } from './CategoryIcon';

interface EnvelopesModalProps {
  currentYM: string;
  categories: Categoria[];
  budgets: Orcamento[];
  transactions: Lancamento[];
  envelopes: Envelope[];
  onSaveEnvelopeTransfer: (sourceCatId: string, destCatId: string, amount: number) => void;
  onClose: () => void;
}

export function EnvelopesModal({
  currentYM,
  categories,
  budgets,
  transactions,
  envelopes,
  onSaveEnvelopeTransfer,
  onClose
}: EnvelopesModalProps) {
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [sourceCatId, setSourceCatId] = useState<string>('');
  const [destCatId, setDestCatId] = useState<string>('');
  const [transferAmountStr, setTransferAmountStr] = useState<string>('');

  const expenseCategories = useMemo(() => {
    return categories.filter(c => c.tipo === 'despesa' && c.incluir_no_orcamento);
  }, [categories]);

  // Calcula o saldo virtual de cada envelope no mês atual:
  // Saldo Virtual = Teto Orçado + Transferências Recebidas - Transferências Enviadas - Gastos Reais do Mês
  const envelopeBalances = useMemo(() => {
    return expenseCategories.map(cat => {
      const budget = budgets.find(b => b.categoria_id === cat.id && b.referencia === currentYM)?.valor_meta || 0;
      
      const spent = transactions
        .filter(t => t.categoria_id === cat.id && t.data.startsWith(currentYM) && t.tipo === 'despesa' && isRealized(t.status))
        .reduce((acc, t) => acc + t.valor, 0);

      // Transferências virtuais do envelope
      let transferAdj = 0;
      for (const env of envelopes.filter(e => e.mes_referencia === currentYM)) {
        for (const tr of env.transferencias) {
          if (tr.destino_categoria_id === cat.id) transferAdj += tr.valor;
          if (tr.origem_categoria_id === cat.id) transferAdj -= tr.valor;
        }
      }

      const allocated = budget + transferAdj;
      const balance = Math.round((allocated - spent) * 100) / 100;

      return {
        cat,
        budget,
        allocated,
        spent,
        balance
      };
    });
  }, [expenseCategories, budgets, currentYM, transactions, envelopes]);

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmountStr.replace(',', '.'));
    if (!sourceCatId || !destCatId || sourceCatId === destCatId || isNaN(amount) || amount <= 0) {
      alert('Selecione categorias diferentes e um valor maior que zero.');
      return;
    }

    onSaveEnvelopeTransfer(sourceCatId, destCatId, amount);
    setShowTransferModal(false);
    setTransferAmountStr('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        {/* Header dos Envelopes */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Mail size={17} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Envelopes Digitais ({formatMonthYear(currentYM)})
              </h3>
              <span className="text-[10px] text-slate-400">
                Saldos virtuais para conter gastos por impulso
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nota explicativa de isolamento */}
        <div className="my-3 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-start space-x-2">
          <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            <strong>Modo Educativo:</strong> os envelopes gerenciam saldo virtual apenas na sua mente e planejamento. Remanejar valores entre envelopes <strong>não altera seus lançamentos reais nem os totais oficiais</strong>.
          </p>
        </div>

        {/* Botão de Transferência entre Envelopes */}
        <div className="flex justify-end mb-3">
          <button
            onClick={() => {
              setSourceCatId(expenseCategories[0]?.id || '');
              setDestCatId(expenseCategories[1]?.id || '');
              setShowTransferModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <ArrowLeftRight size={13} />
            <span>Remanejar entre Envelopes</span>
          </button>
        </div>

        {/* Lista de Envelopes com seus saldos virtuais */}
        <div className="space-y-2.5">
          {envelopeBalances.map(item => {
            const isNegative = item.balance < 0;

            return (
              <div
                key={item.cat.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <CategoryIcon name={item.cat.icone} color={item.cat.cor} size={16} />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
                      {item.cat.nome}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Alocado: {formatCurrency(item.allocated)} • Gasto: {formatCurrency(item.spent)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-extrabold tabular-nums block ${
                      isNegative
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatCurrency(item.balance, true)}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase">
                    {isNegative ? 'Estourou' : 'Restante'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL DE TRANSFERÊNCIA */}
        {showTransferModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-3">
                Remanejar Saldo de Envelope
              </h4>

              <form onSubmit={handleConfirmTransfer} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Tirar do Envelope (Origem)
                  </label>
                  <select
                    value={sourceCatId}
                    onChange={e => setSourceCatId(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold outline-none"
                  >
                    {expenseCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Colocar no Envelope (Destino)
                  </label>
                  <select
                    value={destCatId}
                    onChange={e => setDestCatId(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold outline-none"
                  >
                    {expenseCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Valor a Transferir (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={transferAmountStr}
                    onChange={e => setTransferAmountStr(e.target.value)}
                    placeholder="Ex: 100,00"
                    autoFocus
                    required
                    className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold outline-none tabular-nums"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold"
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="pt-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
          >
            Fechar Envelopes
          </button>
        </div>
      </div>
    </div>
  );
}
