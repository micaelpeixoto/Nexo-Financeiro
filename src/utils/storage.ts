import {
  DatabaseState,
  Conta,
  Categoria,
  Lancamento,
  Orcamento,
  Meta,
  Settings,
  BudgetConfig,
  BudgetControlProfileId
} from '../types';
import {
  toISODate,
  addMonthsSafe,
  BUDGET_ASSISTANT_PROFILES,
  DEFAULT_FALLBACK_INCOME,
  computeDynamicCategoryPercentages,
  inferBudgetGroup
} from './calculations';

const STORAGE_KEY = 'financas_app_state_v2';
const STORAGE_META_TS_KEY = 'financas_app_state_ts_v2';
const IDB_NAME = 'financas_offline_db';
const IDB_STORE = 'kv';
const IDB_STATE_KEY = 'app_state_v2';

let pendingSaveTimer: number | null = null;
let pendingIdleHandle: number | null = null;
let pendingStateToPersist: DatabaseState | null = null;
let pendingSaveTs = 0;

function normalizeDatabaseState(parsed: DatabaseState): DatabaseState {
  parsed.categorias = parsed.categorias.map(cat =>
    cat.tipo === 'despesa' && !cat.grupo_orcamento
      ? { ...cat, grupo_orcamento: inferBudgetGroup(cat) }
      : cat
  );
  if (parsed.settings) {
    parsed.settings.tema = 'escuro';
    if (!parsed.settings.orcamento_config) {
      const hasExistingFixedBudgets = Array.isArray(parsed.orcamentos) && parsed.orcamentos.length > 0;
      parsed.settings.orcamento_config = hasExistingFixedBudgets
        ? {
            ...INITIAL_BUDGET_CONFIG,
            modo: 'fixo',
            perfil_ativo: 'personalizado'
          }
        : {
            ...INITIAL_BUDGET_CONFIG,
            percentuais_categoria: computeDynamicCategoryPercentages(parsed.categorias, 'equilibrado_50_30_20')
          };
    }
  }
  return parsed;
}

function openDatabaseIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise(resolve => {
    try {
      const request = window.indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeStateToIDB(state: DatabaseState, savedAt: number): Promise<void> {
  const db = await openDatabaseIDB();
  if (!db) return;
  try {
    await new Promise<void>(resolve => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ state, savedAt }, IDB_STATE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    // Fallback silencioso para localStorage
  } finally {
    db.close();
  }
}

export async function hydrateDatabaseFromIndexedDB(): Promise<DatabaseState | null> {
  const db = await openDatabaseIDB();
  if (!db) return null;
  try {
    const record = await new Promise<{ state?: DatabaseState; savedAt?: number } | null>(resolve => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_STATE_KEY);
      req.onsuccess = () => resolve((req.result as { state?: DatabaseState; savedAt?: number }) || null);
      req.onerror = () => resolve(null);
    });
    if (!record?.state || !record.state.usuario || !record.state.categorias) {
      return null;
    }
    const localTs = Number(localStorage.getItem(STORAGE_META_TS_KEY) || '0');
    if (record.savedAt && record.savedAt > localTs) {
      return normalizeDatabaseState(record.state);
    }
    return null;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

function writeStateToLocalStorage(state: DatabaseState, savedAt: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(STORAGE_META_TS_KEY, String(savedAt));
  } catch {
    try {
      const lightweightState: DatabaseState = {
        ...state,
        lancamentos: state.lancamentos.map(tx =>
          tx.anexo_path ? { ...tx, anexo_path: undefined } : tx
        )
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweightState));
      localStorage.setItem(STORAGE_META_TS_KEY, String(savedAt - 1));
    } catch (innerErr) {
      console.error('Falha ao persistir no localStorage:', innerErr);
    }
  }
}

export function flushPendingDatabaseSave(): void {
  if (pendingSaveTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(pendingSaveTimer);
    pendingSaveTimer = null;
  }
  if (pendingIdleHandle !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(pendingIdleHandle);
    pendingIdleHandle = null;
  }
  if (pendingStateToPersist) {
    const state = pendingStateToPersist;
    const ts = pendingSaveTs || Date.now();
    pendingStateToPersist = null;
    writeStateToLocalStorage(state, ts);
  }
}

export const STANDARD_503020_EXPENSE_CATEGORIES: Categoria[] = [
  {
    id: 'cat_despesas',
    nome: 'Despesas',
    tipo: 'despesa',
    cor: '#EF4444',
    icone: 'Home',
    incluir_no_orcamento: true,
    ordem: 1,
    grupo_orcamento: 'essenciais',
    subcategoria: 'Moradia, contas fixas, mercado, saúde e transporte'
  },
  {
    id: 'cat_lazer',
    nome: 'Lazer',
    tipo: 'despesa',
    cor: '#8B5CF6',
    icone: 'Smile',
    incluir_no_orcamento: true,
    ordem: 2,
    grupo_orcamento: 'lazer',
    subcategoria: 'Restaurantes, streaming, passeios e compras pessoais'
  },
  {
    id: 'cat_reserva',
    nome: 'Reserva e Metas',
    tipo: 'despesa',
    cor: '#10B981',
    icone: 'ShieldCheck',
    incluir_no_orcamento: true,
    ordem: 3,
    grupo_orcamento: 'reserva',
    subcategoria: 'Guardar dinheiro, investimentos, reserva e metas'
  }
];

export const INITIAL_INCOME_CATEGORIES: Categoria[] = [
  { id: 'cat_sal', nome: 'Salário / Pró-labore', tipo: 'receita', cor: '#10B981', icone: 'Briefcase', incluir_no_orcamento: false, ordem: 4 },
  { id: 'cat_free', nome: 'Renda Extra / Freelance', tipo: 'receita', cor: '#06B6D4', icone: 'Coins', incluir_no_orcamento: false, ordem: 5 },
  { id: 'cat_inve', nome: 'Rendimentos e Investimentos', tipo: 'receita', cor: '#84CC16', icone: 'TrendingUp', incluir_no_orcamento: false, ordem: 6 },
  { id: 'cat_reem', nome: 'Reembolsos', tipo: 'receita', cor: '#14B8A6', icone: 'RotateCcw', incluir_no_orcamento: false, ordem: 7 }
];

export const INITIAL_CATEGORIES: Categoria[] = [
  ...STANDARD_503020_EXPENSE_CATEGORIES,
  ...INITIAL_INCOME_CATEGORIES
];

export const INITIAL_ACCOUNTS: Conta[] = [
  {
    id: 'acc_corrente',
    nome: 'Conta Digital Principal',
    tipo: 'digital',
    cor: '#3B82F6',
    icone: 'Landmark',
    ordem: 1,
    ativo: true,
    saldo_inicial: 1500
  },
  {
    id: 'acc_cartao',
    nome: 'Cartão de Crédito Roxinho',
    tipo: 'cartao',
    limite: 4500,
    dia_fechamento: 20,
    dia_vencimento: 27,
    cor: '#8B5CF6',
    icone: 'CreditCard',
    ordem: 2,
    ativo: true
  },
  {
    id: 'acc_dinheiro',
    nome: 'Carteira (Dinheiro)',
    tipo: 'dinheiro',
    cor: '#10B981',
    icone: 'Wallet',
    ordem: 3,
    ativo: true,
    saldo_inicial: 200
  }
];

export const INITIAL_BUDGET_CONFIG: BudgetConfig = {
  modo: 'percentual',
  perfil_ativo: 'equilibrado_50_30_20',
  renda_padrao_fallback: DEFAULT_FALLBACK_INCOME,
  percentuais_categoria: { ...BUDGET_ASSISTANT_PROFILES[0].percentuais },
  tetos_fixos_desde: {}
};

export const INITIAL_SETTINGS: Settings = {
  tema: 'escuro',
  moeda: 'BRL',
  idioma: 'pt-BR',
  notificacoes: {
    vencimentos: true,
    dias_antecedencia_vencimento: 3,
    orcamento_alerta_80: true,
    orcamento_alerta_100: true,
    resumo_semanal: true,
    dia_resumo_semanal: 1, // Segunda
    hora_resumo_semanal: '08:00',
    metas_marcos: true,
    cartao_lembrete: true
  },
  orcamento_config: INITIAL_BUDGET_CONFIG,
  pin_ativado: false,
  biometria_ativada: false,
  ultimo_backup: undefined
};

export function getInitialState(): DatabaseState {
  return {
    version: 3,
    usuario: {
      id: 'usr_default',
      nome: 'Carlos',
      objetivo_onboarding: 'controlar_gastos',
      criado_em: new Date().toISOString()
    },
    contas: INITIAL_ACCOUNTS,
    categorias: INITIAL_CATEGORIES,
    lancamentos: [],
    recorrencias: [],
    orcamentos: [],
    metas: [],
    contribuicoes: [],
    settings: INITIAL_SETTINGS,
    onboardingCompleted: false
  };
}

export function loadDatabase(): DatabaseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialState();
      saveDatabase(initial, true);
      return initial;
    }
    const parsed = JSON.parse(raw) as DatabaseState;
    if (!parsed.usuario || !parsed.categorias || !parsed.contas) {
      const initial = getInitialState();
      saveDatabase(initial, true);
      return initial;
    }
    return normalizeDatabaseState(parsed);
  } catch (err) {
    console.error('Falha ao carregar banco local:', err);
    return getInitialState();
  }
}

export function saveDatabase(state: DatabaseState, immediate: boolean = false): void {
  const savedAt = Date.now();
  void writeStateToIDB(state, savedAt);

  if (immediate || typeof window === 'undefined') {
    pendingStateToPersist = null;
    if (pendingSaveTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(pendingSaveTimer);
      pendingSaveTimer = null;
    }
    writeStateToLocalStorage(state, savedAt);
    return;
  }

  pendingStateToPersist = state;
  pendingSaveTs = savedAt;

  if (pendingSaveTimer !== null) {
    window.clearTimeout(pendingSaveTimer);
  }
  if (pendingIdleHandle !== null && 'cancelIdleCallback' in window) {
    (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(pendingIdleHandle);
    pendingIdleHandle = null;
  }

  pendingSaveTimer = window.setTimeout(() => {
    pendingSaveTimer = null;
    if ('requestIdleCallback' in window) {
      pendingIdleHandle = (window as Window & {
        requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback(() => {
        pendingIdleHandle = null;
        flushPendingDatabaseSave();
      }, { timeout: 350 });
    } else {
      flushPendingDatabaseSave();
    }
  }, 80);
}

/**
 * Cria configuração dinâmica de orçamento a partir de um dos 3 perfis do Assistente
 */
export function buildBudgetConfigFromProfile(
  profileId: Exclude<BudgetControlProfileId, 'personalizado'>,
  fallbackIncome: number = DEFAULT_FALLBACK_INCOME,
  appliedSinceYM: string = toISODate(new Date()).slice(0, 7),
  categories?: Categoria[]
): BudgetConfig {
  const profile =
    BUDGET_ASSISTANT_PROFILES.find(p => p.id === profileId) || BUDGET_ASSISTANT_PROFILES[0];
  const percentuais =
    categories && categories.length > 0
      ? computeDynamicCategoryPercentages(categories, profile.id)
      : { ...profile.percentuais };

  return {
    modo: 'percentual',
    perfil_ativo: profile.id,
    renda_padrao_fallback: fallbackIncome > 0 ? fallbackIncome : DEFAULT_FALLBACK_INCOME,
    aplicado_desde: appliedSinceYM,
    percentuais_categoria: percentuais,
    tetos_fixos_desde: {}
  };
}

/**
 * Mantida para compatibilidade e criação inicial de registros
 */
export function applyRule50_30_20(
  monthlyIncome: number = DEFAULT_FALLBACK_INCOME,
  referenceYM: string = toISODate(new Date()).slice(0, 7)
): Orcamento[] {
  const base = monthlyIncome > 0 ? monthlyIncome : DEFAULT_FALLBACK_INCOME;
  const pcts = BUDGET_ASSISTANT_PROFILES[0].percentuais;
  return Object.entries(pcts).map(([catId, pct]) => ({
    id: `b_${referenceYM}_${catId}`,
    categoria_id: catId,
    periodo_tipo: 'mensal',
    referencia: referenceYM,
    valor_meta: Math.round(base * (pct / 100))
  }));
}

/**
 * Gera dados fictícios de demonstração claramente rotulados com `origem: 'demo'`,
 * cobrindo os 3 perfis de usuários (Ana, Carlos e Marlene).
 */
export function generateDemoData(currentState: DatabaseState): DatabaseState {
  const today = new Date();
  const currentYM = toISODate(today).slice(0, 7);
  const prevYM = addMonthsSafe(toISODate(today), -1).slice(0, 7);
  const prev2YM = addMonthsSafe(toISODate(today), -2).slice(0, 7);

  // Garante que os IDs das categorias padrão existam (ou usa o equivalente existente)
  const hasDefaultDesp = currentState.categorias.some(c => c.id === 'cat_despesas');
  const despId = hasDefaultDesp ? 'cat_despesas' : currentState.categorias.find(c => c.tipo === 'despesa')?.id || 'cat_despesas';
  const lazerId = currentState.categorias.some(c => c.id === 'cat_lazer') ? 'cat_lazer' : despId;
  const reservaId = currentState.categorias.some(c => c.id === 'cat_reserva') ? 'cat_reserva' : despId;

  const demoTransactions: Lancamento[] = [
    // Mês Atual - Receitas
    {
      id: 'demo_rec_1',
      data: `${currentYM}-05`,
      tipo: 'receita',
      descricao: 'Salário Mensal CLT',
      valor: 6200,
      conta_id: 'acc_corrente',
      categoria_id: 'cat_sal',
      status: 'recebido',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_rec_2',
      data: `${currentYM}-15`,
      tipo: 'receita',
      descricao: 'Projeto Freelance Design',
      valor: 1250,
      conta_id: 'acc_corrente',
      categoria_id: 'cat_free',
      status: 'recebido',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },

    // Mês Atual - Despesas Fixas, Lazer e Reserva
    {
      id: 'demo_desp_1',
      data: `${currentYM}-05`,
      tipo: 'despesa',
      descricao: 'Aluguel do Apartamento',
      valor: 1350,
      conta_id: 'acc_corrente',
      categoria_id: despId,
      status: 'pago',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_desp_2',
      data: `${currentYM}-07`,
      tipo: 'despesa',
      descricao: 'Condomínio e IPTU',
      valor: 420,
      conta_id: 'acc_corrente',
      categoria_id: despId,
      status: 'pago',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_desp_3',
      data: `${currentYM}-08`,
      tipo: 'despesa',
      descricao: 'Supermercado Mensal',
      valor: 750,
      conta_id: 'acc_cartao',
      categoria_id: despId,
      status: 'pago',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_desp_4',
      data: `${currentYM}-12`,
      tipo: 'despesa',
      descricao: 'Uber e Metrô',
      valor: 145,
      conta_id: 'acc_cartao',
      categoria_id: despId,
      status: 'pago',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_desp_5',
      data: `${currentYM}-14`,
      tipo: 'despesa',
      descricao: 'Netflix & Spotify',
      valor: 79.80,
      conta_id: 'acc_cartao',
      categoria_id: lazerId,
      status: 'pago',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_desp_6',
      data: `${currentYM}-18`,
      tipo: 'despesa',
      descricao: 'Jantar Restaurante Japonês',
      valor: 185,
      conta_id: 'acc_cartao',
      categoria_id: lazerId,
      status: 'pago',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_desp_7',
      data: `${currentYM}-16`,
      tipo: 'despesa',
      descricao: 'Aporte Mensal Reserva CDI',
      valor: 900,
      conta_id: 'acc_corrente',
      categoria_id: reservaId,
      status: 'pago',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    // Contas pendentes a vencer neste mês
    {
      id: 'demo_desp_pend_1',
      data: `${currentYM}-25`,
      tipo: 'despesa',
      descricao: 'Conta de Energia Enel',
      valor: 168.40,
      conta_id: 'acc_corrente',
      categoria_id: despId,
      status: 'pendente',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_desp_pend_2',
      data: `${currentYM}-28`,
      tipo: 'despesa',
      descricao: 'Plano de Saúde Familiar',
      valor: 430,
      conta_id: 'acc_corrente',
      categoria_id: despId,
      status: 'pendente',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },

    // Compra parcelada (Smartphone em 4x)
    {
      id: 'demo_parc_1',
      data: `${currentYM}-02`,
      tipo: 'despesa',
      descricao: 'Smartphone Samsung (Parcela 1/4)',
      valor: 350,
      conta_id: 'acc_cartao',
      categoria_id: lazerId,
      status: 'pago',
      parcela_numero: 1,
      parcela_total: 4,
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_parc_2',
      data: addMonthsSafe(`${currentYM}-02`, 1),
      tipo: 'despesa',
      descricao: 'Smartphone Samsung (Parcela 2/4)',
      valor: 350,
      conta_id: 'acc_cartao',
      categoria_id: lazerId,
      status: 'pendente',
      parcela_numero: 2,
      parcela_total: 4,
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },

    // Mês Anterior (Para comparações e gráficos justos)
    {
      id: 'demo_prev_rec',
      data: `${prevYM}-05`,
      tipo: 'receita',
      descricao: 'Salário Mensal CLT',
      valor: 6200,
      conta_id: 'acc_corrente',
      categoria_id: 'cat_sal',
      status: 'recebido',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_prev_desp_1',
      data: `${prevYM}-05`,
      tipo: 'despesa',
      descricao: 'Aluguel do Apartamento',
      valor: 1350,
      conta_id: 'acc_corrente',
      categoria_id: despId,
      status: 'pago',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_prev_desp_2',
      data: `${prevYM}-10`,
      tipo: 'despesa',
      descricao: 'Supermercado Mês Anterior',
      valor: 680,
      conta_id: 'acc_cartao',
      categoria_id: despId,
      status: 'pago',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_prev_desp_3',
      data: `${prevYM}-14`,
      tipo: 'despesa',
      descricao: 'Netflix & Spotify',
      valor: 79.80,
      conta_id: 'acc_cartao',
      categoria_id: lazerId,
      status: 'pago',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_prev_desp_4',
      data: `${prevYM}-22`,
      tipo: 'despesa',
      descricao: 'Manutenção do Carro',
      valor: 520,
      conta_id: 'acc_corrente',
      categoria_id: despId,
      status: 'pago',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },

    // 2 Meses Atrás (Histórico)
    {
      id: 'demo_prev2_rec',
      data: `${prev2YM}-05`,
      tipo: 'receita',
      descricao: 'Salário Mensal CLT',
      valor: 6200,
      conta_id: 'acc_corrente',
      categoria_id: 'cat_sal',
      status: 'recebido',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'demo_prev2_desp_1',
      data: `${prev2YM}-14`,
      tipo: 'despesa',
      descricao: 'Netflix & Spotify',
      valor: 74.90,
      conta_id: 'acc_cartao',
      categoria_id: lazerId,
      status: 'pago',
      origem: 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Orçamentos sugeridos para referência fixa caso o usuário alterne do modo % para fixo
  const demoBudgets: Orcamento[] = [
    { id: `demo_b_desp`, categoria_id: despId, periodo_tipo: 'mensal', referencia: currentYM, valor_meta: 3725 },
    { id: `demo_b_lazer`, categoria_id: lazerId, periodo_tipo: 'mensal', referencia: currentYM, valor_meta: 2235 },
    { id: `demo_b_reserva`, categoria_id: reservaId, periodo_tipo: 'mensal', referencia: currentYM, valor_meta: 1490 }
  ];

  // Metas financeiras de exemplo
  const demoMetas: Meta[] = [
    {
      id: 'meta_reserva',
      nome: 'Reserva de Emergência (6 meses)',
      valor_alvo: 18000,
      data_alvo: `${today.getFullYear() + 1}-12-31`,
      valor_atual: 9500,
      taxa_rendimento_anual: 0.10, // 10% a.a. CDI
      cor: '#10B981',
      icone: 'ShieldCheck',
      criada_em: `${prev2YM}-01`,
      status: 'ativa'
    },
    {
      id: 'meta_viagem',
      nome: 'Viagem de Férias para a Praia',
      valor_alvo: 4000,
      data_alvo: `${today.getFullYear() + 1}-03-15`,
      valor_atual: 2800,
      taxa_rendimento_anual: 0,
      cor: '#3B82F6',
      icone: 'Palmtree',
      criada_em: `${prevYM}-01`,
      status: 'ativa'
    }
  ];

  return {
    ...currentState,
    usuario: {
      ...currentState.usuario,
      nome: 'Carlos',
      objetivo_onboarding: 'controlar_gastos'
    },
    lancamentos: demoTransactions,
    orcamentos: demoBudgets,
    metas: demoMetas,
    settings: {
      ...currentState.settings,
      orcamento_config: buildBudgetConfigFromProfile(
        'equilibrado_50_30_20',
        DEFAULT_FALLBACK_INCOME,
        currentYM,
        currentState.categorias
      )
    },
    onboardingCompleted: true
  };
}

/**
 * Remove todos os dados rotulados com origem: 'demo'
 */
export function removeDemoData(state: DatabaseState): DatabaseState {
  const cleanTransactions = state.lancamentos.filter(t => t.origem !== 'demo');
  const cleanBudgets = state.orcamentos.filter(b => !b.id.startsWith('demo_'));
  const cleanMetas = state.metas.filter(m => !m.id.startsWith('meta_'));

  return {
    ...state,
    lancamentos: cleanTransactions,
    orcamentos: cleanBudgets,
    metas: cleanMetas
  };
}
