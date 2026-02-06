import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RecurringTransaction, FREQUENCIES } from '../types';
import { addDays, addWeeks, addMonths, addYears, isBefore, isToday, parseISO, format } from 'date-fns';

export function useRecurringTransactions() {
  const { user } = useAuth();
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecurringTransactions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('next_date', { ascending: true });

      if (fetchError) throw fetchError;

      // Garantir que is_active e auto_create sejam booleanos
      const formattedData = (data || []).map((t: any) => ({
        ...t,
        is_active: t.is_active === true || t.is_active === 'true',
        auto_create: t.auto_create === true || t.auto_create === 'true',
      }));

      setRecurringTransactions(formattedData);
    } catch (err) {
      console.error('Erro ao buscar transações recorrentes:', err);
      setError('Erro ao carregar transações recorrentes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecurringTransactions();
  }, [fetchRecurringTransactions]);

  const createRecurringTransaction = async (
    transaction: Omit<RecurringTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'next_date'>
  ) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const nextDate = transaction.start_date;

      const { data, error: insertError } = await supabase
        .from('recurring_transactions')
        .insert({
          ...transaction,
          user_id: user.id,
          next_date: nextDate,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setRecurringTransactions((prev) => [...prev, data]);
      return { data, error: null };
    } catch (err: any) {
      console.error('Erro ao criar transação recorrente:', err);
      return { error: err.message || 'Erro ao criar transação recorrente' };
    }
  };

  const updateRecurringTransaction = async (
    id: string,
    updates: Partial<RecurringTransaction>
  ) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { data, error: updateError } = await supabase
        .from('recurring_transactions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setRecurringTransactions((prev) =>
        prev.map((t) => (t.id === id ? data : t))
      );
      return { data, error: null };
    } catch (err: any) {
      console.error('Erro ao atualizar transação recorrente:', err);
      return { error: err.message || 'Erro ao atualizar transação recorrente' };
    }
  };

  const deleteRecurringTransaction = async (id: string) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { error: deleteError } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setRecurringTransactions((prev) => prev.filter((t) => t.id !== id));
      return { error: null };
    } catch (err: any) {
      console.error('Erro ao excluir transação recorrente:', err);
      return { error: err.message || 'Erro ao excluir transação recorrente' };
    }
  };

  const toggleActive = async (id: string) => {
    const transaction = recurringTransactions.find((t) => t.id === id);
    if (!transaction) return { error: 'Transação não encontrada' };

    return updateRecurringTransaction(id, { is_active: !transaction.is_active });
  };

  // Calcular próxima data baseado na frequência
  const calculateNextDate = (currentDate: string, frequency: RecurringTransaction['frequency']): string => {
    const date = parseISO(currentDate);

    switch (frequency) {
      case 'daily':
        return format(addDays(date, 1), 'yyyy-MM-dd');
      case 'weekly':
        return format(addWeeks(date, 1), 'yyyy-MM-dd');
      case 'biweekly':
        return format(addWeeks(date, 2), 'yyyy-MM-dd');
      case 'monthly':
        return format(addMonths(date, 1), 'yyyy-MM-dd');
      case 'yearly':
        return format(addYears(date, 1), 'yyyy-MM-dd');
      default:
        return format(addMonths(date, 1), 'yyyy-MM-dd');
    }
  };

  // Processar transações pendentes (criar transações automáticas)
  const processRecurringTransactions = async () => {
    if (!user) return;

    const today = new Date();
    const pendingTransactions = recurringTransactions.filter(
      (t) => t.is_active && t.auto_create && isBefore(parseISO(t.next_date), today)
    );

    for (const recurring of pendingTransactions) {
      try {
        // Criar a transação
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            account_id: recurring.account_id,
            category_id: recurring.category_id,
            type: recurring.type,
            amount: recurring.amount,
            description: recurring.description,
            date: recurring.next_date,
            recurring_id: recurring.id,
          });

        if (transactionError) throw transactionError;

        // Atualizar próxima data
        const nextDate = calculateNextDate(recurring.next_date, recurring.frequency);

        // Verificar se deve continuar (data fim)
        const shouldContinue = !recurring.end_date || isBefore(parseISO(nextDate), parseISO(recurring.end_date));

        await supabase
          .from('recurring_transactions')
          .update({
            next_date: nextDate,
            is_active: shouldContinue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recurring.id);
      } catch (err) {
        console.error('Erro ao processar transação recorrente:', err);
      }
    }

    // Recarregar lista
    fetchRecurringTransactions();
  };

  // Obter transações que vencem hoje
  const getDueToday = () => {
    return recurringTransactions.filter(
      (t) => t.is_active && isToday(parseISO(t.next_date))
    );
  };

  // Obter transações dos próximos X dias
  const getUpcoming = (days: number = 7) => {
    const futureDate = addDays(new Date(), days);
    return recurringTransactions.filter(
      (t) =>
        t.is_active &&
        isBefore(parseISO(t.next_date), futureDate) &&
        !isBefore(parseISO(t.next_date), new Date())
    );
  };

  // Estatísticas
  const getMonthlyTotal = (type: 'income' | 'expense') => {
    return recurringTransactions
      .filter((t) => t.is_active && t.type === type && t.frequency === 'monthly')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return {
    recurringTransactions,
    loading,
    error,
    fetchRecurringTransactions,
    createRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    toggleActive,
    processRecurringTransactions,
    getDueToday,
    getUpcoming,
    getMonthlyTotal,
    calculateNextDate,
  };
}
