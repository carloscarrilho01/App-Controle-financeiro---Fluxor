import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Button } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useGoals } from '../hooks/useGoals';
import { useNotifications } from '../hooks/useNotifications';
import { exportToCSV, exportSummaryToCSV, exportBackup } from '../utils/exportData';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

export function SettingsScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { colors, theme, setTheme, isDark, toggleTheme } = useTheme();
  const { settings, updateSettings, biometricAvailable } = useSettings();
  const { transactions } = useTransactions();
  const { accounts, getTotalBalance } = useAccounts();
  const { categories } = useCategories();
  const { goals } = useGoals();
  const { unreadCount } = useNotifications();
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const startDate = startOfMonth(subMonths(new Date(), 2));
      const endDate = endOfMonth(new Date());
      await exportToCSV({ transactions, accounts, categories }, startDate, endDate);
      Alert.alert('Sucesso', 'Dados exportados com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível exportar os dados');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSummary = async () => {
    try {
      setExporting(true);
      await exportSummaryToCSV({ transactions, accounts, categories }, new Date());
      Alert.alert('Sucesso', 'Resumo exportado com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível exportar o resumo');
    } finally {
      setExporting(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setExporting(true);
      await exportBackup({ transactions, accounts, categories });
      Alert.alert('Sucesso', 'Backup criado com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar o backup');
    } finally {
      setExporting(false);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    try {
      await updateSettings({ biometricEnabled: value });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível alterar a configuração');
    }
  };

  const handleToggleHideBalances = async (value: boolean) => {
    try {
      await updateSettings({ hideBalances: value });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível alterar a configuração');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const styles = createStyles(colors);

  const MenuItem = ({
    icon,
    title,
    description,
    onPress,
    showArrow = true,
    rightComponent,
    badge,
  }: {
    icon: string;
    title: string;
    description?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightComponent?: React.ReactNode;
    badge?: number;
  }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={!onPress && !rightComponent}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: colors.primaryLight + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={colors.primary} />
      </View>
      <View style={styles.menuInfo}>
        <View style={styles.menuTitleRow}>
          <Text style={[styles.menuText, { color: colors.text }]}>{title}</Text>
          {badge !== undefined && badge > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {description && (
          <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      {rightComponent || (showArrow && onPress && (
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
      ))}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Card */}
      <Card style={styles.profileCard}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {(user?.user_metadata?.name || user?.email || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>
          {user?.user_metadata?.name || 'Usuário'}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          {user?.email}
        </Text>
      </Card>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Acesso Rápido
      </Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('Search')}
        >
          <MaterialCommunityIcons name="magnify" size={28} color={colors.primary} />
          <Text style={[styles.quickActionText, { color: colors.text }]}>Buscar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('Reports')}
        >
          <MaterialCommunityIcons name="chart-bar" size={28} color={colors.primary} />
          <Text style={[styles.quickActionText, { color: colors.text }]}>Relatórios</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('Budgets')}
        >
          <MaterialCommunityIcons name="calculator" size={28} color={colors.primary} />
          <Text style={[styles.quickActionText, { color: colors.text }]}>Orçamentos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('Notifications')}
        >
          <MaterialCommunityIcons name="bell" size={28} color={colors.primary} />
          <Text style={[styles.quickActionText, { color: colors.text }]}>Notificações</Text>
          {unreadCount > 0 && (
            <View style={[styles.quickActionBadge, { backgroundColor: colors.danger }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Finanças */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Finanças
      </Text>
      <Card style={styles.menuCard}>
        <MenuItem
          icon="bank"
          title="Minhas Contas"
          description={`${accounts.length} contas cadastradas`}
          onPress={() => navigation.navigate('Accounts')}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <MenuItem
          icon="credit-card"
          title="Cartões de Crédito"
          description="Faturas e parcelamentos"
          onPress={() => navigation.navigate('CreditCards')}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <MenuItem
          icon="repeat"
          title="Transações Recorrentes"
          description="Receitas e despesas fixas"
          onPress={() => navigation.navigate('RecurringTransactions')}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <MenuItem
          icon="file-document-outline"
          title="Contas a Pagar"
          description="Gerenciar contas e lembretes"
          onPress={() => navigation.navigate('Bills')}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <MenuItem
          icon="chart-line"
          title="Investimentos"
          description="Acompanhe sua carteira"
          onPress={() => navigation.navigate('Investments')}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <MenuItem
          icon="credit-card-off"
          title="Dívidas"
          description="Gerencie seus débitos"
          onPress={() => navigation.navigate('Debts')}
        />
      </Card>

      {/* Aparência e Segurança */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Aparência e Segurança
      </Text>
      <Card style={styles.menuCard}>
        <MenuItem
          icon={isDark ? 'weather-night' : 'weather-sunny'}
          title="Tema Escuro"
          description={isDark ? 'Ativado' : 'Desativado'}
          showArrow={false}
          rightComponent={
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isDark ? colors.primary : colors.textSecondary}
            />
          }
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <MenuItem
          icon="eye-off"
          title="Ocultar Saldos"
          description="Esconder valores na tela inicial"
          showArrow={false}
          rightComponent={
            <Switch
              value={settings.hideBalances}
              onValueChange={handleToggleHideBalances}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={settings.hideBalances ? colors.primary : colors.textSecondary}
            />
          }
        />

        {biometricAvailable && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="fingerprint"
              title="Biometria"
              description="Proteger acesso ao app"
              showArrow={false}
              rightComponent={
                <Switch
                  value={settings.biometricEnabled}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={settings.biometricEnabled ? colors.primary : colors.textSecondary}
                />
              }
            />
          </>
        )}
      </Card>

      {/* Dados */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Gerenciar Dados
      </Text>
      <Card style={styles.menuCard}>
        <MenuItem
          icon="tag-multiple"
          title="Categorias"
          description="Gerenciar categorias"
          onPress={() => navigation.navigate('Categories')}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <MenuItem
          icon="file-export"
          title="Exportar Transações"
          description="Últimos 3 meses em CSV"
          onPress={handleExportCSV}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <MenuItem
          icon="file-chart"
          title="Exportar Resumo"
          description="Resumo por categoria"
          onPress={handleExportSummary}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <MenuItem
          icon="cloud-upload"
          title="Backup Completo"
          description="Exportar todos os dados"
          onPress={handleExportBackup}
        />
      </Card>

      {/* Estatísticas */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Estatísticas
      </Text>
      <Card>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {transactions.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Transações
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {accounts.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Contas
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {categories.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Categorias
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {goals.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Metas
            </Text>
          </View>
        </View>
      </Card>

      {/* Sobre */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Sobre
      </Text>
      <Card style={styles.menuCard}>
        <MenuItem
          icon="information"
          title="Controle Financeiro"
          description="Versão 2.0.0"
          showArrow={false}
        />
      </Card>

      {/* Sign Out */}
      <Button
        title="Sair da Conta"
        onPress={handleSignOut}
        variant="danger"
        style={styles.signOutButton}
      />

      <Text style={[styles.footer, { color: colors.textTertiary }]}>
        Desenvolvido com React Native + Expo
      </Text>
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
    profileCard: {
      alignItems: 'center',
      marginBottom: 24,
    },
    avatarContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatarText: {
      fontSize: 32,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    userName: {
      fontSize: 20,
      fontWeight: '600',
    },
    userEmail: {
      fontSize: 14,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
      marginTop: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    quickAction: {
      width: '47%',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      position: 'relative',
    },
    quickActionText: {
      fontSize: 14,
      fontWeight: '500',
      marginTop: 8,
    },
    quickActionBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    menuCard: {
      padding: 0,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    menuIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    menuInfo: {
      flex: 1,
    },
    menuTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    menuText: {
      fontSize: 16,
      fontWeight: '500',
    },
    menuDescription: {
      fontSize: 13,
      marginTop: 2,
    },
    badge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 5,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    divider: {
      height: 1,
      marginLeft: 68,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 8,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
    },
    statLabel: {
      fontSize: 12,
      marginTop: 4,
    },
    signOutButton: {
      marginTop: 24,
    },
    footer: {
      textAlign: 'center',
      fontSize: 12,
      marginTop: 24,
    },
  });
