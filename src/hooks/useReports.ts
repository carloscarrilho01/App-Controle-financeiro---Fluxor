import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Transaction,
  Category,
  Account,
  MonthSummary,
  CategorySummary,
  FinancialHealth,
  CashFlowProjection
} from '../types';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  differenceInDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyReport {
  month: string;
  year: number;
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
  topExpenseCategories: CategorySummary[];
  topIncomeCategories: CategorySummary[];
  transactionCount: number;
  averageExpense: number;
  largestExpense: Transaction | null;
}

interface YearlyReport {
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  averageMonthlyIncome: number;
  averageMonthlyExpense: number;
  bestMonth: { month: string; balance: number };
  worstMonth: { month: string; balance: number };
  monthlyBreakdown: MonthSummary[];
  categoryBreakdown: CategorySummary[];
}

interface ExpenseAnalysis {
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  peakDay: { date: string; amount: number };
  peakCategory: { category: Category; amount: number };
  unusualExpenses: Transaction[];
}

export function useReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todas as transações para um período
  const fetchTransactions = async (startDate: string, endDate: string): Promise<Transaction[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  // Buscar categorias
  const fetchCategories = async (): Promise<Category[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    return data || [];
  };

  // Gerar relatório mensal
  const getMonthlyReport = useCallback(async (month: number, year: number): Promise<MonthlyReport | null> => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    try {
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

      const [transactions, categories] = await Promise.all([
        fetchTransactions(startDate, endDate),
        fetchCategories(),
      ]);

      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const balance = income - expense;
      const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

      // Agrupar por categoria
      const expenseByCategory: Record<string, number> = {};
      const incomeByCategory: Record<string, number> = {};

      transactions.forEach(t => {
        if (t.type === 'expense') {
          expenseByCategory[t.category_id] = (expenseByCategory[t.category_id] || 0) + t.amount;
        } else if (t.type === 'income') {
          incomeByCategory[t.category_id] = (incomeByCategory[t.category_id] || 0) + t.amount;
        }
      });

      const topExpenseCategories: CategorySummary[] = Object.entries(expenseByCategory)
        .map(([categoryId, total]) => {
          const category = categories.find(c => c.id === categoryId);
          return {
            category: category!,
            total,
            percentage: expense > 0 ? (total / expense) * 100 : 0,
            transactions_count: transactions.filter(t => t.category_id === categoryId).length,
          };
        })
        .filter(c => c.category)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      const topIncomeCategories: CategorySummary[] = Object.entries(incomeByCategory)
        .map(([categoryId, total]) => {
          const category = categories.find(c => c.id === categoryId);
          return {
            category: category!,
            total,
            percentage: income > 0 ? (total / income) * 100 : 0,
            transactions_count: transactions.filter(t => t.category_id === categoryId).length,
          };
        })
        .filter(c => c.category)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      const expenseTransactions = transactions.filter(t => t.type === 'expense');
      const largestExpense = expenseTransactions.length > 0
        ? expenseTransactions.reduce((max, t) => t.amount > max.amount ? t : max)
        : null;

      return {
        month: format(new Date(year, month - 1), 'MMMM', { locale: ptBR }),
        year,
        income,
        expense,
        balance,
        savingsRate,
        topExpenseCategories,
        topIncomeCategories,
        transactionCount: transactions.length,
        averageExpense: expenseTransactions.length > 0 ? expense / expenseTransactions.length : 0,
        largestExpense,
      };
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Gerar relatório anual
  const getYearlyReport = useCallback(async (year: number): Promise<YearlyReport | null> => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const [transactions, categories] = await Promise.all([
        fetchTransactions(startDate, endDate),
        fetchCategories(),
      ]);

      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      // Agrupar por mês
      const monthlyData: Record<string, { income: number; expense: number }> = {};

      for (let m = 1; m <= 12; m++) {
        const monthKey = `${year}-${m.toString().padStart(2, '0')}`;
        monthlyData[monthKey] = { income: 0, expense: 0 };
      }

      transactions.forEach(t => {
        const monthKey = t.date.substring(0, 7);
        if (monthlyData[monthKey]) {
          if (t.type === 'income') {
            monthlyData[monthKey].income += t.amount;
          } else if (t.type === 'expense') {
            monthlyData[monthKey].expense += t.amount;
          }
        }
      });

      const monthlyBreakdown: MonthSummary[] = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense,
      }));

      // Encontrar melhor e pior mês
      const sortedMonths = [...monthlyBreakdown].sort((a, b) => b.balance - a.balance);
      const bestMonth = sortedMonths[0];
      const worstMonth = sortedMonths[sortedMonths.length - 1];

      // Agrupar por categoria
      const categoryTotals: Record<string, number> = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
        categoryTotals[t.category_id] = (categoryTotals[t.category_id] || 0) + t.amount;
      });

      const categoryBreakdown: CategorySummary[] = Object.entries(categoryTotals)
        .map(([categoryId, total]) => {
          const category = categories.find(c => c.id === categoryId);
          return {
            category: category!,
            total,
            percentage: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
            transactions_count: transactions.filter(t => t.category_id === categoryId).length,
          };
        })
        .filter(c => c.category)
        .sort((a, b) => b.total - a.total);

      return {
        year,
        totalIncome,
        totalExpense,
        totalBalance: totalIncome - totalExpense,
        averageMonthlyIncome: totalIncome / 12,
        averageMonthlyExpense: totalExpense / 12,
        bestMonth: { month: bestMonth.month, balance: bestMonth.balance },
        worstMonth: { month: worstMonth.month, balance: worstMonth.balance },
        monthlyBreakdown,
        categoryBreakdown,
      };
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Análise de despesas
  const getExpenseAnalysis = useCallback(async (months: number = 3): Promise<ExpenseAnalysis | null> => {
    if (!user) return null;

    setLoading(true);

    try {
      const endDate = new Date();
      const startDate = subMonths(endDate, months);

      const [transactions, categories] = await Promise.all([
        fetchTransactions(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')),
        fetchCategories(),
      ]);

      const expenses = transactions.filter(t => t.type === 'expense');
      const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
      const days = differenceInDays(endDate, startDate) || 1;

      const dailyAverage = totalExpense / days;
      const weeklyAverage = dailyAverage * 7;
      const monthlyAverage = totalExpense / months;

      // Calcular tendência (comparar primeira metade com segunda metade)
      const midDate = new Date((startDate.getTime() + endDate.getTime()) / 2);
      const firstHalf = expenses.filter(t => parseISO(t.date) < midDate);
      const secondHalf = expenses.filter(t => parseISO(t.date) >= midDate);

      const firstHalfTotal = firstHalf.reduce((sum, t) => sum + t.amount, 0);
      const secondHalfTotal = secondHalf.reduce((sum, t) => sum + t.amount, 0);

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let trendPercentage = 0;

      if (firstHalfTotal > 0) {
        trendPercentage = ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100;
        if (trendPercentage > 10) trend = 'increasing';
        else if (trendPercentage < -10) trend = 'decreasing';
      }

      // Encontrar dia de pico
      const dailyTotals: Record<string, number> = {};
      expenses.forEach(t => {
        dailyTotals[t.date] = (dailyTotals[t.date] || 0) + t.amount;
      });

      const peakDayEntry = Object.entries(dailyTotals)
        .sort((a, b) => b[1] - a[1])[0];

      const peakDay = peakDayEntry
        ? { date: peakDayEntry[0], amount: peakDayEntry[1] }
        : { date: '', amount: 0 };

      // Encontrar categoria de pico
      const categoryTotals: Record<string, number> = {};
      expenses.forEach(t => {
        categoryTotals[t.category_id] = (categoryTotals[t.category_id] || 0) + t.amount;
      });

      const peakCategoryEntry = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0];

      const peakCategory = peakCategoryEntry
        ? {
            category: categories.find(c => c.id === peakCategoryEntry[0])!,
            amount: peakCategoryEntry[1],
          }
        : { category: categories[0], amount: 0 };

      // Identificar despesas incomuns (acima de 2x a média)
      const threshold = monthlyAverage / 30 * 2; // 2x a média diária
      const unusualExpenses = expenses.filter(t => t.amount > threshold);

      return {
        dailyAverage,
        weeklyAverage,
        monthlyAverage,
        trend,
        trendPercentage,
        peakDay,
        peakCategory,
        unusualExpenses: unusualExpenses.slice(0, 10),
      };
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Calcular saúde financeira
  const getFinancialHealth = useCallback(async (): Promise<FinancialHealth | null> => {
    if (!user) return null;

    setLoading(true);

    try {
      // Buscar dados dos últimos 3 meses
      const endDate = new Date();
      const startDate = subMonths(endDate, 3);

      const [transactions, accounts] = await Promise.all([
        fetchTransactions(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')),
        (async () => {
          const { data } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user.id);
          return data || [];
        })(),
      ]);

      // Buscar dívidas
      const { data: debts } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
      const totalDebt = debts?.reduce((sum, d) => sum + d.current_balance, 0) || 0;

      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyIncome = income / 3;
      const monthlyExpense = expense / 3;

      // Calcular métricas
      const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;
      const expenseRatio = monthlyIncome > 0 ? (monthlyExpense / monthlyIncome) * 100 : 0;
      const debtRatio = monthlyIncome > 0 ? (totalDebt / (monthlyIncome * 12)) * 100 : 0;
      const emergencyFundMonths = monthlyExpense > 0 ? totalBalance / monthlyExpense : 0;

      // Calcular score (0-1000)
      let score = 500; // Base

      // Ajustar por taxa de poupança (+/- até 150 pontos)
      if (savingsRate >= 30) score += 150;
      else if (savingsRate >= 20) score += 100;
      else if (savingsRate >= 10) score += 50;
      else if (savingsRate < 0) score -= 100;

      // Ajustar por fundo de emergência (+/- até 150 pontos)
      if (emergencyFundMonths >= 6) score += 150;
      else if (emergencyFundMonths >= 3) score += 100;
      else if (emergencyFundMonths >= 1) score += 50;
      else score -= 50;

      // Ajustar por dívidas (+/- até 150 pontos)
      if (debtRatio === 0) score += 150;
      else if (debtRatio < 20) score += 100;
      else if (debtRatio < 40) score += 50;
      else if (debtRatio > 80) score -= 150;
      else if (debtRatio > 60) score -= 100;

      // Ajustar por razão despesa/receita (+/- até 50 pontos)
      if (expenseRatio < 50) score += 50;
      else if (expenseRatio > 100) score -= 50;

      score = Math.max(0, Math.min(1000, score));

      // Calcular comprometimento de renda com dívidas
      const monthlyDebtPayments = debts?.reduce((sum, d) => sum + (d.monthly_payment || 0), 0) || 0;
      const debtIncomeRatio = monthlyIncome > 0 ? (monthlyDebtPayments / monthlyIncome) * 100 : 0;

      // Gerar recomendações
      const recommendations: string[] = [];

      if (savingsRate < 20) {
        recommendations.push('Tente poupar pelo menos 20% da sua renda mensal');
      }
      if (emergencyFundMonths < 6) {
        recommendations.push('Construa um fundo de emergência de 6 meses de despesas');
      }
      if (debtRatio > 30) {
        recommendations.push('Priorize o pagamento das dívidas com maiores juros (estratégia avalanche)');
      }
      if (debtIncomeRatio > 30) {
        recommendations.push(`Suas parcelas de dívidas comprometem ${debtIncomeRatio.toFixed(0)}% da renda. Tente renegociar prazos ou taxas.`);
      }
      if ((debts?.length || 0) > 0 && debtRatio <= 30) {
        recommendations.push('Continue pagando suas dívidas em dia. Considere pagamentos extras quando possível.');
      }
      if (expenseRatio > 80) {
        recommendations.push('Revise seus gastos e identifique onde pode economizar');
      }
      if (score >= 800) {
        recommendations.push('Excelente! Considere diversificar seus investimentos');
      }

      return {
        score,
        savings_rate: savingsRate,
        expense_ratio: expenseRatio,
        debt_ratio: debtRatio,
        emergency_fund_months: emergencyFundMonths,
        recommendations,
      };
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Projeção de fluxo de caixa (agora inclui parcelas de dívidas)
  const getCashFlowProjection = useCallback(async (months: number = 3): Promise<CashFlowProjection[]> => {
    if (!user) return [];

    try {
      // Buscar histórico para calcular médias
      const endDate = new Date();
      const startDate = subMonths(endDate, 6);

      const transactions = await fetchTransactions(
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      );

      // Calcular médias mensais
      const monthlyIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0) / 6;

      const monthlyExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0) / 6;

      // Buscar dívidas ativas para incluir parcelas na projeção
      const { data: activeDebts } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const monthlyDebtPayments = activeDebts?.reduce((sum, d) => sum + (d.monthly_payment || 0), 0) || 0;
      const totalDebtBalance = activeDebts?.reduce((sum, d) => sum + d.current_balance, 0) || 0;

      // Buscar saldo atual
      const { data: accounts } = await supabase
        .from('accounts')
        .select('balance')
        .eq('user_id', user.id);

      let currentBalance = accounts?.reduce((sum, a) => sum + a.balance, 0) || 0;

      // Gerar projeção incluindo dívidas
      const projections: CashFlowProjection[] = [];
      let remainingDebt = totalDebtBalance;

      for (let i = 1; i <= months; i++) {
        const projectedDate = addMonths(endDate, i);
        // Parcelas de dívida são somadas às despesas projetadas
        const debtPaymentThisMonth = remainingDebt > 0 ? Math.min(monthlyDebtPayments, remainingDebt) : 0;
        remainingDebt = Math.max(0, remainingDebt - debtPaymentThisMonth);

        const totalExpense = monthlyExpense + debtPaymentThisMonth;
        const projectedBalance = currentBalance + (monthlyIncome - totalExpense) * i;

        projections.push({
          date: format(projectedDate, 'yyyy-MM-dd'),
          projected_income: monthlyIncome,
          projected_expense: totalExpense,
          projected_balance: projectedBalance,
        });
      }

      return projections;
    } catch (err) {
      console.error('Erro na projeção:', err);
      return [];
    }
  }, [user]);

  // Comparativo entre períodos
  const comparePeriods = useCallback(async (
    period1Start: string,
    period1End: string,
    period2Start: string,
    period2End: string
  ) => {
    if (!user) return null;

    try {
      const [transactions1, transactions2] = await Promise.all([
        fetchTransactions(period1Start, period1End),
        fetchTransactions(period2Start, period2End),
      ]);

      const period1 = {
        income: transactions1.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expense: transactions1.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        transactionCount: transactions1.length,
      };

      const period2 = {
        income: transactions2.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expense: transactions2.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        transactionCount: transactions2.length,
      };

      return {
        period1,
        period2,
        incomeChange: period1.income > 0 ? ((period2.income - period1.income) / period1.income) * 100 : 0,
        expenseChange: period1.expense > 0 ? ((period2.expense - period1.expense) / period1.expense) * 100 : 0,
      };
    } catch (err) {
      console.error('Erro na comparação:', err);
      return null;
    }
  }, [user]);

  return {
    loading,
    error,
    getMonthlyReport,
    getYearlyReport,
    getExpenseAnalysis,
    getFinancialHealth,
    getCashFlowProjection,
    comparePeriods,
  };
}
