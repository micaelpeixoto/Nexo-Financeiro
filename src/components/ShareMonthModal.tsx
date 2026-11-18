import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  Share2,
  CheckCircle2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Lancamento, Categoria } from '../types';
import { generateMonthShareCard, saveDataUrlOrBlobToAndroid } from '../utils/export';
import { formatMonthYear } from '../utils/i18n';

interface ShareMonthModalProps {
  currentYM: string;
  userName: string;
  transactions: Lancamento[];
  categories: Categoria[];
  onClose: () => void;
}

export function ShareMonthModal({
  currentYM,
  userName,
  transactions,
  categories,
  onClose
}: ShareMonthModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    generateMonthShareCard(currentYM, userName, transactions, categories)
      .then(url => {
        if (isMounted) {
          setImageUrl(url);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Erro ao gerar imagem:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentYM, userName, transactions, categories]);

  const handleDownload = () => {
    if (!imageUrl) return;
    if (saveDataUrlOrBlobToAndroid(imageUrl, `nexo_financeiro_${currentYM}.png`, 'image/png')) {
      return;
    }
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `nexo_financeiro_${currentYM}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNativeShare = async () => {
    if (!imageUrl) return;

    try {
      // Converte dataURL para Blob para envio nativo no Android/WhatsApp
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `nexo_financeiro_${currentYM}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Meu Resumo Financeiro - ${formatMonthYear(currentYM)}`,
          text: `Confira meu fechamento de ${formatMonthYear(currentYM)} com o app Nexo Financeiro!`,
          files: [file]
        });
      } else {
        handleDownload();
      }
    } catch (err) {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Share2 size={16} className="text-brand-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Compartilhar o Mês
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="my-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 text-center">
            Imagem renderizada com os seus dados reais de {formatMonthYear(currentYM)}, perfeita para WhatsApp ou Stories.
          </p>

          {isLoading ? (
            <div className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400">
              <Loader2 size={24} className="animate-spin text-brand-400 mb-2" />
              <span className="text-xs font-semibold">Gerando imagem em alta resolução...</span>
            </div>
          ) : imageUrl ? (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md">
              <img
                src={imageUrl}
                alt="Card de Resumo Mensal"
                className="w-full h-auto object-cover max-h-80"
              />
            </div>
          ) : (
            <p className="text-xs text-red-500 text-center py-8">
              Falha ao gerar o resumo.
            </p>
          )}
        </div>

        <div className="space-y-2 pt-1">
          <button
            onClick={handleNativeShare}
            disabled={!imageUrl}
            className="w-full py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
          >
            <Share2 size={15} />
            <span>Enviar para o WhatsApp / Salvar</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={!imageUrl}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <Download size={14} />
            <span>Baixar PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
