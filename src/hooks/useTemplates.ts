import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionTemplate } from '../types';
import { useAuth } from '../contexts/AuthContext';

const TEMPLATES_STORAGE_KEY = '@transaction_templates';

export function useTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar templates do AsyncStorage
  const fetchTemplates = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(`${TEMPLATES_STORAGE_KEY}_${user.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ordenar por mais usado
        const sorted = parsed.sort((a: TransactionTemplate, b: TransactionTemplate) =>
          b.usage_count - a.usage_count
        );
        setTemplates(sorted);
      } else {
        setTemplates([]);
      }
    } catch (err) {
      setError('Erro ao carregar templates');
      console.error('Erro ao carregar templates:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Salvar templates no AsyncStorage
  const saveTemplates = async (newTemplates: TransactionTemplate[]) => {
    if (!user) return;
    await AsyncStorage.setItem(
      `${TEMPLATES_STORAGE_KEY}_${user.id}`,
      JSON.stringify(newTemplates)
    );
  };

  // Criar novo template
  const createTemplate = async (
    template: Omit<TransactionTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'usage_count'>
  ) => {
    if (!user) return { error: new Error('Usuário não autenticado') };

    try {
      const newTemplate: TransactionTemplate = {
        ...template,
        id: `template_${Date.now()}`,
        user_id: user.id,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newTemplates = [...templates, newTemplate];
      setTemplates(newTemplates);
      await saveTemplates(newTemplates);

      return { data: newTemplate, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  // Atualizar template
  const updateTemplate = async (id: string, updates: Partial<TransactionTemplate>) => {
    try {
      const newTemplates = templates.map(t =>
        t.id === id
          ? { ...t, ...updates, updated_at: new Date().toISOString() }
          : t
      );
      setTemplates(newTemplates);
      await saveTemplates(newTemplates);

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Excluir template
  const deleteTemplate = async (id: string) => {
    try {
      const newTemplates = templates.filter(t => t.id !== id);
      setTemplates(newTemplates);
      await saveTemplates(newTemplates);

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Incrementar contador de uso
  const incrementUsage = async (id: string) => {
    try {
      const newTemplates = templates.map(t =>
        t.id === id
          ? {
              ...t,
              usage_count: t.usage_count + 1,
              last_used_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : t
      ).sort((a, b) => b.usage_count - a.usage_count);

      setTemplates(newTemplates);
      await saveTemplates(newTemplates);
    } catch (err) {
      console.error('Erro ao incrementar uso:', err);
    }
  };

  // Criar template a partir de transação existente
  const createFromTransaction = async (
    transaction: {
      type: 'income' | 'expense';
      amount: number;
      description: string;
      category_id: string;
      account_id: string;
    },
    name: string,
    icon?: string,
    color?: string
  ) => {
    return createTemplate({
      name,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category_id: transaction.category_id,
      account_id: transaction.account_id,
      icon,
      color,
    });
  };

  // Obter templates por tipo
  const getTemplatesByType = (type: 'income' | 'expense') => {
    return templates.filter(t => t.type === type);
  };

  // Obter templates mais usados
  const getMostUsed = (limit: number = 5) => {
    return templates.slice(0, limit);
  };

  // Obter templates recentes
  const getRecent = (limit: number = 5) => {
    return [...templates]
      .filter(t => t.last_used_at)
      .sort((a, b) =>
        new Date(b.last_used_at!).getTime() - new Date(a.last_used_at!).getTime()
      )
      .slice(0, limit);
  };

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUsage,
    createFromTransaction,
    getTemplatesByType,
    getMostUsed,
    getRecent,
  };
}
