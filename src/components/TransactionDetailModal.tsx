import React, { useState } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Copy,
  Calendar,
  CreditCard,
  Tag,
  CheckCircle2,
  Clock,
  Layers,
  Repeat,
  Paperclip,
  Share2
} from 'lucide-react';
import { Lancamento, Categoria, Conta } from '../types';
import { formatCurrency, formatDateBr } from '../utils/i18n';
import { CategoryIcon } from './CategoryIcon';

interface TransactionDetailModalProps {
  transaction: Lancamento;
  category?: Categoria;
  account?: Conta;
  onClose: () => void;
  onEdit: (tx: Lancamento) => void;
  onDuplicate: (tx: Lancamento) => void;
  onDelete: (txId: string) => void;
  onToggleStatus: (txId: string) => void;
  onDeleteSeries?: (serieId: string) => void;
}

export function TransactionDetailModal({
  transaction,
  category,
  account,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  onDeleteSeries
}: TransactionDetailModalProps) {
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);
  const isIncome = transaction.tipo === 'receita';
  const isPaid = transaction.status === 'pago' || transaction.status === 'recebido';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        {/* Topo: Ícone da categoria e fechar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <CategoryIcon
              name={category?.icone || 'HelpCircle'}
              color={category?.cor || '#10B981'}
              size={20}
            />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isIncome ? 'Receita' : 'Despesa'}
              </span>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {category?.nome || 'Geral'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Valor e Descrição */}
        <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-4 mb-1">
            {transaction.descricao}
          </h2>
          <div
            className={`text-2xl font-extrabold tabular-nums ${
              isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isIncome ? '+' : '-'}{formatCurrency(transaction.valor)}
          </div>
          <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold">
            {isPaid ? (
              <span className="text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 flex items-center space-x-1 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} />
                <span>{transaction.status.toUpperCase()}</span>
              </span>
            ) : (
              <span className="text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 flex items-center space-x-1 px-2 py-0.5 rounded-full">
                <Clock size={12} />
                <span>{transaction.status.toUpperCase()}</span>
              </span>
            )}
          </div>
        </div>

        {/* Metadados detalhados */}
        <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 mb-5">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="flex items-center space-x-1.5 text-slate-400">
              <Calendar size={14} />
              <span>Data de vencimento/registro:</span>
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {formatDateBr(transaction.data)}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="flex items-center space-x-1.5 text-slate-400">
              <CreditCard size={14} />
              <span>Conta / Meio de pagamento:</span>
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {account?.nome || 'Conta principal'}
            </span>
          </div>

          {transaction.parcela_numero && transaction.parcela_total && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200">
              <span className="flex items-center space-x-1.5">
                <Layers size={14} />
                <span>Parcelamento:</span>
              </span>
              <span className="font-bold">
                Parcela {transaction.parcela_numero} de {transaction.parcela_total}
              </span>
            </div>
          )}

          {transaction.serie_recorrencia_id && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200">
              <span className="flex items-center space-x-1.5">
                <Repeat size={14} />
                <span>Série recorrente ativa</span>
              </span>
            </div>
          )}

          {transaction.observacao && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <span className="text-[11px] text-slate-400 block mb-1">Observações:</span>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {transaction.observacao}
              </p>
            </div>
          )}

          {transaction.anexo_path && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
              <span className="text-[11px] text-slate-400 block mb-2 flex items-center space-x-1">
                <Paperclip size={12} />
                <span>Comprovante anexado:</span>
              </span>
              <img
                src={transaction.anexo_path}
                alt="Comprovante"
                className="w-full rounded-xl object-contain max-h-48 border border-slate-200 dark:border-slate-700"
              />
            </div>
          )}
        </div>

        {/* Botão de Alternar Status */}
        <button
          onClick={() => onToggleStatus(transaction.id)}
          className={`w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center space-x-1.5 mb-3 transition-colors ${
            isPaid
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
        >
          <CheckCircle2 size={15} />
          <span>{isPaid ? 'Mudar para Pendente' : 'Marcar como Pago'}</span>
        </button>

        {/* Linha de Ações: Editar, Duplicar, Excluir (com confirmação in-app sem window.confirm) */}
        {confirmingDelete ? (
          <div className="p-3 rounded-2xl bg-red-950/60 border border-red-800/70 space-y-2.5">
            <p className="text-xs font-semibold text-red-200 text-center">
              Excluir este lançamento? Esta ação não pode ser desfeita.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid="confirm-delete-tx-btn"
                onClick={() => {
                  onDelete(transaction.id);
                  onClose();
                }}
                className="py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center space-x-1 transition-colors"
              >
                <Trash2 size={13} />
                <span>Sim, apagar</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onEdit(transaction)}
              className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1"
            >
              <Edit2 size={13} />
              <span>Editar</span>
            </button>

            <button
              type="button"
              onClick={() => onDuplicate(transaction)}
              className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1"
            >
              <Copy size={13} />
              <span>Duplicar</span>
            </button>

            <button
              type="button"
              data-testid="delete-tx-btn"
              onClick={() => setConfirmingDelete(true)}
              className="py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 font-semibold text-xs flex items-center justify-center space-x-1"
            >
              <Trash2 size={13} />
              <span>Excluir</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
