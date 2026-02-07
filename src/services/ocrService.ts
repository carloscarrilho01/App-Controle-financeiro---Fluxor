// Servico de OCR para extrair dados de imagens de contas e comprovantes
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
// IMPORTANTE: Configure sua chave no arquivo .env como OPENAI_API_KEY
const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey || process.env.OPENAI_API_KEY || '';

export interface ExtractedBillData {
  name: string | null;
  amount: number | null;
  dueDate: string | null; // formato DD/MM/AAAA
  category: string | null;
  description: string | null;
}

export const extractBillDataFromImage = async (imageUri: string): Promise<ExtractedBillData> => {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('Chave da API OpenAI não configurada. Configure no arquivo .env');
    }

    // Converter imagem para base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Detectar o tipo da imagem
    const imageType = imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    const systemPrompt = `Voce e um assistente especializado em extrair informacoes de contas, boletos, comprovantes de PIX e faturas.

Analise a imagem e extraia as seguintes informacoes:
- Nome/descricao da conta (ex: "Conta de Luz", "Internet", "Mercado", etc)
- Valor (apenas numeros, sem R$)
- Data de vencimento (no formato DD/MM/AAAA)
- Categoria sugerida (uma das opcoes: Alimentacao, Transporte, Moradia, Saude, Educacao, Lazer, Compras, Contas, Outros)

IMPORTANTE:
- Se nao conseguir identificar algum campo, retorne null para ele
- Para comprovantes de PIX, o nome deve ser a descricao ou destinatario
- Para contas de luz/agua/gas, identifique a empresa e tipo
- O valor deve ser apenas numerico (ex: 150.50)
- A data deve estar no formato DD/MM/AAAA

Responda APENAS com um JSON valido no formato:
{
  "name": "string ou null",
  "amount": numero ou null,
  "dueDate": "string DD/MM/AAAA ou null",
  "category": "string ou null",
  "description": "string ou null"
}`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia as informacoes desta conta/comprovante:',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageType};base64,${base64Image}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erro ao processar imagem');
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content || '';

    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Nao foi possivel extrair dados da imagem');
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    return {
      name: extractedData.name || null,
      amount: extractedData.amount ? Number(extractedData.amount) : null,
      dueDate: extractedData.dueDate || null,
      category: extractedData.category || null,
      description: extractedData.description || null,
    };
  } catch (error) {
    console.error('Erro no OCR:', error);
    throw error;
  }
};

// Mapear categoria extraida para categoria do sistema
export const mapExtractedCategory = (
  extractedCategory: string | null,
  availableCategories: Array<{ id: string; name: string }>
): string | null => {
  if (!extractedCategory) return null;

  const categoryMap: Record<string, string[]> = {
    'Alimentacao': ['alimentacao', 'mercado', 'supermercado', 'restaurante', 'comida', 'food'],
    'Transporte': ['transporte', 'combustivel', 'gasolina', 'uber', '99', 'onibus', 'metro'],
    'Moradia': ['moradia', 'aluguel', 'condominio', 'iptu', 'luz', 'agua', 'gas', 'energia', 'eletricidade'],
    'Saude': ['saude', 'farmacia', 'medico', 'hospital', 'plano de saude', 'remedio'],
    'Educacao': ['educacao', 'escola', 'faculdade', 'curso', 'livro'],
    'Lazer': ['lazer', 'entretenimento', 'cinema', 'streaming', 'netflix', 'spotify'],
    'Compras': ['compras', 'shopping', 'roupa', 'eletronico'],
    'Contas': ['contas', 'internet', 'telefone', 'celular', 'tv', 'assinatura'],
  };

  const normalizedCategory = extractedCategory.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const [systemCategory, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(keyword => normalizedCategory.includes(keyword))) {
      const found = availableCategories.find(
        c => c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
          systemCategory.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        )
      );
      if (found) return found.id;
    }
  }

  // Tentar match direto
  const directMatch = availableCategories.find(
    c => c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normalizedCategory
  );

  return directMatch?.id || null;
};
