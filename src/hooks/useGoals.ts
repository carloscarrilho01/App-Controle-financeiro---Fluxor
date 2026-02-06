import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Goal } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('deadline', { ascending: true });

      if (error) throw error;

      // Garantir que is_completed seja booleano
      const formattedGoals = (data || []).map((g: any) => ({
        ...g,
        is_completed: g.is_completed === true || g.is_completed === 'true',
      }));

      setGoals(formattedGoals);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createGoal = async (goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...goal, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setGoals(prev => [...prev, data]);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setGoals(prev => prev.map(g => g.id === id ? data : g));
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setGoals(prev => prev.filter(g => g.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const addToGoal = async (id: string, amount: number) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return { error: new Error('Goal not found') };

    return updateGoal(id, {
      current_amount: goal.current_amount + amount,
    });
  };

  const getGoalProgress = (goal: Goal) => {
    return (goal.current_amount / goal.target_amount) * 100;
  };

  const getActiveGoals = () => {
    return goals.filter(g => g.current_amount < g.target_amount);
  };

  const getCompletedGoals = () => {
    return goals.filter(g => g.current_amount >= g.target_amount);
  };

  return {
    goals,
    loading,
    error,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    addToGoal,
    getGoalProgress,
    getActiveGoals,
    getCompletedGoals,
  };
}
