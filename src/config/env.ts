// Configuração de variáveis de ambiente
// Em produção, estas variáveis devem ser configuradas via variáveis de ambiente
// ou através do app.config.js

import Constants from 'expo-constants';

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  openaiApiKey: string;
}

const getEnvVars = (): EnvConfig => {
  const extra = Constants.expoConfig?.extra || {};

  return {
    supabaseUrl: extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    openaiApiKey: extra.openaiApiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  };
};

export const ENV = getEnvVars();

// Validação de configuração
export const validateEnvConfig = (): { isValid: boolean; missingVars: string[] } => {
  const missingVars: string[] = [];

  if (!ENV.supabaseUrl) missingVars.push('SUPABASE_URL');
  if (!ENV.supabaseAnonKey) missingVars.push('SUPABASE_ANON_KEY');
  // OpenAI é opcional - o app funciona sem IA

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
};
