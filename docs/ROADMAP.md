# Roadmap de Evolução Futura — FINANÇAS

Itens intencionalmente fora do escopo do MVP, mantendo os pontos de extensão devidamente preparados na arquitetura:

---

## 1. Scanner Inteligente de Comprovantes (OCR / Visão Computacional)
- **Status:** Arquitetura preparada (campo `origem: 'scanner'`, campo `anexo_path` com captura de câmera já integrada).
- **Escopo Futuro:** Reconhecimento óptico automático de cupom fiscal (QR Code SAT / NFC-e) e preenchimento de valor, data e estabelecimento.

## 2. Assistente Financeiro por Linguagem Natural
- **Status:** Arquitetura preparada (isolamento de repositório e modelos padronizados).
- **Escopo Futuro:** Interpretação de áudios ("Gastei 45 no almoço") ou comandos em texto para registro passivo.

## 3. Widgets para Android e Tela Inicial
- **Status:** Planejado para empacotamento com Android Studio (Jetpack Compose Glance).
- **Escopo Futuro:** Widget de saldo do mês e sobra diária na tela inicial do celular.

## 4. Integração Open Finance / Bancos Brasileiros (Pluggy / Klavi)
- **Status:** Campo `origem: 'openbanking'` reservado na entidade `Lancamento`.
- **Escopo Futuro:** Leitura opcional e consentida de extrato com conciliação automática.

## 5. Internacionalização Completa (i18n)
- **Status:** Dicionário centralizado em `src/utils/i18n.ts`. Moeda e locales isolados.
- **Escopo Futuro:** Suporte a inglês (USD, `mm/dd/yyyy`) e espanhol (EUR/ARS).
