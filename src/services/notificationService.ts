import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';

export interface NotificationSettings {
  billReminders: boolean;
  daysBeforeDue: number;
  reminderTime: string; // HH:mm format
  budgetAlerts: boolean;
  goalProgress: boolean;
  weeklyReport: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  billReminders: true,
  daysBeforeDue: 3,
  reminderTime: '09:00',
  budgetAlerts: true,
  goalProgress: true,
  weeklyReport: false,
};

// Configurar como as notificações devem ser exibidas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export const NotificationService = {
  // Solicitar permissões
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });

      await Notifications.setNotificationChannelAsync('bills', {
        name: 'Contas a Pagar',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
      });

      await Notifications.setNotificationChannelAsync('budget', {
        name: 'Alertas de Orçamento',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#F59E0B',
      });

      await Notifications.setNotificationChannelAsync('goals', {
        name: 'Progresso de Metas',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#22C55E',
      });
    }

    return true;
  },

  // Obter configurações de notificação
  async getSettings(): Promise<NotificationSettings> {
    try {
      const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (settings) {
        return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(settings) };
      }
      return DEFAULT_NOTIFICATION_SETTINGS;
    } catch {
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  },

  // Salvar configurações de notificação
  async saveSettings(settings: NotificationSettings): Promise<void> {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  },

  // Agendar notificação de conta a pagar
  async scheduleBillReminder(
    billId: string,
    billName: string,
    amount: number,
    dueDate: Date,
    daysBefore: number = 3
  ): Promise<string | null> {
    try {
      const settings = await this.getSettings();
      if (!settings.billReminders) return null;

      // Cancelar notificação anterior para esta conta
      await this.cancelBillReminder(billId);

      // Calcular data/hora da notificação
      const [hours, minutes] = settings.reminderTime.split(':').map(Number);
      const notificationDate = new Date(dueDate);
      notificationDate.setDate(notificationDate.getDate() - daysBefore);
      notificationDate.setHours(hours, minutes, 0, 0);

      // Só agendar se for no futuro
      if (notificationDate <= new Date()) {
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💳 Conta a Vencer',
          body: `${billName} vence em ${daysBefore} dias - R$ ${amount.toFixed(2)}`,
          data: { type: 'bill', billId },
          categoryIdentifier: 'bill_reminder',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notificationDate,
          channelId: 'bills',
        },
        identifier: `bill_${billId}`,
      });

      return identifier;
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
      return null;
    }
  },

  // Cancelar notificação de conta
  async cancelBillReminder(billId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(`bill_${billId}`);
  },

  // Notificação instantânea de alerta de orçamento
  async sendBudgetAlert(
    categoryName: string,
    percentUsed: number,
    limit: number,
    spent: number
  ): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.budgetAlerts) return;

    let title = '';
    let body = '';

    if (percentUsed >= 100) {
      title = '🚨 Limite Excedido!';
      body = `Você ultrapassou o limite de ${categoryName}: R$ ${spent.toFixed(2)} / R$ ${limit.toFixed(2)}`;
    } else if (percentUsed >= 90) {
      title = '⚠️ Quase no Limite';
      body = `${categoryName} está em ${percentUsed.toFixed(0)}% do limite: R$ ${spent.toFixed(2)} / R$ ${limit.toFixed(2)}`;
    } else if (percentUsed >= 75) {
      title = '📊 Atenção com Gastos';
      body = `${categoryName} já usou ${percentUsed.toFixed(0)}% do limite mensal`;
    }

    if (title) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'budget', category: categoryName },
        },
        trigger: null, // Envia imediatamente
      });
    }
  },

  // Notificação de progresso de meta
  async sendGoalProgress(
    goalName: string,
    currentAmount: number,
    targetAmount: number
  ): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.goalProgress) return;

    const progress = (currentAmount / targetAmount) * 100;

    let title = '';
    let body = '';

    if (progress >= 100) {
      title = '🎉 Meta Alcançada!';
      body = `Parabéns! Você completou a meta "${goalName}"!`;
    } else if (progress >= 75) {
      title = '🚀 Quase Lá!';
      body = `Você está em ${progress.toFixed(0)}% da meta "${goalName}"`;
    } else if (progress >= 50) {
      title = '💪 Metade do Caminho!';
      body = `"${goalName}" já está em 50%! Continue assim!`;
    }

    if (title) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'goal', goalName },
        },
        trigger: null,
      });
    }
  },

  // Agendar notificação diária de vencimentos
  async scheduleDailyBillCheck(): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.billReminders) return;

    // Cancelar verificação anterior
    await Notifications.cancelScheduledNotificationAsync('daily_bill_check');

    const [hours, minutes] = settings.reminderTime.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Verificação Diária',
        body: 'Verifique suas contas e dívidas de hoje',
        data: { type: 'daily_check' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
      identifier: 'daily_bill_check',
    });
  },

  // Agendar relatório semanal
  async scheduleWeeklyReport(): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.weeklyReport) {
      await Notifications.cancelScheduledNotificationAsync('weekly_report');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Relatório Semanal',
        body: 'Confira seu resumo financeiro da semana',
        data: { type: 'weekly_report' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Segunda-feira
        hour: 10,
        minute: 0,
      },
      identifier: 'weekly_report',
    });
  },

  // Listar todas notificações agendadas
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  },

  // Cancelar todas as notificações
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  // Obter badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  },

  // Resetar badge count
  async resetBadgeCount(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  },
};
