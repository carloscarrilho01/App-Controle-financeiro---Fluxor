import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Transaction, MonthSummary, CategorySummary, Category } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (startDate?: Date, endDate?: Date) => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        query = query.lte('date', format(endDate, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;

      if (error) throw error;

      // Garantir que is_pending seja booleano
      const formattedTransactions = (data || []).map((t: any) => ({
        ...t,
        is_pending: t.is_pending === true || t.is_pending === 'true',
      }));

      setTransactions(formattedTransactions);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Carregar transações dos últimos 3 meses por padrão
    const startDate = subMonths(new Date(), 3);
    fetchTransactions(startDate);
  }, [fetchTransactions]);

  const createTransaction = async (
    transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      // Criar transação
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...transaction, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Atualizar saldo da conta
      const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
      try {
        await supabase.rpc('update_account_balance', {
          account_id: transaction.account_id,
          amount_change: balanceChange,
        });
      } catch {
        // Se a função RPC não existir, fazer manualmente
        const { data: acc } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', transaction.account_id)
          .single();
        if (acc) {
          await supabase
            .from('accounts')
            .update({ balance: acc.balance + balanceChange })
            .eq('id', transaction.account_id);
        }
      }

      // Se for transferência, atualizar conta destino
      if (transaction.type === 'transfer' && transaction.to_account_id) {
        await supabase
          .from('accounts')
          .select('balance')
          .eq('id', transaction.to_account_id)
          .single()
          .then(({ data: acc }) => {
            if (acc) {
              return supabase
                .from('accounts')
                .update({ balance: acc.balance + transaction.amount })
                .eq('id', transaction.to_account_id);
            }
          });
      }

      setTransactions(prev => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setTransactions(prev => prev.map(t => t.id === id ? data : t));
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      // Encontrar transação para reverter o saldo
      const transaction = transactions.find(t => t.id === id);

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Reverter saldo da conta
      if (transaction) {
        const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
        await supabase
          .from('accounts')
          .select('balance')
          .eq('id', transaction.account_id)
          .single()
          .then(({ data: acc }) => {
            if (acc) {
              return supabase
                .from('accounts')
                .update({ balance: acc.balance + balanceChange })
                .eq('id', transaction.account_id);
            }
          });
      }

      setTransactions(prev => prev.filter(t => t.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const getMonthlyTransactions = (date: Date = new Date()) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= start && tDate <= end;
    });
  };

  const getMonthSummary = (date: Date = new Date()): MonthSummary => {
    const monthTransactions = getMonthlyTransactions(date);

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      month: format(date, 'yyyy-MM'),
      income,
      expense,
      balance: income - expense,
    };
  };

  const getCategorySummary = (
    categories: Category[],
    type: 'income' | 'expense',
    date: Date = new Date()
  ): CategorySummary[] => {
    const monthTransactions = getMonthlyTransactions(date).filter(t => t.type === type);
    const total = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

    const categoryMap = new Map<string, { total: number; count: number }>();

    monthTransactions.forEach(t => {
      const existing = categoryMap.get(t.category_id) || { total: 0, count: 0 };
      categoryMap.set(t.category_id, {
        total: existing.total + t.amount,
        count: existing.count + 1,
      });
    });

    return Array.from(categoryMap.entries())
      .map(([categoryId, data]) => {
        const category = categories.find(c => c.id === categoryId);
        if (!category) return null;

        return {
          category,
          total: data.total,
          percentage: total > 0 ? (data.total / total) * 100 : 0,
          transactions_count: data.count,
        };
      })
      .filter((item): item is CategorySummary => item !== null)
      .sort((a, b) => b.total - a.total);
  };

  const getLast6MonthsSummary = (): MonthSummary[] => {
    const summaries: MonthSummary[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      summaries.push(getMonthSummary(date));
    }
    return summaries;
  };

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getMonthlyTransactions,
    getMonthSummary,
    getCategorySummary,
    getLast6MonthsSummary,
  };
}
