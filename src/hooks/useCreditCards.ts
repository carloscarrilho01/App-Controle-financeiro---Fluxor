import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Account, Transaction, CreditCardBill, Installment } from '../types';
import { format, addMonths, parseISO, isBefore, isAfter, startOfMonth, endOfMonth } from 'date-fns';

interface CreditCardSummary {
  totalLimit: number;
  totalUsed: number;
  totalAvailable: number;
  cards: {
    account: Account;
    limit: number;
    used: number;
    available: number;
    currentBill: number;
    nextDueDate: string;
  }[];
}

export function useCreditCards() {
  const { user } = useAuth();
  const [creditCards, setCreditCards] = useState<Account[]>([]);
  const [bills, setBills] = useState<CreditCardBill[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCreditCards = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'credit_card')
        .eq('is_archived', false)
        .order('name');

      if (fetchError) throw fetchError;
      setCreditCards(data || []);
    } catch (err) {
      console.error('Erro ao buscar cartões de crédito:', err);
      setError('Erro ao carregar cartões de crédito');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchBills = useCallback(async (accountId?: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('credit_card_bills')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Garantir que is_paid e is_closed sejam booleanos
      const formattedBills = (data || []).map((b: any) => ({
        ...b,
        is_paid: b.is_paid === true || b.is_paid === 'true',
        is_closed: b.is_closed === true || b.is_closed === 'true',
      }));

      setBills(formattedBills);
    } catch (err) {
      console.error('Erro ao buscar faturas:', err);
    }
  }, [user]);

  const fetchInstallments = useCallback(async (accountId?: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('installments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setInstallments(data || []);
    } catch (err) {
      console.error('Erro ao buscar parcelamentos:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchCreditCards();
  }, [fetchCreditCards]);

  // Calcular data de fechamento da fatura
  const getClosingDate = (closingDay: number, month: number, year: number): Date => {
    const date = new Date(year, month - 1, closingDay);
    return date;
  };

  // Calcular data de vencimento da fatura
  const getDueDate = (dueDay: number, closingDay: number, month: number, year: number): Date => {
    // Se o vencimento é antes do fechamento, é no mês seguinte
    let dueMonth = month;
    let dueYear = year;

    if (dueDay <= closingDay) {
      dueMonth = month + 1;
      if (dueMonth > 12) {
        dueMonth = 1;
        dueYear = year + 1;
      }
    }

    return new Date(dueYear, dueMonth - 1, dueDay);
  };

  // Verificar em qual fatura uma transação cai
  const getBillPeriod = (
    transactionDate: string,
    closingDay: number
  ): { month: number; year: number } => {
    const date = parseISO(transactionDate);
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    // Se a data é após o fechamento, vai para a fatura do próximo mês
    if (date.getDate() > closingDay) {
      month = month + 1;
      if (month > 12) {
        month = 1;
        year = year + 1;
      }
    }

    return { month, year };
  };

  // Obter ou criar fatura
  const getOrCreateBill = async (
    accountId: string,
    month: number,
    year: number
  ): Promise<CreditCardBill | null> => {
    if (!user) return null;

    // Procurar fatura existente
    const existingBill = bills.find(
      (b) => b.account_id === accountId && b.month === month && b.year === year
    );

    if (existingBill) return existingBill;

    // Criar nova fatura
    const card = creditCards.find((c) => c.id === accountId);
    if (!card) return null;

    const closingDate = getClosingDate(card.closing_day || 1, month, year);
    const dueDate = getDueDate(card.due_day || 10, card.closing_day || 1, month, year);

    try {
      const { data, error: insertError } = await supabase
        .from('credit_card_bills')
        .insert({
          user_id: user.id,
          account_id: accountId,
          month,
          year,
          total_amount: 0,
          paid_amount: 0,
          closing_date: format(closingDate, 'yyyy-MM-dd'),
          due_date: format(dueDate, 'yyyy-MM-dd'),
          is_closed: false,
          is_paid: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setBills((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Erro ao criar fatura:', err);
      return null;
    }
  };

  // Criar parcelamento
  const createInstallment = async (
    installment: Omit<Installment, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { data, error: insertError } = await supabase
        .from('installments')
        .insert({
          ...installment,
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Criar transações para cada parcela
      const card = creditCards.find((c) => c.id === installment.account_id);
      const startDate = parseISO(installment.start_date);

      for (let i = 0; i < installment.total_installments; i++) {
        const installmentDate = format(addMonths(startDate, i), 'yyyy-MM-dd');

        await supabase.from('transactions').insert({
          user_id: user.id,
          account_id: installment.account_id,
          category_id: installment.category_id,
          type: 'expense',
          amount: installment.installment_amount,
          description: `${installment.description} (${i + 1}/${installment.total_installments})`,
          date: installmentDate,
          installment_id: data.id,
          installment_number: i + 1,
          total_installments: installment.total_installments,
        });
      }

      setInstallments((prev) => [data, ...prev]);
      return { data, error: null };
    } catch (err: any) {
      console.error('Erro ao criar parcelamento:', err);
      return { error: err.message || 'Erro ao criar parcelamento' };
    }
  };

  // Pagar fatura
  const payBill = async (billId: string, amount: number) => {
    try {
      const bill = bills.find((b) => b.id === billId);
      if (!bill) return { error: 'Fatura não encontrada' };

      const newPaidAmount = bill.paid_amount + amount;
      const isPaid = newPaidAmount >= bill.total_amount;

      const { data, error: updateError } = await supabase
        .from('credit_card_bills')
        .update({
          paid_amount: newPaidAmount,
          is_paid: isPaid,
          updated_at: new Date().toISOString(),
        })
        .eq('id', billId)
        .select()
        .single();

      if (updateError) throw updateError;

      setBills((prev) => prev.map((b) => (b.id === billId ? data : b)));
      return { data, error: null };
    } catch (err: any) {
      console.error('Erro ao pagar fatura:', err);
      return { error: err.message || 'Erro ao pagar fatura' };
    }
  };

  // Calcular gastos do cartão em um período
  const getCardSpending = async (
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('account_id', accountId)
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      return data?.reduce((sum, t) => sum + t.amount, 0) || 0;
    } catch (err) {
      console.error('Erro ao calcular gastos:', err);
      return 0;
    }
  };

  // Obter resumo dos cartões
  const getSummary = async (): Promise<CreditCardSummary> => {
    const cards = await Promise.all(
      creditCards.map(async (card) => {
        const limit = card.credit_limit || 0;
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Calcular uso atual (fatura aberta)
        const bill = bills.find(
          (b) =>
            b.account_id === card.id &&
            b.month === currentMonth &&
            b.year === currentYear
        );

        const used = bill?.total_amount || Math.abs(card.balance);
        const available = Math.max(0, limit - used);

        // Próximo vencimento
        const nextDueDate = getDueDate(
          card.due_day || 10,
          card.closing_day || 1,
          currentMonth,
          currentYear
        );

        return {
          account: card,
          limit,
          used,
          available,
          currentBill: bill?.total_amount || 0,
          nextDueDate: format(nextDueDate, 'yyyy-MM-dd'),
        };
      })
    );

    const totalLimit = cards.reduce((sum, c) => sum + c.limit, 0);
    const totalUsed = cards.reduce((sum, c) => sum + c.used, 0);
    const totalAvailable = cards.reduce((sum, c) => sum + c.available, 0);

    return {
      totalLimit,
      totalUsed,
      totalAvailable,
      cards,
    };
  };

  // Obter fatura atual de um cartão
  const getCurrentBill = (accountId: string): CreditCardBill | undefined => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    return bills.find(
      (b) =>
        b.account_id === accountId &&
        b.month === currentMonth &&
        b.year === currentYear
    );
  };

  // Obter faturas em aberto
  const getOpenBills = (): CreditCardBill[] => {
    return bills.filter((b) => !b.is_paid && isBefore(new Date(), parseISO(b.due_date)));
  };

  // Obter faturas vencidas
  const getOverdueBills = (): CreditCardBill[] => {
    return bills.filter((b) => !b.is_paid && isAfter(new Date(), parseISO(b.due_date)));
  };

  // Obter parcelamentos ativos
  const getActiveInstallments = (): Installment[] => {
    return installments.filter((i) => i.paid_installments < i.total_installments);
  };

  // Calcular total de parcelas futuras
  const getTotalFutureInstallments = (): number => {
    return installments.reduce((sum, i) => {
      const remaining = i.total_installments - i.paid_installments;
      return sum + remaining * i.installment_amount;
    }, 0);
  };

  return {
    creditCards,
    bills,
    installments,
    loading,
    error,
    fetchCreditCards,
    fetchBills,
    fetchInstallments,
    getOrCreateBill,
    createInstallment,
    payBill,
    getCardSpending,
    getSummary,
    getCurrentBill,
    getOpenBills,
    getOverdueBills,
    getActiveInstallments,
    getTotalFutureInstallments,
    getBillPeriod,
    getClosingDate,
    getDueDate,
  };
}
