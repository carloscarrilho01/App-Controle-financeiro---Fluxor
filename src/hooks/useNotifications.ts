import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Notification, NotificationSettings, Bill, MonthlyBudget } from '../types';
import { parseISO, differenceInDays } from 'date-fns';

// Hook de notificações sem expo-notifications (compatível com Expo Go)
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

  // Refresh
  const refresh = () => {
    fetchNotifications();
  };

  return {
    notifications,
    notificationSettings,
    unreadCount,
    loading,
    refresh,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateSettings,
    checkBillReminders,
    checkBudgetAlerts,
  };
}
