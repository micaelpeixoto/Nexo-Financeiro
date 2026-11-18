import React from 'react';
import { DateFilterPreset } from '../types';

interface DatePresetBarProps {
  value: DateFilterPreset;
  onChange: (preset: DateFilterPreset) => void;
  currentYM: string;
}

const SHORT_MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

export function DatePresetBar({ value, onChange, currentYM }: DatePresetBarProps) {
  const now = new Date();
  const dayLabel = `Dia (${now.getDate()} de ${SHORT_MONTHS[now.getMonth()]})`;
  const currentYear = currentYM.slice(0, 4);

  const options: { id: DateFilterPreset; line1: string; line2?: string }[] = [
    { id: 'dia', line1: dayLabel },
    { id: 'mes_atual', line1: 'Mês', line2: 'Atual' },
    { id: 'mes_passado', line1: 'Mês', line2: 'Passado' },
    { id: 'ano', line1: 'Ano', line2: currentYear },
    { id: 'todos', line1: 'Todos' }
  ];

  return (
    <div
      role="tablist"
      aria-label="Filtro de período"
      className="grid grid-cols-5 items-center gap-1 p-1 rounded-2xl bg-slate-950/90 border border-pearl-border"
    >
      {options.map(opt => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={`min-h-[42px] px-1.5 py-1.5 rounded-xl text-[11px] leading-tight text-center transition-colors flex flex-col items-center justify-center ${
              active
                ? 'bg-pearl-bg text-pearl-ink font-bold shadow-xs'
                : 'text-slate-300 font-medium hover:text-white hover:bg-slate-900'
            }`}
          >
            {opt.line2 ? (
              <>
                <span>{opt.line1}</span>
                <span>{opt.line2}</span>
              </>
            ) : (
              <span className="line-clamp-2">{opt.line1}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
