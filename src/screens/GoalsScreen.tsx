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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoalCard, Card, TutorialTooltip, SCREEN_TUTORIALS } from '../components';
import { useGoals } from '../hooks/useGoals';
import { useAchievements } from '../hooks/useAchievements';
import { Goal, COLORS } from '../types';
import { formatCurrency } from '../utils/formatters';
import { wp, hp, fs, spacing, borderRadius } from '../utils/responsive';

export function GoalsScreen({ navigation }: any) {
  const {
    goals,
    loading,
    fetchGoals,
    deleteGoal,
    getActiveGoals,
    getCompletedGoals,
  } = useGoals();
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const { getStats: getAchievementStats } = useAchievements();
  const achievementStats = getAchievementStats();

  const activeGoals = getActiveGoals();
  const completedGoals = getCompletedGoals();
  const displayGoals = showCompleted ? completedGoals : activeGoals;

  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  };

  const handleDelete = (goal: Goal) => {
    Alert.alert(
      'Excluir Meta',
      `Tem certeza que deseja excluir "${goal.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteGoal(goal.id);
            if (error) {
              Alert.alert('Erro', error.message);
            }
          },
        },
      ]
    );
  };

  const renderGoal = ({ item }: { item: Goal }) => (
    <GoalCard
      goal={item}
      onPress={() => navigation.navigate('AddGoal', { goal: item })}
    />
  );

  return (
    <View style={styles.container}>
      <TutorialTooltip tutorialKey="goals" steps={SCREEN_TUTORIALS.goals} />

      {/* Achievements Banner */}
      <TouchableOpacity
        style={styles.achievementsBanner}
        onPress={() => navigation.navigate('Achievements')}
      >
        <View style={styles.achievementsLeft}>
          <View style={styles.trophyIcon}>
            <MaterialCommunityIcons name="trophy" size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.achievementsTitle}>Conquistas</Text>
            <Text style={styles.achievementsSubtitle}>
              {achievementStats.unlockedCount}/{achievementStats.totalCount} desbloqueadas
            </Text>
          </View>
        </View>
        <View style={styles.achievementsRight}>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>{achievementStats.totalPoints}</Text>
            <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>

      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Poupado</Text>
            <Text style={[styles.summaryValue, { color: COLORS.income }]}>
              {formatCurrency(totalSaved)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total das Metas</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totalTarget)}
            </Text>
          </View>
        </View>
        {totalTarget > 0 && (
          <View style={styles.overallProgress}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {((totalSaved / totalTarget) * 100).toFixed(0)}% alcançado
            </Text>
          </View>
        )}
      </Card>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, !showCompleted && styles.tabActive]}
          onPress={() => setShowCompleted(false)}
        >
          <Text style={[styles.tabText, !showCompleted && styles.tabTextActive]}>
            Em Andamento ({activeGoals.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, showCompleted && styles.tabActive]}
          onPress={() => setShowCompleted(true)}
        >
          <Text style={[styles.tabText, showCompleted && styles.tabTextActive]}>
            Concluídas ({completedGoals.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Goals List */}
      <FlatList
        data={displayGoals}
        keyExtractor={item => item.id}
        renderItem={renderGoal}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyText}>
              {showCompleted
                ? 'Nenhuma meta concluída ainda'
                : 'Nenhuma meta em andamento'}
            </Text>
            {!showCompleted && (
              <Text style={styles.emptySubtext}>
                Crie sua primeira meta financeira
              </Text>
            )}
          </Card>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddGoal')}
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
  achievementsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  achievementsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  trophyIcon: {
    width: wp(44),
    height: wp(44),
    borderRadius: wp(22),
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementsTitle: {
    fontSize: fs(15),
    fontWeight: '600',
    color: COLORS.text,
  },
  achievementsSubtitle: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginTop: hp(2),
  },
  achievementsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F59E0B20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  pointsText: {
    fontSize: fs(14),
    fontWeight: '700',
    color: '#F59E0B',
  },
  summaryCard: {
    margin: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  overallProgress: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
