import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useGoals } from './useGoals';
import { useTransactions } from './useTransactions';
import { useAccounts } from './useAccounts';

const ACHIEVEMENTS_KEY = '@user_achievements';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'savings' | 'goals' | 'transactions' | 'streak' | 'special';
  requirement: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
  points: number;
}

// Definições das conquistas
const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'progress' | 'unlocked' | 'unlockedAt'>[] = [
  // Categoria: Economia
  {
    id: 'first_save',
    title: 'Primeiro Passo',
    description: 'Economize dinheiro pela primeira vez',
    icon: '🌱',
    category: 'savings',
    requirement: 1,
    points: 10,
  },
  {
    id: 'save_100',
    title: 'Poupador Iniciante',
    description: 'Economize R$ 100 no total',
    icon: '💰',
    category: 'savings',
    requirement: 100,
    points: 25,
  },
  {
    id: 'save_500',
    title: 'Poupador Dedicado',
    description: 'Economize R$ 500 no total',
    icon: '💵',
    category: 'savings',
    requirement: 500,
    points: 50,
  },
  {
    id: 'save_1000',
    title: 'Poupador Expert',
    description: 'Economize R$ 1.000 no total',
    icon: '🏦',
    category: 'savings',
    requirement: 1000,
    points: 100,
  },
  {
    id: 'save_5000',
    title: 'Mestre das Finanças',
    description: 'Economize R$ 5.000 no total',
    icon: '👑',
    category: 'savings',
    requirement: 5000,
    points: 250,
  },

  // Categoria: Metas
  {
    id: 'first_goal',
    title: 'Sonhador',
    description: 'Crie sua primeira meta',
    icon: '🎯',
    category: 'goals',
    requirement: 1,
    points: 10,
  },
  {
    id: 'complete_goal',
    title: 'Conquistador',
    description: 'Complete sua primeira meta',
    icon: '🏆',
    category: 'goals',
    requirement: 1,
    points: 50,
  },
  {
    id: 'complete_3_goals',
    title: 'Determinado',
    description: 'Complete 3 metas',
    icon: '🥇',
    category: 'goals',
    requirement: 3,
    points: 100,
  },
  {
    id: 'complete_5_goals',
    title: 'Imparável',
    description: 'Complete 5 metas',
    icon: '⭐',
    category: 'goals',
    requirement: 5,
    points: 200,
  },
  {
    id: 'complete_10_goals',
    title: 'Lendário',
    description: 'Complete 10 metas',
    icon: '🌟',
    category: 'goals',
    requirement: 10,
    points: 500,
  },

  // Categoria: Transações
  {
    id: 'first_transaction',
    title: 'Começando',
    description: 'Registre sua primeira transação',
    icon: '📝',
    category: 'transactions',
    requirement: 1,
    points: 5,
  },
  {
    id: 'transactions_10',
    title: 'Organizador',
    description: 'Registre 10 transações',
    icon: '📊',
    category: 'transactions',
    requirement: 10,
    points: 15,
  },
  {
    id: 'transactions_50',
    title: 'Controlador',
    description: 'Registre 50 transações',
    icon: '📈',
    category: 'transactions',
    requirement: 50,
    points: 30,
  },
  {
    id: 'transactions_100',
    title: 'Meticuloso',
    description: 'Registre 100 transações',
    icon: '💼',
    category: 'transactions',
    requirement: 100,
    points: 75,
  },
  {
    id: 'transactions_500',
    title: 'Veterano',
    description: 'Registre 500 transações',
    icon: '🎖️',
    category: 'transactions',
    requirement: 500,
    points: 150,
  },

  // Categoria: Especial
  {
    id: 'positive_balance',
    title: 'No Azul',
    description: 'Termine o mês com saldo positivo',
    icon: '💚',
    category: 'special',
    requirement: 1,
    points: 25,
  },
  {
    id: 'no_expense_day',
    title: 'Dia de Economia',
    description: 'Passe um dia sem gastar',
    icon: '🛡️',
    category: 'special',
    requirement: 1,
    points: 15,
  },
  {
    id: 'budget_master',
    title: 'Mestre do Orçamento',
    description: 'Fique dentro do orçamento por um mês',
    icon: '🧮',
    category: 'special',
    requirement: 1,
    points: 100,
  },
  {
    id: 'diversified',
    title: 'Diversificado',
    description: 'Tenha 5 contas diferentes',
    icon: '🎨',
    category: 'special',
    requirement: 5,
    points: 50,
  },
];

export function useAchievements() {
  const { user } = useAuth();
  const { goals, getCompletedGoals } = useGoals();
  const { transactions, getMonthSummary } = useTransactions();
  const { accounts, getTotalBalance } = useAccounts();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement | null>(null);

  // Carregar conquistas salvas
  const loadAchievements = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(`${ACHIEVEMENTS_KEY}_${user.id}`);

      if (stored) {
        const savedAchievements = JSON.parse(stored);
        // Merge com definições atuais (para novas conquistas)
        const merged = ACHIEVEMENT_DEFINITIONS.map(def => {
          const saved = savedAchievements.find((a: Achievement) => a.id === def.id);
          return saved || { ...def, progress: 0, unlocked: false };
        });
        setAchievements(merged);
      } else {
        // Inicializar conquistas
        const initial = ACHIEVEMENT_DEFINITIONS.map(def => ({
          ...def,
          progress: 0,
          unlocked: false,
        }));
        setAchievements(initial);
      }
    } catch (err) {
      console.error('Erro ao carregar conquistas:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  // Salvar conquistas
  const saveAchievements = async (newAchievements: Achievement[]) => {
    if (!user) return;
    await AsyncStorage.setItem(
      `${ACHIEVEMENTS_KEY}_${user.id}`,
      JSON.stringify(newAchievements)
    );
  };

  // Verificar e atualizar progresso das conquistas
  const checkAchievements = useCallback(async () => {
    if (!user || achievements.length === 0) return;

    const monthSummary = getMonthSummary();
    const completedGoals = getCompletedGoals();
    const totalSavings = monthSummary.income - monthSummary.expense;

    const updatedAchievements = achievements.map(achievement => {
      if (achievement.unlocked) return achievement;

      let newProgress = achievement.progress;

      switch (achievement.id) {
        // Economia
        case 'first_save':
          newProgress = totalSavings > 0 ? 1 : 0;
          break;
        case 'save_100':
        case 'save_500':
        case 'save_1000':
        case 'save_5000':
          newProgress = Math.max(0, totalSavings);
          break;

        // Metas
        case 'first_goal':
          newProgress = goals.length;
          break;
        case 'complete_goal':
        case 'complete_3_goals':
        case 'complete_5_goals':
        case 'complete_10_goals':
          newProgress = completedGoals.length;
          break;

        // Transações
        case 'first_transaction':
        case 'transactions_10':
        case 'transactions_50':
        case 'transactions_100':
        case 'transactions_500':
          newProgress = transactions.length;
          break;

        // Especial
        case 'positive_balance':
          newProgress = getTotalBalance() > 0 ? 1 : 0;
          break;
        case 'diversified':
          newProgress = accounts.length;
          break;
      }

      const unlocked = newProgress >= achievement.requirement;

      if (unlocked && !achievement.unlocked) {
        setNewlyUnlocked({ ...achievement, progress: newProgress, unlocked: true, unlockedAt: new Date().toISOString() });
      }

      return {
        ...achievement,
        progress: newProgress,
        unlocked,
        unlockedAt: unlocked && !achievement.unlocked ? new Date().toISOString() : achievement.unlockedAt,
      };
    });

    setAchievements(updatedAchievements);
    await saveAchievements(updatedAchievements);
  }, [user, achievements, goals, transactions, accounts, getMonthSummary, getCompletedGoals, getTotalBalance]);

  // Verificar conquistas quando dados mudam
  useEffect(() => {
    if (!loading && achievements.length > 0) {
      checkAchievements();
    }
  }, [transactions.length, goals.length, accounts.length]);

  // Calcular estatísticas
  const getStats = () => {
    const unlocked = achievements.filter(a => a.unlocked);
    const totalPoints = unlocked.reduce((sum, a) => sum + a.points, 0);
    const maxPoints = achievements.reduce((sum, a) => sum + a.points, 0);

    return {
      unlockedCount: unlocked.length,
      totalCount: achievements.length,
      totalPoints,
      maxPoints,
      percentage: achievements.length > 0 ? (unlocked.length / achievements.length) * 100 : 0,
    };
  };

  // Obter conquistas por categoria
  const getByCategory = (category: Achievement['category']) => {
    return achievements.filter(a => a.category === category);
  };

  // Obter próximas conquistas (quase desbloqueadas)
  const getUpcoming = (limit = 3) => {
    return achievements
      .filter(a => !a.unlocked)
      .sort((a, b) => (b.progress / b.requirement) - (a.progress / a.requirement))
      .slice(0, limit);
  };

  // Limpar notificação de nova conquista
  const clearNewlyUnlocked = () => {
    setNewlyUnlocked(null);
  };

  return {
    achievements,
    loading,
    newlyUnlocked,
    getStats,
    getByCategory,
    getUpcoming,
    checkAchievements,
    clearNewlyUnlocked,
  };
}
