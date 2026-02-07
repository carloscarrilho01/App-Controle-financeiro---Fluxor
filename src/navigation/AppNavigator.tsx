import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { OnboardingTutorial } from '../components';
import { wp, hp, fs, spacing, borderRadius, iconSize } from '../utils/responsive';
import {
  LoginScreen,
  RegisterScreen,
  DashboardScreen,
  TransactionsScreen,
  AddTransactionScreen,
  AccountsScreen,
  AddAccountScreen,
  GoalsScreen,
  AddGoalScreen,
  BillsScreen,
  AddBillScreen,
  SettingsScreen,
  AIAssistantScreen,
  RecurringTransactionsScreen,
  AddRecurringTransactionScreen,
  InvestmentsScreen,
  AddInvestmentScreen,
  DebtsScreen,
  AddDebtScreen,
  ReportsScreen,
  SearchScreen,
  CreditCardsScreen,
  BudgetsScreen,
  NotificationsScreen,
  CategoriesScreen,
  CommitmentsScreen,
  TemplatesScreen,
  AchievementsScreen,
  BackupScreen,
  ImportScreen,
  CreditCardDetailScreen,
  AddCreditCardPurchaseScreen,
} from '../screens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Icon Component
function TabIcon({ name, focused, colors }: { name: string; focused: boolean; colors: any }) {
  return (
    <View style={[styles.tabIcon, focused && { backgroundColor: colors.primaryLight + '20' }]}>
      <MaterialCommunityIcons
        name={name as any}
        size={iconSize.sm}
        color={focused ? colors.primary : colors.textSecondary}
      />
    </View>
  );
}

// Main Tab Navigator
function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Altura da tab bar considerando a safe area do Android
  const tabBarHeight = hp(60) + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.text,
          fontSize: fs(18),
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: tabBarHeight,
          paddingBottom: insets.bottom + hp(8),
          paddingTop: hp(8),
          // Sombra para destacar a tab bar
          ...Platform.select({
            android: {
              elevation: 8,
            },
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
          }),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: fs(11),
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} colors={colors} />,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          title: 'Transações',
          tabBarIcon: ({ focused }) => <TabIcon name="swap-horizontal" focused={focused} colors={colors} />,
        }}
      />
      <Tab.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{
          title: 'IA',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name="robot" focused={focused} colors={colors} />,
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          title: 'Metas',
          tabBarIcon: ({ focused }) => <TabIcon name="target" focused={focused} colors={colors} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Mais',
          tabBarIcon: ({ focused }) => <TabIcon name="menu" focused={focused} colors={colors} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Auth Stack
function AuthStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// App Stack (authenticated)
function AppStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.text,
          fontSize: fs(18),
        },
        headerTintColor: colors.primary,
        headerBackTitle: 'Voltar',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />

      {/* Transaction Screens */}
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ title: 'Nova Transação' }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={AddTransactionScreen}
        options={{ title: 'Editar Transação' }}
      />

      {/* Account Screens */}
      <Stack.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{ title: 'Minhas Contas' }}
      />
      <Stack.Screen
        name="AddAccount"
        component={AddAccountScreen}
        options={({ route }: any) => ({
          title: route.params?.account ? 'Editar Conta' : 'Nova Conta',
        })}
      />
      <Stack.Screen
        name="AccountDetail"
        component={AddAccountScreen}
        options={{ title: 'Detalhes da Conta' }}
      />

      {/* Goal Screens */}
      <Stack.Screen
        name="AddGoal"
        component={AddGoalScreen}
        options={({ route }: any) => ({
          title: route.params?.goal ? 'Editar Meta' : 'Nova Meta',
        })}
      />

      {/* Commitments - Unified Screen */}
      <Stack.Screen
        name="Commitments"
        component={CommitmentsScreen}
        options={{ title: 'Compromissos' }}
      />

      {/* Bill Screens */}
      <Stack.Screen
        name="Bills"
        component={BillsScreen}
        options={{ title: 'Contas a Pagar' }}
      />
      <Stack.Screen
        name="AddBill"
        component={AddBillScreen}
        options={({ route }: any) => ({
          title: route.params?.bill ? 'Editar Conta' : 'Nova Conta a Pagar',
        })}
      />

      {/* Recurring Transactions */}
      <Stack.Screen
        name="RecurringTransactions"
        component={RecurringTransactionsScreen}
        options={{ title: 'Transações Recorrentes' }}
      />
      <Stack.Screen
        name="AddRecurringTransaction"
        component={AddRecurringTransactionScreen}
        options={({ route }: any) => ({
          title: route.params?.transaction ? 'Editar Recorrente' : 'Nova Recorrente',
        })}
      />

      {/* Investments */}
      <Stack.Screen
        name="Investments"
        component={InvestmentsScreen}
        options={{ title: 'Investimentos' }}
      />
      <Stack.Screen
        name="AddInvestment"
        component={AddInvestmentScreen}
        options={({ route }: any) => ({
          title: route.params?.investment ? 'Editar Investimento' : 'Novo Investimento',
        })}
      />
      <Stack.Screen
        name="InvestmentDetail"
        component={AddInvestmentScreen}
        options={{ title: 'Detalhes do Investimento' }}
      />

      {/* Debts */}
      <Stack.Screen
        name="Debts"
        component={DebtsScreen}
        options={{ title: 'Dívidas' }}
      />
      <Stack.Screen
        name="AddDebt"
        component={AddDebtScreen}
        options={({ route }: any) => ({
          title: route.params?.debt ? 'Editar Dívida' : 'Nova Dívida',
        })}
      />
      <Stack.Screen
        name="DebtDetail"
        component={AddDebtScreen}
        options={{ title: 'Detalhes da Dívida' }}
      />
      <Stack.Screen
        name="AddDebtPayment"
        component={AddTransactionScreen}
        options={{ title: 'Registrar Pagamento' }}
      />

      {/* Credit Cards */}
      <Stack.Screen
        name="CreditCards"
        component={CreditCardsScreen}
        options={{ title: 'Cartões de Crédito' }}
      />
      <Stack.Screen
        name="CreditCardDetail"
        component={CreditCardDetailScreen}
        options={({ route }: any) => ({
          title: route.params?.account?.name || 'Detalhes do Cartão',
          headerShown: false,
        })}
      />
      <Stack.Screen
        name="AddCreditCardPurchase"
        component={AddCreditCardPurchaseScreen}
        options={{ title: 'Nova Compra' }}
      />

      {/* Reports & Analytics */}
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Relatórios' }}
      />
      <Stack.Screen
        name="MonthDetail"
        component={ReportsScreen}
        options={{ title: 'Detalhe do Mês' }}
      />

      {/* Search */}
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Buscar' }}
      />

      {/* Budgets */}
      <Stack.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{ title: 'Orçamentos' }}
      />

      {/* Notifications */}
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notificações' }}
      />

      {/* Categories */}
      <Stack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ title: 'Categorias' }}
      />

      {/* Templates */}
      <Stack.Screen
        name="Templates"
        component={TemplatesScreen}
        options={{ title: 'Templates' }}
      />

      {/* Achievements */}
      <Stack.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{ title: 'Conquistas' }}
      />

      {/* Backup */}
      <Stack.Screen
        name="Backup"
        component={BackupScreen}
        options={{ title: 'Backup e Exportação' }}
      />

      {/* Import */}
      <Stack.Screen
        name="Import"
        component={ImportScreen}
        options={{ title: 'Importar Extrato' }}
      />
    </Stack.Navigator>
  );
}

// Biometric Lock Screen
function BiometricLockScreen({ onAuthenticate }: { onAuthenticate: () => void }) {
  const { colors } = useTheme();
  const { authenticateWithBiometric } = useSettings();
  const insets = useSafeAreaInsets();

  const handleAuthenticate = async () => {
    const success = await authenticateWithBiometric();
    if (success) {
      onAuthenticate();
    }
  };

  React.useEffect(() => {
    handleAuthenticate();
  }, []);

  return (
    <View style={[
      styles.lockContainer,
      {
        backgroundColor: colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }
    ]}>
      <MaterialCommunityIcons name="lock" size={iconSize.xxl * 1.5} color={colors.primary} />
      <Text style={[styles.lockTitle, { color: colors.text }]}>App Bloqueado</Text>
      <Text style={[styles.lockSubtitle, { color: colors.textSecondary }]}>
        Use a biometria para desbloquear
      </Text>
      <View style={styles.lockButton}>
        <MaterialCommunityIcons
          name="fingerprint"
          size={iconSize.xxl}
          color={colors.primary}
          onPress={handleAuthenticate}
        />
      </View>
    </View>
  );
}

// Loading Screen
function LoadingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.loadingContainer,
      {
        backgroundColor: colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }
    ]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando...</Text>
    </View>
  );
}

// Main Navigator
export function AppNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { settings, isAuthenticated, setAuthenticated, hasCompletedOnboarding, completeOnboarding } = useSettings();

  if (authLoading) {
    return <LoadingScreen />;
  }

  // Mostrar tutorial de onboarding para novos usuários autenticados
  if (user && !hasCompletedOnboarding) {
    return <OnboardingTutorial onComplete={completeOnboarding} />;
  }

  // Show biometric lock if enabled and not authenticated
  if (user && settings.biometricEnabled && !isAuthenticated) {
    return <BiometricLockScreen onAuthenticate={() => setAuthenticated(true)} />;
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: wp(32),
    height: wp(32),
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fs(16),
  },
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  lockTitle: {
    fontSize: fs(24),
    fontWeight: '700',
    marginTop: spacing.xxl,
  },
  lockSubtitle: {
    fontSize: fs(16),
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  lockButton: {
    marginTop: hp(48),
    padding: spacing.lg,
  },
});
