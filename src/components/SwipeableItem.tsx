import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../types';
import { wp, hp, fs, spacing, borderRadius } from '../utils/responsive';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = wp(80);
const ACTION_WIDTH = wp(70);

interface SwipeAction {
  icon: string;
  color: string;
  backgroundColor: string;
  onPress: () => void;
  label?: string;
}

interface SwipeableItemProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeOpen?: (direction: 'left' | 'right') => void;
  onSwipeClose?: () => void;
  disabled?: boolean;
}

export function SwipeableItem({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeOpen,
  onSwipeClose,
  disabled = false,
}: SwipeableItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  const currentDirection = useRef<'left' | 'right' | null>(null);

  const leftActionsWidth = leftActions.length * ACTION_WIDTH;
  const rightActionsWidth = rightActions.length * ACTION_WIDTH;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (disabled) return false;
        // Só captura se o movimento horizontal for significativo
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        // Parar qualquer animação em andamento
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        let newX = gestureState.dx;

        // Se já estava aberto, adicionar o offset
        if (isOpen.current) {
          if (currentDirection.current === 'right') {
            newX += rightActionsWidth;
          } else if (currentDirection.current === 'left') {
            newX -= leftActionsWidth;
          }
        }

        // Limitar o movimento
        if (leftActions.length === 0 && newX > 0) {
          newX = 0;
        }
        if (rightActions.length === 0 && newX < 0) {
          newX = 0;
        }

        // Aplicar resistência nas bordas
        if (newX > leftActionsWidth) {
          newX = leftActionsWidth + (newX - leftActionsWidth) * 0.3;
        }
        if (newX < -rightActionsWidth) {
          newX = -rightActionsWidth + (newX + rightActionsWidth) * 0.3;
        }

        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const velocity = gestureState.vx;
        const dx = gestureState.dx;

        // Determinar a posição final baseado no gesto
        let finalPosition = 0;
        let newDirection: 'left' | 'right' | null = null;

        // Deslizando para a direita (mostra ações da esquerda)
        if (dx > SWIPE_THRESHOLD || (velocity > 0.5 && dx > 0)) {
          if (leftActions.length > 0) {
            finalPosition = leftActionsWidth;
            newDirection = 'left';
          }
        }
        // Deslizando para a esquerda (mostra ações da direita)
        else if (dx < -SWIPE_THRESHOLD || (velocity < -0.5 && dx < 0)) {
          if (rightActions.length > 0) {
            finalPosition = -rightActionsWidth;
            newDirection = 'right';
          }
        }

        // Animar para a posição final
        Animated.spring(translateX, {
          toValue: finalPosition,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }).start();

        // Atualizar estado
        if (finalPosition === 0) {
          if (isOpen.current) {
            onSwipeClose?.();
          }
          isOpen.current = false;
          currentDirection.current = null;
        } else {
          if (!isOpen.current) {
            onSwipeOpen?.(newDirection!);
          }
          isOpen.current = true;
          currentDirection.current = newDirection;
        }
      },
    })
  ).current;

  const close = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
    isOpen.current = false;
    currentDirection.current = null;
    onSwipeClose?.();
  };

  const handleActionPress = (action: SwipeAction) => {
    close();
    setTimeout(() => {
      action.onPress();
    }, 200);
  };

  // Interpolação para as ações da esquerda
  const leftActionsTranslate = translateX.interpolate({
    inputRange: [0, leftActionsWidth],
    outputRange: [-leftActionsWidth, 0],
    extrapolate: 'clamp',
  });

  // Interpolação para as ações da direita
  const rightActionsTranslate = translateX.interpolate({
    inputRange: [-rightActionsWidth, 0],
    outputRange: [0, rightActionsWidth],
    extrapolate: 'clamp',
  });

  // Opacidade das ações
  const leftActionsOpacity = translateX.interpolate({
    inputRange: [0, leftActionsWidth / 2, leftActionsWidth],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const rightActionsOpacity = translateX.interpolate({
    inputRange: [-rightActionsWidth, -rightActionsWidth / 2, 0],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  // Escala das ações
  const leftActionsScale = translateX.interpolate({
    inputRange: [0, leftActionsWidth],
    outputRange: [0.8, 1],
    extrapolate: 'clamp',
  });

  const rightActionsScale = translateX.interpolate({
    inputRange: [-rightActionsWidth, 0],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Ações da esquerda */}
      {leftActions.length > 0 && (
        <Animated.View
          style={[
            styles.actionsContainer,
            styles.leftActions,
            {
              transform: [{ translateX: leftActionsTranslate }, { scale: leftActionsScale }],
              opacity: leftActionsOpacity,
            },
          ]}
        >
          {leftActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.action, { backgroundColor: action.backgroundColor }]}
              onPress={() => handleActionPress(action)}
            >
              <MaterialCommunityIcons name={action.icon as any} size={24} color={action.color} />
              {action.label && <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>}
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* Ações da direita */}
      {rightActions.length > 0 && (
        <Animated.View
          style={[
            styles.actionsContainer,
            styles.rightActions,
            {
              transform: [{ translateX: rightActionsTranslate }, { scale: rightActionsScale }],
              opacity: rightActionsOpacity,
            },
          ]}
        >
          {rightActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.action, { backgroundColor: action.backgroundColor }]}
              onPress={() => handleActionPress(action)}
            >
              <MaterialCommunityIcons name={action.icon as any} size={24} color={action.color} />
              {action.label && <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>}
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* Conteúdo principal */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  content: {
    backgroundColor: COLORS.card,
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  leftActions: {
    left: 0,
  },
  rightActions: {
    right: 0,
  },
  action: {
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionLabel: {
    fontSize: fs(11),
    marginTop: hp(4),
    fontWeight: '500',
  },
});
