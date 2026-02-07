import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import { Card, Button } from '../components';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type NotificationType = 'bill_due' | 'budget_alert' | 'goal_reached' | 'recurring' | 'system';

export function NotificationsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const {
    notifications,
    notificationSettings,
    loading,
    hasPermission,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateSettings,
    refresh,
    requestPermissions,
    sendInstantPush,
    getScheduledPushNotifications,
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  // Carregar contagem de notificações agendadas
  React.useEffect(() => {
    const loadScheduled = async () => {
      const scheduled = await getScheduledPushNotifications();
      setScheduledCount(scheduled.length);
    };
    loadScheduled();
  }, [showSettings]);

  const handleTestNotification = async () => {
    await sendInstantPush(
      'Teste de Notificação',
      'Esta é uma notificação de teste do seu app financeiro!'
    );
    Alert.alert('Sucesso', 'Notificação de teste enviada!');
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermissions();
    if (granted) {
      Alert.alert('Sucesso', 'Permissões concedidas! Você receberá notificações.');
    } else {
      Alert.alert(
        'Permissão Negada',
        'Para receber notificações, habilite nas configurações do dispositivo.'
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'bill_due':
        return 'receipt';
      case 'budget_alert':
        return 'chart-pie';
      case 'goal_reached':
        return 'trophy';
      case 'recurring':
        return 'repeat';
      case 'system':
        return 'bell';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'bill_due':
        return colors.expense;
      case 'budget_alert':
        return colors.warning;
      case 'goal_reached':
        return colors.income;
      case 'recurring':
        return colors.primary;
      case 'system':
        return colors.textSecondary;
      default:
        return colors.primary;
    }
  };

  const handleDeleteNotification = (id: string) => {
    Alert.alert(
      'Excluir Notificação',
      'Deseja excluir esta notificação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteNotification(id),
        },
      ]
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const date = format(new Date(notification.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(notification);
    return acc;
  }, {} as Record<string, typeof notifications>);

  const styles = createStyles(colors);

  if (showSettings) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={styles.settingsHeader}>
          <TouchableOpacity onPress={() => setShowSettings(false)}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.settingsTitle, { color: colors.text }]}>
            Configurações de Notificação
          </Text>
        </View>

        <Card style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="bell" size={24} color={colors.primary} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Notificações Push
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Receber notificações no dispositivo
                </Text>
              </View>
            </View>
            <Switch
              value={notificationSettings?.push_enabled ?? true}
              onValueChange={(value) => updateSettings({ push_enabled: value })}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notificationSettings?.push_enabled ? colors.primary : colors.textSecondary}
            />
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tipos de Notificação</Text>

        <Card style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="receipt" size={24} color={colors.expense} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Contas a Pagar
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Lembrete de vencimentos
                </Text>
              </View>
            </View>
            <Switch
              value={notificationSettings?.bill_reminders ?? true}
              onValueChange={(value) => updateSettings({ bill_reminders: value })}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notificationSettings?.bill_reminders ? colors.primary : colors.textSecondary}
            />
          </View>

          <View style={[styles.settingItem, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="chart-pie" size={24} color={colors.warning} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Alertas de Orçamento
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Quando atingir limites
                </Text>
              </View>
            </View>
            <Switch
              value={notificationSettings?.budget_alerts ?? true}
              onValueChange={(value) => updateSettings({ budget_alerts: value })}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notificationSettings?.budget_alerts ? colors.primary : colors.textSecondary}
            />
          </View>

          <View style={[styles.settingItem, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="trophy" size={24} color={colors.income} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Metas Atingidas
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Celebrar conquistas
                </Text>
              </View>
            </View>
            <Switch
              value={notificationSettings?.goal_alerts ?? true}
              onValueChange={(value) => updateSettings({ goal_alerts: value })}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notificationSettings?.goal_alerts ? colors.primary : colors.textSecondary}
            />
          </View>

          <View style={[styles.settingItem, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="repeat" size={24} color={colors.primary} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Transações Recorrentes
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Lançamentos automáticos
                </Text>
              </View>
            </View>
            <Switch
              value={notificationSettings?.recurring_alerts ?? true}
              onValueChange={(value) => updateSettings({ recurring_alerts: value })}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notificationSettings?.recurring_alerts ? colors.primary : colors.textSecondary}
            />
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Antecedência do Lembrete</Text>

        <Card style={styles.settingsCard}>
          {[1, 2, 3, 5, 7].map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.reminderOption,
                days !== 1 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
              onPress={() => updateSettings({ reminder_days_before: days })}
            >
              <Text style={[styles.reminderText, { color: colors.text }]}>
                {days} {days === 1 ? 'dia' : 'dias'} antes
              </Text>
              {notificationSettings?.reminder_days_before === days && (
                <MaterialCommunityIcons name="check" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </Card>

        {/* Status de Permissões */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Status do Sistema</Text>

        <Card style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons
                name={hasPermission ? 'check-circle' : 'alert-circle'}
                size={24}
                color={hasPermission ? colors.income : colors.expense}
              />
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Permissões de Notificação
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {hasPermission ? 'Concedidas' : 'Não concedidas'}
                </Text>
              </View>
            </View>
            {!hasPermission && (
              <TouchableOpacity
                style={[styles.permissionButton, { backgroundColor: colors.primary }]}
                onPress={handleRequestPermission}
              >
                <Text style={styles.permissionButtonText}>Permitir</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.settingItem, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={colors.primary} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Notificações Agendadas
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {scheduledCount} {scheduledCount === 1 ? 'lembrete' : 'lembretes'} programados
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Botão de Teste */}
        {hasPermission && (
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: colors.primary }]}
            onPress={handleTestNotification}
          >
            <MaterialCommunityIcons name="bell-ring" size={20} color="#FFF" />
            <Text style={styles.testButtonText}>Testar Notificação</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Header Actions */}
      <View style={styles.headerActions}>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.headerButton} onPress={markAllAsRead}>
            <MaterialCommunityIcons name="check-all" size={20} color={colors.primary} />
            <Text style={[styles.headerButtonText, { color: colors.primary }]}>
              Marcar todas como lidas
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.card }]}
          onPress={() => setShowSettings(true)}
        >
          <MaterialCommunityIcons name="cog" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="bell-off" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhuma notificação
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Você receberá notificações sobre contas, metas e orçamentos aqui
          </Text>
        </Card>
      ) : (
        Object.entries(groupedNotifications).map(([date, dayNotifications]) => (
          <View key={date}>
            <Text style={[styles.dateHeader, { color: colors.textSecondary }]}>
              {format(new Date(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </Text>
            {dayNotifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                onPress={() => {
                  if (!notification.read) {
                    markAsRead(notification.id);
                  }
                  // Navigate based on notification type
                  if (notification.action_route) {
                    navigation.navigate(notification.action_route, notification.action_params);
                  }
                }}
                onLongPress={() => handleDeleteNotification(notification.id)}
              >
                <Card
                  style={[
                    styles.notificationCard,
                    !notification.read ? { borderLeftWidth: 3, borderLeftColor: colors.primary } : {},
                  ]}
                >
                  <View style={styles.notificationContent}>
                    <View
                      style={[
                        styles.notificationIcon,
                        { backgroundColor: getNotificationColor(notification.type as NotificationType) + '20' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={getNotificationIcon(notification.type as NotificationType) as any}
                        size={24}
                        color={getNotificationColor(notification.type as NotificationType)}
                      />
                    </View>
                    <View style={styles.notificationInfo}>
                      <Text
                        style={[
                          styles.notificationTitle,
                          { color: colors.text },
                          !notification.read ? { fontWeight: '700' as const } : {},
                        ]}
                      >
                        {notification.title}
                      </Text>
                      <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>
                        {notification.message}
                      </Text>
                      <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </Text>
                    </View>
                    {!notification.read && (
                      <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    headerActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyCard: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '500',
      marginTop: 12,
    },
    emptySubtext: {
      fontSize: 14,
      marginTop: 4,
      textAlign: 'center',
    },
    dateHeader: {
      fontSize: 13,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
      textTransform: 'capitalize',
    },
    notificationCard: {
      marginBottom: 8,
      padding: 12,
    },
    notificationContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    notificationIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notificationInfo: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: 15,
      fontWeight: '600',
    },
    notificationMessage: {
      fontSize: 14,
      marginTop: 2,
      lineHeight: 20,
    },
    notificationTime: {
      fontSize: 12,
      marginTop: 6,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 4,
    },
    settingsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 24,
    },
    settingsTitle: {
      fontSize: 20,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 24,
      marginBottom: 12,
    },
    settingsCard: {
      padding: 0,
      overflow: 'hidden',
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    settingTitle: {
      fontSize: 15,
      fontWeight: '500',
    },
    settingDescription: {
      fontSize: 13,
      marginTop: 2,
    },
    reminderOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    reminderText: {
      fontSize: 15,
    },
    permissionButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    permissionButtonText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '600',
    },
    testButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 16,
      borderRadius: 12,
      marginTop: 24,
    },
    testButtonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
