import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Account, ACCOUNT_TYPES, COLORS } from '../types';
import { formatCurrency, getIconName } from '../utils/formatters';
import { wp, hp, fs, borderRadius, spacing, iconSize, widthPercent } from '../utils/responsive';

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
}

export function AccountCard({ account, onPress }: AccountCardProps) {
  const accountType = ACCOUNT_TYPES[account.type];
  const isNegative = account.balance < 0 || account.type === 'credit_card';
  const iconName = getIconName(account.icon, accountType.icon);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.container,
          { borderLeftColor: account.color, transform: [{ scale: scaleAnim }] },
        ]}
      >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${account.color}20` }]}>
          <MaterialCommunityIcons
            name={iconName as any}
            size={iconSize.md}
            color={account.color}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{account.name}</Text>
          <Text style={styles.type}>{accountType.label}</Text>
        </View>
      </View>

      <Text
        style={[
          styles.balance,
          { color: isNegative ? COLORS.expense : COLORS.text },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatCurrency(account.balance)}
      </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginRight: spacing.md,
    width: widthPercent(45),
    minWidth: wp(160),
    maxWidth: wp(200),
    borderLeftWidth: wp(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(2) },
    shadowOpacity: 0.05,
    shadowRadius: wp(8),
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: wp(40),
    height: wp(40),
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.text,
  },
  type: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginTop: hp(2),
  },
  balance: {
    fontSize: fs(20),
    fontWeight: '700',
  },
});
