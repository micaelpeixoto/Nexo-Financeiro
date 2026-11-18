# Guia de Compilação no Android Studio — FINANÇAS Nativo

Este guia explica exatamente onde cada parte do projeto vive e como gerar o seu arquivo **APK nativo** no **Android Studio**.

---

## 1. Onde as coisas ficam?

- **Aqui no Google AI Studio (Nuvem):**
  - O aplicativo roda como Web App / PWA em tempo real, permitindo testar toda a interface, regras de negócio e validações imediatamente no navegador.
  - Toda a estrutura nativa Android em **Kotlin + Jetpack Compose** já está gerada e organizada dentro da pasta `/android`.

- **No seu computador (Android Studio):**
  - É onde você abre a pasta `/android` para compilar o código Kotlin, acessar as APIs nativas do Android (Biometria, WorkManager, Room SQLite) e gerar o arquivo final `.apk` para instalar direto no seu celular.

---

## 2. Estrutura Nativa Criada em `/android`

```text
android/
├── build.gradle.kts                      # Build raiz com plugins Kotlin 2.1 e KSP
├── settings.gradle.kts                   # Configuração de repositórios Maven/Google
├── gradle/
│   └── libs.versions.toml                # Catálogo moderno de dependências (Compose, Room, Coil)
└── app/
    ├── build.gradle.kts                  # Configuração do módulo app (compileSdk 35, minSdk 26, R8)
    ├── proguard-rules.pro                # Regras de otimização R8
    └── src/
        └── main/
            ├── AndroidManifest.xml       # Permissões de notificação, biometria e alarme
            ├── res/
            │   └── values/strings.xml    # Recursos de texto
            └── java/com/financas/app/
                ├── FinancasApp.kt        # Classe Application com canais de notificação
                ├── MainActivity.kt       # Activity única com Compose Scaffold e Navegação
                ├── data/local/
                │   ├── AppDatabase.kt    # Banco Room SQLite com callback de dados iniciais
                │   ├── dao/Daos.kt       # DAOs com Flow, paginação e índices
                │   └── entities/Entities.kt # Entidades com tabela de totais pré-calculados
                ├── domain/
                │   └── FinancialCalculations.kt # Fórmulas financeiras idênticas em Kotlin puro
                └── ui/
                    ├── theme/Theme.kt    # Material 3 com paleta verde-esmeralda
                    └── dashboard/
                        ├── DashboardViewModel.kt # MVVM com StateFlow
                        └── DashboardScreen.kt    # Interface Compose com cards nativos
```

---

## 3. Passo a Passo para Gerar o APK no Android Studio

1. **Baixar o Projeto:**
   - Faça o download dos arquivos ou exporte o repositório para o seu computador.
2. **Abrir no Android Studio:**
   - Abra o **Android Studio** (versão Ladybug, Jellyfish ou superior).
   - Clique em **File $\rightarrow$ Open** (ou "Open" na tela inicial).
   - Navegue até a pasta **`android/`** do projeto e clique em **OK**.
3. **Sincronizar o Gradle:**
   - O Android Studio iniciará o **Gradle Sync** automaticamente, baixando as dependências definidas no `libs.versions.toml`.
   - Caso não inicie automaticamente, clique no ícone do elefante (**Sync Project with Gradle Files**) na barra superior.
4. **Gerar o APK de Instalação:**
   - Na barra de menu superior do Android Studio, clique em:
     $$\text{Build} \rightarrow \text{Build Bundle(s) / APK(s)} \rightarrow \text{Build APK(s)}$$
   - Quando o processo terminar, uma notificação aparecerá no canto inferior direito dizendo:
     `APK(s) generated successfully for 1 module`.
   - Clique em **locate** para abrir a pasta onde o arquivo `app-debug.apk` foi salvo.
5. **Instalar no Celular:**
   - Envie o arquivo `.apk` para o seu celular (via WhatsApp, Google Drive ou cabo USB) e toque nele para instalar!
   - Alternativamente, plugue o celular via cabo USB com a **Depuração USB** ativada e clique no botão verde **Run 'app'** ($\blacktriangleright$) no topo do Android Studio.

---

## 4. Solução de Problemas Comuns ao Montar o APK

### 🔴 Erro 1: `Task :app:checkDebugAarMetadata FAILED`
- **O que significa:** O Android Studio tentou verificar as versões mínimas exigidas pelas bibliotecas AndroidX.
- **Causa:** Uma das bibliotecas (como `androidx.core:core-ktx`) solicitava o Android 15 (API 35), mas o projeto ou o seu SDK local estava configurado para Android 14 (API 34).
- **Como foi corrigido no projeto:**
  1. Fixamos as versões no arquivo `gradle/libs.versions.toml` para versões estáveis compatíveis com API 34 (`coreKtx = "1.13.1"`, `activityCompose = "1.9.3"`).
  2. Configuramos `compileSdk = 34` e `targetSdk = 34` em `android/app/build.gradle.kts`.
- **O que você precisa fazer no Android Studio:**
  1. Clique em **File $\rightarrow$ Sync Project with Gradle Files** (ou no ícone do elefante no canto superior direito).
  2. Vá em **Build $\rightarrow$ Clean Project**, depois **Build $\rightarrow$ Rebuild Project**.
  3. Agora clique em **Build $\rightarrow$ Build Bundle(s) / APK(s) $\rightarrow$ Build APK(s)**. O APK compilará com sucesso!

### 🔴 Erro 2: `Incompatible with Gradle JVM 25`
- O Gradle 8 suporta Java até a versão 23. Como o seu computador está usando Java 25, basta selecionar o JDK 17 ou 21 embutido do próprio Android Studio:
  - No Android Studio: **File $\rightarrow$ Settings** (ou clique na engrenagem) $\rightarrow$ **Build, Execution, Deployment $\rightarrow$ Build Tools $\rightarrow$ Gradle**.
  - No campo **Gradle JDK**, selecione **"Embedded JDK"** ou **"jbr-17"** / **"Download JDK" (versão 17 ou 21)**.
  - Clique em **Apply** e **OK**.

### 🔴 Erro 3: `Directory does not contain a Gradle build`
- Acontece se abrir a pasta raiz descompactada em vez da pasta onde está o `settings.gradle.kts`.
- O projeto agora possui arquivos Gradle tanto na raiz quanto na pasta `android/`, então você pode abrir tanto a raiz quanto diretamente a pasta `android/`.

---

## 5. Ajustes de Sistema, Insets e Visual (Novidades)

### 📱 1. Gradle 9.9.0
- O `gradle-wrapper.properties` foi atualizado para apontar diretamente para a versão `gradle-9.9.0-bin.zip`.
- Suporte a JVMs recentes e downloads rápidos de dependências no Gradle Sync.

### 📱 2. Respeito aos Ícones do Sistema (Edge-to-Edge & Insets)
- Implementamos `enableEdgeToEdge()` no `MainActivity.kt`.
- O `Scaffold` utiliza `WindowInsets.safeDrawing`, e o `NavigationBar` utiliza `WindowInsets.navigationBars`.
- **Resultado:** A barra de status superior (relógio, bateria, notificações) e a barra de botões inferior do Android (**||| Recentes, O Início, < Voltar**) nunca mais sobrepõem os cards, botões ou o rodapé do app.

### 📱 3. Botão de Adicionar (+)
- O botão flutuante antigo que ficava solto em cima dos cards na tela foi substituído por um **botão central integrado diretamente na barra de navegação inferior**, além dos botões rápidos "+ Despesa" e "+ Receita" no início.
- Ele fica sempre acessível com um toque e nunca cobre o conteúdo.

### 📱 4. Botão de Tema Claro / Escuro
- Adicionamos um ícone discreto de Sol/Lua no canto superior direito para alternar entre o modo claro e escuro instantaneamente, além de respeitar a configuração padrão do seu sistema Android.

### 🔍 5. Enviar o APK para Análise
- Caso queira que eu analise o seu APK, basta colocar o arquivo `.apk` na pasta do projeto ou fazer upload dele.
- Consigo descompactar e inspecionar os recursos e configurações para te dizer exatamente o que está diferente.


