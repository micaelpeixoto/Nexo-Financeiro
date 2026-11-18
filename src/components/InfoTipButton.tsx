import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

interface InfoTipButtonProps {
  title: string;
  description: string;
  details?: string[];
  ariaLabel?: string;
}

export function InfoTipButton({
  title,
  description,
  details,
  ariaLabel
}: InfoTipButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="text-slate-400 hover:text-slate-200 p-1 rounded-full hover:bg-white/5 transition-colors inline-flex items-center justify-center flex-shrink-0"
        aria-label={ariaLabel || `Informação sobre ${title}`}
        title={title}
      >
        <Info size={13} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm max-h-[85vh] overflow-y-auto bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-800 space-y-3 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-brand-500/15 text-brand-400 flex items-center justify-center flex-shrink-0">
                  <Info size={16} />
                </div>
                <h3 className="text-sm font-bold text-white">{title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Fechar informação"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{description}</p>

            {details && details.length > 0 && (
              <ul className="space-y-2 pt-1">
                {details.map((item, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded-2xl bg-slate-800/70 border border-slate-800 text-[11px] text-slate-300 leading-relaxed"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
