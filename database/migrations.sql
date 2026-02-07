-- =====================================================
-- NOVAS TABELAS PARA CONTROLE FINANCEIRO COMPLETO
-- Execute este SQL no painel do Supabase
-- =====================================================

-- =====================================================
-- 1. TRANSAÇÕES RECORRENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  auto_create BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS para recurring_transactions
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring transactions" ON recurring_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recurring transactions" ON recurring_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring transactions" ON recurring_transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring transactions" ON recurring_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_recurring_user ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_next_date ON recurring_transactions(next_date);

-- =====================================================
-- 2. PARCELAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS installments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  installment_amount DECIMAL(15,2) NOT NULL,
  total_installments INTEGER NOT NULL,
  paid_installments INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS para installments
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own installments" ON installments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own installments" ON installments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own installments" ON installments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own installments" ON installments
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 3. FATURAS DE CARTÃO DE CRÉDITO
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_card_bills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  total_amount DECIMAL(15,2) DEFAULT 0,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  due_date DATE NOT NULL,
  closing_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, account_id, month, year)
);

-- RLS para credit_card_bills
ALTER TABLE credit_card_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit card bills" ON credit_card_bills
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit card bills" ON credit_card_bills
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credit card bills" ON credit_card_bills
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own credit card bills" ON credit_card_bills
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 4. INVESTIMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS investments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stocks', 'fixed_income', 'funds', 'crypto', 'real_estate', 'savings', 'other')),
  ticker TEXT,
  quantity DECIMAL(18,8) NOT NULL DEFAULT 0,
  purchase_price DECIMAL(15,2) NOT NULL,
  current_price DECIMAL(15,2) NOT NULL,
  purchase_date DATE NOT NULL,
  institution TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS para investments
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investments" ON investments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own investments" ON investments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own investments" ON investments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own investments" ON investments
  FOR DELETE USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_investments_user ON investments(user_id);
CREATE INDEX idx_investments_type ON investments(type);

-- =====================================================
-- 5. TRANSAÇÕES DE INVESTIMENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS investment_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'dividend', 'yield', 'split')),
  quantity DECIMAL(18,8) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  fees DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS via investment_id
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investment transactions" ON investment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM investments WHERE investments.id = investment_transactions.investment_id AND investments.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own investment transactions" ON investment_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM investments WHERE investments.id = investment_transactions.investment_id AND investments.user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. DÍVIDAS
-- =====================================================
CREATE TABLE IF NOT EXISTS debts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('loan', 'financing', 'credit_card', 'overdraft', 'personal', 'other')),
  creditor TEXT NOT NULL,
  original_amount DECIMAL(15,2) NOT NULL,
  current_balance DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(8,4) NOT NULL, -- Taxa mensal
  monthly_payment DECIMAL(15,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  total_installments INTEGER,
  paid_installments INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS para debts
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debts" ON debts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own debts" ON debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own debts" ON debts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own debts" ON debts
  FOR DELETE USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_debts_user ON debts(user_id);
CREATE INDEX idx_debts_active ON debts(is_active);

-- =====================================================
-- 7. PAGAMENTOS DE DÍVIDAS
-- =====================================================
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  principal DECIMAL(15,2) NOT NULL,
  interest DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  installment_number INTEGER,
  is_extra BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS via debt_id
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debt payments" ON debt_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM debts WHERE debts.id = debt_payments.debt_id AND debts.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own debt payments" ON debt_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM debts WHERE debts.id = debt_payments.debt_id AND debts.user_id = auth.uid()
    )
  );

-- =====================================================
-- 8. NOTIFICAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bill_due', 'budget_alert', 'goal_progress', 'unusual_expense', 'recurring', 'insight')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS para notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- 9. TAGS
-- =====================================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366F1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, name)
);

-- RLS para tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tags" ON tags
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON tags
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON tags
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 10. ATUALIZAR TABELA ACCOUNTS (novos campos)
-- =====================================================
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS closing_day INTEGER CHECK (closing_day >= 1 AND closing_day <= 31);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS institution TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Atualizar constraint de type para incluir 'wallet'
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_type_check
  CHECK (type IN ('checking', 'savings', 'credit_card', 'cash', 'investment', 'wallet'));

-- =====================================================
-- 11. ATUALIZAR TABELA TRANSACTIONS (novos campos)
-- =====================================================
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_id UUID REFERENCES recurring_transactions(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_id UUID REFERENCES installments(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_number INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS total_installments INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT false;

-- =====================================================
-- 12. ATUALIZAR TABELA GOALS (novos campos)
-- =====================================================
ALTER TABLE goals ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'target';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));
ALTER TABLE goals ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS monthly_contribution DECIMAL(15,2);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- =====================================================
-- 13. ATUALIZAR TABELA BILLS (novos campos)
-- =====================================================
ALTER TABLE bills ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly'));
ALTER TABLE bills ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15,2);

-- =====================================================
-- 14. ATUALIZAR TABELA CATEGORIES (novos campos)
-- =====================================================
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- =====================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(recurring_id);
CREATE INDEX IF NOT EXISTS idx_transactions_installment ON transactions(installment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_pending ON transactions(is_pending);
CREATE INDEX IF NOT EXISTS idx_accounts_archived ON accounts(is_archived);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_goals_completed ON goals(is_completed);
