import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../types';
import { wp, borderRadius } from '../utils/responsive';

interface AnimatedFABProps {
  onPress: () => void;
  icon?: string;
  color?: string;
  backgroundColor?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedFAB({
  onPress,
  icon = 'plus',
  color = '#FFFFFF',
  backgroundColor = COLORS.primary,
  size = 56,
  style,
}: AnimatedFABProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: 300,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 40,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.fab,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
            transform: [{ scale: scaleAnim }, { rotate: rotation }],
          },
          style,
        ]}
      >
        <MaterialCommunityIcons name={icon as any} size={size * 0.5} color={color} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
