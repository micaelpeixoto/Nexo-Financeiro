import React, { useState } from 'react';
import { Lock, Delete, ShieldCheck } from 'lucide-react';

interface SecurityLockModalProps {
  pinHash: string;
  onUnlock: () => void;
}

export function SecurityLockModal({ pinHash, onUnlock }: SecurityLockModalProps) {
  const [pinDigits, setPinDigits] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handlePressDigit = (digit: string) => {
    if (pinDigits.length < 4) {
      const next = pinDigits + digit;
      setPinDigits(next);
      setErrorMsg('');

      if (next.length === 4) {
        if (btoa(next) === pinHash) {
          onUnlock();
        } else {
          setErrorMsg('PIN incorreto. Tente novamente.');
          setTimeout(() => {
            setPinDigits('');
          }, 400);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPinDigits(pinDigits.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950 text-white">
      <div className="w-full max-w-xs text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto shadow-lg shadow-brand-500/15">
          <Lock size={32} />
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight">Nexo Financeiro Bloqueado</h2>
          <p className="text-xs text-slate-400 mt-1">
            Digite seu PIN de 4 dígitos para acessar
          </p>
        </div>

        {/* 4 Pontos de PIN */}
        <div className="flex justify-center space-x-4 my-4">
          {[0, 1, 2, 3].map(idx => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                pinDigits.length > idx
                  ? 'bg-brand-400 scale-110 shadow-sm shadow-brand-400/50'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs text-red-400 font-semibold animate-pulse">
            {errorMsg}
          </p>
        )}

        {/* Teclado numérico mobile */}
        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
            <button
              key={d}
              onClick={() => handlePressDigit(d)}
              className="w-16 h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-xl font-bold text-slate-100 flex items-center justify-center border border-slate-800 transition-all"
            >
              {d}
            </button>
          ))}

          <div />

          <button
            onClick={() => handlePressDigit('0')}
            className="w-16 h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-xl font-bold text-slate-100 flex items-center justify-center border border-slate-800 transition-all"
          >
            0
          </button>

          <button
            onClick={handleBackspace}
            className="w-16 h-16 rounded-2xl bg-slate-900/60 hover:bg-slate-800 active:scale-95 text-slate-400 flex items-center justify-center border border-slate-800 transition-all"
          >
            <Delete size={20} />
          </button>
        </div>

        <div className="pt-2 flex items-center justify-center space-x-1 text-[11px] text-slate-500">
          <ShieldCheck size={12} className="text-brand-400" />
          <span>Proteção local 100% no aparelho</span>
        </div>
      </div>
    </div>
  );
}
