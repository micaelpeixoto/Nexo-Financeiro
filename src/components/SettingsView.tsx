import React, { useState, useEffect } from 'react';
import {
  Shield,
  Bell,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Calendar,
  BarChart3,
  Tags,
  Tv,
  Check,
  Lock,
  Trash2,
  BookOpen,
  BellRing
} from 'lucide-react';
import { Settings, Usuario, DatabaseState } from '../types';
import { exportDatabaseJSON } from '../utils/export';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendLocalNotification,
  NotificationPermissionState
} from '../utils/notifications';

interface SettingsViewProps {
  settings: Settings;
  user: Usuario;
  databaseState: DatabaseState;
  hasDemoData: boolean;
  onUpdateSettings: (newSettings: Settings) => void;
  onUpdateUser: (newUser: Usuario) => void;
  onImportBackup: (file: File) => void;
  onLoadDemoData: () => void;
  onClearDemoData: () => void;
  onResetAllData: () => void;
  onReopenTutorial: () => void;
  onOpenDetailedGuide: () => void;
  onNavigateTo: (view: 'reports' | 'calendar' | 'categories' | 'subscriptions' | 'yearWrapped') => void;
}

export function SettingsView({
  settings,
  user,
  databaseState,
  hasDemoData,
  onUpdateSettings,
  onUpdateUser,
  onImportBackup,
  onLoadDemoData,
  onClearDemoData,
  onResetAllData,
  onReopenTutorial,
  onOpenDetailedGuide,
  onNavigateTo
}: SettingsViewProps) {
  const [userName, setUserName] = useState<string>(user.nome);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>(() =>
    getNotificationPermissionStatus()
  );
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState<boolean>(false);

  useEffect(() => {
    const syncPermission = () => setNotifPermission(getNotificationPermissionStatus());
    window.addEventListener('androidNotificationPermission', syncPermission);
    return () => window.removeEventListener('androidNotificationPermission', syncPermission);
  }, []);

  const handleSaveName = () => {
    if (userName.trim()) {
      onUpdateUser({ ...user, nome: userName.trim() });
      setIsEditingName(false);
    }
  };

  const handleToggleNotification = (key: keyof Settings['notificacoes']) => {
    onUpdateSettings({
      ...settings,
      notificacoes: {
        ...settings.notificacoes,
        [key]: !settings.notificacoes[key]
      }
    });
  };

  const handleRequestNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      setNotifFeedback('Permissão concedida! Notificações prontas para funcionar.');
    } else if (result === 'denied') {
      setNotifFeedback('Permissão negada no sistema. Ative nas configurações do aparelho/navegador.');
    } else {
      setNotifFeedback('Solicitação enviada ao sistema.');
    }
    setTimeout(() => setNotifFeedback(null), 4000);
  };

  const handleTestNotification = async () => {
    let status = getNotificationPermissionStatus();
    if (status !== 'granted') {
      status = await requestNotificationPermission();
      setNotifPermission(status);
    }

    if (status !== 'granted') {
      setNotifFeedback('Conceda permissão de notificação para testar os alertas.');
      setTimeout(() => setNotifFeedback(null), 4000);
      return;
    }

    const sent = sendLocalNotification(
      999,
      'Nexo Financeiro • Inteligência do Momento',
      'Tudo certo! Seus alertas de vencimento e orçamento estão ativos.'
    );

    setNotifFeedback(
      sent
        ? 'Notificação de teste enviada!'
        : 'Não foi possível disparar no navegador atual (teste no APK Android).'
    );
    setTimeout(() => setNotifFeedback(null), 4000);
  };

  const handleSetPin = () => {
    if (pinInput.length === 4) {
      onUpdateSettings({
        ...settings,
        pin_ativado: true,
        pin_hash: btoa(pinInput)
      });
      setShowPinModal(false);
      setPinInput('');
    }
  };

  const handleRemovePin = () => {
    onUpdateSettings({
      ...settings,
      pin_ativado: false,
      pin_hash: undefined
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-4 pb-28">
      {/* ATALHOS PARA AS FERRAMENTAS DO APP (SEM ENVELOPES) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Ferramentas e Análises
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onNavigateTo('reports')}
            data-testid="menu-open-reports"
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs flex items-center space-x-3 text-left hover:border-brand-500/40 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-950 flex items-center justify-center text-brand-400">
              <BarChart3 size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">Relatórios</h4>
              <span className="text-[10px] text-slate-400">Gráficos e planilha</span>
            </div>
          </button>

          <button
            onClick={() => onNavigateTo('calendar')}
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs flex items-center space-x-3 text-left hover:border-brand-500/40 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-950/80 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Calendar size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-100">Calendário</h4>
              <span className="text-[10px] text-slate-400 block truncate">Agenda e vencimentos</span>
            </div>
          </button>

          <button
            onClick={() => onNavigateTo('categories')}
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs flex items-center space-x-3 text-left hover:border-brand-500/40 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-950 flex items-center justify-center text-purple-400 flex-shrink-0">
              <Tags size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-100">Categorias</h4>
              <span className="text-[10px] text-slate-400 block truncate">Contas e cartões</span>
            </div>
          </button>

          <button
            onClick={() => onNavigateTo('subscriptions')}
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs flex items-center space-x-3 text-left hover:border-brand-500/40 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-pink-950 flex items-center justify-center text-pink-400 flex-shrink-0">
              <Tv size={18} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-100">Assinaturas</h4>
              <span className="text-[10px] text-slate-400 block truncate">Gastos recorrentes</span>
            </div>
          </button>

          <button
            onClick={() => onNavigateTo('yearWrapped')}
            className="col-span-2 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs flex items-center space-x-3 text-left hover:border-brand-500/40 transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-950 flex items-center justify-center text-emerald-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">Retrospectiva Anual</h4>
              <span className="text-[10px] text-slate-400">Resumo completo e conquistas do seu ano</span>
            </div>
          </button>
        </div>
      </div>

      {/* PERFIL & NOME */}
      <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xs space-y-3">
        <h4 className="text-xs font-bold text-slate-200">Perfil do Usuário</h4>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-base">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              {isEditingName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    className="px-2 py-1 rounded-xl bg-slate-800 text-xs font-semibold text-white outline-none"
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="p-1 rounded-lg bg-brand-600 text-white">
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <h5 className="text-xs font-bold text-slate-100">{user.nome}</h5>
                  <span className="text-[10px] text-slate-400 block">
                    Objetivo: {user.objetivo_onboarding.replace('_', ' ')}
                  </span>
                </>
              )}
            </div>
          </div>

          {!isEditingName && (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-xs font-semibold text-brand-400 hover:underline"
            >
              Alterar nome
            </button>
          )}
        </div>
      </div>

      {/* NOTIFICAÇÕES E PERMISSÕES ANDROID/WEB */}
      <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
            <Bell size={14} className="text-brand-400" />
            <span>Notificações e Alertas</span>
          </h4>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              notifPermission === 'granted'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/40'
                : notifPermission === 'denied'
                ? 'bg-red-950 text-red-300 border border-red-700/40'
                : 'bg-amber-950 text-amber-300 border border-amber-700/40'
            }`}
          >
            {notifPermission === 'granted'
              ? 'Permitidas'
              : notifPermission === 'denied'
              ? 'Bloqueadas'
              : 'Pendente'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {notifPermission !== 'granted' && (
            <button
              onClick={handleRequestNotifications}
              data-testid="request-notification-permission"
              className="flex-1 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <BellRing size={13} />
              <span>Permitir Notificações</span>
            </button>
          )}

          <button
            onClick={handleTestNotification}
            data-testid="test-notification-btn"
            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Bell size={13} className="text-slate-300" />
            <span>Testar Notificação</span>
          </button>
        </div>

        {notifFeedback && (
          <p
            className={`text-[11px] px-3 py-2 rounded-xl border ${
              notifPermission === 'granted'
                ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800/60'
                : 'text-slate-200 bg-slate-800/90 border-slate-700'
            }`}
          >
            {notifFeedback}
          </p>
        )}

        <div className="space-y-2.5 text-xs pt-1">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-300">Aviso de vencimentos (3 dias antes e no dia)</span>
            <input
              type="checkbox"
              checked={settings.notificacoes.vencimentos}
              onChange={() => handleToggleNotification('vencimentos')}
              className="rounded text-brand-500 focus:ring-brand-400 accent-brand-600"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-300">Alertas de orçamento (ao cruzar 80% e 100%)</span>
            <input
              type="checkbox"
              checked={settings.notificacoes.orcamento_alerta_80}
              onChange={() => handleToggleNotification('orcamento_alerta_80')}
              className="rounded text-brand-500 focus:ring-brand-400 accent-brand-600"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-300">Resumo semanal (segunda-feira às 8h)</span>
            <input
              type="checkbox"
              checked={settings.notificacoes.resumo_semanal}
              onChange={() => handleToggleNotification('resumo_semanal')}
              className="rounded text-brand-500 focus:ring-brand-400 accent-brand-600"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-slate-300">Fechamento e vencimento de cartão de crédito</span>
            <input
              type="checkbox"
              checked={settings.notificacoes.cartao_lembrete}
              onChange={() => handleToggleNotification('cartao_lembrete')}
              className="rounded text-brand-500 focus:ring-brand-400 accent-brand-600"
            />
          </label>
        </div>
      </div>

      {/* AJUDA E TUTORIAL */}
      <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xs space-y-2.5">
        <h4 className="text-xs font-bold text-slate-200">Ajuda e Tutorial</h4>

        <button
          onClick={onOpenDetailedGuide}
          data-testid="open-detailed-guide-btn"
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-pearl-border transition-colors text-left"
        >
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-brand-500 flex-shrink-0 shadow-xs">
              <BookOpen size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block text-white">
                Manual Completo do App (Com Imagens)
              </span>
              <span className="text-[10px] text-slate-300 block">
                Guia detalhado de todas as telas, funções e cálculos em 8 capítulos
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-pearl-text flex-shrink-0">Abrir</span>
        </button>

        <button
          onClick={onReopenTutorial}
          data-testid="reopen-tutorial-btn"
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800 transition-colors text-left"
        >
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold block text-slate-100">
                Rever Boas-vindas Inicial
              </span>
              <span className="text-[10px] text-slate-400 block">
                Resumo rápido exibido na primeira abertura sem alterar dados
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-400 flex-shrink-0">Rever</span>
        </button>
      </div>

      {/* SEGURANÇA E BLOQUEIO (PIN) */}
      <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xs space-y-3">
        <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
          <Shield size={14} className="text-brand-400" />
          <span>Privacidade e Segurança</span>
        </h4>

        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-200 block">Bloqueio por PIN / Senha</span>
            <span className="text-[10px] text-slate-400">
              {settings.pin_ativado
                ? 'PIN ativado. O app exige senha ao abrir.'
                : 'Opcional. Tudo fica salvo no seu aparelho.'}
            </span>
          </div>

          {settings.pin_ativado ? (
            <button onClick={handleRemovePin} className="text-xs text-red-400 font-semibold hover:underline">
              Desativar PIN
            </button>
          ) : (
            <button
              onClick={() => setShowPinModal(true)}
              className="px-3 py-1.5 rounded-xl bg-pearl-soft text-white font-semibold text-xs border border-pearl-border hover:bg-slate-800 transition-colors"
            >
              Definir PIN
            </button>
          )}
        </div>
      </div>

      {/* BACKUP & RESTAURAÇÃO */}
      <div className="bg-slate-900 p-4 rounded-3xl border border-pearl-border shadow-xs space-y-3">
        <h4 className="text-xs font-bold text-slate-200">Backup Completo dos Dados</h4>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Os dados pertencem exclusivamente a você. Guarde cópias de segurança em JSON.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => exportDatabaseJSON(databaseState)}
            className="p-2.5 rounded-2xl bg-brand-950 hover:bg-brand-900/70 text-brand-300 font-semibold text-xs border border-brand-700/40 flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Download size={14} />
            <span>Exportar Backup</span>
          </button>

          <label className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1.5 cursor-pointer">
            <Upload size={14} />
            <span>Restaurar Backup</span>
            <input
              type="file"
              accept=".json,application/json,text/plain,*/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* DADOS DE DEMONSTRAÇÃO E RESET */}
      <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-xs space-y-2.5">
        <h4 className="text-xs font-bold text-slate-200">Gerenciamento de Dados</h4>

        <div className="space-y-2">
          {hasDemoData ? (
            <button
              onClick={onClearDemoData}
              className="w-full py-2 px-3 rounded-xl bg-amber-950/60 hover:bg-amber-950 text-amber-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Trash2 size={13} />
              <span>Excluir Dados de Demonstração (Limpar tudo)</span>
            </button>
          ) : (
            <button
              onClick={onLoadDemoData}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Sparkles size={13} className="text-amber-500" />
              <span>Carregar Dados de Demonstração (Para testes)</span>
            </button>
          )}

          {confirmingReset ? (
            <div className="p-3 rounded-2xl bg-red-950/60 border border-red-800/70 space-y-2.5">
              <p className="text-xs font-semibold text-red-200 text-center">
                Apagar todos os lançamentos, metas e configurações? Esta ação não pode ser desfeita.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingReset(false);
                    onResetAllData();
                  }}
                  className="py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                >
                  Sim, apagar tudo
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="w-full py-2 px-3 rounded-xl text-red-400 hover:bg-red-950/40 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <RotateCcw size={13} />
              <span>Restaurar configurações de fábrica</span>
            </button>
          )}
        </div>
      </div>

      {/* SOBRE */}
      <div className="text-center py-4 text-xs text-slate-400 space-y-1">
        <span className="font-bold text-slate-300">Nexo Financeiro • Versão 2.5 (APK Mobile)</span>
        <p className="text-[11px]">
          Feito com Responsabilidade para organizar a vida financeira.
        </p>
      </div>

      {/* MODAL CONFIGURAR PIN */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
          <div className="w-full max-w-xs bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-800 text-center">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-3">
              <Lock size={20} />
            </div>
            <h4 className="text-sm font-bold text-slate-100 mb-1">Definir PIN de 4 dígitos</h4>
            <p className="text-xs text-slate-400 mb-4">
              Digite um código numérico de 4 dígitos para proteger o acesso.
            </p>

            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="••••"
              autoFocus
              className="w-32 py-2 text-2xl font-bold tracking-widest text-center rounded-xl bg-slate-800 text-slate-100 outline-none mb-4 mx-auto block"
            />

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPinInput('');
                }}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSetPin}
                className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold"
              >
                Ativar PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
