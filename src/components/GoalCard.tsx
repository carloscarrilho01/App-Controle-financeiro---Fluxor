import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Goal, COLORS } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { wp, hp, fs, borderRadius, spacing } from '../utils/responsive';

interface GoalCardProps {
  goal: Goal;
  onPress?: () => void;
}

export function GoalCard({ goal, onPress }: GoalCardProps) {
  const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  const isCompleted = goal.current_amount >= goal.target_amount;
  const remaining = goal.target_amount - goal.current_amount;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 800,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
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
      <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.header}>
        <View style={[styles.colorDot, { backgroundColor: goal.color }]} />
        <Text style={styles.name} numberOfLines={1}>{goal.name}</Text>
        {isCompleted && <Text style={styles.completed}>Concluída</Text>}
      </View>

      <View style={styles.amounts}>
        <Text style={styles.current}>{formatCurrency(goal.current_amount)}</Text>
        <Text style={styles.target}>de {formatCurrency(goal.target_amount)}</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: isCompleted ? COLORS.success : goal.color,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
      </View>

      <View style={styles.footer}>
        {goal.deadline && (
          <Text style={styles.deadline}>Meta: {formatDate(goal.deadline)}</Text>
        )}
        {!isCompleted && (
          <Text style={styles.remaining}>Faltam {formatCurrency(remaining)}</Text>
        )}
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(2) },
    shadowOpacity: 0.05,
    shadowRadius: wp(8),
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  colorDot: {
    width: wp(12),
    height: wp(12),
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.text,
  },
  completed: {
    fontSize: fs(12),
    fontWeight: '600',
    color: COLORS.success,
    backgroundColor: `${COLORS.success}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: wp(4),
    borderRadius: borderRadius.sm,
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  current: {
    fontSize: fs(24),
    fontWeight: '700',
    color: COLORS.text,
  },
  target: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    marginLeft: spacing.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: hp(8),
    backgroundColor: COLORS.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
    width: wp(45),
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deadline: {
    fontSize: fs(13),
    color: COLORS.textSecondary,
  },
  remaining: {
    fontSize: fs(13),
    color: COLORS.primary,
    fontWeight: '500',
  },
});
