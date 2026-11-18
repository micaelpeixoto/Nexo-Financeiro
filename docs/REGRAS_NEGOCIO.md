# Regras de Negócio e Fórmulas Financeiras — FINANÇAS

Este documento consolida as regras de negócio e fórmulas financeiras implementadas no módulo `src/utils/calculations.ts`.

---

## 1. Mapeamento de Status de Lançamento

| Status | Classificação para Apuração |
|---|---|
| `pago` | **Realizado** (Despesa liquidada) ou **Realizado** (Receita recebida) |
| `recebido` | **Realizado** (Receita compensada em conta) |
| `pendente` | **Projetado** (Despesa prevista/agendada a vencer) |
| `a_receber` | **Projetado** (Receita futura prevista) |

---

## 2. Fórmulas Oficiais

### Resultado do Mês (Realizado)
$$\text{Resultado do Mês} = \sum \text{Receitas (pago/recebido)} - \sum \text{Despesas (pago)}$$

### Resultado Projetado do Mês
$$\text{Resultado Projetado} = \sum \text{Todas as Receitas do Mês} - \sum \text{Todas as Despesas do Mês}$$

### % Poupado
$$\% \text{ Poupado} = \text{round}\left(\frac{\text{Resultado Realizado}}{\text{Receitas Realizadas}} \times 100\right)$$
- *Tratamento de divisão por zero:* Se $\text{Receitas} \le 0$, retorna `"—"`.

### Saldo Acumulado
$$\text{Saldo Acumulado}(m) = \sum_{k=m_0}^{m} \text{Resultado Realizado}(k)$$
Inicia no primeiro mês com movimentação financeira e acumula mês a mês.

### Níveis de Uso do Orçamento
$$\text{Uso} = \frac{\text{Gasto Realizado}}{\text{Meta Definida}} \times 100$$
- $\le 70\%$: **OK (Verde)**
- $70\% < x \le 100\%$: **Atenção (Amarelo)**
- $> 100\%$: **Estourado (Vermelho)** com badge `"Estourou em R$ X,XX"`

### Sobra por Dia (Home)
$$\text{Sobra por Dia} = \frac{\text{Meta Total do Mês} - \text{Gasto Realizado}}{\text{Dias Úteis Restantes do Mês}}$$
- Dias úteis: segunda a sexta-feira, excluindo fins de semana.
- Se a diferença for negativa: exibe em vermelho `"Orçamento estourado"`.

### Projeção de Fechamento do Mês
$$\text{Projeção de Fechamento} = \text{Gasto Realizado} + (\text{Média Diária dos Últimos 30 Dias} \times \text{Dias Corridos Restantes})$$

### Disponibilidade do Cartão de Crédito
$$\text{Disponível} = \text{Limite} - \text{Fatura Aberta Atual}$$
onde $\text{Fatura Aberta} = \sum \text{Despesas no Cartão dentro do Ciclo Vigente (entre fechamentos)}$.

### Meta de Poupança — Contribuição Sugerida
- **Divisão Simples (sem juros):**
$$\text{PMT} = \frac{\text{Alvo} - \text{Atual}}{\text{Meses Restantes}}$$
- **Com Juros Compostos ($i > 0$):**
$$\text{PMT} = \frac{(\text{Alvo} - \text{Atual}) \cdot i}{(1 + i)^n - 1}$$
onde $i = \text{taxa mensal} = \frac{\text{taxa anual}}{12}$ e $n = \text{meses restantes}$.

### Parcelamento de Compras
Divide o valor total em $N$ parcelas mensais, gerando lançamentos futuros no mesmo dia dos meses seguintes com a anotação `Parcela X/N`. Ajustes de centavos decorrentes de dízimas são absorvidos na primeira parcela para garantir a soma exata.

### Recorrências e Rollover de Calendário
Para datas no fim do mês (como dia 31), o rollover para fevereiro trata 28 ou 29 dias (em anos bissextos) e meses de 30 dias automaticamente sem estourar para o mês seguinte.
