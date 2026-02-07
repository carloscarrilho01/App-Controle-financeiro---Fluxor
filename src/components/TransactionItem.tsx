import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Transaction, Category, Account, COLORS } from '../types';
import { formatCurrency, formatDateRelative, getIconName } from '../utils/formatters';
import { wp, hp, fs, borderRadius, spacing, iconSize } from '../utils/responsive';
import { SwipeableItem } from './SwipeableItem';

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  swipeable?: boolean;
}

export function TransactionItem({
  transaction,
  category,
  account,
  onPress,
  onEdit,
  onDelete,
  onDuplicate,
  swipeable = false,
}: TransactionItemProps) {
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const iconName = isTransfer ? 'swap-horizontal' : getIconName(category?.icon);
  const iconColor = category?.color || COLORS.primary;

  const content = (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <MaterialCommunityIcons
          name={iconName as any}
          size={iconSize.sm}
          color={iconColor}
        />
      </View>

      <View style={styles.details}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description || category?.name || 'Sem descrição'}
        </Text>
        <Text style={styles.meta}>
          {formatDateRelative(transaction.date)} • {account?.name || 'Conta'}
        </Text>
      </View>

      <Text
        style={[
          styles.amount,
          { color: isIncome ? COLORS.income : isTransfer ? COLORS.textSecondary : COLORS.expense },
        ]}
      >
        {isIncome ? '+' : isTransfer ? '' : '-'}{formatCurrency(transaction.amount)}
      </Text>
    </TouchableOpacity>
  );

  if (!swipeable || (!onEdit && !onDelete && !onDuplicate)) {
    return content;
  }

  const rightActions = [];
  if (onDelete) {
    rightActions.push({
      icon: 'delete',
      color: '#FFF',
      backgroundColor: COLORS.expense,
      onPress: onDelete,
      label: 'Excluir',
    });
  }

  const leftActions = [];
  if (onEdit) {
    leftActions.push({
      icon: 'pencil',
      color: '#FFF',
      backgroundColor: COLORS.primary,
      onPress: onEdit,
      label: 'Editar',
    });
  }
  if (onDuplicate) {
    leftActions.push({
      icon: 'content-copy',
      color: '#FFF',
      backgroundColor: COLORS.info,
      onPress: onDuplicate,
      label: 'Duplicar',
    });
  }

  return (
    <SwipeableItem leftActions={leftActions} rightActions={rightActions}>
      {content}
    </SwipeableItem>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(12),
    paddingHorizontal: spacing.lg,
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: wp(44),
    height: wp(44),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    marginLeft: spacing.md,
  },
  description: {
    fontSize: fs(16),
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: hp(2),
  },
  meta: {
    fontSize: fs(13),
    color: COLORS.textSecondary,
  },
  amount: {
    fontSize: fs(16),
    fontWeight: '600',
  },
});
