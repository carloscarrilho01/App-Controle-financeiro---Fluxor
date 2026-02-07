import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as ExpoNotifications from 'expo-notifications';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Notification, NotificationSettings, Bill, MonthlyBudget } from '../types';
import { parseISO, differenceInDays, addDays, setHours, setMinutes } from 'date-fns';

// Configurar como as notificações devem ser exibidas
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: ExpoNotifications.AndroidNotificationPriority.HIGH,
  }),
});

// Hook de notificações com expo-notifications
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    push_enabled: true,
    bill_reminders: true,
    budget_alerts: true,
    goal_alerts: true,
    recurring_alerts: true,
    reminder_days_before: 3,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const notificationListener = useRef<ExpoNotifications.EventSubscription>();
  const responseListener = useRef<ExpoNotifications.EventSubscription>();

  // Solicitar permissões de notificação
  const requestPermissions = async () => {
    try {
      const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await ExpoNotifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        setHasPermission(true);

        // Configurar canais para Android
        if (Platform.OS === 'android') {
          await ExpoNotifications.setNotificationChannelAsync('bills', {
            name: 'Contas a Pagar',
            importance: ExpoNotifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#EF4444',
          });

          await ExpoNotifications.setNotificationChannelAsync('budget', {
            name: 'Alertas de Orcamento',
            importance: ExpoNotifications.AndroidImportance.DEFAULT,
            lightColor: '#F59E0B',
          });

          await ExpoNotifications.setNotificationChannelAsync('goals', {
            name: 'Progresso de Metas',
            importance: ExpoNotifications.AndroidImportance.DEFAULT,
            lightColor: '#22C55E',
          });
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      return false;
    }
  };

  // Inicializar listeners
  useEffect(() => {
    requestPermissions();

    // Listener para notificações recebidas (app em foreground)
    notificationListener.current = ExpoNotifications.addNotificationReceivedListener(notification => {
      console.log('Notificacao recebida:', notification);
    });

    // Listener para interação com notificações
    responseListener.current = ExpoNotifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Interacao com notificacao:', data);
    });

    return () => {
      if (notificationListener.current) {
        ExpoNotifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        ExpoNotifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Buscar notificações do banco
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedNotifications = (data || []).map((n: any) => ({
        ...n,
        read: n.is_read === true || n.is_read === 'true',
      }));

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter((n: any) => !n.read).length);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
      // Em caso de erro (ex: tabela não existe), retornar array vazio
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Criar notificação no banco
  const createNotification = async (
    notification: Omit<Notification, 'id' | 'user_id' | 'created_at' | 'read'>
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          user_id: user.id,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      const newNotification = { ...data, read: false };
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Mostrar alerta local (substitui notificação push no Expo Go)
      if (notificationSettings.push_enabled) {
        Alert.alert(notification.title, notification.message);
      }

      return newNotification;
    } catch (err) {
      console.error('Erro ao criar notificação:', err);
    }
  };

  // Marcar como lida
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  // Excluir notificação
  const deleteNotification = async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Erro ao excluir notificação:', err);
    }
  };

  // Atualizar configurações
  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setNotificationSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Verificar e criar lembretes de contas
  const checkBillReminders = async (bills: Bill[]) => {
    if (!notificationSettings.bill_reminders) return;

    const today = new Date();

    for (const bill of bills) {
      if (bill.is_paid) continue;

      const dueDate = parseISO(bill.due_date);
      const daysUntilDue = differenceInDays(dueDate, today);

      if (daysUntilDue === notificationSettings.reminder_days_before) {
        let message = '';
        if (daysUntilDue === 0) {
          message = `A conta "${bill.name}" vence hoje!`;
        } else if (daysUntilDue === 1) {
          message = `A conta "${bill.name}" vence amanhã!`;
        } else {
          message = `A conta "${bill.name}" vence em ${daysUntilDue} dias.`;
        }

        await createNotification({
          type: 'bill_due',
          title: 'Lembrete de Conta',
          message,
        });
      }
    }
  };

  // Verificar alertas de orçamento
  const checkBudgetAlerts = async (
    budgets: MonthlyBudget[],
    categorySpending: Record<string, number>
  ) => {
    if (!notificationSettings.budget_alerts) return;

    for (const budget of budgets) {
      const spent = categorySpending[budget.category_id] || 0;
      const percentage = (spent / budget.amount) * 100;

      if (percentage >= 80 && percentage < 100) {
        await createNotification({
          type: 'budget_alert',
          title: 'Alerta de Orçamento',
          message: `Você já usou ${percentage.toFixed(0)}% do orçamento desta categoria.`,
        });
      } else if (percentage >= 100) {
        await createNotification({
          type: 'budget_alert',
          title: 'Orçamento Excedido',
          message: `Você excedeu o orçamento desta categoria em ${(percentage - 100).toFixed(0)}%!`,
        });
      }
    }
  };

  // Agendar notificação push para conta
  const schedulePushNotification = async (
    billId: string,
    billName: string,
    amount: number,
    dueDate: Date,
    daysBefore: number = 3
  ): Promise<string | null> => {
    if (!hasPermission || !notificationSettings.push_enabled || !notificationSettings.bill_reminders) {
      return null;
    }

    try {
      // Cancelar notificação anterior
      await ExpoNotifications.cancelScheduledNotificationAsync(`bill_${billId}`);

      // Calcular data da notificação
      const notificationDate = addDays(dueDate, -daysBefore);
      const scheduledDate = setMinutes(setHours(notificationDate, 9), 0);

      // Só agendar se for no futuro
      if (scheduledDate <= new Date()) {
        return null;
      }

      const identifier = await ExpoNotifications.scheduleNotificationAsync({
        content: {
          title: 'Conta a Vencer',
          body: `${billName} vence em ${daysBefore} dias - R$ ${amount.toFixed(2)}`,
          data: { type: 'bill', billId },
        },
        trigger: {
          type: ExpoNotifications.SchedulableTriggerInputTypes.DATE,
          date: scheduledDate,
          channelId: 'bills',
        },
        identifier: `bill_${billId}`,
      });

      return identifier;
    } catch (error) {
      console.error('Erro ao agendar notificacao push:', error);
      return null;
    }
  };

  // Cancelar notificação push
  const cancelPushNotification = async (billId: string) => {
    try {
      await ExpoNotifications.cancelScheduledNotificationAsync(`bill_${billId}`);
    } catch (error) {
      console.error('Erro ao cancelar notificacao:', error);
    }
  };

  // Enviar notificação push instantânea
  const sendInstantPush = async (title: string, body: string, data?: any) => {
    if (!hasPermission || !notificationSettings.push_enabled) return;

    try {
      await ExpoNotifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Envia imediatamente
      });
    } catch (error) {
      console.error('Erro ao enviar notificacao:', error);
    }
  };

  // Alerta de orçamento push
  const sendBudgetPushAlert = async (
    categoryName: string,
    percentUsed: number,
    limit: number,
    spent: number
  ) => {
    if (!notificationSettings.budget_alerts) return;

    let title = '';
    let body = '';

    if (percentUsed >= 100) {
      title = 'Limite Excedido!';
      body = `Você ultrapassou o limite de ${categoryName}: R$ ${spent.toFixed(2)} / R$ ${limit.toFixed(2)}`;
    } else if (percentUsed >= 90) {
      title = 'Quase no Limite';
      body = `${categoryName} está em ${percentUsed.toFixed(0)}% do limite`;
    } else if (percentUsed >= 75) {
      title = 'Atenção com Gastos';
      body = `${categoryName} já usou ${percentUsed.toFixed(0)}% do limite mensal`;
    }

    if (title) {
      await sendInstantPush(title, body, { type: 'budget', category: categoryName });
    }
  };

  // Progresso de meta push
  const sendGoalProgressPush = async (
    goalName: string,
    currentAmount: number,
    targetAmount: number
  ) => {
    if (!notificationSettings.goal_alerts) return;

    const progress = (currentAmount / targetAmount) * 100;

    let title = '';
    let body = '';

    if (progress >= 100) {
      title = 'Meta Alcançada!';
      body = `Parabéns! Você completou a meta "${goalName}"!`;
    } else if (progress >= 75) {
      title = 'Quase Lá!';
      body = `Você está em ${progress.toFixed(0)}% da meta "${goalName}"`;
    } else if (progress >= 50) {
      title = 'Metade do Caminho!';
      body = `"${goalName}" já está em 50%! Continue assim!`;
    }

    if (title) {
      await sendInstantPush(title, body, { type: 'goal', goalName });
    }
  };

  // Listar notificações agendadas
  const getScheduledPushNotifications = async () => {
    return await ExpoNotifications.getAllScheduledNotificationsAsync();
  };

  // Cancelar todas notificações push
  const cancelAllPushNotifications = async () => {
    await ExpoNotifications.cancelAllScheduledNotificationsAsync();
  };

  // Refresh
  const refresh = () => {
    fetchNotifications();
  };

  return {
    notifications,
    notificationSettings,
    unreadCount,
    loading,
    hasPermission,
    refresh,
    requestPermissions,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateSettings,
    checkBillReminders,
    checkBudgetAlerts,
    // Push notifications
    schedulePushNotification,
    cancelPushNotification,
    sendInstantPush,
    sendBudgetPushAlert,
    sendGoalProgressPush,
    getScheduledPushNotifications,
    cancelAllPushNotifications,
  };
}
