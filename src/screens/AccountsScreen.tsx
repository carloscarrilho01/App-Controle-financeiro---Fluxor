import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Card, Button } from '../components';
import { useAccounts } from '../hooks/useAccounts';
import { Account, ACCOUNT_TYPES, COLORS } from '../types';
import { formatCurrency } from '../utils/formatters';

export function AccountsScreen({ navigation }: any) {
  const { accounts, loading, fetchAccounts, deleteAccount, getTotalBalance } = useAccounts();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAccounts();
    setRefreshing(false);
  };

  const handleDelete = (account: Account) => {
    Alert.alert(
      'Excluir Conta',
      `Tem certeza que deseja excluir "${account.name}"? Todas as transações associadas também serão excluídas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount(account.id);
            if (error) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
  };

  const renderAccount = ({ item }: { item: Account }) => {
    const accountType = ACCOUNT_TYPES[item.type];
    const isNegative = item.balance < 0 || item.type === 'credit_card';

    return (
      <TouchableOpacity
        style={[styles.accountCard, { borderLeftColor: item.color }]}
        onPress={() => navigation.navigate('AddAccount', { account: item })}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.accountHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
            <Text style={styles.accountIcon}>{item.icon || accountType.icon}</Text>
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{item.name}</Text>
            <Text style={styles.accountType}>{accountType.label}</Text>
          </View>
        </View>
        <Text
          style={[
            styles.accountBalance,
            { color: isNegative ? COLORS.expense : COLORS.text },
          ]}
        >
          {formatCurrency(item.balance)}
        </Text>
      </TouchableOpacity>
    );
  };

  const totalBalance = getTotalBalance();

  return (
    <View style={styles.container}>
      {/* Total Balance Card */}
      <Card style={styles.totalCard}>
        <Text style={styles.totalLabel}>Patrimônio Total</Text>
        <Text
          style={[
            styles.totalValue,
            { color: totalBalance >= 0 ? COLORS.income : COLORS.expense },
          ]}
        >
          {formatCurrency(totalBalance)}
        </Text>
        <Text style={styles.accountsCount}>
          {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}
        </Text>
      </Card>

      {/* Accounts List */}
      <FlatList
        data={accounts}
        keyExtractor={item => item.id}
        renderItem={renderAccount}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyText}>Nenhuma conta cadastrada</Text>
            <Text style={styles.emptySubtext}>
              Adicione sua primeira conta para começar
            </Text>
          </Card>
        }
        ListFooterComponent={
          <Text style={styles.hint}>
            Pressione e segure para excluir uma conta
          </Text>
        }
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddAccount')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  totalCard: {
    margin: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  accountsCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  accountCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountIcon: {
    fontSize: 24,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  accountType: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  accountBalance: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
    paddingTop: 20,
  },
  emptySubtext: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    paddingBottom: 20,
    marginTop: 4,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    lineHeight: 34,
  },
});
