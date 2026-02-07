// Servico de IA para analise financeira
import { Transaction, Category, Account, Goal, Debt, DEBT_TYPES } from '../types';
import { ENV } from '../config/env';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = ENV.openaiApiKey;

interface DebtAnalysisData {
  activeDebts: Debt[];
  totalDebt: number;
  totalMonthly: number;
  totalOriginal: number;
  totalPaid: number;
  debtCount: number;
  highestInterest: Debt | null;
  averageInterestRate: number;
  debtsByType: Record<string, number>;
}

interface FinancialData {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  goals: Goal[];
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  debtsData?: DebtAnalysisData;
}

// Funcao para preparar os dados financeiros para a IA
const prepareFinancialContext = (data: FinancialData): string => {
  // Calcular gastos por categoria
  const expensesByCategory: Record<string, number> = {};
  const incomeByCategory: Record<string, number> = {};

  data.transactions.forEach(t => {
    const category = data.categories.find(c => c.id === t.category_id);
    const categoryName = category?.name || 'Outros';

    if (t.type === 'expense') {
      expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + t.amount;
    } else if (t.type === 'income') {
      incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + t.amount;
    }
  });

  // Ordenar categorias por gasto
  const topExpenses = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const savings = data.monthlyIncome - data.monthlyExpenses;
  const savingsRate = data.monthlyIncome > 0 ? (savings / data.monthlyIncome * 100).toFixed(1) : 0;

  // Metas financeiras
  const goalsInfo = data.goals.map(g => ({
    name: g.name,
    target: g.target_amount,
    current: g.current_amount,
    progress: ((g.current_amount / g.target_amount) * 100).toFixed(1)
  }));

  return `
DADOS FINANCEIROS:
- Saldo Total: R$ ${data.totalBalance.toFixed(2)}
- Receita Mensal: R$ ${data.monthlyIncome.toFixed(2)}
- Despesas Mensais: R$ ${data.monthlyExpenses.toFixed(2)}
- Sobra/Deficit Mensal: R$ ${savings.toFixed(2)}
- Taxa de Poupanca: ${savingsRate}%

MAIORES GASTOS:
${topExpenses.map(([cat, amount]) => `- ${cat}: R$ ${amount.toFixed(2)}`).join('\n')}

CONTAS:
${data.accounts.map(a => `- ${a.name}: R$ ${a.balance.toFixed(2)}`).join('\n')}

METAS:
${goalsInfo.length > 0
  ? goalsInfo.map(g => `- ${g.name}: ${g.progress}% concluido`).join('\n')
  : '- Nenhuma meta definida'}

DIVIDAS:
${data.debtsData && data.debtsData.debtCount > 0
  ? `- Total de dividas ativas: ${data.debtsData.debtCount}
- Valor total em dividas: R$ ${data.debtsData.totalDebt.toFixed(2)}
- Parcelas mensais totais: R$ ${data.debtsData.totalMonthly.toFixed(2)}
- Ja pago: R$ ${data.debtsData.totalPaid.toFixed(2)} de R$ ${data.debtsData.totalOriginal.toFixed(2)}
- Taxa media de juros: ${data.debtsData.averageInterestRate.toFixed(1)}% a.m.
${data.debtsData.highestInterest ? `- Divida com maior juros: ${data.debtsData.highestInterest.name} (${data.debtsData.highestInterest.interest_rate}% a.m. - Saldo: R$ ${data.debtsData.highestInterest.current_balance.toFixed(2)})` : ''}
- Detalhes:
${data.debtsData.activeDebts.map(d => `  * ${d.name} (${DEBT_TYPES[d.type]?.label || d.type}): Saldo R$ ${d.current_balance.toFixed(2)} | Parcela R$ ${(d.monthly_payment || 0).toFixed(2)} | Juros ${d.interest_rate}% a.m.`).join('\n')}`
  : '- Nenhuma divida ativa'}

Total de transacoes: ${data.transactions.length}
`;
};

// Funcao principal para analise com IA
export const analyzeFinances = async (
  data: FinancialData,
  customQuestion?: string
): Promise<string> => {
  const financialContext = prepareFinancialContext(data);

  const systemPrompt = `Voce e um consultor financeiro pessoal amigavel e atencioso, especializado em financas brasileiras.

IMPORTANTE - REGRAS DE FORMATACAO:
- Escreva de forma natural e conversacional, como se estivesse conversando com um amigo
- NAO use marcadores como ** ou ### ou outros simbolos de markdown
- Use quebras de linha para separar paragrafos
- Para listas, use apenas tracos simples (-)
- Seja direto mas caloroso, mostrando empatia com a situacao financeira do usuario
- Use emojis com moderacao para deixar a conversa mais leve (maximo 1-2 por secao)
- Valores sempre no formato R$ X.XXX,XX

ESTRUTURA DA RESPOSTA:
1. Comece com uma saudacao breve e um resumo da situacao (2-3 frases)
2. Destaque os pontos principais que voce observou
3. De sugestoes praticas e acionaveis
4. Se houver oportunidade de investimento, mencione opcoes adequadas ao perfil
5. Termine com uma mensagem motivacional ou proximos passos

Considere sempre o cenario economico brasileiro atual (Selic, inflacao, etc).`;

  const userPrompt = customQuestion
    ? `${financialContext}\n\nPergunta do usuario: ${customQuestion}`
    : `${financialContext}\n\nPor favor, faca uma analise completa e humanizada da minha situacao financeira. Quero entender onde estou, onde posso melhorar e quais sao minhas opcoes.`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erro ao comunicar com a IA');
    }

    const result = await response.json();
    return result.choices[0]?.message?.content || 'Desculpe, nao consegui processar a analise.';
  } catch (error) {
    console.error('Erro na analise de IA:', error);
    throw error;
  }
};

// Funcao para chat continuo com a IA
export const chatWithAI = async (
  data: FinancialData,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  newMessage: string
): Promise<string> => {
  const financialContext = prepareFinancialContext(data);

  const systemPrompt = `Voce e um assistente financeiro pessoal amigavel chamado Fin. Voce ajuda pessoas a organizarem suas financas de forma simples e sem julgamentos.

PERSONALIDADE:
- Amigavel e acessivel, nunca usa jargoes complicados
- Empatico - entende que financas podem ser um assunto dificil
- Pratico - sempre da dicas que podem ser aplicadas imediatamente
- Motivador - celebra pequenas vitorias e encoraja o usuario

REGRAS DE FORMATACAO:
- Escreva de forma natural e conversacional
- NAO use ** ou ### ou outros simbolos de markdown
- Use quebras de linha para organizar o texto
- Para listas, use apenas tracos simples (-)
- Use emojis com moderacao para deixar a conversa mais leve
- Seja conciso - respostas de 3-5 paragrafos no maximo

DADOS FINANCEIROS DO USUARIO:
${financialContext}

Responda sempre em portugues brasileiro, de forma clara e amigavel.`;

  const allMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: newMessage }
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: allMessages,
        temperature: 0.8,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erro ao comunicar com a IA');
    }

    const result = await response.json();
    return result.choices[0]?.message?.content || 'Desculpe, nao consegui processar sua pergunta.';
  } catch (error) {
    console.error('Erro no chat com IA:', error);
    throw error;
  }
};

// Sugestoes rapidas pre-definidas
export const quickSuggestions = [
  'Como posso economizar mais?',
  'Onde devo investir meu dinheiro?',
  'Como criar uma reserva de emergencia?',
  'Me ajuda a entender meus gastos?',
  'Quais contas devo priorizar?',
  'Como sair das dividas?',
];
