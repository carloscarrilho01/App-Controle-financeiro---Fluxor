import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Debt, DebtPayment, DEBT_TYPES } from '../types';
import { addMonths, format, differenceInMonths, addDays, isBefore } from 'date-fns';

interface DebtSummary {
  totalDebt: number;
  totalPaid: number;
  totalRemaining: number;
  monthlyPayments: number;
  debtsByType: {
    type: keyof typeof DEBT_TYPES;
    count: number;
    total: number;
  }[];
  averageInterestRate: number;
  projectedPayoffDate: string | null;
}

interface AmortizationSchedule {
  installment: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export function useDebts() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDebts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Garantir que is_active seja booleano
      const formattedDebts = (data || []).map((d: any) => ({
        ...d,
        is_active: d.is_active === true || d.is_active === 'true',
      }));

      setDebts(formattedDebts);
    } catch (err) {
      console.error('Erro ao buscar dívidas:', err);
      setError('Erro ao carregar dívidas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchPayments = useCallback(async (debtId?: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('debt_payments')
        .select('*')
        .order('date', { ascending: false });

      if (debtId) {
        query = query.eq('debt_id', debtId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Garantir que is_extra seja booleano
      const formattedPayments = (data || []).map((p: any) => ({
        ...p,
        is_extra: p.is_extra === true || p.is_extra === 'true',
      }));

      setPayments(formattedPayments);
    } catch (err) {
      console.error('Erro ao buscar pagamentos:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const createDebt = async (debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: 'Usuário não autenticado' };

    // 🚀 OPTIMISTIC UPDATE
    const tempId = `temp_${Date.now()}`;
    const optimisticDebt: Debt = {
      ...debt,
      id: tempId,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Debt;

    setDebts((prev) => [optimisticDebt, ...prev]);

    try {
      const { data, error: insertError } = await supabase
        .from('debts')
        .insert({
          ...debt,
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Substituir pelo real
      setDebts((prev) => prev.map((d) => d.id === tempId ? { ...data, is_active: data.is_active === true } : d));
      return { data, error: null };
    } catch (err: any) {
      // ❌ ROLLBACK
      setDebts((prev) => prev.filter((d) => d.id !== tempId));
      console.error('Erro ao criar dívida:', err);
      return { error: err.message || 'Erro ao criar dívida' };
    }
  };

  const updateDebt = async (id: string, updates: Partial<Debt>) => {
    if (!user) return { error: 'Usuário não autenticado' };

    const previousDebts = [...debts];

    // 🚀 OPTIMISTIC UPDATE
    setDebts((prev) => prev.map((d) => d.id === id ? { ...d, ...updates } : d));

    try {
      const { data, error: updateError } = await supabase
        .from('debts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setDebts((prev) => prev.map((d) => (d.id === id ? { ...data, is_active: data.is_active === true } : d)));
      return { data, error: null };
    } catch (err: any) {
      // ❌ ROLLBACK
      setDebts(previousDebts);
      console.error('Erro ao atualizar dívida:', err);
      return { error: err.message || 'Erro ao atualizar dívida' };
    }
  };

  const deleteDebt = async (id: string) => {
    if (!user) return { error: 'Usuário não autenticado' };

    const previousDebts = [...debts];

    // 🚀 OPTIMISTIC UPDATE
    setDebts((prev) => prev.filter((d) => d.id !== id));

    try {
      const { error: deleteError } = await supabase
        .from('debts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      return { error: null };
    } catch (err: any) {
      // ❌ ROLLBACK
      setDebts(previousDebts);
      console.error('Erro ao excluir dívida:', err);
      return { error: err.message || 'Erro ao excluir dívida' };
    }
  };

  // Registrar pagamento e criar transação vinculada
  const addPayment = async (
    debtId: string,
    payment: Omit<DebtPayment, 'id' | 'debt_id' | 'created_at'>,
    options?: { accountId?: string; categoryId?: string; createTransaction?: boolean }
  ) => {
    try {
      const { data, error: insertError } = await supabase
        .from('debt_payments')
        .insert({
          ...payment,
          debt_id: debtId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Atualizar saldo da dívida
      const debt = debts.find((d) => d.id === debtId);
      if (debt) {
        const newBalance = debt.current_balance - payment.principal;
        const newPaidInstallments = debt.paid_installments + (payment.is_extra ? 0 : 1);

        await updateDebt(debtId, {
          current_balance: Math.max(0, newBalance),
          paid_installments: newPaidInstallments,
          is_active: newBalance > 0,
        });

        // Criar transação de despesa vinculada (se solicitado)
        if (options?.createTransaction && options.accountId) {
          try {
            await supabase.from('transactions').insert({
              user_id: user!.id,
              account_id: options.accountId,
              category_id: options.categoryId || null,
              type: 'expense',
              amount: payment.amount,
              description: `Pagamento: ${debt.name}${payment.is_extra ? ' (Extra)' : ''} - Parcela ${payment.installment_number}`,
              date: payment.date,
              notes: `Dívida: ${debt.name} | Principal: R$ ${payment.principal.toFixed(2)} | Juros: R$ ${payment.interest.toFixed(2)}`,
            });
          } catch (txErr) {
            console.warn('Transação vinculada não foi criada:', txErr);
          }
        }
      }

      setPayments((prev) => [data, ...prev]);
      return { data, error: null };
    } catch (err: any) {
      console.error('Erro ao adicionar pagamento:', err);
      return { error: err.message || 'Erro ao adicionar pagamento' };
    }
  };

  // Obter dívidas próximas do vencimento
  const getUpcomingDebts = (daysAhead: number = 7): Debt[] => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return debts
      .filter((d) => d.is_active && d.due_day)
      .filter((d) => {
        // Calcular a próxima data de vencimento
        let dueDate = new Date(currentYear, currentMonth, d.due_day!);
        if (isBefore(dueDate, today)) {
          // Se já passou, pegar o próximo mês
          dueDate = new Date(currentYear, currentMonth + 1, d.due_day!);
        }
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= daysAhead;
      })
      .sort((a, b) => (a.due_day || 0) - (b.due_day || 0));
  };

  // Obter dados para integração com o AI/Reports
  const getDebtsForAnalysis = () => {
    const activeDebts = debts.filter((d) => d.is_active);
    const totalDebt = activeDebts.reduce((sum, d) => sum + d.current_balance, 0);
    const totalMonthly = activeDebts.reduce((sum, d) => sum + (d.monthly_payment || 0), 0);
    const highestInterest = activeDebts.length > 0
      ? activeDebts.reduce((max, d) => d.interest_rate > max.interest_rate ? d : max)
      : null;
    const totalOriginal = activeDebts.reduce((sum, d) => sum + d.original_amount, 0);
    const totalPaid = totalOriginal - totalDebt;

    return {
      activeDebts,
      totalDebt,
      totalMonthly,
      totalOriginal,
      totalPaid,
      debtCount: activeDebts.length,
      highestInterest,
      averageInterestRate: activeDebts.length > 0
        ? activeDebts.reduce((sum, d) => sum + d.interest_rate, 0) / activeDebts.length
        : 0,
      debtsByType: activeDebts.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] || 0) + d.current_balance;
        return acc;
      }, {} as Record<string, number>),
    };
  };

  // Calcular parcela usando tabela Price
  const calculatePriceInstallment = (
    principal: number,
    monthlyRate: number,
    months: number
  ): number => {
    if (monthlyRate === 0) return principal / months;
    const factor = Math.pow(1 + monthlyRate, months);
    return principal * (monthlyRate * factor) / (factor - 1);
  };

  // Gerar tabela de amortização
  const getAmortizationSchedule = (debt: Debt): AmortizationSchedule[] => {
    const schedule: AmortizationSchedule[] = [];
    let balance = debt.original_amount;
    const monthlyRate = debt.interest_rate / 100;
    const totalInstallments = debt.total_installments || 12;
    const installmentAmount = calculatePriceInstallment(
      debt.original_amount,
      monthlyRate,
      totalInstallments
    );

    for (let i = 1; i <= totalInstallments; i++) {
      const interest = balance * monthlyRate;
      const principal = installmentAmount - interest;
      balance = Math.max(0, balance - principal);

      schedule.push({
        installment: i,
        date: format(addMonths(new Date(debt.start_date), i - 1), 'yyyy-MM-dd'),
        payment: installmentAmount,
        principal,
        interest,
        balance,
      });
    }

    return schedule;
  };

  // Estratégia bola de neve (menor saldo primeiro)
  const getSnowballStrategy = () => {
    return [...debts]
      .filter((d) => d.is_active)
      .sort((a, b) => a.current_balance - b.current_balance);
  };

  // Estratégia avalanche (maior juros primeiro)
  const getAvalancheStrategy = () => {
    return [...debts]
      .filter((d) => d.is_active)
      .sort((a, b) => b.interest_rate - a.interest_rate);
  };

  // Calcular resumo das dívidas
  const getSummary = (): DebtSummary => {
    const activeDebts = debts.filter((d) => d.is_active);

    const totalDebt = activeDebts.reduce((sum, d) => sum + d.original_amount, 0);
    const totalRemaining = activeDebts.reduce((sum, d) => sum + d.current_balance, 0);
    const totalPaid = totalDebt - totalRemaining;
    const monthlyPayments = activeDebts.reduce((sum, d) => sum + d.monthly_payment, 0);

    // Agrupar por tipo
    const typeMap: Record<string, { count: number; total: number }> = {};
    activeDebts.forEach((debt) => {
      if (!typeMap[debt.type]) {
        typeMap[debt.type] = { count: 0, total: 0 };
      }
      typeMap[debt.type].count++;
      typeMap[debt.type].total += debt.current_balance;
    });

    const debtsByType = Object.entries(typeMap).map(([type, data]) => ({
      type: type as keyof typeof DEBT_TYPES,
      ...data,
    }));

    // Taxa média de juros ponderada
    const weightedRates = activeDebts.reduce(
      (sum, d) => sum + d.interest_rate * d.current_balance,
      0
    );
    const averageInterestRate =
      totalRemaining > 0 ? weightedRates / totalRemaining : 0;

    // Data projetada de quitação
    let projectedPayoffDate: string | null = null;
    if (monthlyPayments > 0 && totalRemaining > 0) {
      const monthsToPayoff = Math.ceil(totalRemaining / monthlyPayments);
      projectedPayoffDate = format(
        addMonths(new Date(), monthsToPayoff),
        'yyyy-MM-dd'
      );
    }

    return {
      totalDebt,
      totalPaid,
      totalRemaining,
      monthlyPayments,
      debtsByType,
      averageInterestRate,
      projectedPayoffDate,
    };
  };

  // Calcular economia com pagamento extra
  const calculateExtraPaymentSavings = (
    debt: Debt,
    extraAmount: number
  ): { monthsSaved: number; interestSaved: number } => {
    const monthlyRate = debt.interest_rate / 100;

    // Calcular juros totais sem pagamento extra
    const normalSchedule = getAmortizationSchedule(debt);
    const remainingInstallments = (debt.total_installments || 12) - debt.paid_installments;
    const normalInterest = normalSchedule
      .slice(debt.paid_installments)
      .reduce((sum, s) => sum + s.interest, 0);

    // Calcular com pagamento extra (reduz saldo principal)
    const newBalance = debt.current_balance - extraAmount;
    const newMonthsNeeded = Math.ceil(
      Math.log(
        debt.monthly_payment / (debt.monthly_payment - newBalance * monthlyRate)
      ) / Math.log(1 + monthlyRate)
    );

    const monthsSaved = Math.max(0, remainingInstallments - newMonthsNeeded);

    // Estimar economia de juros
    const interestSaved = Math.max(0, normalInterest * (extraAmount / debt.current_balance));

    return { monthsSaved, interestSaved };
  };

  return {
    debts,
    payments,
    loading,
    error,
    fetchDebts,
    fetchPayments,
    createDebt,
    updateDebt,
    deleteDebt,
    addPayment,
    getAmortizationSchedule,
    getSnowballStrategy,
    getAvalancheStrategy,
    getSummary,
    calculateExtraPaymentSavings,
    calculatePriceInstallment,
    getUpcomingDebts,
    getDebtsForAnalysis,
  };
}
