import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
};

export const formatDateRelative = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(d)) {
    return 'Hoje';
  }

  if (isYesterday(d)) {
    return 'Ontem';
  }

  return format(d, "dd 'de' MMMM", { locale: ptBR });
};

export const formatMonth = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "MMMM 'de' yyyy", { locale: ptBR });
};

export const formatShortMonth = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM', { locale: ptBR });
};

export const formatPercent = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

// Mapa de emojis para ícones do MaterialCommunityIcons
const EMOJI_TO_ICON: Record<string, string> = {
  // Categorias de receita
  '💼': 'briefcase',
  '💻': 'laptop',
  '📈': 'chart-line',
  '💵': 'cash',
  '💰': 'cash-plus',
  // Categorias de despesa
  '🍔': 'food',
  '🚗': 'car',
  '🏠': 'home',
  '🏥': 'hospital-box',
  '📚': 'school',
  '🎮': 'gamepad-variant',
  '🛒': 'cart',
  '📄': 'file-document',
  '📦': 'package-variant',
  // Tipos de conta
  '🏦': 'bank',
  '🐷': 'piggy-bank',
  '💳': 'credit-card',
  '✈️': 'airplane',
  '📱': 'cellphone',
};

// Converte emoji para nome de ícone do MaterialCommunityIcons
export const getIconName = (iconOrEmoji: string | undefined, fallback: string = 'package-variant'): string => {
  if (!iconOrEmoji) return fallback;

  // Se já é um nome de ícone válido (não tem emojis), retorna direto
  if (/^[a-z0-9-]+$/.test(iconOrEmoji)) {
    return iconOrEmoji;
  }

  // Tenta converter emoji para ícone
  return EMOJI_TO_ICON[iconOrEmoji] || fallback;
};

// Converte data de DD/MM/YYYY para YYYY-MM-DD
export const parseBrazilianDate = (dateStr: string): string => {
  // Se já está no formato YYYY-MM-DD, retorna direto
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Converte DD/MM/YYYY para YYYY-MM-DD
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return dateStr;
};

// Converte data de YYYY-MM-DD para DD/MM/YYYY
export const toBrazilianDate = (dateStr: string): string => {
  // Se já está no formato DD/MM/YYYY, retorna direto
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  // Converte YYYY-MM-DD para DD/MM/YYYY
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

  return dateStr;
};
