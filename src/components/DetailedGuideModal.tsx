import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  List,
  LayoutDashboard,
  PlusCircle,
  Receipt,
  PieChart,
  Target,
  Tags,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  Lightbulb
} from 'lucide-react';

interface DetailedGuideModalProps {
  onClose: () => void;
}

interface GuideStep {
  title: string;
  text: string;
}

interface GuideChapter {
  id: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentClass: string;
  image: string;
  imageAlt: string;
  imageCaption: string;
  overview: string[];
  steps: GuideStep[];
  tips: string[];
}

const GUIDE_CHAPTERS: GuideChapter[] = [
  {
    id: 'inicio',
    shortTitle: '1. Início',
    title: 'Tela Início, Carteira e Sobra Diária',
    subtitle: 'Visão rápida do saldo do mês, teto planejado e quanto você pode gastar por dia',
    icon: LayoutDashboard,
    accentClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    image: './assets/guide/inicio.png',
    imageAlt: 'Tela Início mostrando Carteira do Mês, Orçamento Planejado e Sobra por Dia Útil',
    imageCaption:
      'Carteira do Mês, botões rápidos (+ Despesa, Receita, Comprovante), barra do Orçamento Planejado e cálculo da Sobra por Dia Útil.',
    overview: [
      'Seletor de Mês no topo (< Novembro De 2026 >): navegue para meses passados ou futuros para conferir contas agendadas e parcelas.',
      'Carteira do Mês: soma o saldo que sobrou dos meses anteriores com o resultado previsto do mês (Receitas − Despesas), além da linha "Já realizado" com apenas o que já teve baixa efetiva.',
      'Botões de Ação Rápida: adicione uma Despesa, Receita ou lance um Comprovante direto da tela inicial em 1 toque.',
      'Orçamento Planejado: compara tudo o que você lançou no mês (pago + a pagar) contra o teto definido na aba Orçamento.',
      'Sobra por Dia Útil e Dia Corrido: calcula quanto você pode gastar hoje sem estourar o teto de gastos e sem mexer na sua reserva.',
      'Ícones (i) em cada cartão: toque a qualquer momento para abrir o passo a passo exato daquela conta com os seus números reais.'
    ],
    steps: [
      {
        title: 'Entenda a diferença entre Carteira e Orçamento',
        text: 'A Carteira do Mês mostra o total de receitas menos todas as despesas (inclusive o que foi para Reserva/Metas). Já a Sobra por Dia Útil protege automaticamente os 20% de Reserva e Metas antes de dividir o saldo restante pelos dias que faltam.'
      },
      {
        title: 'Use os Próximos Vencimentos (rolando a tela)',
        text: 'Abaixo da Sobra por Dia Útil aparecem as contas pendentes com vencimento próximo e um resumo dos Últimos 6 Meses. Toque em "Pagar" direto no card para dar baixa na conta sem precisar abrir formulários.'
      },
      {
        title: 'Acompanhe a Inteligência do Momento',
        text: 'Os alertas automáticos no card de insights avisam se alguma categoria passou de 80% do limite, se há contas vencendo hoje ou quanto foi economizado em relação à sua meta.'
      }
    ],
    tips: [
      'No cálculo da Sobra por Dia Útil, o app pega seu teto de gastos (ex.: 80% da renda para Essenciais + Lazer), desconta tudo o que já foi pago ou está agendado para pagar nessas categorias e divide pelos dias úteis restantes (segunda a sexta).',
      'Se você estiver olhando um mês futuro ou passado, o app exibe a projeção completa dos dias úteis daquele mês.'
    ]
  },
  {
    id: 'lancamentos',
    shortTitle: '2. Lançamentos',
    title: 'Novo Lançamento, Parcelas e Recibos',
    subtitle: 'Registre gastos, ganhos, compras parceladas, contas fixas e fotos de comprovante',
    icon: PlusCircle,
    accentClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    image: './assets/guide/lancamento.png',
    imageAlt: 'Modal de Novo Lançamento com seletor de valor, categoria expansível, parcelamento e comprovante',
    imageCaption:
      'Toque no botão verde "+" no rodapé para registrar despesas ou receitas, escolher a categoria na lista expansível e configurar parcelas ou recorrência.',
    overview: [
      'Botões Despesa / Receita no topo: alternam a cor, o status padrão (Pago ou Recebido) e filtram automaticamente as categorias compatíveis.',
      'Campo Valor e Descrição: o layout do modal trava a altura ao abrir o teclado do celular para evitar que a tela fique pulando enquanto você digita.',
      'Autocompletar inteligente: ao digitar na Descrição, sugestões de lançamentos anteriores aparecem para preencher mais rápido.',
      'Categoria em lista expansível: toque em "Escolher" para abrir todas as categorias e selecione sem ocupar a tela inteira quando fechado.',
      'Conta / Cartão e Data: vincule à conta bancária, dinheiro em espécie ou cartão de crédito e escolha a data de pagamento/vencimento.',
      'Status (Pago/Realizado vs Pendente/Agendado): use "Pendente" para boletos futuros, contas a vencer ou receitas que ainda vão cair.'
    ],
    steps: [
      {
        title: 'Parcelar uma compra',
        text: 'Marque "Parcelar compra" e informe em quantas vezes (ex.: 4x). O app divide o valor total automaticamente em parcelas iguais e cria cada mês futuro identificado como (1/4), (2/4), etc.'
      },
      {
        title: 'Repetir um gasto ou salário fixo (Recorrente)',
        text: 'Marque "Repetir lançamento" e defina quantos meses deseja repetir (ex.: 12 meses). O primeiro mês fica com o status selecionado e os próximos entram como Pendentes para você apenas dar baixa quando pagar.'
      },
      {
        title: 'Anexar foto ou comprovante',
        text: 'Toque em "Anexar foto ou recibo" para tirar foto ou escolher da galeria. O app comprime a imagem automaticamente para ocupar pouco espaço no aparelho e ficar salva offline.'
      },
      {
        title: 'Editar, duplicar ou excluir depois',
        text: 'No Extrato ou Início, toque sobre qualquer lançamento para abrir o card de detalhes: lá você pode alternar Pago/Pendente, ver o recibo em tela cheia, duplicar, editar ou excluir.'
      }
    ],
    tips: [
      'Não misture Parcelamento e Recorrência no mesmo lançamento: use Parcelar para compras divididas (ex.: 10x de R$ 150) e Recorrente para assinaturas/aluguel de valor fixo todo mês.'
    ]
  },
  {
    id: 'extrato',
    shortTitle: '3. Extrato',
    title: 'Extrato, Busca Instantânea e Filtros',
    subtitle: 'Encontre qualquer lançamento por período, palavra-chave, categoria, conta ou status',
    icon: Receipt,
    accentClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    image: './assets/guide/extrato.png',
    imageAlt: 'Tela de Extrato com busca, barra de períodos, filtros avançados e resumo Receitas, Despesas e Balanço',
    imageCaption:
      'Filtre rapidamente por Dia, Mês Atual, Mês Passado, Ano ou Todos, combine com Tipo/Status/Categoria e quite contas com 1 toque no ícone à direita.',
    overview: [
      'Barra de Busca: pesquisa em tempo real pelo nome da descrição, anotação, nome da categoria, nome da conta ou até pelo valor digitado.',
      'Barra de Período Rápido: botões Dia, Mês Atual, Mês Passado, Ano e Todos — igual à tela de Relatórios.',
      'Botão Filtros: abre ou recolhe os seletores de Tipo (Todos/Despesas/Receitas), Status (Pago/Pendente/Recebido/A receber), Categoria, Conta e Ordenação (Mais recentes, Mais antigos, Maior valor ou Menor valor).',
      'Resumo de 3 Colunas (Receitas, Despesas e Balanço): recalcula instantaneamente conforme os filtros aplicados na tela.',
      'Sobra do mês anterior: quando houver saldo acumulado de meses anteriores, ele aparece automaticamente no dia 01 do mês no Extrato ("Sobra do mês anterior") e entra na soma do Balanço.'
    ],
    steps: [
      {
        title: 'Quitar ou reabrir uma conta em 1 toque',
        text: 'No lado direito de cada lançamento há um botão circular de check (✓). Toque nele para alternar imediatamente entre Pendente e Pago (ou A receber e Recebido) sem abrir outra tela.'
      },
      {
        title: 'Inspecionar ou apagar um lançamento',
        text: 'Toque no nome do lançamento para abrir todos os detalhes, foto do comprovante e opções de Editar ou Duplicar.'
      },
      {
        title: 'Carregamento leve em listas grandes',
        text: 'Se o filtro selecionado tiver muitos lançamentos, o app exibe os primeiros 50 e mostra um botão "Mostrar mais" no final para manter a rolagem sempre rápida no celular.'
      }
    ],
    tips: [
      'Quer ver apenas boletos atrasados ou futuros do ano inteiro? Selecione "Ano" na barra de datas e escolha "Status: Pendentes" nos filtros.'
    ]
  },
  {
    id: 'orcamento',
    shortTitle: '4. Orçamento',
    title: 'Orçamento 50/30/20, Tetos Fixos e Assistente',
    subtitle: 'Controle automático por % da renda ou limites fixos em reais para cada categoria',
    icon: PieChart,
    accentClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    image: './assets/guide/orcamento.png',
    imageAlt: 'Tela de Orçamento mostrando modo Dinâmico 50/30/20, Consumo Geral e barras por categoria',
    imageCaption:
      'Alterne entre visão Mensal e Anual, configure o plano pelo Assistente e acompanhe o percentual gasto de cada categoria com botão Ajustar teto.',
    overview: [
      'Visão Mês vs Ano: acompanhe o limite do mês atual ou a soma proporcional dos 12 meses do ano selecionado.',
      'Modo Dinâmico (% da Renda): multiplica automaticamente a sua renda do mês pela porcentagem de cada categoria (padrão 50% Despesas, 30% Lazer, 20% Reserva e Metas). Se a renda subir ou cair, os tetos se ajustam sozinhos.',
      'Modo Tetos Fixos ("Usar Fixos"): congela valores exatos em R$ (ex.: R$ 2.000 para Despesas) que continuam valendo para os meses seguintes sem depender da renda.',
      'Consumo Geral e Cards por Categoria: mostram o valor gasto, o teto calculado e um selo colorido (OK até 79%, Atenção entre 80% e 99%, Excedido a partir de 100%).'
    ],
    steps: [
      {
        title: 'Configurar com 1 toque pelo Assistente',
        text: 'Toque em "Assistente" e escolha entre 3 perfis: Equilibrado (50/30/20), Foco em Quitar Dívidas (65/15/20) ou Economia Máxima (45/20/35). Você também pode marcar se quer manter apenas as 3 categorias principais ou ajustar as que já possui.'
      },
      {
        title: 'Ajustar o teto de uma única categoria',
        text: 'Toque em "Ajustar teto" no card da categoria. No modo Dinâmico você pode alterar o % dela (ex.: mudar Lazer para 25%) ou digitar um teto fixo em R$ só para ela — e depois clicar em "Voltar p/ %" quando quiser.'
      }
    ],
    tips: [
      'Se o mês ainda não tiver nenhuma receita lançada, o Assistente permite informar uma "Renda base estimada" para que seus tetos nunca fiquem zerados.',
      'Ao criar ou apagar categorias na tela de Categorias, o modo Dinâmico recalcula automaticamente os percentuais dentro de cada grupo (50%, 30% ou 20%).'
    ]
  },
  {
    id: 'metas',
    shortTitle: '5. Metas',
    title: 'Metas de Poupança e Metas Sugeridas',
    subtitle: 'Planeje objetivos, veja quanto guardar por mês e registre aportes direto no extrato',
    icon: Target,
    accentClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    image: './assets/guide/metas.png',
    imageAlt: 'Tela de Metas com progresso de Reserva de Emergência, Viagem, aporte sugerido e aba Metas Sugeridas',
    imageCaption:
      'Acompanhe quanto falta em cada objetivo, quanto guardar por mês para chegar no prazo e explore modelos prontos em Metas Sugeridas.',
    overview: [
      'Aba Minhas Metas: lista todos os objetivos ativos e concluídos com barra de progresso, valor acumulado, quanto falta e meta mensal calculada automaticamente pela data alvo.',
      'Botão "+ Nova Meta": crie qualquer objetivo definindo nome, valor alvo, valor já guardado hoje, data limite e ícone.',
      'Aba Metas Sugeridas: traz 6 modelos populares (Reserva de Emergência, Quitar Dívidas, Viagem, Trocar Celular/Notebook, Entrada de Imóvel/Veículo e Primeiro Investimento) já prontos para usar.',
      'Botões (i) nas Metas Sugeridas: explicam para que serve cada meta, como calcular um valor realista e dicas práticas antes de adicioná-la.'
    ],
    steps: [
      {
        title: 'Escolher uma meta pronta',
        text: 'Toque na aba "Metas Sugeridas", leia os detalhes no botão (i) da opção que fizer sentido para você e toque em "Usar esta meta" para já abrir o formulário pré-preenchido (você ainda pode editar valor e prazo).'
      },
      {
        title: 'Fazer um Aporte na meta',
        text: 'Toque em "Adicionar Aporte", digite o valor guardado e confirme. O app soma esse valor à barra da meta e cria automaticamente um lançamento de poupança no seu Extrato.'
      }
    ],
    tips: [
      'Ao atingir 100% do valor alvo de uma meta, ela é marcada como Concluída e dispara uma animação comemorativa.'
    ]
  },
  {
    id: 'categorias',
    shortTitle: '6. Categorias',
    title: 'Categorias, Grupos 50/30/20 e Contas/Cartões',
    subtitle: 'Organize categorias personalizadas e cadastre contas bancárias ou cartões de crédito',
    icon: Tags,
    accentClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    image: './assets/guide/categorias.png',
    imageAlt: 'Tela de Categorias e Contas mostrando categorias 50/30/20, ícones de edição/exclusão e aba Contas',
    imageCaption:
      'Em Mais → Categorias você gerencia suas categorias de despesa e receita (com ajuste automático no 50/30/20) e alterna para Contas/Cartões.',
    overview: [
      'Aba Categorias: exibe todas as categorias de Despesa (com indicação de qual grupo pertencem: Essenciais 50%, Lazer 30% ou Reserva e Metas 20%) e de Receita.',
      'Botão "+ Nova": cria uma categoria escolhendo Tipo (Despesa ou Receita), Nome, Grupo do Plano 50/30/20, Cor e Ícone em um seletor compacto.',
      'Edição e Exclusão Segura: se você apagar uma categoria que já tem lançamentos, o app permite migrar automaticamente todas as transações antigas para outra categoria sem perder seu histórico.',
      'Aba Contas: gerencia Carteiras, Contas Correntes/Digitais e Cartões de Crédito.'
    ],
    steps: [
      {
        title: 'Criar categorias sem quebrar o 50/30/20',
        text: 'Ao criar uma nova categoria de despesa (ex.: "Mercado" ou "Streaming"), escolha em "Onde entra no plano" se ela faz parte de Essenciais (50%), Lazer (30%) ou Reserva e Metas (20%). O orçamento redistribui a porcentagem do grupo automaticamente entre as categorias daquele bloco.'
      },
      {
        title: 'Cadastrar um Cartão de Crédito',
        text: 'Na aba Contas, toque em "+ Nova", selecione o tipo "Cartão de Crédito" e preencha o Limite, Dia de Fechamento e Dia de Vencimento da fatura. Isso habilita os lembretes de fechamento e vencimento do cartão.'
      }
    ],
    tips: [
      'Prefere simplicidade máxima? Use apenas as 3 categorias padrão (Despesas, Lazer e Reserva e Metas). Quer detalhar melhor mercado, moradia ou transporte? Crie as categorias extras normalmente e indique o bloco do plano.'
    ]
  },
  {
    id: 'relatorios',
    shortTitle: '7. Relatórios',
    title: 'Relatórios, Planilha CSV e Ferramentas Extras',
    subtitle: 'Gráficos por categoria, evolução mensal, planilha exportável, calendário e assinaturas',
    icon: BarChart3,
    accentClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    image: './assets/guide/relatorios.png',
    imageAlt: 'Tela de Relatórios com filtro de período, Resumo Realizado, Compartilhar, Ver Planilha e Baixar CSV',
    imageCaption:
      'Veja o ranking de gastos por categoria, a evolução mês a mês, a planilha completa com exportação em .CSV e acesso rápido à Retrospectiva.',
    overview: [
      'Período do Relatório: filtre entre Dia, Mês Atual, Mês Passado, Ano inteiro ou Todos.',
      'Resumo Realizado: mostra Receitas, Despesas, Balanço e a % exata economizada no período.',
      '3 Abas de Análise: Por Categorias (ranking com barras), Evolução Mensal (gráfico comparando receitas x despesas mês a mês) e Planilha (tabela completa com filtro Todos, Realizados ou Pendentes).',
      'Exportação & Compartilhamento: toque em "Baixar CSV" para abrir no Excel ou Google Planilhas, ou em "Compartilhar" para gerar uma imagem resumo do mês.'
    ],
    steps: [
      {
        title: 'Usar a Planilha e baixar em CSV',
        text: 'Toque na aba "Planilha" (ou no botão "Ver Planilha"), filtre se quer incluir lançamentos pendentes e clique em "Baixar CSV" para salvar a tabela organizada com data, categoria, conta, status e valor.'
      },
      {
        title: 'Explorar Calendário, Assinaturas e Retrospectiva no menu Mais',
        text: 'Em Mais → Ferramentas e Análises você também encontra: Calendário (visão em grade dos dias com contas a pagar e receber), Assinaturas (detector automático de cobranças repetidas com cálculo do custo anual) e Retrospectiva Anual (resumo visual com conquistas do seu ano).'
      }
    ],
    tips: [
      'As abas "Por Categorias" e "Evolução Mensal" mostram apenas o que já foi realmente pago ou recebido; já a "Planilha" deixa você inspecionar também o que ainda está pendente.'
    ]
  },
  {
    id: 'seguranca',
    shortTitle: '8. Configs & Backup',
    title: 'Notificações, PIN, Backup JSON e Privacidade Offline',
    subtitle: 'Ative alertas no aparelho, proteja o acesso com senha e salve cópias de segurança',
    icon: ShieldCheck,
    accentClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    image: './assets/guide/ferramentas.png',
    imageAlt: 'Tela Mais com Ferramentas, Perfil do Usuário e painel de Notificações e Alertas',
    imageCaption:
      'Menu Mais centraliza atalhos para ferramentas, nome do perfil, permissões e testes de notificação, bloqueio por PIN, backup JSON e gerenciamento de dados.',
    overview: [
      'Notificações e Alertas: toque em "Permitir Notificações" para autorizar avisos no Android/navegador e use "Testar Notificação" para confirmar que está funcionando. Escolha quais alertas quer receber (vencimentos, 80%/100% do orçamento, resumo semanal e cartão).',
      'Ajuda e Tutorial: abre este Manual Completo com Imagens ou o tour inicial de boas-vindas sempre que você tiver dúvida.',
      'Bloqueio por PIN: cadastre uma senha numérica de 4 dígitos para proteger seus dados ao abrir o app.',
      'Backup Completo (.json): exporte um arquivo com todos os seus lançamentos, metas, categorias, contas e configurações, e restaure em outro aparelho quando trocar de celular.',
      'Gerenciamento de Dados: carregue ou limpe os Dados de Demonstração para testes ou restaure o aplicativo do zero.'
    ],
    steps: [
      {
        title: 'Fazer backup antes de trocar de celular',
        text: 'Role a aba Mais até "Backup Completo dos Dados" e toque em "Exportar Backup". Guarde o arquivo .json em um local seguro (Google Drive, e-mail ou pasta Downloads). No celular novo, toque em "Restaurar Backup" e selecione o arquivo.'
      },
      {
        title: 'Funciona 100% offline e sem conta',
        text: 'Seus registros ficam gravados diretamente na memória do seu aparelho (IndexedDB e armazenamento local). Não existe login, senha em nuvem nem envio dos seus valores para servidores externos.'
      }
    ],
    tips: [
      'Para silenciar alertas durante a madrugada no celular, use diretamente o modo "Não Perturbe" ou as configurações de notificação do próprio Android.',
      'Sempre exporte um backup .json após grandes reorganizações de metas ou fechamento do mês para ter uma cópia extra de segurança.'
    ]
  }
];

export function DetailedGuideModal({ onClose }: DetailedGuideModalProps) {
  const [chapterIndex, setChapterIndex] = useState<number>(0);
  const [showIndex, setShowIndex] = useState<boolean>(false);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string; caption: string } | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const chapter = GUIDE_CHAPTERS[chapterIndex];
  const Icon = chapter.icon;

  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
    const activePill = tabsScrollRef.current?.querySelector<HTMLButtonElement>(
      `[data-guide-tab="${chapter.id}"]`
    );
    activePill?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [chapterIndex, chapter.id]);

  return (
    <div
      data-testid="detailed-guide-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/90 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Manual Completo do Aplicativo"
    >
      <div className="w-full max-w-md h-[95dvh] sm:h-[88dvh] bg-[var(--app-bg)] border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* TOPO FIXO */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-800 bg-slate-900 flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 flex-shrink-0">
                <BookOpen size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-slate-100 truncate">
                  Manual Completo do App
                </h2>
                <p className="text-[11px] text-slate-400">
                  Capítulo {chapterIndex + 1} de {GUIDE_CHAPTERS.length} • Guia detalhado offline
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowIndex(prev => !prev)}
                data-testid="guide-index-toggle"
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border flex items-center space-x-1 transition-colors ${
                  showIndex
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <List size={13} />
                <span>Índice</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                data-testid="close-detailed-guide"
                aria-label="Fechar manual"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ABAS DE CAPÍTULOS */}
          <div
            ref={tabsScrollRef}
            className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar"
          >
            {GUIDE_CHAPTERS.map((item, idx) => {
              const active = idx === chapterIndex && !showIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-guide-tab={item.id}
                  onClick={() => {
                    setChapterIndex(idx);
                    setShowIndex(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors border ${
                    active
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                  }`}
                >
                  {item.shortTitle}
                </button>
              );
            })}
          </div>
        </div>

        {/* CORPO COM SCROLL */}
        <div
          ref={contentScrollRef}
          className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4"
        >
          {showIndex ? (
            <div className="space-y-2.5" data-testid="guide-index-list">
              <div className="px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Todos os Capítulos ({GUIDE_CHAPTERS.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Toque em qualquer assunto para abrir a explicação completa com imagem da tela.
                </p>
              </div>

              {GUIDE_CHAPTERS.map((item, idx) => {
                const ItemIcon = item.icon;
                const isCurrent = idx === chapterIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setChapterIndex(idx);
                      setShowIndex(false);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center space-x-3 transition-colors ${
                      isCurrent
                        ? 'bg-slate-900 border-brand-500/50'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${item.accentClass}`}
                    >
                      <ItemIcon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {idx + 1}. {item.title}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-brand-400 flex-shrink-0">
                            Atual
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                        {item.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              {/* CABEÇALHO DO CAPÍTULO */}
              <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-2">
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${chapter.accentClass}`}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-slate-100 leading-snug">
                      {chapter.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {chapter.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* IMAGEM REAL DA TELA COM ZOOM */}
              <div className="bg-slate-900 p-3 rounded-3xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Visual da Tela no App
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setZoomedImage({
                        src: chapter.image,
                        alt: chapter.imageAlt,
                        caption: chapter.imageCaption
                      })
                    }
                    data-testid="guide-zoom-image-btn"
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-400 text-[11px] font-bold transition-colors"
                  >
                    <ZoomIn size={13} />
                    <span>Ampliar imagem</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setZoomedImage({
                      src: chapter.image,
                      alt: chapter.imageAlt,
                      caption: chapter.imageCaption
                    })
                  }
                  className="w-full rounded-2xl bg-[var(--app-bg-deep)] border border-slate-800 p-2 flex items-center justify-center overflow-hidden hover:border-brand-500/40 transition-colors"
                  aria-label={`Ampliar captura de tela: ${chapter.title}`}
                >
                  <img
                    src={chapter.image}
                    alt={chapter.imageAlt}
                    data-testid="guide-chapter-image"
                    className="max-h-80 w-auto rounded-xl border border-slate-800 object-contain"
                  />
                </button>

                <p className="text-[11px] text-slate-400 leading-relaxed px-1">
                  {chapter.imageCaption}
                </p>
              </div>

              {/* O QUE VOCÊ ENCONTRA NESTA TELA */}
              <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center space-x-1.5">
                  <CheckCircle2 size={14} />
                  <span>O que cada parte faz</span>
                </h4>
                <ul className="space-y-2">
                  {chapter.overview.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-200 leading-relaxed flex items-start space-x-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* COMO USAR PASSO A PASSO */}
              <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Como usar na prática
                </h4>
                <div className="space-y-2.5">
                  {chapter.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-300 text-[11px] font-extrabold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <h5 className="text-xs font-bold text-slate-100">{step.title}</h5>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pl-7">
                        {step.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* DICAS E CÁLCULOS */}
              <div className="bg-amber-950/30 p-4 rounded-3xl border border-amber-800/40 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
                  <Lightbulb size={14} />
                  <span>Regras e Dicas Importantes</span>
                </h4>
                <ul className="space-y-1.5">
                  {chapter.tips.map((tip, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-amber-100/90 leading-relaxed flex items-start space-x-2"
                    >
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* RODAPÉ FIXO DE NAVEGAÇÃO */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-2 flex-shrink-0">
          <button
            type="button"
            disabled={chapterIndex === 0}
            onClick={() => {
              setShowIndex(false);
              setChapterIndex(i => Math.max(0, i - 1));
            }}
            data-testid="guide-prev-btn"
            className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold text-slate-200 flex items-center space-x-1 transition-colors"
          >
            <ChevronLeft size={15} />
            <span>Anterior</span>
          </button>

          <span className="text-[11px] font-bold text-slate-400">
            {chapterIndex + 1} / {GUIDE_CHAPTERS.length}
          </span>

          {chapterIndex < GUIDE_CHAPTERS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                setShowIndex(false);
                setChapterIndex(i => Math.min(GUIDE_CHAPTERS.length - 1, i + 1));
              }}
              data-testid="guide-next-btn"
              className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-xs font-extrabold text-white flex items-center space-x-1 transition-colors"
            >
              <span>Próximo</span>
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              data-testid="guide-finish-btn"
              className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-xs font-extrabold text-white transition-colors"
            >
              Fechar Manual
            </button>
          )}
        </div>
      </div>

      {/* LIGHTBOX PARA AMPLIAR IMAGEM */}
      {zoomedImage && (
        <div
          data-testid="guide-image-lightbox"
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-60 bg-slate-950/95 flex flex-col items-center justify-center p-4"
        >
          <div className="w-full max-w-md flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200">
              Visualização ampliada
            </span>
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              aria-label="Fechar visualização ampliada"
              className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <X size={16} />
            </button>
          </div>
          <img
            src={zoomedImage.src}
            alt={zoomedImage.alt}
            onClick={e => e.stopPropagation()}
            className="max-w-full max-h-[80dvh] w-auto rounded-2xl border border-slate-700 shadow-2xl object-contain"
          />
          <p className="mt-2.5 max-w-md text-center text-[11px] text-slate-300 leading-relaxed">
            {zoomedImage.caption}
          </p>
        </div>
      )}
    </div>
  );
}
