import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../types';
import { wp, hp, fs, spacing, borderRadius, iconSize } from '../utils/responsive';

interface TutorialStep {
  icon: string;
  title: string;
  description: string;
}

interface TutorialTooltipProps {
  tutorialKey: string; // Chave única para cada tela
  steps: TutorialStep[];
  onComplete?: () => void;
}

const TUTORIAL_STORAGE_PREFIX = '@financeapp:tutorial_seen_';

export function TutorialTooltip({ tutorialKey, steps, onComplete }: TutorialTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    checkIfSeen();
  }, []);

  const checkIfSeen = async () => {
    try {
      const seen = await AsyncStorage.getItem(`${TUTORIAL_STORAGE_PREFIX}${tutorialKey}`);
      if (seen !== 'true') {
        // Pequeno delay para a tela carregar antes de mostrar o tutorial
        setTimeout(() => {
          setVisible(true);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 500);
      }
    } catch (error) {
      console.error('Erro ao verificar tutorial:', error);
    }
  };

  const markAsSeen = async () => {
    try {
      await AsyncStorage.setItem(`${TUTORIAL_STORAGE_PREFIX}${tutorialKey}`, 'true');
    } catch (error) {
      console.error('Erro ao salvar tutorial:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      markAsSeen();
      onComplete?.();
    });
  };

  const handleSkip = () => {
    handleClose();
  };

  if (!visible || steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleSkip}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.tooltipContainer,
                {
                  opacity: fadeAnim,
                  transform: [{
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  }],
                },
              ]}
            >
              {/* Icone */}
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={step.icon as any}
                  size={iconSize.xl}
                  color={COLORS.primary}
                />
              </View>

              {/* Conteudo */}
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.description}>{step.description}</Text>

              {/* Indicadores de passo */}
              {steps.length > 1 && (
                <View style={styles.dotsContainer}>
                  {steps.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        index === currentStep && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Botoes */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                  <Text style={styles.skipText}>Pular</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
                  <Text style={styles.nextText}>
                    {isLastStep ? 'Entendi!' : 'Próximo'}
                  </Text>
                  <MaterialCommunityIcons
                    name={isLastStep ? 'check' : 'arrow-right'}
                    size={iconSize.xs}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>

              {/* Botao fechar */}
              <TouchableOpacity style={styles.closeButton} onPress={handleSkip}>
                <MaterialCommunityIcons name="close" size={iconSize.sm} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Tutoriais predefinidos para cada tela
export const SCREEN_TUTORIALS = {
  dashboard: [
    {
      icon: 'view-dashboard',
      title: 'Seu Painel Financeiro',
      description: 'Aqui você vê um resumo completo das suas finanças: saldo total, receitas e despesas do mês.',
    },
    {
      icon: 'bank',
      title: 'Suas Contas',
      description: 'Deslize para ver todas as suas contas. Toque em uma conta para ver detalhes ou em "+" para adicionar nova.',
    },
    {
      icon: 'bell-outline',
      title: 'Contas a Pagar',
      description: 'Fique atento às suas contas próximas do vencimento. Nunca mais esqueça um pagamento!',
    },
  ],
  transactions: [
    {
      icon: 'swap-horizontal',
      title: 'Suas Transações',
      description: 'Veja todas as suas movimentações. Use os filtros para encontrar transações específicas.',
    },
    {
      icon: 'plus-circle',
      title: 'Adicionar Transação',
      description: 'Toque no botão "+" para registrar uma nova receita, despesa ou transferência.',
    },
  ],
  addTransaction: [
    {
      icon: 'cash-multiple',
      title: 'Nova Transação',
      description: 'Escolha o tipo: Despesa, Receita ou Transferência. Preencha o valor e os detalhes.',
    },
    {
      icon: 'shape',
      title: 'Categorize',
      description: 'Escolha uma categoria para organizar melhor seus gastos e ter relatórios precisos.',
    },
  ],
  goals: [
    {
      icon: 'target',
      title: 'Suas Metas',
      description: 'Crie metas de economia para realizar seus sonhos. Acompanhe seu progresso aqui!',
    },
    {
      icon: 'plus',
      title: 'Nova Meta',
      description: 'Toque em "+" para criar uma meta. Defina o valor desejado e a data limite.',
    },
  ],
  bills: [
    {
      icon: 'file-document-outline',
      title: 'Contas a Pagar',
      description: 'Gerencie todas as suas contas fixas e variáveis. Nunca mais perca um vencimento!',
    },
    {
      icon: 'camera',
      title: 'Escanear Contas',
      description: 'Use a câmera para escanear boletos e comprovantes. Os dados são preenchidos automaticamente!',
    },
  ],
  accounts: [
    {
      icon: 'bank',
      title: 'Suas Contas',
      description: 'Gerencie suas contas bancárias, carteiras e cartões de crédito em um só lugar.',
    },
    {
      icon: 'pencil',
      title: 'Editar Conta',
      description: 'Toque em uma conta para editar seus detalhes ou ver o extrato.',
    },
  ],
  aiAssistant: [
    {
      icon: 'robot',
      title: 'Assistente com IA',
      description: 'Seu assistente financeiro pessoal! Pergunte sobre seus gastos, peça dicas ou análises.',
    },
    {
      icon: 'chart-line',
      title: 'Análise Inteligente',
      description: 'Toque em "Analisar Minhas Finanças" para receber insights personalizados sobre seu dinheiro.',
    },
  ],
  settings: [
    {
      icon: 'cog',
      title: 'Configurações',
      description: 'Personalize o app, ative a biometria, gerencie categorias e muito mais.',
    },
  ],
  reports: [
    {
      icon: 'chart-bar',
      title: 'Relatórios',
      description: 'Visualize gráficos e análises detalhadas dos seus gastos e receitas ao longo do tempo.',
    },
  ],
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  tooltipContainer: {
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: wp(320),
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: spacing.xs,
  },
  iconContainer: {
    width: wp(64),
    height: wp(64),
    borderRadius: wp(32),
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fs(20),
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: hp(20),
    marginBottom: spacing.lg,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  dot: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: COLORS.border,
    marginHorizontal: wp(4),
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: wp(20),
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  nextText: {
    fontSize: fs(14),
    color: '#FFF',
    fontWeight: '600',
  },
});
