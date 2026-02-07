import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS } from '../types';
import { borderRadius, spacing } from '../utils/responsive';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  onPress?: () => void;
  duration?: number;
  animationType?: 'fadeIn' | 'slideUp' | 'scale' | 'slideRight';
}

export function AnimatedCard({
  children,
  style,
  delay = 0,
  onPress,
  duration = 400,
  animationType = 'fadeIn',
}: AnimatedCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(animationType === 'slideUp' ? 30 : 0)).current;
  const translateX = useRef(new Animated.Value(animationType === 'slideRight' ? -30 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(animationType === 'scale' ? 0.9 : 1)).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ];

    if (animationType === 'slideUp') {
      animations.push(
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        })
      );
    }

    if (animationType === 'slideRight') {
      animations.push(
        Animated.timing(translateX, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        })
      );
    }

    if (animationType === 'scale') {
      animations.push(
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        })
      );
    }

    Animated.parallel(animations).start();
  }, []);

  const animatedStyle: Animated.WithAnimatedObject<ViewStyle> = {
    opacity: fadeAnim,
    transform: [
      { translateY },
      { translateX },
      { scale: scaleAnim },
    ],
  };

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <Animated.View style={[styles.card, style, animatedStyle]}>
          {children}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={[styles.card, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

// Componente para animar itens de lista com stagger
interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedListItem({ children, index, style }: AnimatedListItemProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateX }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Componente de pulso para chamar atenção
interface PulseAnimationProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}

export function PulseAnimation({ children, style, active = true }: PulseAnimationProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [active]);

  return (
    <Animated.View style={[style, { transform: [{ scale: pulseAnim }] }]}>
      {children}
    </Animated.View>
  );
}

// Componente de shake para erros
interface ShakeAnimationProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  trigger?: boolean;
}

export function ShakeAnimation({ children, style, trigger }: ShakeAnimationProps) {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [trigger]);

  return (
    <Animated.View style={[style, { transform: [{ translateX: shakeAnim }] }]}>
      {children}
    </Animated.View>
  );
}

// Componente de bounce para botões
interface BounceButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function BounceButton({ children, onPress, style }: BounceButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// Componente de progresso animado
interface AnimatedProgressProps {
  progress: number; // 0-100
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedProgress({
  progress,
  color = COLORS.primary,
  height = 8,
  style,
}: AnimatedProgressProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <Animated.View style={[styles.progressContainer, { height }, style]}>
      <Animated.View
        style={[
          styles.progressBar,
          {
            backgroundColor: color,
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </Animated.View>
  );
}

// Componente de contador animado
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
  style?: StyleProp<ViewStyle>;
  textStyle?: any;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  formatter = (v) => v.toFixed(0),
  style,
  textStyle,
}: AnimatedCounterProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = React.useState('0');

  useEffect(() => {
    animatedValue.setValue(0);

    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();

    const listener = animatedValue.addListener(({ value: v }) => {
      setDisplayValue(formatter(v));
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value]);

  return (
    <Animated.View style={style}>
      <Animated.Text style={textStyle}>{displayValue}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  progressContainer: {
    backgroundColor: COLORS.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
