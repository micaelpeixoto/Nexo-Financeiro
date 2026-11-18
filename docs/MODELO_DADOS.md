# Modelo de Dados — FINANÇAS

Arquitetura offline-first orientada a entidades independentes e repositório isolado no dispositivo.

---

## Entidades Principais

```text
Usuario
├── id: string
├── nome: string
├── avatar_url: string (opcional)
├── objetivo_onboarding: 'controlar_gastos' | 'sair_dividas' | 'guardar_meta' | 'grandes_despesas'
└── criado_em: ISO timestamp

Conta
├── id: string
├── nome: string
├── tipo: 'corrente' | 'digital' | 'cartao' | 'dinheiro' | 'poupanca'
├── limite: number (opcional, para cartões)
├── dia_fechamento: number (1 a 31)
├── dia_vencimento: number (1 a 31)
├── cor: string (hex)
├── icone: string
├── ordem: number
└── ativo: boolean

Categoria
├── id: string
├── nome: string
├── tipo: 'receita' | 'despesa'
├── cor: string (hex)
├── icone: string
├── incluir_no_orcamento: boolean
├── ordem: number
└── pai_id: string | null (para futuras subcategorias)

Lancamento
├── id: string
├── data: string (YYYY-MM-DD)
├── tipo: 'receita' | 'despesa'
├── descricao: string
├── valor: number (positivo, arredondado a 2 casas)
├── conta_id: string (FK Conta)
├── categoria_id: string (FK Categoria)
├── status: 'pago' | 'pendente' | 'recebido' | 'a_receber'
├── observacao: string (opcional)
├── anexo_path: string (DataURL local de comprovante)
├── serie_recorrencia_id: string | null
├── parcela_numero: number | null
├── parcela_total: number | null
├── meta_id: string | null (vínculo com meta de poupança)
├── origem: 'manual' | 'recorrente' | 'parcelamento' | 'demo'
├── created_at: ISO timestamp
└── updated_at: ISO timestamp

Orcamento
├── id: string
├── categoria_id: string (FK Categoria)
├── periodo_tipo: 'mensal' | 'anual'
├── referencia: string ('YYYY-MM' ou 'YYYY')
└── valor_meta: number

Meta
├── id: string
├── nome: string
├── valor_alvo: number
├── data_alvo: string (YYYY-MM-DD)
├── valor_atual: number
├── taxa_rendimento_anual: number (ex: 0.10 para 10% a.a.)
├── cor: string
├── status: 'ativa' | 'pausada' | 'concluida'
└── criada_em: ISO date

Envelope
├── id: string
├── categoria_id: string (FK Categoria)
├── mes_referencia: string ('YYYY-MM')
├── saldo_alocado: number
└── transferencias: Array<{ origem_id, destino_id, valor, data }>
```

---

## Integridade Referencial
- A exclusão de uma Categoria que possua lançamentos exige a seleção prévia de uma categoria de destino para migração atômica dos registros.
- O modo Envelopes Digitais é desacoplado dos lançamentos oficiais, garantindo que reorganizações virtuais não adulterem extratos bancários.
