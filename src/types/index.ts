// Tipos principais do app de controle financeiro

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  avatar_url?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  language: string;
  notifications_enabled: boolean;
  biometric_enabled: boolean;
  hide_balances: boolean;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'wallet';
  balance: number;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
  // Campos específicos para cartão de crédito
  credit_limit?: number;
  closing_day?: number; // Dia do fechamento da fatura
  due_day?: number; // Dia do vencimento da fatura
  // Campos para investimento
  institution?: string;
  account_number?: string;
  is_archived?: boolean;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  created_at: string;
  parent_id?: string; // Para subcategorias
  is_archived?: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
  // Campos para transferências
  to_account_id?: string;
  // Campos para transações recorrentes
  recurring_id?: string;
  // Campos para parcelamento
  installment_id?: string;
  installment_number?: number;
  total_installments?: number;
  // Tags e notas
  tags?: string[];
  notes?: string;
  // Anexos
  receipt_url?: string;
  // Localização
  location?: string;
  // Status
  is_pending?: boolean;
}

// Transação Recorrente
export interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date?: string;
  next_date: string;
  is_active: boolean;
  auto_create: boolean; // Criar automaticamente ou apenas lembrar
  created_at: string;
  updated_at: string;
}

// Parcelamento
export interface Installment {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  description: string;
  total_amount: number;
  installment_amount: number;
  total_installments: number;
  paid_installments: number;
  start_date: string;
  created_at: string;
  updated_at: string;
}

// Cartão de Crédito - Fatura
export interface CreditCardBill {
  id: string;
  user_id: string;
  account_id: string;
  month: number;
  year: number;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  closing_date: string;
  is_closed: boolean;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  category_id?: string;
  color: string;
  icon?: string;
  created_at: string;
  updated_at: string;
  // Novos campos
  description?: string;
  priority: 'low' | 'medium' | 'high';
  is_completed: boolean;
  monthly_contribution?: number; // Contribuição mensal sugerida
  linked_account_id?: string; // Conta vinculada para depósitos automáticos
}

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  category_id: string;
  account_id?: string;
  is_recurring: boolean;
  is_paid: boolean;
  reminder_days_before: number;
  created_at: string;
  updated_at: string;
  // Novos campos
  frequency?: 'monthly' | 'yearly' | 'weekly' | 'biweekly';
  notes?: string;
  barcode?: string;
  paid_date?: string;
  paid_amount?: number;
}

export interface MonthlyBudget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  // Campos calculados
  spent?: number;
  remaining?: number;
  percentage?: number;
}

// Investimentos
export interface Investment {
  id: string;
  user_id: string;
  account_id?: string;
  name: string;
  type: 'stocks' | 'fixed_income' | 'funds' | 'crypto' | 'real_estate' | 'savings' | 'other';
  ticker?: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  purchase_date: string;
  institution: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvestmentTransaction {
  id: string;
  investment_id: string;
  type: 'buy' | 'sell' | 'dividend' | 'yield' | 'split';
  quantity: number;
  price: number;
  total: number;
  date: string;
  fees?: number;
  notes?: string;
  created_at: string;
}

// Dívidas
export interface Debt {
  id: string;
  user_id: string;
  name: string;
  type: 'loan' | 'financing' | 'credit_card' | 'overdraft' | 'personal' | 'other';
  creditor: string;
  original_amount: number;
  current_balance: number;
  interest_rate: number; // Taxa de juros mensal
  monthly_payment: number;
  start_date: string;
  end_date?: string;
  total_installments?: number;
  paid_installments: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  principal: number;
  interest: number;
  date: string;
  installment_number: number;
  is_extra: boolean; // Pagamento extra
  notes?: string;
  created_at: string;
}

// Tags
export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

// Tipos para estatísticas e relatórios
export interface MonthSummary {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategorySummary {
  category: Category;
  total: number;
  percentage: number;
  transactions_count: number;
  trend?: number; // Variação em relação ao mês anterior
}

export interface FinancialHealth {
  score: number; // 0-1000
  savings_rate: number;
  expense_ratio: number;
  debt_ratio: number;
  emergency_fund_months: number;
  recommendations: string[];
}

export interface CashFlowProjection {
  date: string;
  projected_income: number;
  projected_expense: number;
  projected_balance: number;
  actual_income?: number;
  actual_expense?: number;
  actual_balance?: number;
}

// Notificações
export interface Notification {
  id: string;
  user_id: string;
  type: 'bill_due' | 'budget_alert' | 'goal_progress' | 'unusual_expense' | 'recurring' | 'insight' | 'goal_reached' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read?: boolean;
  read: boolean; // Propriedade mapeada do is_read
  created_at: string;
  action_route?: string;
  action_params?: Record<string, any>;
}

// Configurações de notificação
export interface NotificationSettings {
  push_enabled?: boolean;
  bill_reminders: boolean;
  bill_reminder_days?: number[];
  budget_alerts: boolean;
  budget_alert_threshold?: number; // Percentual (ex: 80%)
  goal_alerts?: boolean;
  goal_updates?: boolean;
  recurring_alerts?: boolean;
  weekly_summary?: boolean;
  monthly_report?: boolean;
  unusual_expense_alert?: boolean;
  unusual_expense_threshold?: number; // Valor em reais
  reminder_days_before?: number;
}

// Tipo para tema/cores do app
export const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  secondary: '#EC4899',
  secondaryDark: '#DB2777',
  success: '#10B981',
  successDark: '#059669',
  warning: '#F59E0B',
  warningDark: '#D97706',
  danger: '#EF4444',
  dangerDark: '#DC2626',
  info: '#3B82F6',
  infoDark: '#2563EB',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  income: '#10B981',
  expense: '#EF4444',
  transfer: '#3B82F6',
  // Cores para investimentos
  profit: '#10B981',
  loss: '#EF4444',
  neutral: '#64748B',
} as const;

// Tema escuro
export const DARK_COLORS = {
  primary: '#818CF8',
  primaryDark: '#6366F1',
  primaryLight: '#A5B4FC',
  secondary: '#F472B6',
  secondaryDark: '#EC4899',
  success: '#34D399',
  successDark: '#10B981',
  warning: '#FBBF24',
  warningDark: '#F59E0B',
  danger: '#F87171',
  dangerDark: '#EF4444',
  info: '#60A5FA',
  infoDark: '#3B82F6',
  background: '#0F172A',
  card: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  border: '#334155',
  borderLight: '#1E293B',
  income: '#34D399',
  expense: '#F87171',
  transfer: '#60A5FA',
  profit: '#34D399',
  loss: '#F87171',
  neutral: '#94A3B8',
} as const;

// Ícones para tipos de conta (usando MaterialCommunityIcons)
export const ACCOUNT_TYPES = {
  checking: { label: 'Conta Corrente', icon: 'bank' },
  savings: { label: 'Poupança', icon: 'piggy-bank' },
  credit_card: { label: 'Cartão de Crédito', icon: 'credit-card' },
  cash: { label: 'Dinheiro', icon: 'cash' },
  investment: { label: 'Investimento', icon: 'chart-line' },
  wallet: { label: 'Carteira Digital', icon: 'wallet' },
} as const;

// Tipos de investimento
export const INVESTMENT_TYPES = {
  stocks: { label: 'Ações', icon: 'chart-areaspline' },
  fixed_income: { label: 'Renda Fixa', icon: 'bank' },
  funds: { label: 'Fundos', icon: 'chart-pie' },
  crypto: { label: 'Criptomoedas', icon: 'bitcoin' },
  real_estate: { label: 'Imóveis', icon: 'home-city' },
  savings: { label: 'Poupança', icon: 'piggy-bank' },
  other: { label: 'Outros', icon: 'dots-horizontal' },
} as const;

// Tipos de dívida
export const DEBT_TYPES = {
  loan: { label: 'Empréstimo', icon: 'hand-coin' },
  financing: { label: 'Financiamento', icon: 'car' },
  credit_card: { label: 'Cartão de Crédito', icon: 'credit-card' },
  overdraft: { label: 'Cheque Especial', icon: 'bank-minus' },
  personal: { label: 'Pessoal', icon: 'account' },
  other: { label: 'Outros', icon: 'dots-horizontal' },
} as const;

// Frequências para transações recorrentes
export const FREQUENCIES = {
  daily: { label: 'Diário', days: 1 },
  weekly: { label: 'Semanal', days: 7 },
  biweekly: { label: 'Quinzenal', days: 15 },
  monthly: { label: 'Mensal', days: 30 },
  yearly: { label: 'Anual', days: 365 },
} as const;

// Categorias padrão com ícones (MaterialCommunityIcons)
export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id' | 'created_at'>[] = [
  // Receitas
  { name: 'Salário', type: 'income', icon: 'briefcase', color: '#10B981' },
  { name: 'Freelance', type: 'income', icon: 'laptop', color: '#059669' },
  { name: 'Investimentos', type: 'income', icon: 'chart-line', color: '#047857' },
  { name: 'Vendas', type: 'income', icon: 'tag', color: '#0D9488' },
  { name: 'Aluguel Recebido', type: 'income', icon: 'home', color: '#14B8A6' },
  { name: 'Outros Receitas', type: 'income', icon: 'cash-plus', color: '#065F46' },
  // Despesas
  { name: 'Alimentação', type: 'expense', icon: 'food', color: '#EF4444' },
  { name: 'Transporte', type: 'expense', icon: 'car', color: '#F97316' },
  { name: 'Moradia', type: 'expense', icon: 'home', color: '#F59E0B' },
  { name: 'Saúde', type: 'expense', icon: 'hospital-box', color: '#EAB308' },
  { name: 'Educação', type: 'expense', icon: 'school', color: '#84CC16' },
  { name: 'Lazer', type: 'expense', icon: 'gamepad-variant', color: '#22C55E' },
  { name: 'Compras', type: 'expense', icon: 'cart', color: '#14B8A6' },
  { name: 'Contas', type: 'expense', icon: 'file-document', color: '#06B6D4' },
  { name: 'Assinaturas', type: 'expense', icon: 'television-play', color: '#0EA5E9' },
  { name: 'Pet', type: 'expense', icon: 'dog', color: '#8B5CF6' },
  { name: 'Beleza', type: 'expense', icon: 'face-woman', color: '#EC4899' },
  { name: 'Presentes', type: 'expense', icon: 'gift', color: '#F43F5E' },
  { name: 'Impostos', type: 'expense', icon: 'file-percent', color: '#64748B' },
  { name: 'Outros Despesas', type: 'expense', icon: 'package-variant', color: '#6366F1' },
];

// Lista de ícones disponíveis para seleção
export const AVAILABLE_ICONS = [
  'cash', 'bank', 'credit-card', 'piggy-bank', 'chart-line', 'wallet',
  'home', 'car', 'bus', 'airplane', 'train', 'bike',
  'food', 'food-fork-drink', 'coffee', 'cart', 'shopping', 'basket',
  'hospital-box', 'medical-bag', 'pill', 'heart-pulse', 'tooth',
  'school', 'book-open-variant', 'laptop', 'cellphone', 'desktop-mac',
  'gamepad-variant', 'movie', 'music', 'basketball', 'soccer', 'dumbbell',
  'briefcase', 'account', 'gift', 'tag', 'package-variant', 'cube',
  'file-document', 'lightning-bolt', 'water', 'gas-station', 'fire',
  'wifi', 'phone', 'television', 'sofa', 'washing-machine', 'fridge',
  'dog', 'cat', 'paw', 'face-woman', 'face-man', 'baby-face',
  'bitcoin', 'ethereum', 'chart-pie', 'chart-areaspline',
  'home-city', 'office-building', 'store', 'factory',
  'hand-coin', 'cash-multiple', 'cash-minus', 'cash-plus',
  'calendar', 'clock', 'target', 'star', 'flag', 'trophy',
];

// Cores disponíveis para seleção
export const AVAILABLE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#64748B', '#475569', '#1E293B',
];
