import { DatabaseState, Lancamento, Categoria, Conta } from '../types';
import { formatCurrency, formatDateBr, formatMonthYear } from './i18n';
import { calculateMonthRealized, calculateSavingsRate } from './calculations';

/**
 * Exporta lançamentos para CSV compatível com Excel no Brasil
 * - Codificação UTF-8 com BOM (\uFEFF)
 * - Separador ponto-e-vírgula (;)
 * - Vírgula decimal em valores monetários
 */
export function exportTransactionsToCSV(
  transactions: Lancamento[],
  categories: Categoria[],
  accounts: Conta[],
  filename: string = 'nexo_lancamentos.csv'
): void {
  const catMap = new Map(categories.map(c => [c.id, c.nome]));
  const accMap = new Map(accounts.map(a => [a.id, a.nome]));

  const headers = [
    'Data',
    'Tipo',
    'Descrição',
    'Categoria',
    'Conta',
    'Valor (R$)',
    'Status',
    'Parcela',
    'Observação'
  ];

  const rows = transactions.map(t => {
    const dataBr = formatDateBr(t.data);
    const tipo = t.tipo === 'receita' ? 'Receita' : 'Despesa';
    const desc = `"${(t.descricao || '').replace(/"/g, '""')}"`;
    const cat = `"${(catMap.get(t.categoria_id) || 'Sem categoria').replace(/"/g, '""')}"`;
    const acc = `"${(accMap.get(t.conta_id) || 'Conta').replace(/"/g, '""')}"`;
    const valor = t.valor.toFixed(2).replace('.', ',');
    const status = t.status.toUpperCase();
    const parcela = t.parcela_numero && t.parcela_total ? `${t.parcela_numero}/${t.parcela_total}` : '';
    const obs = `"${(t.observacao || '').replace(/"/g, '""')}"`;

    return [dataBr, tipo, desc, cat, acc, valor, status, parcela, obs].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Exporta backup completo do banco de dados em JSON
 */
export function exportDatabaseJSON(state: DatabaseState, filename?: string): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const name = filename || `nexo_backup_${dateStr}.json`;
  const jsonContent = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  downloadBlob(blob, name);
}

/**
 * Lê e valida arquivo JSON de backup
 */
export async function importDatabaseJSON(file: File): Promise<DatabaseState> {
  const text = await file.text();
  const parsed = JSON.parse(text) as DatabaseState;
  
  if (!parsed || !parsed.usuario || !Array.isArray(parsed.lancamentos)) {
    throw new Error('Arquivo de backup inválido.');
  }

  return parsed;
}

declare global {
  interface Window {
    AndroidBridge?: {
      saveFile: (filename: string, mimeType: string, base64Content: string) => void;
      hasNotificationPermission?: () => boolean;
      requestNotificationPermission?: () => void;
      showNotification?: (notificationId: number, title: string, body: string) => void;
    };
  }
}

export function saveDataUrlOrBlobToAndroid(dataUrl: string, filename: string, mimeType: string): boolean {
  if (!window.AndroidBridge?.saveFile) return false;
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  window.AndroidBridge.saveFile(filename, mimeType, base64);
  return true;
}

function downloadBlob(blob: Blob, filename: string): void {
  if (window.AndroidBridge?.saveFile) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : '';
      if (base64) {
        window.AndroidBridge?.saveFile(filename, blob.type || 'application/octet-stream', base64);
      }
    };
    reader.readAsDataURL(blob);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Gera uma imagem de alta resolução (1080x1350) para "Compartilhar o Mês"
 * Renderizada com HTML5 Canvas nativo, pronta para WhatsApp ou Stories.
 */
export function generateMonthShareCard(
  monthYM: string,
  userName: string,
  transactions: Lancamento[],
  categories: Categoria[]
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d')!;

    // Fundo gradiente Obsidiana + Carmim
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
    bgGrad.addColorStop(0, '#090A0F');
    bgGrad.addColorStop(0.6, '#13161E');
    bgGrad.addColorStop(1, '#2D0712');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1350);

    // Círculos decorativos sutis no fundo
    ctx.beginPath();
    ctx.arc(950, 150, 300, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(100, 1200, 250, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.06)';
    ctx.fill();

    // Topo: Marca e mês
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('NEXO FINANCEIRO', 80, 120);

    ctx.fillStyle = '#A5AAB8';
    ctx.font = '500 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Resumo financeiro de ${userName || 'Carlos'}`, 80, 165);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 54px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(formatMonthYear(monthYM), 80, 240);

    // Resumo de cálculos do mês
    const summary = calculateMonthRealized(transactions, monthYM);
    const savingsRate = calculateSavingsRate(summary.income, summary.balance);

    // Card do Saldo Principal
    drawRoundedRect(
      ctx,
      80,
      290,
      920,
      260,
      28,
      '#13161E',
      'rgba(255,255,255,0.18)'
    );

    ctx.fillStyle = '#A5AAB8';
    ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ECONOMIA LÍQUIDA NO MÊS', 120, 350);

    const isPositive = summary.balance >= 0;
    ctx.fillStyle = isPositive ? '#10B981' : '#EF4444';
    ctx.font = 'bold 72px "JetBrains Mono", monospace';
    ctx.fillText(formatCurrency(summary.balance, true), 120, 440);

    // Taxa poupada badge
    drawRoundedRect(ctx, 680, 390, 280, 70, 20, isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)');
    ctx.fillStyle = isPositive ? '#34D399' : '#F87171';
    ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${savingsRate} poupado`, 820, 436);
    ctx.textAlign = 'left';

    // Cards menores: Receitas e Despesas
    const subCardColor = '#1F2330';
    // Receitas
    drawRoundedRect(ctx, 80, 580, 445, 180, 24, subCardColor);
    ctx.fillStyle = '#A5AAB8';
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Entradas realizadas', 120, 635);
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 42px "JetBrains Mono", monospace';
    ctx.fillText(formatCurrency(summary.income), 120, 705);

    // Despesas
    drawRoundedRect(ctx, 555, 580, 445, 180, 24, subCardColor);
    ctx.fillStyle = '#A5AAB8';
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Saídas realizadas', 595, 635);
    ctx.fillStyle = '#F87171';
    ctx.font = 'bold 42px "JetBrains Mono", monospace';
    ctx.fillText(formatCurrency(summary.expense), 595, 705);

    // Top Categorias de Gastos
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Maiores Categorias de Gastos', 80, 830);

    const monthExpenses = transactions.filter(t => t.data.startsWith(monthYM) && t.tipo === 'despesa');
    const catTotals = new Map<string, number>();
    for (const t of monthExpenses) {
      catTotals.set(t.categoria_id, (catTotals.get(t.categoria_id) || 0) + t.valor);
    }

    const sortedCats = Array.from(catTotals.entries())
      .map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId);
        return {
          nome: cat?.nome || 'Outros',
          cor: cat?.cor || '#10B981',
          valor: amount
        };
      })
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 4);

    let startY = 890;
    const maxVal = sortedCats[0]?.valor || 1;

    for (const cat of sortedCats) {
      // Nome e Valor
      ctx.fillStyle = '#F1F5F9';
      ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(cat.nome, 80, startY);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = 'bold 26px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(formatCurrency(cat.valor), 1000, startY);
      ctx.textAlign = 'left';

      // Barra de progresso
      const barY = startY + 14;
      drawRoundedRect(ctx, 80, barY, 920, 16, 8, '#334155');
      const fillW = Math.max(20, (cat.valor / maxVal) * 920);
      drawRoundedRect(ctx, 80, barY, fillW, 16, 8, cat.cor);

      startY += 78;
    }

    // Rodapé de segurança e privacidade
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '400 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nexo Financeiro • Feito com Responsabilidade para organizar a vida financeira', 540, 1280);

    resolve(canvas.toDataURL('image/png'));
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle: string,
  strokeStyle?: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}
