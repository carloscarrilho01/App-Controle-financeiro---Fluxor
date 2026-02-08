import { Dimensions, PixelRatio, Platform } from 'react-native';

// Dimensoes base (iPhone 11 Pro)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Escala horizontal baseada na largura da tela
const widthScale = SCREEN_WIDTH / BASE_WIDTH;
// Escala vertical baseada na altura da tela
const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;
// Escala moderada (media entre horizontal e vertical)
const moderateScale = (widthScale + heightScale) / 2;

/**
 * Escala um valor baseado na largura da tela
 * Use para: larguras, margens horizontais, paddings horizontais
 */
export const wp = (size: number): number => {
  return Math.round(size * widthScale);
};

/**
 * Escala um valor baseado na altura da tela
 * Use para: alturas, margens verticais, paddings verticais
 */
export const hp = (size: number): number => {
  return Math.round(size * heightScale);
};

/**
 * Escala moderada - usa um fator de escala mais suave
 * Use para: fontes, icones, elementos que precisam de escala equilibrada
 * @param size - tamanho base
 * @param factor - fator de moderacao (0-1), padrao 0.5
 */
export const ms = (size: number, factor: number = 0.5): number => {
  return Math.round(size + (widthScale - 1) * size * factor);
};

/**
 * Escala para fontes - considera densidade de pixels
 * Use para: tamanhos de fonte
 */
export const fs = (size: number): number => {
  const newSize = size * widthScale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
};

/**
 * Porcentagem da largura da tela
 */
export const widthPercent = (percent: number): number => {
  return Math.round((percent / 100) * SCREEN_WIDTH);
};

/**
 * Porcentagem da altura da tela
 */
export const heightPercent = (percent: number): number => {
  return Math.round((percent / 100) * SCREEN_HEIGHT);
};

/**
 * Verifica se e uma tela pequena (largura < 375)
 */
export const isSmallScreen = (): boolean => {
  return SCREEN_WIDTH < 375;
};

/**
 * Verifica se e uma tela grande (largura > 414)
 */
export const isLargeScreen = (): boolean => {
  return SCREEN_WIDTH > 414;
};

/**
 * Verifica se e tablet
 */
export const isTablet = (): boolean => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 600 || aspectRatio < 1.6;
};

/**
 * Retorna o numero de colunas ideal para grids
 */
export const getGridColumns = (minItemWidth: number = 100): number => {
  const columns = Math.floor(SCREEN_WIDTH / minItemWidth);
  return Math.max(2, Math.min(columns, 6));
};

/**
 * Dimensoes da tela
 */
export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: isSmallScreen(),
  isLarge: isLargeScreen(),
  isTablet: isTablet(),
};

/**
 * Padding inferior seguro para Android (barra de navegação)
 * No Android, a barra de navegação (voltar, home, apps) pode cobrir o conteúdo
 */
export const SAFE_BOTTOM_PADDING = Platform.OS === 'android' ? hp(48) : hp(20);

/**
 * Espacamentos responsivos predefinidos
 */
export const spacing = {
  xs: wp(4),
  sm: wp(8),
  md: wp(12),
  lg: wp(16),
  xl: wp(20),
  xxl: wp(24),
  bottomSafe: SAFE_BOTTOM_PADDING,
};

/**
 * Tamanhos de fonte responsivos
 */
export const fontSize = {
  xs: fs(10),
  sm: fs(12),
  md: fs(14),
  lg: fs(16),
  xl: fs(18),
  xxl: fs(20),
  xxxl: fs(24),
  title: fs(28),
  hero: fs(32),
};

/**
 * Raios de borda responsivos
 */
export const borderRadius = {
  sm: wp(6),
  md: wp(10),
  lg: wp(14),
  xl: wp(18),
  full: wp(100),
};

/**
 * Tamanhos de icones responsivos
 */
export const iconSize = {
  xs: ms(16),
  sm: ms(20),
  md: ms(24),
  lg: ms(28),
  xl: ms(32),
  xxl: ms(40),
};

export default {
  wp,
  hp,
  ms,
  fs,
  widthPercent,
  heightPercent,
  screen,
  spacing,
  fontSize,
  borderRadius,
  iconSize,
};
