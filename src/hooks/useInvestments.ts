import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Investment, InvestmentTransaction, INVESTMENT_TYPES } from '../types';

interface InvestmentSummary {
  totalInvested: number;
  currentValue: number;
  totalProfit: number;
  profitPercentage: number;
  byType: {
    type: keyof typeof INVESTMENT_TYPES;
    invested: number;
    currentValue: number;
    profit: number;
    percentage: number;
  }[];
}

export function useInvestments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestments = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setInvestments(data || []);
    } catch (err) {
      console.error('Erro ao buscar investimentos:', err);
      setError('Erro ao carregar investimentos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchTransactions = useCallback(async (investmentId?: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('investment_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (investmentId) {
        query = query.eq('investment_id', investmentId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err) {
      console.error('Erro ao buscar transações de investimento:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const createInvestment = async (
    investment: Omit<Investment, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { data, error: insertError } = await supabase
        .from('investments')
        .insert({
          ...investment,
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Criar transação de compra inicial
      await supabase
        .from('investment_transactions')
        .insert({
          investment_id: data.id,
          type: 'buy',
          quantity: investment.quantity,
          price: investment.purchase_price,
          total: investment.quantity * investment.purchase_price,
          date: investment.purchase_date,
        });

      setInvestments((prev) => [data, ...prev]);
      return { data, error: null };
    } catch (err: any) {
      console.error('Erro ao criar investimento:', err);
      return { error: err.message || 'Erro ao criar investimento' };
    }
  };

  const updateInvestment = async (id: string, updates: Partial<Investment>) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { data, error: updateError } = await supabase
        .from('investments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setInvestments((prev) => prev.map((i) => (i.id === id ? data : i)));
      return { data, error: null };
    } catch (err: any) {
      console.error('Erro ao atualizar investimento:', err);
      return { error: err.message || 'Erro ao atualizar investimento' };
    }
  };

  const deleteInvestment = async (id: string) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { error: deleteError } = await supabase
        .from('investments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setInvestments((prev) => prev.filter((i) => i.id !== id));
      return { error: null };
    } catch (err: any) {
      console.error('Erro ao excluir investimento:', err);
      return { error: err.message || 'Erro ao excluir investimento' };
    }
  };

  // Registrar transação de investimento (compra, venda, dividendo, etc.)
  const addInvestmentTransaction = async (
    transaction: Omit<InvestmentTransaction, 'id' | 'created_at'>
  ) => {
    try {
      const { data, error: insertError } = await supabase
        .from('investment_transactions')
        .insert(transaction)
        .select()
        .single();

      if (insertError) throw insertError;

      // Atualizar quantidade e preço médio do investimento
      const investment = investments.find((i) => i.id === transaction.investment_id);
      if (investment) {
        let newQuantity = investment.quantity;
        let newPurchasePrice = investment.purchase_price;

        if (transaction.type === 'buy') {
          // Calcular novo preço médio
          const totalCost = investment.quantity * investment.purchase_price + transaction.total;
          newQuantity = investment.quantity + transaction.quantity;
          newPurchasePrice = totalCost / newQuantity;
        } else if (transaction.type === 'sell') {
          newQuantity = investment.quantity - transaction.quantity;
        } else if (transaction.type === 'split') {
          newQuantity = investment.quantity * transaction.quantity;
          newPurchasePrice = investment.purchase_price / transaction.quantity;
        }

        await updateInvestment(investment.id, {
          quantity: newQuantity,
          purchase_price: newPurchasePrice,
        });
      }

      setTransactions((prev) => [data, ...prev]);
      return { data, error: null };
    } catch (err: any) {
      console.error('Erro ao adicionar transação de investimento:', err);
      return { error: err.message || 'Erro ao adicionar transação' };
    }
  };

  // Atualizar cotação atual
  const updateCurrentPrice = async (id: string, currentPrice: number) => {
    return updateInvestment(id, { current_price: currentPrice });
  };

  // Calcular resumo dos investimentos
  const getSummary = (): InvestmentSummary => {
    const totalInvested = investments.reduce(
      (sum, i) => sum + i.quantity * i.purchase_price,
      0
    );
    const currentValue = investments.reduce(
      (sum, i) => sum + i.quantity * i.current_price,
      0
    );
    const totalProfit = currentValue - totalInvested;
    const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    // Agrupar por tipo
    const byTypeMap: Record<string, { invested: number; currentValue: number }> = {};
    investments.forEach((inv) => {
      if (!byTypeMap[inv.type]) {
        byTypeMap[inv.type] = { invested: 0, currentValue: 0 };
      }
      byTypeMap[inv.type].invested += inv.quantity * inv.purchase_price;
      byTypeMap[inv.type].currentValue += inv.quantity * inv.current_price;
    });

    const byType = Object.entries(byTypeMap).map(([type, data]) => ({
      type: type as keyof typeof INVESTMENT_TYPES,
      invested: data.invested,
      currentValue: data.currentValue,
      profit: data.currentValue - data.invested,
      percentage: currentValue > 0 ? (data.currentValue / currentValue) * 100 : 0,
    }));

    return {
      totalInvested,
      currentValue,
      totalProfit,
      profitPercentage,
      byType,
    };
  };

  // Calcular lucro/prejuízo de um investimento específico
  const getInvestmentProfit = (investment: Investment) => {
    const invested = investment.quantity * investment.purchase_price;
    const current = investment.quantity * investment.current_price;
    const profit = current - invested;
    const percentage = invested > 0 ? (profit / invested) * 100 : 0;

    return { invested, current, profit, percentage };
  };

  // Obter dividendos recebidos
  const getTotalDividends = (investmentId?: string) => {
    return transactions
      .filter(
        (t) =>
          t.type === 'dividend' &&
          (!investmentId || t.investment_id === investmentId)
      )
      .reduce((sum, t) => sum + t.total, 0);
  };

  return {
    investments,
    transactions,
    loading,
    error,
    fetchInvestments,
    fetchTransactions,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    addInvestmentTransaction,
    updateCurrentPrice,
    getSummary,
    getInvestmentProfit,
    getTotalDividends,
  };
}
