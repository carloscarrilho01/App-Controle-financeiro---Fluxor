import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { useGoals } from '../hooks/useGoals';
import { analyzeFinances, chatWithAI, quickSuggestions } from '../services/aiService';
import { COLORS } from '../types';
import { formatCurrency } from '../utils/formatters';
import { wp, hp, fs, spacing, borderRadius, iconSize } from '../utils/responsive';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIAssistantScreen() {
  const { transactions, getMonthSummary } = useTransactions();
  const { categories } = useCategories();
  const { accounts, getTotalBalance } = useAccounts();
  const { goals } = useGoals();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const monthSummary = getMonthSummary();

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const getFinancialData = () => ({
    transactions,
    categories,
    accounts,
    goals,
    totalBalance: getTotalBalance(),
    monthlyIncome: monthSummary.income,
    monthlyExpenses: monthSummary.expense,
  });

  const handleInitialAnalysis = async () => {
    setLoading(true);
    addMessage('user', 'Analise minhas financas e me de dicas');

    try {
      const response = await analyzeFinances(getFinancialData());
      addMessage('assistant', response);
    } catch (error: any) {
      addMessage('assistant', `Desculpe, ocorreu um erro na analise: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = inputText.trim();
    setInputText('');
    addMessage('user', userMessage);
    setLoading(true);

    try {
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await chatWithAI(
        getFinancialData(),
        chatHistory,
        userMessage
      );

      addMessage('assistant', response);
    } catch (error: any) {
      addMessage('assistant', `Desculpe, ocorreu um erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSuggestion = (suggestion: string) => {
    setInputText(suggestion);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  // Auto scroll para ultima mensagem
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={hp(90)}
    >
      {/* Header com resumo */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Assistente Financeiro</Text>
          <Text style={styles.headerSubtitle}>
            Saldo: {formatCurrency(getTotalBalance())}
          </Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleClearChat} style={styles.clearButton}>
            <MaterialCommunityIcons name="delete-outline" size={iconSize.md} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Mensagens */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="robot-happy" size={iconSize.xxl * 2} color={COLORS.primary} />
            <Text style={styles.emptyTitle}>Ola! Sou seu assistente financeiro</Text>
            <Text style={styles.emptyDescription}>
              Posso analisar seus gastos, identificar onde voce pode economizar
              e sugerir os melhores investimentos para seu perfil.
            </Text>

            <TouchableOpacity
              style={styles.analysisButton}
              onPress={handleInitialAnalysis}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="chart-line" size={iconSize.sm} color="#FFF" />
                  <Text style={styles.analysisButtonText}>Analisar Minhas Financas</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.suggestionsTitle}>Ou pergunte algo:</Text>
            <View style={styles.suggestionsContainer}>
              {quickSuggestions.slice(0, 4).map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => handleQuickSuggestion(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <>
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble
                ]}
              >
                {message.role === 'assistant' && (
                  <MaterialCommunityIcons
                    name="robot"
                    size={iconSize.sm}
                    color={COLORS.primary}
                    style={styles.botIcon}
                  />
                )}
                <Text style={[
                  styles.messageText,
                  message.role === 'user' && styles.userMessageText
                ]}>
                  {message.content}
                </Text>
              </View>
            ))}

            {loading && (
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.thinkingText}>Analisando...</Text>
              </View>
            )}

            {/* Sugestoes rapidas apos mensagens */}
            {!loading && messages.length > 0 && (
              <View style={styles.quickActionsContainer}>
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                  {quickSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.quickActionChip}
                      onPress={() => handleQuickSuggestion(suggestion)}
                    >
                      <Text style={styles.quickActionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TextInput
          style={styles.input}
          placeholder="Pergunte sobre suas financas..."
          placeholderTextColor={COLORS.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline={true}
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || loading}
        >
          <MaterialCommunityIcons
            name="send"
            size={iconSize.md}
            color={inputText.trim() && !loading ? '#FFF' : COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fs(18),
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    marginTop: hp(2),
  },
  clearButton: {
    padding: spacing.sm,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: hp(20),
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: hp(40),
  },
  emptyTitle: {
    fontSize: fs(20),
    fontWeight: '600',
    color: COLORS.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    lineHeight: hp(20),
  },
  analysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: hp(14),
    borderRadius: borderRadius.md,
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  analysisButtonText: {
    color: '#FFF',
    fontSize: fs(16),
    fontWeight: '600',
  },
  suggestionsTitle: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    marginTop: hp(32),
    marginBottom: spacing.md,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  suggestionChip: {
    backgroundColor: COLORS.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: hp(10),
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionText: {
    fontSize: fs(13),
    color: COLORS.text,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: hp(14),
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: wp(4),
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: wp(4),
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  botIcon: {
    marginRight: spacing.sm,
    marginTop: hp(2),
  },
  messageText: {
    fontSize: fs(15),
    color: COLORS.text,
    lineHeight: hp(22),
    flex: 1,
  },
  userMessageText: {
    color: '#FFF',
  },
  thinkingText: {
    color: COLORS.textSecondary,
    marginLeft: spacing.sm,
  },
  quickActionsContainer: {
    marginTop: spacing.sm,
  },
  quickActionChip: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: hp(14),
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
  },
  quickActionText: {
    fontSize: fs(13),
    color: COLORS.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: hp(10),
    fontSize: fs(15),
    color: COLORS.text,
    maxHeight: hp(100),
    marginRight: spacing.sm,
  },
  sendButton: {
    width: wp(44),
    height: wp(44),
    borderRadius: borderRadius.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
});
