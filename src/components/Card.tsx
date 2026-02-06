import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../types';
import { wp, borderRadius } from '../utils/responsive';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export function Card({ children, style, padding }: CardProps) {
  const defaultPadding = wp(16);

  return (
    <View style={[styles.card, { padding: padding ?? defaultPadding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: wp(2) },
    shadowOpacity: 0.05,
    shadowRadius: wp(8),
    elevation: 2,
  },
});
