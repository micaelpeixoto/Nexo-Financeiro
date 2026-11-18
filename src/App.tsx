import React, { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import {
  DatabaseState,
  Lancamento,
  Orcamento,
  Categoria,
  Conta,
  Meta,
  Settings,
  Usuario,
  TransactionType,
  TransactionStatus,
  RecurrenceFrequency,
  BudgetControlProfileId
} from './types';
import {
  loadDatabase,
  saveDatabase,
  hydrateDatabaseFromIndexedDB,
  flushPendingDatabaseSave,
  getInitialState,
  generateDemoData,
  removeDemoData,
  buildBudgetConfigFromProfile,
  INITIAL_BUDGET_CONFIG,
  STANDARD_503020_EXPENSE_CATEGORIES
} from './utils/storage';
import {
  toISODate,
  generateInstallmentTransactions,
  addMonthsSafe,
  resolveMonthBudgets,
  DEFAULT_FALLBACK_INCOME,
  computeDynamicCategoryPercentages,
  inferBudgetGroup
} from './utils/calculations';
import { importDatabaseJSON } from './utils/export';
import { evaluateAndDispatchNotifications } from './utils/notifications';

// Componentes críticos do primeiro carregamento (Início)
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { DashboardView } from './components/DashboardView';

// Telas secundárias e modais carregados sob demanda (reduz bundle inicial no celular)
const OnboardingModal = lazy(() => import('./components/OnboardingModal').then(m => ({ default: m.OnboardingModal })));
const TransactionsView = lazy(() => import('./components/TransactionsView').then(m => ({ default: m.TransactionsView })));
const TransactionFormModal = lazy(() => import('./components/TransactionFormModal').then(m => ({ default: m.TransactionFormModal })));
const TransactionDetailModal = lazy(() => import('./components/TransactionDetailModal').then(m => ({ default: m.TransactionDetailModal })));
const BudgetsView = lazy(() => import('./components/BudgetsView').then(m => ({ default: m.BudgetsView })));
const GoalsView = lazy(() => import('./components/GoalsView').then(m => ({ default: m.GoalsView })));
const ReportsView = lazy(() => import('./components/ReportsView').then(m => ({ default: m.ReportsView })));
const CalendarView = lazy(() => import('./components/CalendarView').then(m => ({ default: m.CalendarView })));
const CategoriesAccountsView = lazy(() => import('./components/CategoriesAccountsView').then(m => ({ default: m.CategoriesAccountsView })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const SubscriptionsModal = lazy(() => import('./components/SubscriptionsModal').then(m => ({ default: m.SubscriptionsModal })));
const YearWrappedModal = lazy(() => import('./components/YearWrappedModal').then(m => ({ default: m.YearWrappedModal })));
const ShareMonthModal = lazy(() => import('./components/ShareMonthModal').then(m => ({ default: m.ShareMonthModal })));
const SecurityLockModal = lazy(() => import('./components/SecurityLockModal').then(m => ({ default: m.SecurityLockModal })));
const DetailedGuideModal = lazy(() => import('./components/DetailedGuideModal').then(m => ({ default: m.DetailedGuideModal })));

const LazyFallback = () => (
  <div className="py-16 flex items-center justify-center text-xs font-medium text-slate-400">
    Carregando...
  </div>
);

export default function App() {
  const [dbState, setDbState] = useState<DatabaseState>(() => loadDatabase());
  const [currentYM, setCurrentYM] = useState<string>(() => toISODate(new Date()).slice(0, 7));
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Subtelas acessadas via Menu / Mais
  const [activeSubView, setActiveSubView] = useState<
    'reports' | 'calendar' | 'categories' | 'subscriptions' | 'yearWrapped' | null
  >(null);

  // Modais flutuantes
  const [showTransactionForm, setShowTransactionForm] = useState<boolean>(false);
  const [formInitialType, setFormInitialType] = useState<TransactionType>('despesa');
  const [editingTransaction, setEditingTransaction] = useState<Lancamento | null>(null);
  const [inspectingTransaction, setInspectingTransaction] = useState<Lancamento | null>(null);

  const [showShareMonthModal, setShowShareMonthModal] = useState<boolean>(false);
  const [showYearWrappedModal, setShowYearWrappedModal] = useState<boolean>(false);
  const [showSubscriptionsModal, setShowSubscriptionsModal] = useState<boolean>(false);
  const [showTutorialReview, setShowTutorialReview] = useState<boolean>(false);
  const [showDetailedGuide, setShowDetailedGuide] = useState<boolean>(false);
  const [appToast, setAppToast] = useState<{ text: string; type: 'ok' | 'error' } | null>(null);

  // Segurança PIN
  const [isLocked, setIsLocked] = useState<boolean>(() => !!dbState.settings.pin_ativado);

  const showToast = (text: string, type: 'ok' | 'error' = 'ok') => {
    setAppToast({ text, type });
    setTimeout(() => setAppToast(null), 4000);
  };

  // Suporte a autostart=1 + hidratação assíncrona do IndexedDB + flush seguro ao sair
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && !dbState.onboardingCompleted) {
      const seeded = generateDemoData(dbState);
      setDbState(seeded);
      saveDatabase(seeded, true);
    } else {
      void hydrateDatabaseFromIndexedDB().then(hydrated => {
        if (hydrated) setDbState(hydrated);
      });
    }

    const handleVisibilityOrExit = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingDatabaseSave();
      }
    };
    const handlePageHide = () => flushPendingDatabaseSave();

    document.addEventListener('visibilitychange', handleVisibilityOrExit);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrExit);
      window.removeEventListener('pagehide', handlePageHide);
      flushPendingDatabaseSave();
    };
  }, []);

  // Sincroniza persistência do banco (IndexedDB assíncrono + localStorage em idle)
  const updateDbState = (updater: (prev: DatabaseState) => DatabaseState) => {
    setDbState(prev => {
      const next = updater(prev);
      saveDatabase(next);
      return next;
    });
  };

  // Força Modo Escuro permanente conforme solicitado pelo usuário
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
  }, []);

  // Avalia alertas locais após a UI responder ao toque (sem travar cliques)
  useEffect(() => {
    if (!dbState.onboardingCompleted || isLocked) return;
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(() => {
        evaluateAndDispatchNotifications(dbState, currentYM);
      }, { timeout: 500 });
      return () => {
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(handle);
        }
      };
    }
    const timer = globalThis.setTimeout(() => {
      evaluateAndDispatchNotifications(dbState, currentYM);
    }, 150);
    return () => globalThis.clearTimeout(timer);
  }, [dbState.lancamentos, dbState.orcamentos, dbState.settings, dbState.onboardingCompleted, currentYM, isLocked]);

  // Lista de descrições recentes para autocomplete inteligente
  const recentDescriptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of dbState.lancamentos) {
      if (t.descricao && !t.descricao.includes('Parcela')) {
        set.add(t.descricao.trim());
      }
    }
    return Array.from(set);
  }, [dbState.lancamentos]);

  // Checa se dados demo estão carregados
  const hasDemoData = useMemo(() => {
    return dbState.lancamentos.some(t => t.origem === 'demo');
  }, [dbState.lancamentos]);

  // HANDLERS DE ONBOARDING
  const handleCompleteOnboarding = (data: {
    nome: string;
    objetivo: any;
    rendaEstimada: number;
    carregarDemo: boolean;
  }) => {
    updateDbState(prev => {
      let state = {
        ...prev,
        usuario: {
          ...prev.usuario,
          nome: data.nome,
          objetivo_onboarding: data.objetivo
        },
        onboardingCompleted: true
      };

      if (data.carregarDemo) {
        state = generateDemoData(state);
      } else {
        const fallback = data.rendaEstimada > 0 ? data.rendaEstimada : DEFAULT_FALLBACK_INCOME;
        state = {
          ...state,
          settings: {
            ...state.settings,
            orcamento_config: buildBudgetConfigFromProfile(
              'equilibrado_50_30_20',
              fallback,
              currentYM,
              state.categorias
            )
          }
        };
      }

      return state;
    });
  };

  // CRIAÇÃO OU EDIÇÃO DE LANÇAMENTO
  const handleSaveTransaction = (formData: {
    tipo: TransactionType;
    valor: number;
    descricao: string;
    categoria_id: string;
    conta_id: string;
    data: string;
    status: TransactionStatus;
    observacao?: string;
    anexo_path?: string;
    recorrencia?: { frequencia: RecurrenceFrequency; mesesRepetir: number } | null;
    parcelamento?: { totalParcelas: number } | null;
  }) => {
    updateDbState(prev => {
      const now = new Date().toISOString();

      // Edição de existente
      if (editingTransaction) {
        const updatedList = prev.lancamentos.map(t => {
          if (t.id === editingTransaction.id) {
            return {
              ...t,
              tipo: formData.tipo,
              valor: formData.valor,
              descricao: formData.descricao,
              categoria_id: formData.categoria_id,
              conta_id: formData.conta_id,
              data: formData.data,
              status: formData.status,
              observacao: formData.observacao,
              anexo_path: formData.anexo_path,
              updated_at: now
            };
          }
          return t;
        });

        return { ...prev, lancamentos: updatedList };
      }

      // Novo lançamento parcelado
      if (formData.parcelamento && formData.parcelamento.totalParcelas > 1) {
        const rawItems = generateInstallmentTransactions(
          {
            data: formData.data,
            tipo: formData.tipo,
            descricao: formData.descricao,
            valor: formData.valor,
            conta_id: formData.conta_id,
            categoria_id: formData.categoria_id,
            status: formData.status,
            observacao: formData.observacao,
            anexo_path: formData.anexo_path,
            meta_id: null,
            serie_recorrencia_id: null,
            origem: 'parcelamento'
          },
          formData.parcelamento.totalParcelas
        );

        const newItems: Lancamento[] = rawItems.map((item, idx) => ({
          ...item,
          id: `tx_${Date.now()}_${idx}`,
          created_at: now,
          updated_at: now
        }));

        return { ...prev, lancamentos: [...prev.lancamentos, ...newItems] };
      }

      // Novo lançamento recorrente
      if (formData.recorrencia && formData.recorrencia.mesesRepetir > 1) {
        const serieId = `serie_${Date.now()}`;
        const newItems: Lancamento[] = [];

        for (let i = 0; i < formData.recorrencia.mesesRepetir; i++) {
          const itemDate = addMonthsSafe(formData.data, i);
          newItems.push({
            id: `tx_${Date.now()}_${i}`,
            data: itemDate,
            tipo: formData.tipo,
            descricao: formData.descricao,
            valor: formData.valor,
            conta_id: formData.conta_id,
            categoria_id: formData.categoria_id,
            status: i === 0 ? formData.status : 'pendente',
            observacao: formData.observacao,
            anexo_path: formData.anexo_path,
            serie_recorrencia_id: serieId,
            parcela_numero: null,
            parcela_total: null,
            meta_id: null,
            origem: 'recorrente',
            created_at: now,
            updated_at: now
          });
        }

        return { ...prev, lancamentos: [...prev.lancamentos, ...newItems] };
      }

      // Novo lançamento simples
      const singleItem: Lancamento = {
        id: `tx_${Date.now()}`,
        data: formData.data,
        tipo: formData.tipo,
        descricao: formData.descricao,
        valor: formData.valor,
        conta_id: formData.conta_id,
        categoria_id: formData.categoria_id,
        status: formData.status,
        observacao: formData.observacao,
        anexo_path: formData.anexo_path,
        serie_recorrencia_id: null,
        parcela_numero: null,
        parcela_total: null,
        meta_id: null,
        origem: 'manual',
        created_at: now,
        updated_at: now
      };

      return { ...prev, lancamentos: [...prev.lancamentos, singleItem] };
    });

    setShowTransactionForm(false);
    setEditingTransaction(null);
  };

  // Alternar status (Pago ↔ Pendente)
  const handleToggleStatus = (txId: string) => {
    updateDbState(prev => {
      const updated = prev.lancamentos.map(t => {
        if (t.id === txId) {
          let newStatus: TransactionStatus;
          if (t.tipo === 'receita') {
            newStatus = t.status === 'recebido' || t.status === 'pago' ? 'a_receber' : 'recebido';
          } else {
            newStatus = t.status === 'pago' ? 'pendente' : 'pago';
          }
          return { ...t, status: newStatus, updated_at: new Date().toISOString() };
        }
        return t;
      });
      return { ...prev, lancamentos: updated };
    });

    // Se estiver inspecionando o item, atualiza a visualização modal
    if (inspectingTransaction && inspectingTransaction.id === txId) {
      setInspectingTransaction(prev => {
        if (!prev) return null;
        let newStatus: TransactionStatus;
        if (prev.tipo === 'receita') {
          newStatus = prev.status === 'recebido' || prev.status === 'pago' ? 'a_receber' : 'recebido';
        } else {
          newStatus = prev.status === 'pago' ? 'pendente' : 'pago';
        }
        return { ...prev, status: newStatus };
      });
    }
  };

  // Excluir lançamento
  const handleDeleteTransaction = (txId: string) => {
    updateDbState(prev => ({
      ...prev,
      lancamentos: prev.lancamentos.filter(t => t.id !== txId)
    }));
  };

  // Duplicar lançamento
  const handleDuplicateTransaction = (tx: Lancamento) => {
    updateDbState(prev => {
      const clone: Lancamento = {
        ...tx,
        id: `tx_${Date.now()}`,
        descricao: `${tx.descricao} (Cópia)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return { ...prev, lancamentos: [...prev.lancamentos, clone] };
    });
    setInspectingTransaction(null);
  };

  // Orçamentos Dinâmicos (persistem para meses seguintes e escalam com % da renda)
  const handleSaveFixedBudget = (catId: string, referenceYM: string, targetValue: number) => {
    updateDbState(prev => {
      const cfg = prev.settings.orcamento_config || { ...INITIAL_BUDGET_CONFIG };
      // Propaga para o mês atual e remove valores obsoletos posteriores para que todos os seguintes herdem o novo valor
      const keptBudgets = prev.orcamentos.filter(
        b => !(b.categoria_id === catId && b.referencia >= referenceYM)
      );
      const updatedBudget: Orcamento = {
        id: `b_${referenceYM}_${catId}`,
        categoria_id: catId,
        periodo_tipo: 'mensal',
        referencia: referenceYM,
        valor_meta: targetValue
      };

      const nextCfg =
        cfg.modo === 'percentual'
          ? {
              ...cfg,
              tetos_fixos_desde: {
                ...(cfg.tetos_fixos_desde || {}),
                [catId]: { desde: referenceYM, valor: targetValue }
              }
            }
          : cfg;

      return {
        ...prev,
        orcamentos: [...keptBudgets, updatedBudget],
        settings: {
          ...prev.settings,
          orcamento_config: nextCfg
        }
      };
    });
  };

  const handleSaveCategoryPercentage = (catId: string, pct: number) => {
    updateDbState(prev => {
      const cfg = prev.settings.orcamento_config || { ...INITIAL_BUDGET_CONFIG };
      const nextFixed = { ...(cfg.tetos_fixos_desde || {}) };
      delete nextFixed[catId];
      return {
        ...prev,
        settings: {
          ...prev.settings,
          orcamento_config: {
            ...cfg,
            modo: 'percentual',
            percentuais_categoria: {
              ...cfg.percentuais_categoria,
              [catId]: pct
            },
            tetos_fixos_desde: nextFixed
          }
        }
      };
    });
  };

  const handleClearCategoryFixedOverride = (catId: string) => {
    updateDbState(prev => {
      const cfg = prev.settings.orcamento_config || { ...INITIAL_BUDGET_CONFIG };
      const nextFixed = { ...(cfg.tetos_fixos_desde || {}) };
      delete nextFixed[catId];
      return {
        ...prev,
        settings: {
          ...prev.settings,
          orcamento_config: {
            ...cfg,
            tetos_fixos_desde: nextFixed
          }
        }
      };
    });
  };

  const handleApplyBudgetAssistant = (
    profileId: Exclude<BudgetControlProfileId, 'personalizado'>,
    fallbackIncome: number,
    referenceYM: string,
    simplifyToThreeCategories?: boolean
  ) => {
    updateDbState(prev => {
      let nextCategories = prev.categorias;
      let nextLancamentos = prev.lancamentos;

      if (simplifyToThreeCategories) {
        const incomeCats = prev.categorias.filter(c => c.tipo === 'receita');
        nextCategories = [
          ...STANDARD_503020_EXPENSE_CATEGORIES,
          ...incomeCats
        ];

        const catMap = new Map(prev.categorias.map(c => [c.id, c]));
        nextLancamentos = prev.lancamentos.map(tx => {
          if (tx.tipo !== 'despesa') return tx;
          const oldCat = catMap.get(tx.categoria_id);
          if (!oldCat) return tx;
          if (
            oldCat.id === 'cat_despesas' ||
            oldCat.id === 'cat_lazer' ||
            oldCat.id === 'cat_reserva'
          ) {
            return tx;
          }
          const group = inferBudgetGroup(oldCat);
          const mappedId =
            group === 'reserva'
              ? 'cat_reserva'
              : group === 'lazer'
              ? 'cat_lazer'
              : 'cat_despesas';
          return { ...tx, categoria_id: mappedId };
        });
      }

      return {
        ...prev,
        categorias: nextCategories,
        lancamentos: nextLancamentos,
        settings: {
          ...prev.settings,
          orcamento_config: buildBudgetConfigFromProfile(
            profileId,
            fallbackIncome,
            referenceYM,
            nextCategories
          )
        }
      };
    });
  };

  const handleToggleBudgetMode = (modo: 'percentual' | 'fixo', referenceYM: string) => {
    updateDbState(prev => {
      const cfg = prev.settings.orcamento_config || { ...INITIAL_BUDGET_CONFIG };
      if (modo === 'fixo') {
        // Materializa os valores atuais no mês como base fixa recorrente para meses seguintes
        const resolved = resolveMonthBudgets(
          prev.categorias,
          referenceYM,
          prev.orcamentos,
          prev.lancamentos,
          cfg
        );
        const kept = prev.orcamentos.filter(b => b.referencia < referenceYM);
        const materialized: Orcamento[] = resolved
          .filter(r => r.target > 0)
          .map(r => ({
            id: `b_${referenceYM}_${r.categoria_id}`,
            categoria_id: r.categoria_id,
            periodo_tipo: 'mensal',
            referencia: referenceYM,
            valor_meta: r.target
          }));
        return {
          ...prev,
          orcamentos: [...kept, ...materialized],
          settings: {
            ...prev.settings,
            orcamento_config: {
              ...cfg,
              modo: 'fixo'
            }
          }
        };
      }
      return {
        ...prev,
        settings: {
          ...prev.settings,
          orcamento_config: {
            ...cfg,
            modo: 'percentual',
            aplicado_desde: referenceYM
          }
        }
      };
    });
  };

  // Metas
  const handleSaveGoal = (goalData: Omit<Meta, 'id' | 'criada_em'>) => {
    updateDbState(prev => {
      const newGoal: Meta = {
        ...goalData,
        id: `meta_${Date.now()}`,
        criada_em: toISODate(new Date())
      };
      return { ...prev, metas: [...prev.metas, newGoal] };
    });
  };

  const handleAddGoalContribution = (goalId: string, amount: number, note?: string) => {
    updateDbState(prev => {
      const updatedMetas = prev.metas.map(m => {
        if (m.id === goalId) {
          const newVal = Math.round((m.valor_atual + amount) * 100) / 100;
          return {
            ...m,
            valor_atual: newVal,
            status: newVal >= m.valor_alvo ? 'concluida' : m.status
          };
        }
        return m;
      });

      // Cria lançamento de reserva/meta refletido automaticamente no Orçamento (Reserva e Metas) e no Extrato
      const targetGoal = prev.metas.find(m => m.id === goalId);
      const savingsCategory =
        prev.categorias.find(c => c.tipo === 'despesa' && c.id === 'cat_reserva') ||
        prev.categorias.find(c => c.tipo === 'despesa' && inferBudgetGroup(c) === 'reserva') ||
        prev.categorias.find(c => c.tipo === 'despesa') ||
        prev.categorias[0];
      const primaryAccount = prev.contas[0];

      const contributionTx: Lancamento = {
        id: `tx_contrib_${Date.now()}`,
        data: toISODate(new Date()),
        tipo: 'despesa',
        descricao: `Aporte: ${targetGoal?.nome || 'Meta'}`,
        valor: amount,
        conta_id: primaryAccount.id,
        categoria_id: savingsCategory.id,
        status: 'pago',
        meta_id: goalId,
        observacao: note,
        origem: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return {
        ...prev,
        metas: updatedMetas,
        lancamentos: [...prev.lancamentos, contributionTx]
      };
    });
  };

  const handleDeleteGoal = (goalId: string) => {
    updateDbState(prev => ({
      ...prev,
      metas: prev.metas.filter(m => m.id !== goalId)
    }));
  };

  // Categorias e Contas (recalcula automaticamente as % do sistema 50/30/20 ao criar/editar/excluir)
  const syncBudgetConfigWithCategories = (prev: DatabaseState, nextCategories: Categoria[]): Settings => {
    const cfg = prev.settings.orcamento_config;
    if (!cfg || cfg.modo !== 'percentual' || cfg.perfil_ativo === 'personalizado') {
      return prev.settings;
    }
    const updatedPercentages = computeDynamicCategoryPercentages(nextCategories, cfg.perfil_ativo);
    return {
      ...prev.settings,
      orcamento_config: {
        ...cfg,
        percentuais_categoria: updatedPercentages
      }
    };
  };

  const handleSaveCategory = (cat: Categoria) => {
    updateDbState(prev => {
      const idx = prev.categorias.findIndex(c => c.id === cat.id);
      const nextCategories =
        idx >= 0
          ? prev.categorias.map((c, i) => (i === idx ? cat : c))
          : [...prev.categorias, cat];

      return {
        ...prev,
        categorias: nextCategories,
        settings: syncBudgetConfigWithCategories(prev, nextCategories)
      };
    });
  };

  const handleDeleteCategory = (catId: string, migrateToCatId?: string) => {
    updateDbState(prev => {
      let updatedTx = prev.lancamentos;
      if (migrateToCatId) {
        updatedTx = prev.lancamentos.map(t => {
          if (t.categoria_id === catId) {
            return { ...t, categoria_id: migrateToCatId };
          }
          return t;
        });
      }
      const nextCategories = prev.categorias.filter(c => c.id !== catId);
      return {
        ...prev,
        categorias: nextCategories,
        lancamentos: updatedTx,
        settings: syncBudgetConfigWithCategories(prev, nextCategories)
      };
    });
  };

  const handleSaveAccount = (acc: Conta) => {
    updateDbState(prev => {
      const idx = prev.contas.findIndex(a => a.id === acc.id);
      if (idx >= 0) {
        const next = [...prev.contas];
        next[idx] = acc;
        return { ...prev, contas: next };
      }
      return { ...prev, contas: [...prev.contas, acc] };
    });
  };

  const handleDeleteAccount = (accId: string) => {
    updateDbState(prev => ({
      ...prev,
      contas: prev.contas.filter(a => a.id !== accId)
    }));
  };

  // Backup e Restauração
  const handleImportBackup = async (file: File) => {
    try {
      const imported = await importDatabaseJSON(file);
      setDbState(imported);
      saveDatabase(imported);
      showToast('Backup restaurado com sucesso!', 'ok');
    } catch (err) {
      showToast('Arquivo inválido. Use um backup JSON gerado por este app.', 'error');
    }
  };

  const handleLoadDemoData = () => {
    const seeded = generateDemoData(dbState);
    setDbState(seeded);
    saveDatabase(seeded);
  };

  const handleClearDemoData = () => {
    const cleaned = removeDemoData(dbState);
    setDbState(cleaned);
    saveDatabase(cleaned);
  };

  const handleResetAllData = () => {
    const fresh = getInitialState();
    setDbState(fresh);
    saveDatabase(fresh, true);
    window.location.reload();
  };

  // Se bloqueio por PIN estiver ativado
  if (isLocked && dbState.settings.pin_hash) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[var(--app-bg)]" />}>
        <SecurityLockModal
          pinHash={dbState.settings.pin_hash}
          onUnlock={() => setIsLocked(false)}
        />
      </Suspense>
    );
  }

  // Se primeira vez (onboarding não concluído)
  if (!dbState.onboardingCompleted) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[var(--app-bg)]" />}>
        <OnboardingModal
          onComplete={handleCompleteOnboarding}
          onImportBackup={handleImportBackup}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-slate-100 flex flex-col font-sans">
      {/* HEADER FIXO SUPERIOR */}
      <Header
        currentYM={currentYM}
        onChangeYM={setCurrentYM}
        hasDemoData={hasDemoData}
        onClearDemoData={handleClearDemoData}
        userName={dbState.usuario.nome}
      />

      {/* ÁREA DE CONTEÚDO PRINCIPAL (COM SCROLL CONFORTÁVEL) */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-3">
        {appToast && (
          <div
            role="status"
            className={`mb-3 px-4 py-2.5 rounded-2xl text-xs font-semibold border ${
              appToast.type === 'ok'
                ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-200'
                : 'bg-red-950/80 border-red-700/60 text-red-200'
            }`}
          >
            {appToast.text}
          </div>
        )}
        <Suspense fallback={<LazyFallback />}>
        {/* SUBTELAS ABERTAS A PARTIR DO MENU */}
        {activeSubView === 'reports' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Relatórios Financeiros
              </h2>
              <button
                onClick={() => setActiveSubView(null)}
                className="text-xs font-semibold text-brand-400 hover:underline"
              >
                ← Voltar
              </button>
            </div>
            <ReportsView
              currentYM={currentYM}
              transactions={dbState.lancamentos}
              categories={dbState.categorias}
              accounts={dbState.contas}
              onOpenShareMonth={() => setShowShareMonthModal(true)}
              onOpenYearWrapped={() => setShowYearWrappedModal(true)}
            />
          </div>
        )}

        {activeSubView === 'calendar' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Calendário Financeiro
              </h2>
              <button
                onClick={() => setActiveSubView(null)}
                className="text-xs font-semibold text-brand-400 hover:underline"
              >
                ← Voltar
              </button>
            </div>
            <CalendarView
              currentYM={currentYM}
              transactions={dbState.lancamentos}
              categories={dbState.categorias}
              accounts={dbState.contas}
              onSelectTransaction={setInspectingTransaction}
              onToggleStatus={handleToggleStatus}
            />
          </div>
        )}

        {activeSubView === 'categories' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Categorias e Contas
              </h2>
              <button
                onClick={() => setActiveSubView(null)}
                className="text-xs font-semibold text-brand-400 hover:underline"
              >
                ← Voltar
              </button>
            </div>
            <CategoriesAccountsView
              categories={dbState.categorias}
              accounts={dbState.contas}
              transactions={dbState.lancamentos}
              onSaveCategory={handleSaveCategory}
              onDeleteCategory={handleDeleteCategory}
              onSaveAccount={handleSaveAccount}
              onDeleteAccount={handleDeleteAccount}
            />
          </div>
        )}

        {/* TELAS PRINCIPAIS DE NAVEGAÇÃO */}
        {!activeSubView && activeTab === 'dashboard' && (
          <DashboardView
            currentYM={currentYM}
            transactions={dbState.lancamentos}
            budgets={dbState.orcamentos}
            budgetConfig={dbState.settings.orcamento_config}
            categories={dbState.categorias}
            accounts={dbState.contas}
            metas={dbState.metas}
            userName={dbState.usuario.nome}
            onOpenNewTransaction={(type) => {
              setFormInitialType(type || 'despesa');
              setEditingTransaction(null);
              setShowTransactionForm(true);
            }}
            onOpenGoals={() => setActiveTab('goals')}
            onOpenBudgets={() => setActiveTab('budgets')}
            onOpenTransactions={() => setActiveTab('transactions')}
            onSelectTransaction={setInspectingTransaction}
            onMarkAsPaid={handleToggleStatus}
          />
        )}

        {!activeSubView && activeTab === 'transactions' && (
          <TransactionsView
            currentYM={currentYM}
            transactions={dbState.lancamentos}
            categories={dbState.categorias}
            accounts={dbState.contas}
            onOpenNewTransaction={() => {
              setFormInitialType('despesa');
              setEditingTransaction(null);
              setShowTransactionForm(true);
            }}
            onSelectTransaction={setInspectingTransaction}
            onToggleStatus={handleToggleStatus}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {!activeSubView && activeTab === 'budgets' && (
          <BudgetsView
            currentYM={currentYM}
            budgets={dbState.orcamentos}
            budgetConfig={dbState.settings.orcamento_config}
            categories={dbState.categorias}
            transactions={dbState.lancamentos}
            onSaveFixedBudget={handleSaveFixedBudget}
            onSaveCategoryPercentage={handleSaveCategoryPercentage}
            onClearCategoryFixedOverride={handleClearCategoryFixedOverride}
            onApplyBudgetAssistant={handleApplyBudgetAssistant}
            onToggleBudgetMode={handleToggleBudgetMode}
          />
        )}

        {!activeSubView && activeTab === 'goals' && (
          <GoalsView
            metas={dbState.metas}
            onSaveGoal={handleSaveGoal}
            onAddContribution={handleAddGoalContribution}
            onDeleteGoal={handleDeleteGoal}
          />
        )}

        {!activeSubView && activeTab === 'menu' && (
          <SettingsView
            settings={dbState.settings}
            user={dbState.usuario}
            databaseState={dbState}
            hasDemoData={hasDemoData}
            onUpdateSettings={(newSettings) => updateDbState(prev => ({ ...prev, settings: newSettings }))}
            onUpdateUser={(newUser) => updateDbState(prev => ({ ...prev, usuario: newUser }))}
            onImportBackup={handleImportBackup}
            onLoadDemoData={handleLoadDemoData}
            onClearDemoData={handleClearDemoData}
            onResetAllData={handleResetAllData}
            onReopenTutorial={() => setShowTutorialReview(true)}
            onOpenDetailedGuide={() => setShowDetailedGuide(true)}
            onNavigateTo={(view) => {
              if (view === 'subscriptions') setShowSubscriptionsModal(true);
              else if (view === 'yearWrapped') setShowYearWrappedModal(true);
              else setActiveSubView(view);
            }}
          />
        )}
        </Suspense>
      </main>

      {/* BARRA DE NAVEGAÇÃO INFERIOR */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveSubView(null);
          setActiveTab(tab);
        }}
        onOpenNewTransaction={() => {
          setFormInitialType('despesa');
          setEditingTransaction(null);
          setShowTransactionForm(true);
        }}
      />

      {/* MODAL DE NOVO / EDITAR LANÇAMENTO */}
      <Suspense fallback={null}>
        {showTransactionForm && (
          <TransactionFormModal
            initialType={formInitialType}
            editingTransaction={editingTransaction}
            categories={dbState.categorias}
            accounts={dbState.contas}
            recentDescriptions={recentDescriptions}
            currentYM={currentYM}
            onClose={() => {
              setShowTransactionForm(false);
              setEditingTransaction(null);
            }}
            onSave={handleSaveTransaction}
          />
        )}

        {/* MODAL DE DETALHES DO LANÇAMENTO */}
        {inspectingTransaction && (
          <TransactionDetailModal
            transaction={inspectingTransaction}
            category={dbState.categorias.find(c => c.id === inspectingTransaction.categoria_id)}
            account={dbState.contas.find(a => a.id === inspectingTransaction.conta_id)}
            onClose={() => setInspectingTransaction(null)}
            onEdit={(tx) => {
              setInspectingTransaction(null);
              setEditingTransaction(tx);
              setShowTransactionForm(true);
            }}
            onDuplicate={handleDuplicateTransaction}
            onDelete={handleDeleteTransaction}
            onToggleStatus={handleToggleStatus}
          />
        )}

        {/* MODAL COMPARTILHAR O MÊS (CANVAS PNG) */}
        {showShareMonthModal && (
          <ShareMonthModal
            currentYM={currentYM}
            userName={dbState.usuario.nome}
            transactions={dbState.lancamentos}
            categories={dbState.categorias}
            onClose={() => setShowShareMonthModal(false)}
          />
        )}

        {/* MODAL RETROSPECTIVA DO ANO (WRAPPED) */}
        {showYearWrappedModal && (
          <YearWrappedModal
            year={currentYM.slice(0, 4)}
            userName={dbState.usuario.nome}
            transactions={dbState.lancamentos}
            categories={dbState.categorias}
            metas={dbState.metas}
            onClose={() => setShowYearWrappedModal(false)}
            onShare={() => setShowShareMonthModal(true)}
          />
        )}

        {/* MODAL DETETIVE DE ASSINATURAS */}
        {showSubscriptionsModal && (
          <SubscriptionsModal
            transactions={dbState.lancamentos}
            categories={dbState.categorias}
            onClose={() => setShowSubscriptionsModal(false)}
          />
        )}

        {/* REVISÃO DO TUTORIAL PELAS CONFIGURAÇÕES */}
        {showTutorialReview && (
          <OnboardingModal
            reviewMode
            onCloseReview={() => setShowTutorialReview(false)}
            onComplete={handleCompleteOnboarding}
            onImportBackup={handleImportBackup}
          />
        )}

        {/* MANUAL COMPLETO DO APP COM IMAGENS */}
        {showDetailedGuide && (
          <DetailedGuideModal onClose={() => setShowDetailedGuide(false)} />
        )}
      </Suspense>
    </div>
  );
}
