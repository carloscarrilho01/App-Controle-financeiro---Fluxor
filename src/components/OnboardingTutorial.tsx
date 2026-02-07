import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../types';
import { wp, hp, fs, spacing, borderRadius, iconSize } from '../utils/responsive';

const { width } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: '1',
    icon: 'hand-wave',
    title: 'Bem-vindo!',
    description: 'Obrigado por escolher o Controle Financeiro! Vamos te mostrar como organizar suas finanças de forma simples e eficiente.',
    color: COLORS.primary,
  },
  {
    id: '2',
    icon: 'bank',
    title: 'Adicione suas Contas',
    description: 'Comece adicionando suas contas bancárias, carteiras e cartões. Assim você terá uma visão completa do seu dinheiro.',
    color: '#10B981',
  },
  {
    id: '3',
    icon: 'swap-horizontal',
    title: 'Registre Transações',
    description: 'Anote suas receitas e despesas. Você pode categorizar cada transação para entender melhor seus gastos.',
    color: '#F59E0B',
  },
  {
    id: '4',
    icon: 'target',
    title: 'Defina Metas',
    description: 'Crie metas de economia para realizar seus sonhos. Acompanhe seu progresso e mantenha-se motivado!',
    color: '#8B5CF6',
  },
  {
    id: '5',
    icon: 'robot',
    title: 'Assistente com IA',
    description: 'Use nosso assistente inteligente para receber dicas personalizadas e análises das suas finanças.',
    color: '#EC4899',
  },
  {
    id: '6',
    icon: 'rocket-launch',
    title: 'Tudo Pronto!',
    description: 'Agora é só começar! Adicione sua primeira conta e comece a controlar suas finanças.',
    color: COLORS.primary,
  },
];

interface OnboardingTutorialProps {
  onComplete: () => void;
}

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const handleNext = () => {
    if (currentIndex < tutorialSteps.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const renderStep = ({ item, index }: { item: TutorialStep; index: number }) => {
    return (
      <View style={[styles.slide, { width }]}>
        <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
          <MaterialCommunityIcons
            name={item.icon as any}
            size={iconSize.xxl * 2}
            color={item.color}
          />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {tutorialSteps.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [wp(8), wp(24), wp(8)],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor: tutorialSteps[currentIndex].color,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const isLastStep = currentIndex === tutorialSteps.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip Button */}
      {!isLastStep && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Pular</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={tutorialSteps}
        renderItem={renderStep}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Dots */}
      {renderDots()}

      {/* Next Button */}
      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: tutorialSteps[currentIndex].color }]}
        onPress={handleNext}
        activeOpacity={0.8}
      >
        <Text style={styles.nextButtonText}>
          {isLastStep ? 'Começar' : 'Próximo'}
        </Text>
        <MaterialCommunityIcons
          name={isLastStep ? 'check' : 'arrow-right'}
          size={iconSize.md}
          color="#FFF"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  skipButton: {
    position: 'absolute',
    top: hp(50),
    right: spacing.xl,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipText: {
    fontSize: fs(16),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconContainer: {
    width: wp(140),
    height: wp(140),
    borderRadius: wp(70),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(40),
  },
  title: {
    fontSize: fs(28),
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: fs(16),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: hp(24),
    paddingHorizontal: spacing.lg,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(40),
  },
  dot: {
    height: wp(8),
    borderRadius: wp(4),
    marginHorizontal: wp(4),
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xxl,
    marginBottom: hp(20),
    paddingVertical: hp(16),
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  nextButtonText: {
    fontSize: fs(18),
    fontWeight: '600',
    color: '#FFF',
  },
});
