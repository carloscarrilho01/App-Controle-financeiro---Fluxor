import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components';
import { useAchievements, Achievement } from '../hooks/useAchievements';
import { COLORS } from '../types';
import { wp, hp, fs, spacing, borderRadius } from '../utils/responsive';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORY_LABELS = {
  savings: { label: 'Economia', icon: 'piggy-bank', color: '#10B981' },
  goals: { label: 'Metas', icon: 'target', color: '#6366F1' },
  transactions: { label: 'Transações', icon: 'swap-horizontal', color: '#F59E0B' },
  streak: { label: 'Sequências', icon: 'fire', color: '#EF4444' },
  special: { label: 'Especiais', icon: 'star', color: '#EC4899' },
};

export function AchievementsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    achievements,
    loading,
    newlyUnlocked,
    getStats,
    getByCategory,
    getUpcoming,
    checkAchievements,
    clearNewlyUnlocked,
  } = useAchievements();

  const [selectedCategory, setSelectedCategory] = useState<Achievement['category'] | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const stats = getStats();
  const upcoming = getUpcoming();

  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : getByCategory(selectedCategory);

  const unlockedAchievements = filteredAchievements.filter(a => a.unlocked);
  const lockedAchievements = filteredAchievements.filter(a => !a.unlocked);

  const onRefresh = async () => {
    setRefreshing(true);
    await checkAchievements();
    setRefreshing(false);
  };

  const renderProgressBar = (progress: number, requirement: number, color: string) => {
    const percentage = Math.min(100, (progress / requirement) * 100);
    return (
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    );
  };

  const renderAchievement = (achievement: Achievement, isLocked = false) => {
    const categoryInfo = CATEGORY_LABELS[achievement.category];
    const progress = Math.min(achievement.progress, achievement.requirement);
    const percentage = (progress / achievement.requirement) * 100;

    return (
      <TouchableOpacity
        key={achievement.id}
        onPress={() => setSelectedAchievement(achievement)}
        activeOpacity={0.7}
      >
        <Card style={[styles.achievementCard, isLocked && styles.lockedCard]}>
          <View style={styles.achievementHeader}>
            <View style={[
              styles.achievementIcon,
              {
                backgroundColor: isLocked ? COLORS.border : categoryInfo.color,
                opacity: isLocked ? 0.5 : 1,
              },
            ]}>
              <MaterialCommunityIcons
                name={achievement.icon as any}
                size={28}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.achievementInfo}>
              <Text style={[styles.achievementTitle, isLocked && styles.lockedText]}>
                {achievement.title}
              </Text>
              <Text style={[styles.achievementDesc, isLocked && styles.lockedText]}>
                {achievement.description}
              </Text>
            </View>
            <View style={styles.achievementPoints}>
              <Text style={[styles.pointsText, isLocked && styles.lockedText]}>
                {achievement.points}
              </Text>
              <MaterialCommunityIcons
                name="star"
                size={14}
                color={isLocked ? COLORS.textSecondary : '#F59E0B'}
              />
            </View>
          </View>

          {!achievement.unlocked && (
            <View style={styles.achievementProgress}>
              {renderProgressBar(progress, achievement.requirement, categoryInfo.color)}
              <Text style={styles.progressText}>
                {progress} / {achievement.requirement} ({percentage.toFixed(0)}%)
              </Text>
            </View>
          )}

          {achievement.unlocked && achievement.unlockedAt && (
            <Text style={styles.unlockedDate}>
              Desbloqueado em {format(new Date(achievement.unlockedAt), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
            </Text>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Card */}
        <Card style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Suas Conquistas</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>
                {stats.totalPoints >= 500 ? 'Mestre' :
                 stats.totalPoints >= 200 ? 'Expert' :
                 stats.totalPoints >= 50 ? 'Intermediário' : 'Iniciante'}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.unlockedCount}</Text>
              <Text style={styles.statLabel}>Desbloqueadas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalCount}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.pointsRow}>
                <Text style={styles.statValue}>{stats.totalPoints}</Text>
                <MaterialCommunityIcons name="star" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.statLabel}>Pontos</Text>
            </View>
          </View>

          <View style={styles.overallProgress}>
            {renderProgressBar(stats.unlockedCount, stats.totalCount, COLORS.primary)}
            <Text style={styles.overallProgressText}>
              {stats.percentage.toFixed(0)}% completo
            </Text>
          </View>
        </Card>

        {/* Próximas Conquistas */}
        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Quase Lá!</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.upcomingScroll}>
              {upcoming.map(achievement => {
                const categoryInfo = CATEGORY_LABELS[achievement.category];
                const percentage = (achievement.progress / achievement.requirement) * 100;

                return (
                  <TouchableOpacity
                    key={achievement.id}
                    style={[styles.upcomingCard, { borderColor: categoryInfo.color }]}
                    onPress={() => setSelectedAchievement(achievement)}
                  >
                    <View style={[styles.upcomingIcon, { backgroundColor: categoryInfo.color }]}>
                      <MaterialCommunityIcons
                        name={achievement.icon as any}
                        size={24}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text style={styles.upcomingTitle} numberOfLines={1}>
                      {achievement.title}
                    </Text>
                    {renderProgressBar(achievement.progress, achievement.requirement, categoryInfo.color)}
                    <Text style={styles.upcomingProgress}>{percentage.toFixed(0)}%</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Filtro por Categoria */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <MaterialCommunityIcons
              name="trophy"
              size={16}
              color={selectedCategory === 'all' ? '#FFF' : COLORS.text}
            />
            <Text style={[styles.filterText, selectedCategory === 'all' && { color: '#FFF' }]}>
              Todas
            </Text>
          </TouchableOpacity>

          {Object.entries(CATEGORY_LABELS).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterChip,
                selectedCategory === key && { backgroundColor: value.color },
              ]}
              onPress={() => setSelectedCategory(key as Achievement['category'])}
            >
              <MaterialCommunityIcons
                name={value.icon as any}
                size={16}
                color={selectedCategory === key ? '#FFF' : value.color}
              />
              <Text style={[styles.filterText, selectedCategory === key && { color: '#FFF' }]}>
                {value.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Conquistas Desbloqueadas */}
        {unlockedAchievements.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Desbloqueadas ({unlockedAchievements.length})
            </Text>
            {unlockedAchievements.map(a => renderAchievement(a, false))}
          </>
        )}

        {/* Conquistas Bloqueadas */}
        {lockedAchievements.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Em Progresso ({lockedAchievements.length})
            </Text>
            {lockedAchievements.map(a => renderAchievement(a, true))}
          </>
        )}
      </ScrollView>

      {/* Modal de Detalhes */}
      <Modal
        visible={selectedAchievement !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedAchievement(null)}
        >
          {selectedAchievement && (
            <View style={styles.modal}>
              <View style={[
                styles.modalIcon,
                { backgroundColor: CATEGORY_LABELS[selectedAchievement.category].color },
              ]}>
                <MaterialCommunityIcons
                  name={selectedAchievement.icon as any}
                  size={40}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.modalTitle}>{selectedAchievement.title}</Text>
              <Text style={styles.modalDesc}>{selectedAchievement.description}</Text>

              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>{selectedAchievement.points}</Text>
                  <MaterialCommunityIcons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.modalStatLabel}>Pontos</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>
                    {Math.min(selectedAchievement.progress, selectedAchievement.requirement)}
                  </Text>
                  <Text style={styles.modalStatLabel}>/ {selectedAchievement.requirement}</Text>
                </View>
              </View>

              {!selectedAchievement.unlocked && (
                <View style={styles.modalProgress}>
                  {renderProgressBar(
                    selectedAchievement.progress,
                    selectedAchievement.requirement,
                    CATEGORY_LABELS[selectedAchievement.category].color
                  )}
                </View>
              )}

              {selectedAchievement.unlocked && (
                <View style={styles.unlockedBadge}>
                  <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.income} />
                  <Text style={styles.unlockedBadgeText}>Desbloqueado!</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Modal>

      {/* Modal de Nova Conquista */}
      <Modal
        visible={newlyUnlocked !== null}
        animationType="fade"
        transparent
        onRequestClose={clearNewlyUnlocked}
      >
        <TouchableOpacity
          style={styles.newAchievementOverlay}
          activeOpacity={1}
          onPress={clearNewlyUnlocked}
        >
          {newlyUnlocked && (
            <View style={styles.newAchievementModal}>
              <View style={styles.congratsRow}>
                <MaterialCommunityIcons name="party-popper" size={28} color="#F59E0B" />
                <Text style={styles.newAchievementCongrats}>Parabéns!</Text>
                <MaterialCommunityIcons name="party-popper" size={28} color="#F59E0B" />
              </View>
              <View style={[
                styles.newAchievementIcon,
                { backgroundColor: CATEGORY_LABELS[newlyUnlocked.category].color },
              ]}>
                <MaterialCommunityIcons
                  name={newlyUnlocked.icon as any}
                  size={48}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.newAchievementTitle}>{newlyUnlocked.title}</Text>
              <Text style={styles.newAchievementDesc}>{newlyUnlocked.description}</Text>
              <View style={styles.newAchievementPoints}>
                <Text style={styles.newAchievementPointsText}>+{newlyUnlocked.points}</Text>
                <MaterialCommunityIcons name="star" size={24} color="#F59E0B" />
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.bottomSafe,
  },
  statsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statsTitle: {
    fontSize: fs(18),
    fontWeight: '700',
    color: COLORS.text,
  },
  levelBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  levelText: {
    color: '#FFF',
    fontSize: fs(12),
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fs(24),
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginTop: hp(2),
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  overallProgress: {
    marginTop: spacing.sm,
  },
  overallProgressText: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fs(18),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  upcomingScroll: {
    marginBottom: spacing.md,
  },
  upcomingCard: {
    width: wp(120),
    padding: spacing.md,
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.lg,
    marginRight: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
  },
  upcomingIcon: {
    width: wp(48),
    height: wp(48),
    borderRadius: wp(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  upcomingTitle: {
    fontSize: fs(12),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  upcomingProgress: {
    fontSize: fs(12),
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: spacing.xs,
  },
  filterScroll: {
    marginBottom: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: fs(13),
    fontWeight: '500',
    color: COLORS.text,
  },
  achievementCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lockedCard: {
    opacity: 0.7,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIcon: {
    width: wp(48),
    height: wp(48),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  achievementTitle: {
    fontSize: fs(15),
    fontWeight: '600',
    color: COLORS.text,
  },
  achievementDesc: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginTop: hp(2),
  },
  lockedText: {
    color: COLORS.textSecondary,
  },
  achievementPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pointsText: {
    fontSize: fs(14),
    fontWeight: '700',
    color: COLORS.text,
  },
  achievementProgress: {
    marginTop: spacing.md,
  },
  progressBar: {
    height: hp(6),
    backgroundColor: COLORS.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: fs(11),
    color: COLORS.textSecondary,
    marginTop: spacing.xs,
  },
  unlockedDate: {
    fontSize: fs(11),
    color: COLORS.income,
    marginTop: spacing.sm,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: wp(300),
  },
  modalIcon: {
    width: wp(80),
    height: wp(80),
    borderRadius: wp(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalEmoji: {
    fontSize: fs(40),
  },
  modalTitle: {
    fontSize: fs(20),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: spacing.sm,
  },
  modalDesc: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalStats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  modalStatItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  modalStatValue: {
    fontSize: fs(18),
    fontWeight: '700',
    color: COLORS.text,
  },
  modalStatLabel: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
  },
  modalProgress: {
    width: '100%',
    marginTop: spacing.md,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: COLORS.income + '20',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  unlockedBadgeText: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.income,
  },
  // New Achievement Modal
  newAchievementOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newAchievementModal: {
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
  },
  congratsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  newAchievementCongrats: {
    fontSize: fs(24),
    fontWeight: '700',
    color: COLORS.text,
  },
  newAchievementIcon: {
    width: wp(100),
    height: wp(100),
    borderRadius: wp(50),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  newAchievementTitle: {
    fontSize: fs(22),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: spacing.sm,
  },
  newAchievementDesc: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  newAchievementPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F59E0B20',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  newAchievementPointsText: {
    fontSize: fs(20),
    fontWeight: '700',
    color: '#F59E0B',
  },
});
