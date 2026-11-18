# Diretrizes de Fluidez e Desempenho com Bom Senso — FINANÇAS

A fluidez do FINANÇAS é uma meta de qualidade guiada pela experiência real do usuário em dispositivos intermediários (ex.: aparelhos da linha Moto G ou similares), e não por obsessão técnica estéril.

---

## 1. Princípios Práticos
1. **Abertura Imediata:** Estado pré-carregado em cache local no primeiro tick de renderização. Sem telas brancas ou spinners desnecessários.
2. **Navegação com o Polegar:** Áreas de toque com altura mínima de 44px e barra de navegação no rodapé dentro da zona ergonômica natural.
3. **Rolagem Confortável em Listas Longas:** Divisão por blocos de datas e cálculo memorizado (`useMemo`) dos subtotais, evitando re-renderizações em cascata.
4. **Armazenamento de Anexos Otimizado:** Fotos e comprovantes comprimidos em base64 local, sem transferências de rede bloqueantes.
5. **Operações em Segundo Plano:** Exportação de backups JSON, CSV e renderização de cards Canvas em threads assíncronas com feedback imediato para o usuário.
6. **Zero Dependência Externa para Funcionamento Core:** O aplicativo roda com 100% de capacidade sem conexão à internet.
