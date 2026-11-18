import { DatabaseState } from '../types';
import {
  calculateBudgetUsage,
  calculateDaysToDue,
  isRealized,
  resolveMonthBudgets
} from './calculations';
import { formatCurrency } from './i18n';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

const SENT_NOTIFICATIONS_KEY = 'financas_sent_notifications_v1';

export function isAndroidHost(): boolean {
  return typeof window !== 'undefined' && typeof window.AndroidBridge?.showNotification === 'function';
}

export function getNotificationPermissionStatus(): NotificationPermissionState {
  if (typeof window === 'undefined') return 'unsupported';

  if (window.AndroidBridge?.hasNotificationPermission) {
    return window.AndroidBridge.hasNotificationPermission() ? 'granted' : 'default';
  }

  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'default';
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined') return 'unsupported';

  if (window.AndroidBridge?.requestNotificationPermission) {
    window.AndroidBridge.requestNotificationPermission();
    // Dá um pequeno intervalo para o usuário/sistema processar e reconsulta
    await new Promise(resolve => setTimeout(resolve, 400));
    return getNotificationPermissionStatus();
  }

  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }

  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermissionState;
  } catch {
    return 'denied';
  }
}

export function sendLocalNotification(
  id: number,
  title: string,
  body: string
): boolean {

  if (window.AndroidBridge?.showNotification) {
    if (window.AndroidBridge.hasNotificationPermission && !window.AndroidBridge.hasNotificationPermission()) {
      return false;
    }
    window.AndroidBridge.showNotification(id, title, body);
    return true;
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        tag: `nexo_${id}`,
        icon: './assets/nexo-icon.png',
        badge: './assets/nexo-favicon.png'
      });
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

function getSentTodaySet(): Set<string> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(SENT_NOTIFICATIONS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { date: string; keys: string[] };
    if (parsed.date !== today) return new Set();
    return new Set(parsed.keys || []);
  } catch {
    return new Set();
  }
}

function markSentToday(key: string): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const current = getSentTodaySet();
    current.add(key);
    localStorage.setItem(
      SENT_NOTIFICATIONS_KEY,
      JSON.stringify({ date: today, keys: Array.from(current) })
    );
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Avalia alertas locais (vencimentos próximos e limites de orçamento 80%/100%)
 * e dispara notificações locais quando permitido (sem duplicar no mesmo dia).
 */
export function evaluateAndDispatchNotifications(
  state: DatabaseState,
  currentYM: string
): number {
  const notifCfg = state.settings.notificacoes;

  if (getNotificationPermissionStatus() !== 'granted') {
    return 0;
  }

  const sentSet = getSentTodaySet();
  let dispatched = 0;

  // 1. Vencimentos próximos ou hoje
  if (notifCfg.vencimentos) {
    const daysAhead = notifCfg.dias_antecedencia_vencimento ?? 3;
    const dueBills = state.lancamentos.filter(t => {
      if (t.tipo !== 'despesa' || isRealized(t.status)) return false;
      const days = calculateDaysToDue(t.data);
      return days >= 0 && days <= daysAhead;
    });

    if (dueBills.length > 0 && !sentSet.has(`due_${currentYM}_${dueBills.length}`)) {
      const first = dueBills[0];
      const days = calculateDaysToDue(first.data);
      const whenLabel = days === 0 ? 'vence hoje' : `vence em ${days} dia(s)`;
      const ok = sendLocalNotification(
        101,
        dueBills.length === 1
          ? `Conta próxima: ${first.descricao}`
          : `${dueBills.length} contas próximas do vencimento`,
        dueBills.length === 1
          ? `${first.descricao} (${formatCurrency(first.valor)}) ${whenLabel}.`
          : `Ex.: ${first.descricao} (${formatCurrency(first.valor)}) ${whenLabel}.`
      );
      if (ok) {
        markSentToday(`due_${currentYM}_${dueBills.length}`);
        dispatched++;
      }
    }
  }

  // 2. Alertas de orçamento 80% / 100%
  if (notifCfg.orcamento_alerta_80 || notifCfg.orcamento_alerta_100) {
    const resolved = resolveMonthBudgets(
      state.categorias,
      currentYM,
      state.orcamentos,
      state.lancamentos,
      state.settings.orcamento_config
    );

    for (const rb of resolved) {
      if (rb.target <= 0) continue;
      const spent = state.lancamentos
        .filter(
          t =>
            t.data.startsWith(currentYM) &&
            t.tipo === 'despesa' &&
            t.categoria_id === rb.categoria_id
        )
        .reduce((acc, t) => acc + t.valor, 0);

      const usage = calculateBudgetUsage(spent, rb.target);
      const cat = state.categorias.find(c => c.id === rb.categoria_id);
      if (!cat) continue;

      if (usage.percentage >= 100 && notifCfg.orcamento_alerta_100) {
        const key = `budget_100_${currentYM}_${cat.id}`;
        if (!sentSet.has(key)) {
          const ok = sendLocalNotification(
            200 + Math.abs(cat.id.charCodeAt(4) || 1),
            `Orçamento excedido: ${cat.nome}`,
            `Você atingiu ${usage.percentage}% do teto de ${formatCurrency(rb.target)}.`
          );
          if (ok) {
            markSentToday(key);
            dispatched++;
            break;
          }
        }
      } else if (usage.percentage >= 80 && notifCfg.orcamento_alerta_80) {
        const key = `budget_80_${currentYM}_${cat.id}`;
        if (!sentSet.has(key)) {
          const ok = sendLocalNotification(
            300 + Math.abs(cat.id.charCodeAt(4) || 1),
            `Atenção ao orçamento: ${cat.nome}`,
            `${usage.percentage}% do teto mensal (${formatCurrency(rb.target)}) já utilizado.`
          );
          if (ok) {
            markSentToday(key);
            dispatched++;
            break;
          }
        }
      }
    }
  }

  return dispatched;
}
