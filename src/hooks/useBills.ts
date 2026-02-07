import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Bill } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useBills() {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Garantir que is_paid e is_recurring sejam booleanos
      const formattedBills = (data || []).map((b: any) => ({
        ...b,
        is_paid: b.is_paid === true || b.is_paid === 'true',
        is_recurring: b.is_recurring === true || b.is_recurring === 'true',
      }));

      setBills(formattedBills);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const createBill = async (bill: Omit<Bill, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: new Error('User not authenticated') };

    // Optimistic update - adiciona imediatamente com ID temporario
    const tempId = `temp_${Date.now()}`;
    const optimisticBill: Bill = {
      ...bill,
      id: tempId,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setBills(prev => [...prev, optimisticBill].sort((a, b) =>
      a.due_date.localeCompare(b.due_date)
    ));

    try {
      const { data, error } = await supabase
        .from('bills')
        .insert({ ...bill, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Substitui o item temporario pelo real
      const formattedData = {
        ...data,
        is_paid: data.is_paid === true || data.is_paid === 'true',
      };
      setBills(prev => prev.map(b => b.id === tempId ? formattedData : b));

      return { data: formattedData, error: null };
    } catch (err) {
      // Reverte o optimistic update em caso de erro
      setBills(prev => prev.filter(b => b.id !== tempId));
      return { data: null, error: err as Error };
    }
  };

  const updateBill = async (id: string, updates: Partial<Bill>) => {
    // Guarda o estado anterior para rollback
    const previousBills = [...bills];

    // Optimistic update
    setBills(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));

    try {
      const { data, error } = await supabase
        .from('bills')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const formattedData = {
        ...data,
        is_paid: data.is_paid === true || data.is_paid === 'true',
      };
      setBills(prev => prev.map(b => b.id === id ? formattedData : b));
      return { data: formattedData, error: null };
    } catch (err) {
      // Rollback em caso de erro
      setBills(previousBills);
      return { data: null, error: err as Error };
    }
  };

  const deleteBill = async (id: string) => {
    // Guarda o estado anterior para rollback
    const previousBills = [...bills];

    // Optimistic update
    setBills(prev => prev.filter(b => b.id !== id));

    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      // Rollback em caso de erro
      setBills(previousBills);
      return { error: err as Error };
    }
  };

  const markAsPaid = async (id: string) => {
    return updateBill(id, { is_paid: true });
  };

  const markAsUnpaid = async (id: string) => {
    return updateBill(id, { is_paid: false });
  };

  const getUpcomingBills = (days: number = 7) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return bills.filter(bill => {
      if (bill.is_paid) return false;
      const dueDate = new Date(bill.due_date + 'T12:00:00');
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= days;
    });
  };

  const getOverdueBills = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return bills.filter(bill => {
      if (bill.is_paid) return false;
      const dueDate = new Date(bill.due_date + 'T12:00:00');
      return dueDate < now;
    });
  };

  const getTotalPending = () => {
    return bills
      .filter(b => !b.is_paid)
      .reduce((sum, b) => sum + b.amount, 0);
  };

  // Total de contas pagas no mês atual (para somar nas despesas)
  const getTotalPaidThisMonth = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return bills
      .filter(b => {
        if (!b.is_paid) return false;
        const dueDate = new Date(b.due_date + 'T12:00:00');
        return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
      })
      .reduce((sum, b) => sum + b.amount, 0);
  };

  // Todas as contas do mês (pagas e pendentes)
  const getMonthBills = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return bills.filter(b => {
      const dueDate = new Date(b.due_date + 'T12:00:00');
      return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
    });
  };

  return {
    bills,
    loading,
    error,
    fetchBills,
    createBill,
    updateBill,
    deleteBill,
    markAsPaid,
    markAsUnpaid,
    getUpcomingBills,
    getOverdueBills,
    getTotalPending,
    getTotalPaidThisMonth,
    getMonthBills,
  };
}
