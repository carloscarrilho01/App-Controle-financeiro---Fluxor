import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Account } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Garantir que is_archived seja booleano
      const formattedAccounts = (data || []).map((a: any) => ({
        ...a,
        is_archived: a.is_archived === true || a.is_archived === 'true',
      }));

      setAccounts(formattedAccounts);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const createAccount = async (account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({ ...account, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setAccounts(prev => [...prev, data]);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setAccounts(prev => prev.map(acc => acc.id === id ? data : acc));
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const getTotalBalance = () => {
    return accounts.reduce((total, acc) => {
      // Cartão de crédito é negativo no saldo total
      if (acc.type === 'credit_card') {
        return total - acc.balance;
      }
      return total + acc.balance;
    }, 0);
  };

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    getTotalBalance,
  };
}
