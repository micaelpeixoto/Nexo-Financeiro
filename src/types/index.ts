export type TransactionType = 'receita' | 'despesa';

export type TransactionStatus = 'pago' | 'pendente' | 'recebido' | 'a_receber';

export type AccountType = 'corrente' | 'digital' | 'cartao' | 'dinheiro' | 'poupanca';

export type RecurrenceFrequency = 'semanal' | 'mensal' | 'anual';

export type BudgetPeriodType = 'mensal' | 'anual';

export type GoalStatus = 'ativa' | 'pausada' | 'concluida';

export type OnboardingGoal = 
  | 'controlar_gastos' 
  | 'sair_dividas' 
  | 'guardar_meta' 
  | 'grandes_despesas';

export interface Usuario {
  id: string;
  nome: string;
  avatar_url?: string;
  objetivo_onboarding: OnboardingGoal;
  criado_em: string;
}

export interface Conta {
  id: string;
  nome: string;
  tipo: AccountType;
  limite?: number;
  dia_fechamento?: number;
  dia_vencimento?: number;
  cor: string;
  icone: string;
  ordem: number;
  ativo: boolean;
  saldo_inicial?: number;
}

export type BudgetCategoryGroup = 'essenciais' | 'lazer' | 'reserva';

export type DateFilterPreset = 'dia' | 'mes_atual' | 'mes_passado' | 'ano' | 'todos';

export interface Categoria {
  id: string;
  nome: string;
  tipo: TransactionType;
  cor: string;
  icone: string;
  incluir_no_orcamento: boolean;
  ordem: number;
  pai_id?: string | null;
  grupo_orcamento?: BudgetCategoryGroup;
  subcategoria?: string;
}

export interface Lancamento {
  id: string;
  data: string; // formato YYYY-MM-DD
  tipo: TransactionType;
  descricao: string;
  valor: number; // sempre positivo, valor nominal
  conta_id: string;
  categoria_id: string;
  status: TransactionStatus;
  observacao?: string;
  anexo_path?: string; // base64 ou data URL local
  serie_recorrencia_id?: string | null;
  parcela_numero?: number | null;
  parcela_total?: number | null;
  meta_id?: string | null;
  origem: 'manual' | 'recorrente' | 'parcelamento' | 'demo';
  created_at: string;
  updated_at: string;
}

export interface Recorrencia {
  id: string;
  lancamento_pai_id: string;
  frequencia: RecurrenceFrequency;
  dia_referencia: number;
  inicio_validade: string; // YYYY-MM-DD
  fim_validade?: string | null; // YYYY-MM-DD ou null para sem fim
  proxima_data_calculada: string;
  ativo: boolean;
}

export interface Orcamento {
  id: string;
  categoria_id: string;
  periodo_tipo: BudgetPeriodType;
  referencia: string; // "YYYY-MM" ou "YYYY"
  valor_meta: number;
}

export interface Meta {
  id: string;
  nome: string;
  valor_alvo: number;
  data_alvo: string; // YYYY-MM-DD
  valor_atual: number;
  taxa_rendimento_anual?: number; // ex: 0.10 para 10% a.a.
  cor: string;
  icone?: string;
  criada_em: string;
  status: GoalStatus;
}

export interface Contribuicao {
  id: string;
  meta_id: string;
  valor: number;
  data: string;
  lancamento_id?: string | null;
  nota?: string;
}

export interface Envelope {
  id: string;
  categoria_id: string;
  mes_referencia: string; // YYYY-MM
  saldo_alocado: number;
  transferencias: {
    id: string;
    origem_categoria_id: string;
    destino_categoria_id: string;
    valor: number;
    data: string;
    motivo?: string;
  }[];
}

export type BudgetRuleMode = 'percentual' | 'fixo';

export type BudgetControlProfileId =
  | 'equilibrado_50_30_20'
  | 'quitar_dividas'
  | 'acelerar_metas'
  | 'personalizado';

export interface BudgetFixedOverride {
  desde: string; // YYYY-MM
  valor: number;
}

export interface BudgetConfig {
  modo: BudgetRuleMode;
  perfil_ativo: BudgetControlProfileId;
  renda_padrao_fallback: number; // padrão 2400 quando mês não tem receita
  aplicado_desde?: string; // YYYY-MM
  percentuais_categoria: Record<string, number>;
  tetos_fixos_desde?: Record<string, BudgetFixedOverride>;
}

export interface NotificationSettings {
  vencimentos: boolean;
  dias_antecedencia_vencimento: number; // default: 3
  orcamento_alerta_80: boolean;
  orcamento_alerta_100: boolean;
  resumo_semanal: boolean;
  dia_resumo_semanal: number; // 1 = Segunda-feira
  hora_resumo_semanal: string; // "08:00"
  metas_marcos: boolean;
  cartao_lembrete: boolean;
}

export interface Settings {
  tema: 'claro' | 'escuro' | 'sistema';
  moeda: string; // "BRL"
  idioma: string; // "pt-BR"
  notificacoes: NotificationSettings;
  orcamento_config?: BudgetConfig;
  pin_ativado: boolean;
  pin_hash?: string;
  biometria_ativada: boolean;
  envelopes_ativados?: boolean;
  ultimo_backup?: string;
}

export interface SubscriptionDetection {
  id: string;
  descricao: string;
  categoria_id: string;
  valor_atual: number;
  dia_cobranca: number;
  frequencia_estimada: 'mensal' | 'anual';
  proxima_data_estimada: string;
  historico_precos: {
    data: string;
    valor: number;
  }[];
  ativo: boolean;
}

export interface DatabaseState {
  version: number;
  usuario: Usuario;
  contas: Conta[];
  categorias: Categoria[];
  lancamentos: Lancamento[];
  recorrencias: Recorrencia[];
  orcamentos: Orcamento[];
  metas: Meta[];
  contribuicoes: Contribuicao[];
  envelopes?: Envelope[];
  settings: Settings;
  onboardingCompleted: boolean;
}
