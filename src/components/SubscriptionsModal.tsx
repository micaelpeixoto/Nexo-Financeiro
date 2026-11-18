import React, { useMemo } from 'react';
import {
  X,
  Tv,
  Calendar,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Lancamento, Categoria } from '../types';
import { detectSubscriptions } from '../utils/calculations';
import { formatCurrency, formatDateBr, formatShortDateBr } from '../utils/i18n';
import { CategoryIcon } from './CategoryIcon';

interface SubscriptionsModalProps {
  transactions: Lancamento[];
  categories: Categoria[];
  onClose: () => void;
}

export function SubscriptionsModal({
  transactions,
  categories,
  onClose
}: SubscriptionsModalProps) {
  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Executa o algoritmo de detecção inteligente de assinaturas
  const detected = useMemo(() => {
    return detectSubscriptions(transactions);
  }, [transactions]);

  const totalMonthlyCommitment = detected.reduce((acc, it) => acc + it.valor_atual, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        {/* Header do Detetive de Assinaturas */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-pink-100 dark:bg-pink-950 flex items-center justify-center text-pink-600 dark:text-pink-400">
              <Tv size={17} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Detetive de Assinaturas
              </h3>
              <span className="text-[11px] text-slate-400">
                Cobranças automáticas detectadas no seu histórico
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

        {/* Resumo do impacto mensal das assinaturas */}
        <div className="my-3 p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-200 dark:border-pink-900/40">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Impacto Mensal Recorrente Estimado
          </span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
            {formatCurrency(totalMonthlyCommitment)}
            <span className="text-xs font-normal text-slate-400 ml-1">/mês</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {detected.length} serviços recorrentes identificados (ex: Netflix, Spotify, academia).
          </span>
        </div>

        {/* Lista de Assinaturas Detectadas */}
        {detected.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2 opacity-60" />
            <p className="text-xs">
              Nenhuma assinatura mensal repetida detectada ainda.
            </p>
            <span className="text-[10px] text-slate-500 block mt-1">
              À medida que você registrar mensalidades, elas aparecerão aqui automaticamente.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {detected.map(sub => {
              const cat = catMap.get(sub.categoria_id);
              const hasPriceChange = sub.historico_precos.length >= 2 &&
                sub.historico_precos[0].valor !== sub.historico_precos[sub.historico_precos.length - 1].valor;

              return (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <CategoryIcon
                        name={cat?.icone || 'Tv'}
                        color={cat?.cor || '#EC4899'}
                        size={17}
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {sub.descricao}
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          Cobrança estimada todo dia {sub.dia_cobranca}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 tabular-nums block">
                        {formatCurrency(sub.valor_atual)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Próx: {formatShortDateBr(sub.proxima_data_estimada)}
                      </span>
                    </div>
                  </div>

                  {/* Histórico de Preços */}
                  {sub.historico_precos.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span>Histórico recente:</span>
                      <div className="flex items-center space-x-2">
                        {sub.historico_precos.map((hp, i) => (
                          <span key={i} className="tabular-nums">
                            {formatShortDateBr(hp.data)}: {formatCurrency(hp.valor)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasPriceChange && (
                    <div className="flex items-center space-x-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                      <AlertCircle size={11} />
                      <span>Houve reajuste no valor desta assinatura recentemente.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-3">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
          >
            Fechar Detetive
          </button>
        </div>
      </div>
    </div>
  );
}
