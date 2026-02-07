import * as DocumentPicker from 'expo-document-picker';
import { Paths, File } from 'expo-file-system';
import { Transaction, Account, Category } from '../types';
import { parseISO, format } from 'date-fns';

export interface ImportedTransaction {
  date: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  originalLine?: string;
  memo?: string;
  fitid?: string; // ID único OFX
  checkNum?: string;
}

export interface ImportResult {
  success: boolean;
  transactions: ImportedTransaction[];
  errors: string[];
  fileName?: string;
  fileType?: 'OFX' | 'CSV' | 'PDF';
  bankName?: string;
  accountNumber?: string;
  startDate?: string;
  endDate?: string;
}

// Parser OFX
export const parseOFX = (content: string): ImportResult => {
  const transactions: ImportedTransaction[] = [];
  const errors: string[] = [];

  try {
    // Extrair informações do banco
    const bankIdMatch = content.match(/<BANKID>([^<\n]+)/);
    const acctIdMatch = content.match(/<ACCTID>([^<\n]+)/);

    // Extrair transações
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = stmtTrnRegex.exec(content)) !== null) {
      const trnBlock = match[1];

      try {
        // Extrair campos
        const typeMatch = trnBlock.match(/<TRNTYPE>([^<\n]+)/);
        const dateMatch = trnBlock.match(/<DTPOSTED>(\d{8})/);
        const amountMatch = trnBlock.match(/<TRNAMT>([^<\n]+)/);
        const fitidMatch = trnBlock.match(/<FITID>([^<\n]+)/);
        const memoMatch = trnBlock.match(/<MEMO>([^<\n]+)/);
        const nameMatch = trnBlock.match(/<NAME>([^<\n]+)/);
        const checkNumMatch = trnBlock.match(/<CHECKNUM>([^<\n]+)/);

        if (dateMatch && amountMatch) {
          const rawDate = dateMatch[1];
          const date = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
          const amount = parseFloat(amountMatch[1].replace(',', '.'));

          const transaction: ImportedTransaction = {
            date,
            amount: Math.abs(amount),
            type: amount >= 0 ? 'income' : 'expense',
            description: (nameMatch?.[1] || memoMatch?.[1] || 'Transação importada').trim(),
            memo: memoMatch?.[1]?.trim(),
            fitid: fitidMatch?.[1]?.trim(),
            checkNum: checkNumMatch?.[1]?.trim(),
          };

          transactions.push(transaction);
        }
      } catch (err) {
        errors.push(`Erro ao processar transação: ${err}`);
      }
    }

    // Ordenar por data
    transactions.sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: transactions.length > 0,
      transactions,
      errors,
      fileType: 'OFX',
      bankName: bankIdMatch?.[1]?.trim(),
      accountNumber: acctIdMatch?.[1]?.trim(),
      startDate: transactions[0]?.date,
      endDate: transactions[transactions.length - 1]?.date,
    };
  } catch (err) {
    return {
      success: false,
      transactions: [],
      errors: [`Erro ao processar arquivo OFX: ${err}`],
    };
  }
};

// Parser CSV genérico
export const parseCSV = (content: string, delimiter = ';'): ImportResult => {
  const transactions: ImportedTransaction[] = [];
  const errors: string[] = [];

  try {
    const lines = content.trim().split('\n');

    if (lines.length < 2) {
      return {
        success: false,
        transactions: [],
        errors: ['Arquivo CSV vazio ou inválido'],
      };
    }

    // Primeira linha é o cabeçalho
    const header = lines[0].toLowerCase();

    // Detectar colunas
    const columns = header.split(delimiter).map(c => c.trim());
    const dateIndex = columns.findIndex(c =>
      c.includes('data') || c.includes('date') || c === 'dt'
    );
    const amountIndex = columns.findIndex(c =>
      c.includes('valor') || c.includes('amount') || c.includes('quantia')
    );
    const descIndex = columns.findIndex(c =>
      c.includes('descri') || c.includes('memo') || c.includes('hist') || c.includes('observ')
    );

    if (dateIndex === -1 || amountIndex === -1) {
      return {
        success: false,
        transactions: [],
        errors: ['Não foi possível identificar as colunas de data e valor'],
      };
    }

    // Processar linhas de dados
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(delimiter);

      try {
        const rawDate = parts[dateIndex]?.trim();
        const rawAmount = parts[amountIndex]?.trim();
        const description = parts[descIndex]?.trim() || 'Transação importada';

        if (!rawDate || !rawAmount) continue;

        // Converter data (DD/MM/YYYY ou YYYY-MM-DD)
        let date: string;
        if (rawDate.includes('/')) {
          const [d, m, y] = rawDate.split('/');
          date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else {
          date = rawDate;
        }

        // Converter valor
        const amount = parseFloat(
          rawAmount
            .replace(/[R$\s]/g, '')
            .replace('.', '')
            .replace(',', '.')
        );

        if (isNaN(amount)) continue;

        transactions.push({
          date,
          amount: Math.abs(amount),
          type: amount >= 0 ? 'income' : 'expense',
          description,
          originalLine: line,
        });
      } catch (err) {
        errors.push(`Linha ${i + 1}: ${err}`);
      }
    }

    return {
      success: transactions.length > 0,
      transactions,
      errors,
      fileType: 'CSV',
      startDate: transactions[0]?.date,
      endDate: transactions[transactions.length - 1]?.date,
    };
  } catch (err) {
    return {
      success: false,
      transactions: [],
      errors: [`Erro ao processar arquivo CSV: ${err}`],
    };
  }
};

// Função para selecionar e processar arquivo
export const pickAndParseFile = async (): Promise<ImportResult> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/x-ofx',
        'text/x-ofx',
        'text/csv',
        'application/csv',
        'text/plain',
        '*/*', // Fallback para outros tipos
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return {
        success: false,
        transactions: [],
        errors: ['Nenhum arquivo selecionado'],
      };
    }

    const asset = result.assets[0];
    const fileName = asset.name.toLowerCase();
    const fileUri = asset.uri;

    // Ler conteúdo do arquivo
    const file = new File(fileUri);
    const content = await file.text();

    // Determinar tipo e processar
    let importResult: ImportResult;

    if (fileName.endsWith('.ofx') || content.includes('<OFX>') || content.includes('OFXHEADER')) {
      importResult = parseOFX(content);
    } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      // Detectar delimitador
      const firstLine = content.split('\n')[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';
      importResult = parseCSV(content, delimiter);
    } else {
      // Tentar detectar formato pelo conteúdo
      if (content.includes('OFXHEADER') || content.includes('<OFX>')) {
        importResult = parseOFX(content);
      } else {
        importResult = parseCSV(content);
      }
    }

    importResult.fileName = asset.name;
    return importResult;

  } catch (err) {
    return {
      success: false,
      transactions: [],
      errors: [`Erro ao processar arquivo: ${err}`],
    };
  }
};

// Função para sugerir categoria baseada na descrição
export const suggestCategory = (
  description: string,
  categories: Category[]
): Category | null => {
  const desc = description.toLowerCase();

  // Mapeamento de palavras-chave para categorias
  const keywordMap: { [key: string]: string[] } = {
    'alimentação': ['mercado', 'supermercado', 'restaurante', 'lanchonete', 'padaria', 'açougue', 'ifood', 'uber eats', 'rappi'],
    'transporte': ['uber', '99', 'cabify', 'combustível', 'gasolina', 'estacionamento', 'pedágio', 'metro', 'ônibus'],
    'saúde': ['farmácia', 'drogaria', 'hospital', 'clínica', 'médico', 'dentista', 'laborat'],
    'moradia': ['aluguel', 'condomínio', 'iptu', 'luz', 'energia', 'água', 'gás', 'internet'],
    'lazer': ['cinema', 'teatro', 'show', 'netflix', 'spotify', 'amazon prime', 'disney'],
    'educação': ['escola', 'faculdade', 'curso', 'livro', 'udemy', 'mensalidade'],
    'vestuário': ['roupa', 'sapato', 'tênis', 'loja', 'shopping'],
    'salário': ['salário', 'pagamento', 'vencimento', 'transferência recebida'],
    'transferência': ['pix', 'ted', 'doc', 'transferência'],
  };

  for (const [categoryName, keywords] of Object.entries(keywordMap)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        // Procurar categoria correspondente
        const category = categories.find(c =>
          c.name.toLowerCase().includes(categoryName) ||
          categoryName.includes(c.name.toLowerCase())
        );
        if (category) return category;
      }
    }
  }

  return null;
};

// Função para detectar transações duplicadas
export const detectDuplicates = (
  imported: ImportedTransaction[],
  existing: Transaction[]
): ImportedTransaction[] => {
  return imported.filter(imp => {
    // Verificar se já existe transação com mesma data e valor
    const isDuplicate = existing.some(ex =>
      ex.date === imp.date &&
      Math.abs(ex.amount - imp.amount) < 0.01 &&
      (imp.fitid ? ex.description?.includes(imp.fitid) : true)
    );
    return !isDuplicate;
  });
};
