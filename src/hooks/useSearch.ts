import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Transaction, Category, Account } from '../types';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export interface SearchFilters {
  query?: string;
  type?: 'income' | 'expense' | 'transfer' | 'all';
  categoryIds?: string[];
  accountIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  tags?: string[];
  hasReceipt?: boolean;
  isPending?: boolean;
}

export interface SearchResult {
  transactions: Transaction[];
  totalCount: number;
  totalAmount: number;
  incomeTotal: number;
  expenseTotal: number;
}

export function useSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});

  const search = useCallback(async (searchFilters: SearchFilters): Promise<SearchResult> => {
    if (!user) {
      return { transactions: [], totalCount: 0, totalAmount: 0, incomeTotal: 0, expenseTotal: 0 };
    }

    setLoading(true);
    setError(null);
    setFilters(searchFilters);

    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      // Filtrar por tipo
      if (searchFilters.type && searchFilters.type !== 'all') {
        query = query.eq('type', searchFilters.type);
      }

      // Filtrar por categorias
      if (searchFilters.categoryIds && searchFilters.categoryIds.length > 0) {
        query = query.in('category_id', searchFilters.categoryIds);
      }

      // Filtrar por contas
      if (searchFilters.accountIds && searchFilters.accountIds.length > 0) {
        query = query.in('account_id', searchFilters.accountIds);
      }

      // Filtrar por data
      if (searchFilters.dateFrom) {
        query = query.gte('date', searchFilters.dateFrom);
      }
      if (searchFilters.dateTo) {
        query = query.lte('date', searchFilters.dateTo);
      }

      // Filtrar por valor
      if (searchFilters.amountMin !== undefined) {
        query = query.gte('amount', searchFilters.amountMin);
      }
      if (searchFilters.amountMax !== undefined) {
        query = query.lte('amount', searchFilters.amountMax);
      }

      // Filtrar por recibo
      if (searchFilters.hasReceipt !== undefined) {
        if (searchFilters.hasReceipt) {
          query = query.not('receipt_url', 'is', null);
        } else {
          query = query.is('receipt_url', null);
        }
      }

      // Filtrar por pendente
      if (searchFilters.isPending !== undefined) {
        query = query.eq('is_pending', searchFilters.isPending);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      let filteredData = data || [];

      // Filtrar por texto (descrição) - fazemos no cliente para busca flexível
      if (searchFilters.query && searchFilters.query.trim()) {
        const searchTerm = searchFilters.query.toLowerCase().trim();
        filteredData = filteredData.filter(
          (t) =>
            t.description?.toLowerCase().includes(searchTerm) ||
            t.notes?.toLowerCase().includes(searchTerm) ||
            t.location?.toLowerCase().includes(searchTerm)
        );
      }

      // Filtrar por tags
      if (searchFilters.tags && searchFilters.tags.length > 0) {
        filteredData = filteredData.filter((t) =>
          t.tags?.some((tag: string) => searchFilters.tags?.includes(tag))
        );
      }

      // Calcular totais
      const incomeTotal = filteredData
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expenseTotal = filteredData
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalAmount = incomeTotal - expenseTotal;

      setResults(filteredData);

      return {
        transactions: filteredData,
        totalCount: filteredData.length,
        totalAmount,
        incomeTotal,
        expenseTotal,
      };
    } catch (err: any) {
      console.error('Erro na busca:', err);
      setError('Erro ao realizar busca');
      return { transactions: [], totalCount: 0, totalAmount: 0, incomeTotal: 0, expenseTotal: 0 };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearSearch = () => {
    setResults([]);
    setFilters({});
    setError(null);
  };

  // Busca rápida por texto
  const quickSearch = useCallback(async (query: string) => {
    return search({ query });
  }, [search]);

  // Buscar transações recentes
  const getRecentTransactions = useCallback(async (limit: number = 10) => {
    if (!user) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error('Erro ao buscar transações recentes:', err);
      return [];
    }
  }, [user]);

  // Buscar transações por tag
  const searchByTag = useCallback(async (tag: string) => {
    return search({ tags: [tag] });
  }, [search]);

  // Buscar transações de uma categoria específica
  const searchByCategory = useCallback(async (categoryId: string) => {
    return search({ categoryIds: [categoryId] });
  }, [search]);

  // Buscar transações de uma conta específica
  const searchByAccount = useCallback(async (accountId: string) => {
    return search({ accountIds: [accountId] });
  }, [search]);

  // Buscar transações em um período
  const searchByPeriod = useCallback(async (dateFrom: string, dateTo: string) => {
    return search({ dateFrom, dateTo });
  }, [search]);

  // Sugestões de busca baseadas no histórico
  const getSearchSuggestions = useCallback(async (query: string): Promise<string[]> => {
    if (!user || !query.trim()) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('description')
        .eq('user_id', user.id)
        .ilike('description', `%${query}%`)
        .limit(10);

      if (fetchError) throw fetchError;

      // Remover duplicatas e retornar
      const suggestions = [...new Set(data?.map((t) => t.description) || [])];
      return suggestions.slice(0, 5);
    } catch (err) {
      console.error('Erro ao buscar sugestões:', err);
      return [];
    }
  }, [user]);

  return {
    results,
    loading,
    error,
    filters,
    search,
    clearSearch,
    quickSearch,
    getRecentTransactions,
    searchByTag,
    searchByCategory,
    searchByAccount,
    searchByPeriod,
    getSearchSuggestions,
  };
}

// Hook para filtros predefinidos
export function useFilterPresets() {
  const presets: { label: string; filters: SearchFilters }[] = [
    {
      label: 'Hoje',
      filters: {
        dateFrom: new Date().toISOString().split('T')[0],
        dateTo: new Date().toISOString().split('T')[0],
      },
    },
    {
      label: 'Esta semana',
      filters: {
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dateTo: new Date().toISOString().split('T')[0],
      },
    },
    {
      label: 'Este mês',
      filters: {
        dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        dateTo: new Date().toISOString().split('T')[0],
      },
    },
    {
      label: 'Apenas receitas',
      filters: { type: 'income' },
    },
    {
      label: 'Apenas despesas',
      filters: { type: 'expense' },
    },
    {
      label: 'Acima de R$ 100',
      filters: { amountMin: 100 },
    },
    {
      label: 'Acima de R$ 500',
      filters: { amountMin: 500 },
    },
    {
      label: 'Pendentes',
      filters: { isPending: true },
    },
  ];

  return { presets };
}
