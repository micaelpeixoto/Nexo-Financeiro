# Nexo

Criei o Nexo para substituir aquelas planilhas de gastos difíceis de mexer. O objetivo dele é ajudar quem não entende muito de finanças a anotar o que ganha, ver para onde o dinheiro está indo e conseguir guardar um pouco todo mês, sem precisar de termos complicados ou fórmulas.

Ele funciona totalmente offline. Tudo o que você registra fica salvo apenas no seu celular, sem precisar criar conta online, conectar banco e sem anúncios.

## Como funciona na prática

* **Anotar o dia a dia:** Você registra o que entrou e o que saiu, separa por categorias e acompanha tudo em um extrato simples ou no calendário.
* **Limites e metas:** Dá para definir um teto de quanto você quer gastar em cada coisa (como mercado ou lazer) e criar metas para juntar dinheiro para algum objetivo.
* **Relatórios fáceis de ler:** O app gera gráficos e resumos do mês para você bater o olho e entender onde está gastando mais.
* **Ajuda dentro do app:** Como a ideia é ajudar quem está começando, o aplicativo tem explicações rápidas nas telas e um guia com imagens mostrando como usar cada função.
* **Segurança:** Você pode colocar senha no app e salvar arquivos de backup no próprio aparelho para não perder seus registros se trocar de celular.

## Como instalar

1. Acesse a aba **[Releases](../../releases)** aqui no GitHub.
2. Baixe o arquivo `.apk` no seu Android.
3. Abra o arquivo para instalar (o celular vai pedir para autorizar a instalação de fontes desconhecidas, é só confirmar).

## Para quem quiser mexer no código

O projeto foi feito em React com TypeScript e empacotado para Android em Kotlin. Para rodar no computador:

```bash
bun install
bun run dev
```

Para atualizar os arquivos dentro da pasta do Android Studio:

```bash
node scripts/sync-android-assets.mjs
```

---
*Licença: [MIT / GPLv3]*  
*Desenvolvido com o apoio do Google Gemini.*
