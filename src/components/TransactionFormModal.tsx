import React, { useState, useMemo } from 'react';
import {
  X,
  Check,
  Repeat,
  Layers,
  Paperclip,
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Lancamento,
  Categoria,
  Conta,
  TransactionType,
  TransactionStatus,
  RecurrenceFrequency
} from '../types';
import { toISODate, addMonthsSafe } from '../utils/calculations';
import { formatCurrency, formatMonthYear } from '../utils/i18n';
import { CategoryIcon } from './CategoryIcon';

interface TransactionFormModalProps {
  initialType?: TransactionType;
  editingTransaction?: Lancamento | null;
  categories: Categoria[];
  accounts: Conta[];
  recentDescriptions: string[];
  currentYM: string;
  onClose: () => void;
  onSave: (data: {
    tipo: TransactionType;
    valor: number;
    descricao: string;
    categoria_id: string;
    conta_id: string;
    data: string;
    status: TransactionStatus;
    observacao?: string;
    anexo_path?: string;
    recorrencia?: {
      frequencia: RecurrenceFrequency;
      mesesRepetir: number;
    } | null;
    parcelamento?: {
      totalParcelas: number;
    } | null;
  }) => void;
}

const GROUP_BADGE: Record<'essenciais' | 'lazer' | 'reserva', string> = {
  essenciais: 'Essenciais',
  lazer: 'Lazer',
  reserva: 'Reserva'
};

export function TransactionFormModal({
  initialType = 'despesa',
  editingTransaction,
  categories,
  accounts,
  recentDescriptions,
  onClose,
  onSave
}: TransactionFormModalProps) {
  // Trava a altura máxima do modal na abertura para evitar que a tela "sambe" ao abrir/fechar o teclado
  const [lockedMaxHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? Math.max(420, Math.min(window.innerHeight - 24, 720)) : 640
  );

  const [tipo, setTipo] = useState<TransactionType>(
    editingTransaction ? editingTransaction.tipo : initialType
  );
  const [valorStr, setValorStr] = useState<string>(
    editingTransaction ? editingTransaction.valor.toFixed(2).replace('.', ',') : ''
  );
  const [descricao, setDescricao] = useState<string>(
    editingTransaction ? editingTransaction.descricao : ''
  );
  const [categoriaId, setCategoriaId] = useState<string>(
    editingTransaction
      ? editingTransaction.categoria_id
      : categories.find(c => c.tipo === initialType)?.id || categories[0]?.id || ''
  );
  const [isCategoryListOpen, setIsCategoryListOpen] = useState<boolean>(false);
  const [contaId, setContaId] = useState<string>(
    editingTransaction ? editingTransaction.conta_id : accounts[0]?.id || ''
  );
  const [data, setData] = useState<string>(
    editingTransaction ? editingTransaction.data : toISODate(new Date())
  );
  const [status, setStatus] = useState<TransactionStatus>(
    editingTransaction
      ? editingTransaction.status
      : initialType === 'receita'
      ? 'recebido'
      : 'pago'
  );
  const [observacao, setObservacao] = useState<string>(
    editingTransaction?.observacao || ''
  );
  const [anexoBase64, setAnexoBase64] = useState<string | undefined>(
    editingTransaction?.anexo_path
  );
  const [formError, setFormError] = useState<string | null>(null);

  // Parcelamento (apenas para novas despesas)
  const [isInstallment, setIsInstallment] = useState<boolean>(false);
  const [totalInstallments, setTotalInstallments] = useState<number>(3);

  // Recorrência
  const [isRecurrent, setIsRecurrent] = useState<boolean>(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency>('mensal');
  const [recurrenceMonths, setRecurrenceMonths] = useState<number>(12);

  // Autocomplete histórico
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const filteredSuggestions = useMemo(() => {
    if (!descricao.trim()) return recentDescriptions.slice(0, 5);
    return recentDescriptions
      .filter(d => d.toLowerCase().includes(descricao.toLowerCase()) && d !== descricao)
      .slice(0, 5);
  }, [descricao, recentDescriptions]);

  // Lista de categorias filtradas pelo tipo selecionado
  const filteredCategories = useMemo(
    () => categories.filter(c => c.tipo === tipo),
    [categories, tipo]
  );

  const selectedCategory = useMemo(
    () => filteredCategories.find(c => c.id === categoriaId) || filteredCategories[0],
    [filteredCategories, categoriaId]
  );

  // Conversão de valor digitado para número
  const numericValue = useMemo(() => {
    const clean = valorStr.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }, [valorStr]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericValue <= 0) {
      setFormError('Informe um valor maior que zero.');
      return;
    }
    if (!descricao.trim()) {
      setFormError('Informe uma descrição para o lançamento.');
      return;
    }
    setFormError(null);

    onSave({
      tipo,
      valor: numericValue,
      descricao: descricao.trim(),
      categoria_id: selectedCategory?.id || categoriaId,
      conta_id: contaId,
      data,
      status,
      observacao: observacao.trim() || undefined,
      anexo_path: anexoBase64,
      recorrencia:
        isRecurrent && !editingTransaction
          ? { frequencia: recurrenceFreq, mesesRepetir: recurrenceMonths }
          : null,
      parcelamento:
        isInstallment && tipo === 'despesa' && !editingTransaction
          ? { totalParcelas: totalInstallments }
          : null
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl || !file.type.startsWith('image/')) {
        setAnexoBase64(dataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1200;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setAnexoBase64(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.76);
          setAnexoBase64(compressed.length < dataUrl.length ? compressed : dataUrl);
        } catch {
          setAnexoBase64(dataUrl);
        }
      };
      img.onerror = () => setAnexoBase64(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-x-0 top-0 bottom-0 z-50 flex items-start sm:items-center justify-center bg-slate-950/80 pt-3 px-2.5 sm:p-4 overflow-hidden"
      style={{ height: '100svh' }}
    >
      <div
        className="w-full sm:max-w-md bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-800 flex flex-col overflow-hidden"
        style={{ maxHeight: `${lockedMaxHeight}px` }}
      >
        {/* Header fixo do Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <h3 className="text-base font-bold text-slate-100">
            {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="space-y-3.5 pt-3 pb-4 overflow-y-auto overscroll-contain pr-0.5 flex-1"
        >
          {formError && (
            <div className="p-2.5 rounded-2xl bg-red-950/70 border border-red-800/70 text-red-200 text-xs flex items-center space-x-2">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* SEGMENTED CONTROL: RECEITA / DESPESA */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setTipo('despesa');
                setStatus('pago');
                setIsCategoryListOpen(false);
                const firstCat = categories.find(c => c.tipo === 'despesa');
                if (firstCat) setCategoriaId(firstCat.id);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                tipo === 'despesa'
                  ? 'bg-red-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Despesa
            </button>

            <button
              type="button"
              onClick={() => {
                setTipo('receita');
                setStatus('recebido');
                setIsCategoryListOpen(false);
                const firstCat = categories.find(c => c.tipo === 'receita');
                if (firstCat) setCategoriaId(firstCat.id);
                setIsInstallment(false);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                tipo === 'receita'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Receita
            </button>
          </div>

          {/* CAMPO DE VALOR (R$) SEM AUTOFOCUS PARA NÃO DAR SALTO AO ABRIR */}
          <div className="text-center py-2.5 bg-slate-800/50 rounded-2xl px-3 border border-slate-800">
            <label
              htmlFor="tx-valor-input"
              className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1"
            >
              Valor
            </label>
            <div className="flex items-center justify-center space-x-1">
              <span className="text-xl font-bold text-slate-400">R$</span>
              <input
                id="tx-valor-input"
                type="text"
                inputMode="decimal"
                value={valorStr}
                onChange={e => setValorStr(e.target.value)}
                placeholder="0,00"
                className="w-48 text-3xl font-extrabold text-slate-100 bg-transparent text-center outline-none tabular-nums"
              />
            </div>
            {isInstallment && totalInstallments > 1 && numericValue > 0 && (
              <span className="text-[11px] text-purple-400 font-medium block mt-1">
                {totalInstallments}x de ~{formatCurrency(numericValue / totalInstallments)}
              </span>
            )}
          </div>

          {/* DESCRIÇÃO COM AUTOCOMPLETE */}
          <div className="relative">
            <label
              htmlFor="tx-desc-input"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Descrição
            </label>
            <input
              id="tx-desc-input"
              type="text"
              value={descricao}
              onChange={e => {
                setDescricao(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Ex: Supermercado, Aluguel, Uber, Salário..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700/60 text-slate-100 text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-none"
            />

            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 rounded-2xl shadow-xl border border-slate-700 z-20 overflow-hidden divide-y divide-slate-800">
                {filteredSuggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => {
                      setDescricao(sug);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CATEGORIA EM LISTA EXPANSÍVEL COMPACTA */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Categoria
            </label>

            <button
              type="button"
              aria-expanded={isCategoryListOpen}
              data-testid="toggle-category-picker"
              onClick={() => setIsCategoryListOpen(prev => !prev)}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/70 hover:border-brand-500/50 transition-colors text-left"
            >
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                {selectedCategory && (
                  <CategoryIcon
                    name={selectedCategory.icone}
                    color={selectedCategory.cor}
                    size={16}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-100 truncate">
                      {selectedCategory?.nome || 'Selecionar categoria'}
                    </span>
                    {selectedCategory?.tipo === 'despesa' && selectedCategory.grupo_orcamento && (
                      <span className="text-[10px] font-semibold text-brand-400">
                        {GROUP_BADGE[selectedCategory.grupo_orcamento]}
                      </span>
                    )}
                  </div>
                  {selectedCategory?.subcategoria && (
                    <span className="text-[10px] text-slate-400 block truncate">
                      {selectedCategory.subcategoria}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1 text-[11px] font-semibold text-brand-400 pl-2 flex-shrink-0">
                <span>{isCategoryListOpen ? 'Fechar' : 'Escolher'}</span>
                {isCategoryListOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>
            </button>

            {isCategoryListOpen && (
              <div
                data-testid="category-expandable-list"
                className="mt-1.5 rounded-2xl bg-slate-950/70 border border-slate-800 divide-y divide-slate-800/80 max-h-44 overflow-y-auto"
              >
                {filteredCategories.map(cat => {
                  const isSelected = selectedCategory?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoriaId(cat.id);
                        setIsCategoryListOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? 'bg-brand-950/60 text-brand-200'
                          : 'hover:bg-slate-800/60 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <CategoryIcon name={cat.icone} color={cat.cor} size={14} />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold block truncate">{cat.nome}</span>
                          {cat.subcategoria && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              {cat.subcategoria}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check size={14} className="text-brand-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CONTA E DATA */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Conta / Cartão
              </label>
              <select
                value={contaId}
                onChange={e => setContaId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-500"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nome} ({acc.tipo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data
              </label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* STATUS */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Status da transação
            </label>
            <div className="grid grid-cols-2 gap-2">
              {tipo === 'despesa' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setStatus('pago')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      status === 'pago'
                        ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    Pago (Realizado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('pendente')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      status === 'pendente'
                        ? 'border-amber-500 bg-amber-950/50 text-amber-300'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    Pendente (Agendado)
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStatus('recebido')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      status === 'recebido'
                        ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    Recebido (Realizado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('a_receber')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      status === 'a_receber'
                        ? 'border-amber-500 bg-amber-950/50 text-amber-300'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    A receber (Agendado)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* PARCELAMENTO */}
          {!editingTransaction && tipo === 'despesa' && (
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                  <Layers size={14} className="text-purple-400" />
                  <span>Parcelar compra</span>
                </span>
                <input
                  type="checkbox"
                  checked={isInstallment}
                  onChange={e => {
                    setIsInstallment(e.target.checked);
                    if (e.target.checked) setIsRecurrent(false);
                  }}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
              </label>

              {isInstallment && (
                <div className="pt-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Pagar em:</span>
                    <select
                      value={totalInstallments}
                      onChange={e => setTotalInstallments(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-purple-300 outline-none"
                    >
                      {[2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map(n => (
                        <option key={n} value={n}>
                          {n} vezes mensais
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Gera {totalInstallments} lançamentos mensais com a nota Parcela X/{totalInstallments}.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* RECORRÊNCIA */}
          {!editingTransaction && !isInstallment && (
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                  <Repeat size={14} className="text-brand-400" />
                  <span>Repetir lançamento (recorrente)</span>
                </span>
                <input
                  type="checkbox"
                  checked={isRecurrent}
                  onChange={e => {
                    setIsRecurrent(e.target.checked);
                    if (e.target.checked) setIsInstallment(false);
                  }}
                  className="rounded text-brand-600 focus:ring-brand-500 accent-brand-600"
                />
              </label>

              {isRecurrent && (
                <div className="pt-1.5 space-y-2">
                  <div className="flex items-center space-x-2">
                    <select
                      value={recurrenceFreq}
                      onChange={e => setRecurrenceFreq(e.target.value as RecurrenceFrequency)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 outline-none"
                    >
                      <option value="mensal">Mensalmente</option>
                      <option value="semanal">Semanalmente</option>
                      <option value="anual">Anualmente</option>
                    </select>

                    <span className="text-xs text-slate-400">por</span>

                    <select
                      value={recurrenceMonths}
                      onChange={e => setRecurrenceMonths(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 outline-none"
                    >
                      <option value={3}>3 meses</option>
                      <option value={6}>6 meses</option>
                      <option value={12}>12 meses (1 ano)</option>
                      <option value={24}>24 meses (2 anos)</option>
                    </select>
                  </div>

                  <div className="flex items-start space-x-1.5 p-2 rounded-xl bg-brand-950/50 text-brand-200 border border-brand-800/40 text-[11px]">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>
                      Isso criará {recurrenceMonths} lançamentos futuros até{' '}
                      {formatMonthYear(addMonthsSafe(data, recurrenceMonths - 1).slice(0, 7))}.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ANEXO DE FOTO / COMPROVANTE */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Foto ou Comprovante (Opcional)
            </label>
            {anexoBase64 ? (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800 border border-slate-700">
                <div className="flex items-center space-x-2">
                  <img
                    src={anexoBase64}
                    alt="Comprovante"
                    className="w-10 h-10 rounded-lg object-cover border border-slate-700"
                  />
                  <span className="text-xs text-slate-300 font-medium">
                    Comprovante anexado
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAnexoBase64(undefined)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-950 transition-colors"
                  title="Remover anexo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center space-x-2 p-2.5 rounded-2xl border border-dashed border-slate-700 hover:bg-slate-800 cursor-pointer text-slate-400 text-xs font-medium transition-colors">
                <Paperclip size={15} />
                <span>Anexar foto ou recibo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* OBSERVAÇÕES */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observações (Opcional)
            </label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              onFocus={e => {
                const el = e.currentTarget;
                setTimeout(() => el.scrollIntoView({ block: 'nearest' }), 100);
              }}
              rows={2}
              placeholder="Anotações adicionais, detalhes da compra..."
              className="w-full px-3.5 py-2 rounded-2xl bg-slate-800 border border-slate-700/60 text-slate-100 text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-none resize-none"
            />
          </div>

          {/* BOTÃO SALVAR */}
          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/25 transition-colors text-sm"
            >
              <Check size={18} strokeWidth={2.5} />
              <span>{editingTransaction ? 'Salvar Alterações' : 'Registrar Lançamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
