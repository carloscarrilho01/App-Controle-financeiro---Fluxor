import { Paths, File } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Transaction, Account, Category } from '../types';
import { format } from 'date-fns';

interface ExportData {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}

export const exportToCSV = async (
  data: ExportData,
  startDate: Date,
  endDate: Date
): Promise<void> => {
  const { transactions, accounts, categories } = data;

  // Criar mapeamentos para nomes
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  // Cabeçalho do CSV
  const headers = [
    'Data',
    'Tipo',
    'Categoria',
    'Conta',
    'Descrição',
    'Valor',
  ].join(';');

  // Linhas de dados
  const rows = transactions
    .filter(t => {
      const date = new Date(t.date);
      return date >= startDate && date <= endDate;
    })
    .map(t => {
      const tipo = t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência';
      return [
        format(new Date(t.date), 'dd/MM/yyyy'),
        tipo,
        categoryMap.get(t.category_id) || 'Sem categoria',
        accountMap.get(t.account_id) || 'Conta desconhecida',
        `"${t.description || ''}"`,
        t.amount.toFixed(2).replace('.', ','),
      ].join(';');
    });

  const csvContent = [headers, ...rows].join('\n');

  // Salvar arquivo
  const fileName = `financas_${format(startDate, 'yyyy-MM-dd')}_a_${format(endDate, 'yyyy-MM-dd')}.csv`;
  const file = new File(Paths.cache, fileName);
  await file.write(csvContent);

  // Compartilhar arquivo
  if (await isAvailableAsync()) {
    await shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Exportar dados financeiros',
    });
  }
};

export const exportSummaryToCSV = async (
  data: ExportData,
  month: Date
): Promise<void> => {
  const { transactions, categories } = data;

  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  // Filtrar transações do mês
  const monthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date >= startOfMonth && date <= endOfMonth;
  });

  // Calcular totais por categoria
  const categoryTotals = new Map<string, { income: number; expense: number }>();

  monthTransactions.forEach(t => {
    const existing = categoryTotals.get(t.category_id) || { income: 0, expense: 0 };
    if (t.type === 'income') {
      existing.income += t.amount;
    } else if (t.type === 'expense') {
      existing.expense += t.amount;
    }
    categoryTotals.set(t.category_id, existing);
  });

  // Criar mapeamento de categorias
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Cabeçalho
  const headers = ['Categoria', 'Tipo', 'Total'].join(';');

  // Linhas
  const rows: string[] = [];

  categoryTotals.forEach((totals, categoryId) => {
    const category = categoryMap.get(categoryId);
    if (category) {
      if (totals.income > 0) {
        rows.push([
          category.name,
          'Receita',
          totals.income.toFixed(2).replace('.', ','),
        ].join(';'));
      }
      if (totals.expense > 0) {
        rows.push([
          category.name,
          'Despesa',
          totals.expense.toFixed(2).replace('.', ','),
        ].join(';'));
      }
    }
  });

  // Totais gerais
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  rows.push('');
  rows.push(['TOTAL RECEITAS', '', totalIncome.toFixed(2).replace('.', ',')].join(';'));
  rows.push(['TOTAL DESPESAS', '', totalExpense.toFixed(2).replace('.', ',')].join(';'));
  rows.push(['SALDO', '', (totalIncome - totalExpense).toFixed(2).replace('.', ',')].join(';'));

  const csvContent = [headers, ...rows].join('\n');

  // Salvar arquivo
  const fileName = `resumo_${format(month, 'yyyy-MM')}.csv`;
  const file = new File(Paths.cache, fileName);
  await file.write(csvContent);

  // Compartilhar arquivo
  if (await isAvailableAsync()) {
    await shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Exportar resumo mensal',
    });
  }
};

export const exportBackup = async (data: ExportData): Promise<void> => {
  const backupContent = JSON.stringify({
    ...data,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  }, null, 2);

  const fileName = `backup_financas_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
  const file = new File(Paths.cache, fileName);
  await file.write(backupContent);

  if (await isAvailableAsync()) {
    await shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar backup',
    });
  }
};
