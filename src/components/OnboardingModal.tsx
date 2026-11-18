import React, { useState } from 'react';
import {
  ShieldCheck,
  Wallet,
  PlusCircle,
  PieChart,
  Target,
  BarChart3,
  ArrowLeft,
  ArrowRight,
  Upload,
  Check,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { OnboardingGoal } from '../types';

interface OnboardingModalProps {
  onComplete: (data: {
    nome: string;
    objetivo: OnboardingGoal;
    rendaEstimada: number;
    carregarDemo: boolean;
  }) => void;
  onImportBackup: (file: File) => void;
  reviewMode?: boolean;
  onCloseReview?: () => void;
}

interface TutorialSlide {
  badge: string;
  title: string;
  description: string;
  bullets: string[];
  tip: string;
  icon: React.ElementType;
  iconColor: string;
}

export function OnboardingModal({
  onComplete,
  onImportBackup,
  reviewMode = false,
  onCloseReview
}: OnboardingModalProps) {
  const [step, setStep] = useState<number>(0);
  const [nome, setNome] = useState<string>('Carlos');
  const [objetivo, setObjetivo] = useState<OnboardingGoal>('controlar_gastos');
  const [rendaEstimada, setRendaEstimada] = useState<number>(2400);

  const slides: TutorialSlide[] = [
    {
      badge: '1. Privacidade & Segurança',
      icon: ShieldCheck,
      iconColor: '#10B981',
      title: 'Seus dados ficam 100% no seu aparelho',
      description:
        'O Nexo Financeiro funciona totalmente offline, sem login, sem conexão bancária e sem enviar suas contas para a internet.',
      bullets: [
        'Em Mais → Segurança, ative um PIN de 4 dígitos para bloquear o app ao abrir.',
        'Faça cópias em JSON em Backup Completo sempre que trocar de celular.',
        'Ative alertas em Mais → Notificações para receber avisos de vencimento e teto.'
      ],
      tip: 'Os ícones (i) espalhados pelo app explicam na hora como cada número é calculado.'
    },
    {
      badge: '2. Tela Inicial (Início)',
      icon: Wallet,
      iconColor: '#38BDF8',
      title: 'Carteira Dinâmica e Sobra por Dia Útil',
      description:
        'Logo ao abrir, você enxerga o resultado real do mês sem precisar marcar cada conta como paga antes do vencimento.',
      bullets: [
        'Carteira do Mês: soma tudo que você tem a receber e subtrai tudo que tem a pagar.',
        'Orçamento Planejado: mostra quanto % do teto mensal já foi consumido até hoje.',
        'Sobra por Dia Útil: divide quanto resta do orçamento pelos dias úteis e corridos até o fim do mês.'
      ],
      tip: 'Em Próximos Vencimentos, você quita contas pendentes com apenas 1 toque em "Pagar".'
    },
    {
      badge: '3. Lançamentos & Extrato',
      icon: PlusCircle,
      iconColor: '#10B981',
      title: 'Botão +, Parcelamentos e Filtros Rápidos',
      description:
        'Toque no botão verde "+" no rodapé para registrar receitas, despesas, compras parceladas ou gastos fixos em segundos.',
      bullets: [
        'A lista de categorias abre recolhida para evitar rolagem excessiva e manter a tela leve.',
        'Use "Compra Parcelada" para gerar automaticamente todas as parcelas nos meses futuros.',
        'No Extrato, filtre por Dia, Mês Atual, Mês Passado, Ano ou Todos e veja Receitas, Despesas e Balanço.'
      ],
      tip: 'Você também pode anexar fotos de comprovantes direto no lançamento.'
    },
    {
      badge: '4. Orçamento 50/30/20 & Categorias',
      icon: PieChart,
      iconColor: '#F59E0B',
      title: 'Planos Dinâmicos que se adaptam ao seu mês',
      description:
        'Na aba Orçamento, escolha entre 3 objetivos no Assistente (50/30/20, Quitar Dívidas ou Economia Máxima) e os tetos se ajustam sozinhos.',
      bullets: [
        'Por padrão você começa com 3 pilares claros: Despesas (50%), Lazer (30%) e Reserva e Metas (20%).',
        'Suas alterações ficam salvas para todos os meses seguintes e escalam conforme sua renda do mês (ou R$ 2.400 padrão).',
        'Criou uma nova categoria em Mais → Categorias? Basta escolher onde ela entra no plano (Essenciais, Lazer ou Reserva) e o sistema divide as porcentagens.'
      ],
      tip: 'Prefere valores fixos em reais? Troque o modo no topo da aba Planos quando quiser.'
    },
    {
      badge: '5. Metas & Sugestões Prontas',
      icon: Target,
      iconColor: '#A855F7',
      title: 'Metas financeiras com cálculo mensal automático',
      description:
        'Na aba Metas, acompanhe reserva de emergência, quitação de dívidas ou planos futuros sem planilhas complicadas.',
      bullets: [
        'Aba Minhas Metas: mostra quanto falta e quanto poupar por mês até a data-alvo.',
        'Aba Metas Sugeridas: traz 6 metas comuns já prontas (Reserva 3m, Quitar Dívidas, Viagem, Fundo Saúde e mais) para escolher em 1 toque.',
        'Use "Aportar" para somar progresso e registrar automaticamente a saída no seu extrato.'
      ],
      tip: 'Cada meta sugerida tem um botão (i) explicando por que ela ajuda e como definir o valor.'
    },
    {
      badge: '6. Relatórios, Planilha & Agenda',
      icon: BarChart3,
      iconColor: '#EC4899',
      title: 'Planilha na tela, CSV, Agenda e Assinaturas',
      description:
        'No menu Mais você acessa ferramentas extras para revisar todo seu histórico e planejar vencimentos.',
      bullets: [
        'Relatórios: filtre por Dia, Mês Atual, Mês Passado, Ano ou Todos e alterne entre Gráficos e Planilha completa.',
        'Exporte a Planilha em formato .CSV para abrir no Excel ou Google Sheets quando quiser.',
        'Use o Calendário para ver contas no dia do vencimento e Assinaturas para flagrar cobranças repetidas.'
      ],
      tip: 'Você pode rever este tutorial a qualquer momento em Mais → Ajuda e Tutorial.'
    }
  ];

  const totalSlides = slides.length;

  const objetivosList: { id: OnboardingGoal; title: string; desc: string; icon: React.ElementType }[] = [
    {
      id: 'controlar_gastos',
      title: 'Controlar melhor meus gastos',
      desc: 'Saber para onde o dinheiro foi e usar o método 50/30/20.',
      icon: TrendingUp
    },
    {
      id: 'sair_dividas',
      title: 'Sair das dívidas e faturas',
      desc: 'Organizar parcelamentos e ter previsibilidade das contas.',
      icon: ShieldCheck
    },
    {
      id: 'guardar_meta',
      title: 'Guardar dinheiro para uma meta',
      desc: 'Construir reserva ou juntar para viagens e conquistas.',
      icon: Target
    },
    {
      id: 'grandes_despesas',
      title: 'Me preparar para grandes despesas',
      desc: 'Planejar reformas, estudos ou investimentos futuros.',
      icon: PieChart
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
    }
    e.target.value = '';
  };

  const currentSlide = slides[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/94">
      <div className="w-full max-w-md bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-800 max-h-[92vh] overflow-y-auto">
        {step < totalSlides ? (
          <div className="py-1 space-y-4">
            {/* Cabeçalho de passo + progresso */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-400">
                {currentSlide.badge}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                Passo {step + 1} de {totalSlides}
              </span>
            </div>

            <div className="flex space-x-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  aria-label={`Ir para passo ${i + 1}`}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'bg-brand-500'
                      : i < step
                      ? 'bg-brand-500/40'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* Ícone + Título + Descrição */}
            <div className="flex items-start space-x-3 pt-1">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-800 border border-slate-700/70 flex-shrink-0">
                {React.createElement(currentSlide.icon, {
                  size: 26,
                  style: { color: currentSlide.iconColor },
                  strokeWidth: 2.2
                })}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100 leading-snug">
                  {currentSlide.title}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">
                  {currentSlide.description}
                </p>
              </div>
            </div>

            {/* Lista detalhada de funcionalidades */}
            <ul className="space-y-2">
              {currentSlide.bullets.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start space-x-2.5 p-3 rounded-2xl bg-slate-800/70 border border-slate-800 text-xs text-slate-200 leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-brand-500/15 text-brand-400 font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* Dica prática */}
            <div className="p-3 rounded-2xl bg-amber-950/35 border border-amber-800/40 text-[11px] text-amber-200 leading-relaxed">
              <strong className="text-amber-300">Dica rápida:</strong> {currentSlide.tip}
            </div>

            {/* Botões de navegação Anterior / Próximo */}
            <div className="flex items-center gap-2 pt-1">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1 transition-colors"
                >
                  <ArrowLeft size={15} />
                  <span>Anterior</span>
                </button>
              )}

              <button
                type="button"
                data-testid="tutorial-next-btn"
                onClick={() => {
                  if (reviewMode && step === totalSlides - 1) {
                    onCloseReview?.();
                  } else {
                    setStep(step + 1);
                  }
                }}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/25 transition-all"
              >
                <span>
                  {step === totalSlides - 1
                    ? reviewMode
                      ? 'Concluir tutorial'
                      : 'Personalizar meu perfil'
                    : 'Próximo passo'}
                </span>
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <button
                type="button"
                onClick={() => (reviewMode ? onCloseReview?.() : setStep(totalSlides))}
                className="hover:text-slate-200 hover:underline py-1"
              >
                {reviewMode ? 'Fechar tutorial' : 'Pular tutorial'}
              </button>

              {!reviewMode && (
                <label className="inline-flex items-center space-x-1 cursor-pointer hover:underline text-brand-400 py-1">
                  <Upload size={13} />
                  <span>Já tenho backup</span>
                  <input
                    type="file"
                    accept=".json,.csv,application/json,text/plain,*/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        ) : (
          /* Pergunta Final: Personalização do perfil e objetivo */
          <div className="py-1">
            <div className="text-center mb-5">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
                Personalização rápida
              </span>
              <h2 className="text-xl font-bold text-slate-100 mt-1">
                Como podemos te chamar?
              </h2>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Seu nome ou apelido
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Carlos, Ana, Marlene"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-100 font-medium focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Renda mensal estimada (R$)
                </label>
                <input
                  type="number"
                  value={rendaEstimada || ''}
                  onChange={e => setRendaEstimada(Number(e.target.value))}
                  placeholder="Ex: 2400"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-100 font-medium focus:ring-2 focus:ring-brand-500 outline-none text-sm tabular-nums"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Usada como base para a regra 50/30/20 (3 pilares: Despesas, Lazer e Reserva e Metas).
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Qual o seu principal objetivo agora?
                </label>
                <div className="space-y-2">
                  {objetivosList.map(obj => {
                    const isSelected = objetivo === obj.id;
                    const Icon = obj.icon;
                    return (
                      <button
                        key={obj.id}
                        type="button"
                        onClick={() => setObjetivo(obj.id)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start space-x-3 ${
                          isSelected
                            ? 'border-brand-500 bg-brand-950/40 text-brand-100 shadow-xs'
                            : 'border-slate-800 hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl mt-0.5 flex-shrink-0 ${
                            isSelected
                              ? 'bg-brand-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-xs flex items-center justify-between">
                            <span>{obj.title}</span>
                            {isSelected && <Check size={14} className="text-brand-400" />}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{obj.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() =>
                  onComplete({
                    nome: nome.trim() || 'Carlos',
                    objetivo,
                    rendaEstimada: rendaEstimada > 0 ? rendaEstimada : 2400,
                    carregarDemo: false
                  })
                }
                className="w-full py-3.5 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/25 transition-all text-sm"
              >
                <span>Começar com app limpo</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() =>
                  onComplete({
                    nome: nome.trim() || 'Carlos',
                    objetivo,
                    rendaEstimada: rendaEstimada > 0 ? rendaEstimada : 2400,
                    carregarDemo: true
                  })
                }
                className="w-full py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center justify-center space-x-2 transition-all text-xs"
              >
                <Sparkles size={15} className="text-amber-500" />
                <span>Iniciar com dados de demonstração (testar)</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(totalSlides - 1)}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                ← Voltar ao tutorial
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
