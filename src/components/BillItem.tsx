import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Bill, COLORS } from '../types';
import { formatCurrency, toBrazilianDate } from '../utils/formatters';
import { wp, hp, fs, borderRadius, spacing, iconSize } from '../utils/responsive';

interface BillItemProps {
  bill: Bill;
  categoryName?: string;
  onPress?: () => void;
  onTogglePaid?: () => void;
}

export function BillItem({ bill, categoryName, onPress, onTogglePaid }: BillItemProps) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueDate = new Date(bill.due_date + 'T12:00:00');
  const diffTime = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isOverdue = diffDays < 0 && !bill.is_paid;
  const isDueSoon = !isOverdue && diffDays >= 0 && diffDays <= 3 && !bill.is_paid;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isOverdue && styles.overdue,
        isDueSoon && styles.dueSoon,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <TouchableOpacity
        style={[styles.checkbox, bill.is_paid && styles.checkboxChecked]}
        onPress={onTogglePaid}
      >
        {bill.is_paid && <MaterialCommunityIcons name="check" size={iconSize.xs} color="#FFFFFF" />}
      </TouchableOpacity>

      <View style={styles.details}>
        <Text
          style={[styles.name, bill.is_paid && styles.namePaid]}
          numberOfLines={1}
        >
          {bill.name}
        </Text>
        <Text style={styles.meta}>
          Vence {toBrazilianDate(bill.due_date)} • {categoryName || 'Sem categoria'}
          {bill.is_recurring && ' • Recorrente'}
        </Text>
      </View>

      <View style={styles.amountContainer}>
        <Text style={[styles.amount, bill.is_paid && styles.amountPaid]}>
          {formatCurrency(bill.amount)}
        </Text>
        {isOverdue && <Text style={styles.overdueLabel}>Atrasada</Text>}
        {isDueSoon && !isOverdue && <Text style={styles.dueSoonLabel}>Em breve</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(14),
    paddingHorizontal: spacing.lg,
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderLeftWidth: wp(4),
    borderLeftColor: COLORS.border,
  },
  overdue: {
    borderLeftColor: COLORS.danger,
    backgroundColor: `${COLORS.danger}08`,
  },
  dueSoon: {
    borderLeftColor: COLORS.warning,
    backgroundColor: `${COLORS.warning}08`,
  },
  checkbox: {
    width: wp(24),
    height: wp(24),
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: fs(16),
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: hp(2),
  },
  namePaid: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  meta: {
    fontSize: fs(13),
    color: COLORS.textSecondary,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.text,
  },
  amountPaid: {
    color: COLORS.textSecondary,
  },
  overdueLabel: {
    fontSize: fs(11),
    fontWeight: '600',
    color: COLORS.danger,
    marginTop: hp(2),
  },
  dueSoonLabel: {
    fontSize: fs(11),
    fontWeight: '600',
    color: COLORS.warning,
    marginTop: hp(2),
  },
});
