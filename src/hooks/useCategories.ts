import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Category } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      const formattedCategories = (data || []).map((c: any) => ({
        ...c,
        is_archived: c.is_archived === true || c.is_archived === 'true',
      }));

      setCategories(formattedCategories);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (category: Omit<Category, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return { error: new Error('User not authenticated') };

    // 🚀 OPTIMISTIC UPDATE
    const tempId = `temp_${Date.now()}`;
    const optimisticCategory: Category = {
      ...category,
      id: tempId,
      user_id: user.id,
      created_at: new Date().toISOString(),
    };

    setCategories(prev => [...prev, optimisticCategory].sort((a, b) => a.name.localeCompare(b.name)));

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...category, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => prev.map(c => c.id === tempId ? { ...data, is_archived: data.is_archived === true } : c));
      return { data, error: null };
    } catch (err) {
      // ❌ ROLLBACK
      setCategories(prev => prev.filter(c => c.id !== tempId));
      return { data: null, error: err as Error };
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const previousCategories = [...categories];

    // 🚀 OPTIMISTIC UPDATE
    setCategories(prev => prev.map(cat => cat.id === id ? { ...cat, ...updates } : cat));

    try {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => prev.map(cat => cat.id === id ? { ...data, is_archived: data.is_archived === true } : cat));
      return { data, error: null };
    } catch (err) {
      // ❌ ROLLBACK
      setCategories(previousCategories);
      return { data: null, error: err as Error };
    }
  };

  const deleteCategory = async (id: string) => {
    const previousCategories = [...categories];

    // 🚀 OPTIMISTIC UPDATE
    setCategories(prev => prev.filter(cat => cat.id !== id));

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      // ❌ ROLLBACK
      setCategories(previousCategories);
      return { error: err as Error };
    }
  };

  // Todas as categorias por tipo (incluindo subcategorias)
  const allIncomeCategories = categories.filter(cat => cat.type === 'income');
  const allExpenseCategories = categories.filter(cat => cat.type === 'expense');

  // Apenas categorias principais (sem parent_id) - para compatibilidade
  const incomeCategories = allIncomeCategories.filter(cat => !cat.parent_id);
  const expenseCategories = allExpenseCategories.filter(cat => !cat.parent_id);

  // Obter apenas categorias principais (sem parent_id)
  const mainCategories = categories.filter(cat => !cat.parent_id);

  // Obter subcategorias de uma categoria
  const getSubcategories = (parentId: string) => {
    return categories.filter(cat => cat.parent_id === parentId);
  };

  // Obter categoria pai
  const getParentCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category?.parent_id) return null;
    return categories.find(c => c.id === category.parent_id);
  };

  // Verificar se uma categoria tem subcategorias
  const hasSubcategories = (categoryId: string) => {
    return categories.some(cat => cat.parent_id === categoryId);
  };

  // Obter categorias organizadas em árvore (para exibição)
  const getCategoryTree = (type?: 'income' | 'expense') => {
    const mainCats = type
      ? mainCategories.filter(c => c.type === type)
      : mainCategories;

    return mainCats.map(main => ({
      ...main,
      subcategories: getSubcategories(main.id),
    }));
  };

  // Obter todas categorias (incluindo subcategorias) de forma flat para seleção
  const getFlatCategories = (type?: 'income' | 'expense') => {
    const filtered = type ? categories.filter(c => c.type === type) : categories;

    // Ordenar: principais primeiro, depois subcategorias agrupadas
    const result: (Category & { isSubcategory?: boolean; parentName?: string })[] = [];

    const mainCats = filtered.filter(c => !c.parent_id);
    mainCats.forEach(main => {
      result.push({ ...main, isSubcategory: false });
      const subs = filtered.filter(c => c.parent_id === main.id);
      subs.forEach(sub => {
        result.push({ ...sub, isSubcategory: true, parentName: main.name });
      });
    });

    return result;
  };

  // Criar subcategoria
  const createSubcategory = async (
    parentId: string,
    subcategory: Omit<Category, 'id' | 'user_id' | 'created_at' | 'parent_id' | 'type'>
  ) => {
    const parent = categories.find(c => c.id === parentId);
    if (!parent) return { error: new Error('Categoria pai não encontrada') };

    return createCategory({
      ...subcategory,
      type: parent.type,
      parent_id: parentId,
    });
  };

  return {
    categories,
    incomeCategories,
    expenseCategories,
    allIncomeCategories,
    allExpenseCategories,
    mainCategories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getSubcategories,
    getParentCategory,
    hasSubcategories,
    getCategoryTree,
    getFlatCategories,
    createSubcategory,
  };
}
