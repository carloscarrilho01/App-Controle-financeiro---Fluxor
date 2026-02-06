import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MonthlyBudget, Category, CategorySummary } from '../types';
import { format } from 'date-fns';

interface BudgetWithProgress extends MonthlyBudget {
  category?: Category;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'under' | 'warning' | 'over';
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  budgetsOnTrack: number;
  budgetsWarning: number;
  budgetsOver: number;
}

export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [budgetsWithProgress, setBudgetsWithProgress] = useState<BudgetWithProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async (month?: number, year?: number) => {
    if (!user) return;

    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    setLoading(true);
    setError(null);

    try {
      // Buscar orçamentos
      const { data: budgetData, error: budgetError } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', targetMonth)
        .eq('year', targetYear);

      if (budgetError) throw budgetError;

      // Buscar categorias
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense');

      if (catError) throw catError;

      // Buscar gastos do mês por categoria
      const startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
      const endDate = format(
        new Date(targetYear, targetMonth, 0),
        'yyyy-MM-dd'
      );

      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate);

      if (transError) throw transError;

      // Calcular gastos por categoria
      const spentByCategory: Record<string, number> = {};
      transactions?.forEach((t) => {
        spentByCategory[t.category_id] = (spentByCategory[t.category_id] || 0) + t.amount;
      });

      // Combinar orçamentos com progresso
      const withProgress: BudgetWithProgress[] = (budgetData || []).map((budget) => {
        const category = categories?.find((c) => c.id === budget.category_id);
        const spent = spentByCategory[budget.category_id] || 0;
        const remaining = budget.amount - spent;
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

        let status: 'under' | 'warning' | 'over' = 'under';
        if (percentage >= 100) status = 'over';
        else if (percentage >= 80) status = 'warning';

        return {
          ...budget,
          category,
          spent,
          remaining,
          percentage,
          status,
        };
      });

      setBudgets(budgetData || []);
      setBudgetsWithProgress(withProgress);
    } catch (err: any) {
      console.error('Erro ao buscar orçamentos:', err);
      setError('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const createBudget = async (
    budget: Omit<MonthlyBudget, 'id' | 'user_id' | 'created_at'>
  ) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      // Verificar se já existe orçamento para esta categoria/mês
      const existing = budgets.find(
        (b) =>
          b.category_id === budget.category_id &&
          b.month === budget.month &&
          b.year === budget.year
      );

      if (existing) {
        return updateBudget(existing.id, { amount: budget.amount });
      }

      const { data, error: insertError } = await supabase
        .from('monthly_budgets')
        .insert({
          ...budget,
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setBudgets((prev) => [...prev, data]);
      await fetchBudgets(budget.month, budget.year);
      return { data, error: null };
    } catch (err: any) {
      console.error('Erro ao criar orçamento:', err);
      return { error: err.message || 'Erro ao criar orçamento' };
    }
  };

  const updateBudget = async (id: string, updates: Partial<MonthlyBudget>) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { data, error: updateError } = await supabase
        .from('monthly_budgets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setBudgets((prev) => prev.map((b) => (b.id === id ? data : b)));
      await fetchBudgets();
      return { data, error: null };
    } catch (err: any) {
      console.error('Erro ao atualizar orçamento:', err);
      return { error: err.message || 'Erro ao atualizar orçamento' };
    }
  };

  const deleteBudget = async (id: string) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { error: deleteError } = await supabase
        .from('monthly_budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setBudgets((prev) => prev.filter((b) => b.id !== id));
      setBudgetsWithProgress((prev) => prev.filter((b) => b.id !== id));
      return { error: null };
    } catch (err: any) {
      console.error('Erro ao excluir orçamento:', err);
      return { error: err.message || 'Erro ao excluir orçamento' };
    }
  };

  // Copiar orçamentos do mês anterior
  const copyFromPreviousMonth = async (month: number, year: number) => {
    if (!user) return { error: 'Usuário não autenticado' };

    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    try {
      // Buscar orçamentos do mês anterior
      const { data: prevBudgets, error: fetchError } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', prevMonth)
        .eq('year', prevYear);

      if (fetchError) throw fetchError;

      if (!prevBudgets || prevBudgets.length === 0) {
        return { error: 'Nenhum orçamento encontrado no mês anterior' };
      }

      // Criar novos orçamentos
      const newBudgets = prevBudgets.map((b) => ({
        user_id: user.id,
        category_id: b.category_id,
        amount: b.amount,
        month,
        year,
      }));

      const { data, error: insertError } = await supabase
        .from('monthly_budgets')
        .insert(newBudgets)
        .select();

      if (insertError) throw insertError;

      await fetchBudgets(month, year);
      return { data, error: null };
    } catch (err: any) {
      console.error('Erro ao copiar orçamentos:', err);
      return { error: err.message || 'Erro ao copiar orçamentos' };
    }
  };

  // Obter resumo dos orçamentos
  const getSummary = (): BudgetSummary => {
    const totalBudget = budgetsWithProgress.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgetsWithProgress.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const budgetsOnTrack = budgetsWithProgress.filter((b) => b.status === 'under').length;
    const budgetsWarning = budgetsWithProgress.filter((b) => b.status === 'warning').length;
    const budgetsOver = budgetsWithProgress.filter((b) => b.status === 'over').length;

    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      overallPercentage,
      budgetsOnTrack,
      budgetsWarning,
      budgetsOver,
    };
  };

  // Obter orçamentos por status
  const getBudgetsByStatus = (status: 'under' | 'warning' | 'over') => {
    return budgetsWithProgress.filter((b) => b.status === status);
  };

  // Sugerir orçamentos baseado no histórico
  const getSuggestedBudgets = async (month: number, year: number) => {
    if (!user) return [];

    try {
      // Buscar média dos últimos 3 meses por categoria
      const endDate = new Date(year, month - 1, 0);
      const startDate = new Date(year, month - 4, 1);

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      if (error) throw error;

      const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense');

      // Calcular média por categoria
      const spentByCategory: Record<string, number[]> = {};
      transactions?.forEach((t) => {
        if (!spentByCategory[t.category_id]) {
          spentByCategory[t.category_id] = [];
        }
        spentByCategory[t.category_id].push(t.amount);
      });

      const suggestions = Object.entries(spentByCategory)
        .map(([categoryId, amounts]) => {
          const average = amounts.reduce((a, b) => a + b, 0) / 3;
          const category = categories?.find((c) => c.id === categoryId);
          // Sugerir 10% a mais como margem
          const suggestedAmount = Math.ceil(average * 1.1);

          return {
            category_id: categoryId,
            category,
            suggested_amount: suggestedAmount,
            average_spent: average,
          };
        })
        .filter((s) => s.category && s.suggested_amount > 0)
        .sort((a, b) => b.suggested_amount - a.suggested_amount);

      return suggestions;
    } catch (err) {
      console.error('Erro ao buscar sugestões:', err);
      return [];
    }
  };

  return {
    budgets,
    budgetsWithProgress,
    loading,
    error,
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    copyFromPreviousMonth,
    getSummary,
    getBudgetsByStatus,
    getSuggestedBudgets,
  };
}
