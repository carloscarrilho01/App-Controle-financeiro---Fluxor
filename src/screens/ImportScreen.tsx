import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { Card, Button } from '../components';
import {
  pickAndParseFile,
  ImportedTransaction,
  ImportResult,
  suggestCategory,
  detectDuplicates,
} from '../services/importService';
import { formatCurrency } from '../utils/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ImportScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { categories, getFlatCategories } = useCategories();
  const { accounts } = useAccounts();
  const { transactions, createTransaction } = useTransactions();

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [selectedAccount, setSelectedAccount] = useState<string>(accounts[0]?.id || '');
  const [importing, setImporting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [transactionCategories, setTransactionCategories] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(false);

  const handlePickFile = async () => {
    setLoading(true);
    try {
      const result = await pickAndParseFile();

      if (!result.success) {
        Alert.alert('Erro', result.errors[0] || 'Não foi possível processar o arquivo');
        return;
      }

      // Filtrar transações duplicadas
      const unique = detectDuplicates(result.transactions, transactions);

      if (unique.length < result.transactions.length) {
        Alert.alert(
          'Transações Duplicadas',
          `${result.transactions.length - unique.length} transação(ões) já existem e foram ignoradas.`
        );
      }

      result.transactions = unique;
      setImportResult(result);

      // Selecionar todas por padrão
      setSelectedTransactions(new Set(result.transactions.map((_, i) => i)));

      // Sugerir categorias automaticamente
      const suggestedCategories = new Map<number, string>();
      result.transactions.forEach((t, index) => {
        const suggested = suggestCategory(t.description, categories);
        if (suggested) {
          suggestedCategories.set(index, suggested.id);
        }
      });
      setTransactionCategories(suggestedCategories);

    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao importar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedTransactions);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedTransactions(newSelection);
  };

  const selectAll = () => {
    if (importResult) {
      setSelectedTransactions(new Set(importResult.transactions.map((_, i) => i)));
    }
  };

  const deselectAll = () => {
    setSelectedTransactions(new Set());
  };

  const openCategorySelector = (index: number) => {
    setEditingIndex(index);
    setShowCategoryModal(true);
  };

  const selectCategory = (categoryId: string) => {
    if (editingIndex !== null) {
      const newCategories = new Map(transactionCategories);
      newCategories.set(editingIndex, categoryId);
      setTransactionCategories(newCategories);
    }
    setShowCategoryModal(false);
    setEditingIndex(null);
  };

  const handleImport = async () => {
    if (!selectedAccount) {
      Alert.alert('Erro', 'Selecione uma conta de destino');
      return;
    }

    if (selectedTransactions.size === 0) {
      Alert.alert('Erro', 'Selecione pelo menos uma transação para importar');
      return;
    }

    // Verificar se todas as transações têm categoria
    const missing: number[] = [];
    selectedTransactions.forEach(index => {
      if (!transactionCategories.has(index)) {
        missing.push(index);
      }
    });

    if (missing.length > 0) {
      Alert.alert(
        'Categorias Faltando',
        `${missing.length} transação(ões) não têm categoria definida. Deseja continuar? Elas serão atribuídas à categoria "Outros".`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => doImport() },
        ]
      );
      return;
    }

    doImport();
  };

  const doImport = async () => {
    if (!importResult) return;

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    // Encontrar categoria "Outros" como fallback
    const otherCategory = categories.find(c =>
      c.name.toLowerCase() === 'outros' ||
      c.name.toLowerCase() === 'other' ||
      c.name.toLowerCase() === 'geral'
    );

    for (const index of Array.from(selectedTransactions)) {
      const transaction = importResult.transactions[index];
      const categoryId = transactionCategories.get(index) || otherCategory?.id;

      try {
        await createTransaction({
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.date,
          account_id: selectedAccount,
          category_id: categoryId || '',
        });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    setImporting(false);

    Alert.alert(
      'Importação Concluída',
      `${successCount} transação(ões) importada(s) com sucesso.${errorCount > 0 ? ` ${errorCount} erro(s).` : ''}`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const getCategoryName = (index: number) => {
    const categoryId = transactionCategories.get(index);
    if (!categoryId) return 'Sem categoria';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Sem categoria';
  };

  const styles = createStyles(colors);

  const renderTransaction = ({ item, index }: { item: ImportedTransaction; index: number }) => {
    const isSelected = selectedTransactions.has(index);
    const categoryName = getCategoryName(index);
    const category = categories.find(c => c.id === transactionCategories.get(index));

    return (
      <TouchableOpacity
        onPress={() => toggleSelection(index)}
        style={[
          styles.transactionItem,
          { backgroundColor: colors.card },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
        ]}
      >
        <View style={styles.checkboxContainer}>
          <MaterialCommunityIcons
            name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={isSelected ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
            {format(parseISO(item.date), 'dd/MM/yyyy')}
          </Text>
          <Text style={[styles.transactionDesc, { color: colors.text }]} numberOfLines={2}>
            {item.description}
          </Text>
          <TouchableOpacity
            onPress={() => openCategorySelector(index)}
            style={[styles.categoryBadge, { backgroundColor: category?.color || colors.border }]}
          >
            <MaterialCommunityIcons
              name={(category?.icon as any) || 'tag'}
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.categoryBadgeText}>{categoryName}</Text>
            <MaterialCommunityIcons name="chevron-down" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.transactionAmount,
            { color: item.type === 'income' ? colors.income : colors.expense },
          ]}
        >
          {item.type === 'expense' ? '-' : '+'}
          {formatCurrency(item.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!importResult ? (
        <ScrollView contentContainerStyle={styles.emptyContent}>
          <Card style={styles.instructionCard}>
            <MaterialCommunityIcons
              name="file-upload"
              size={64}
              color={colors.primary}
            />
            <Text style={[styles.instructionTitle, { color: colors.text }]}>
              Importar Extrato
            </Text>
            <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
              Selecione um arquivo OFX ou CSV do seu banco para importar transações automaticamente.
            </Text>

            <View style={styles.formatsList}>
              <View style={styles.formatItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.income} />
                <Text style={[styles.formatText, { color: colors.text }]}>
                  Arquivos OFX (Itaú, Bradesco, BB, Santander, etc.)
                </Text>
              </View>
              <View style={styles.formatItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.income} />
                <Text style={[styles.formatText, { color: colors.text }]}>
                  Arquivos CSV com separador ; ou ,
                </Text>
              </View>
              <View style={styles.formatItem}>
                <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
                <Text style={[styles.formatText, { color: colors.textSecondary }]}>
                  Detecta duplicatas automaticamente
                </Text>
              </View>
              <View style={styles.formatItem}>
                <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
                <Text style={[styles.formatText, { color: colors.textSecondary }]}>
                  Sugere categorias baseado na descrição
                </Text>
              </View>
            </View>

            <Button
              title="Selecionar Arquivo"
              onPress={handlePickFile}
              loading={loading}
              icon="folder-open"
              style={styles.selectButton}
            />
          </Card>
        </ScrollView>
      ) : (
        <>
          {/* Header com informações do arquivo */}
          <Card style={styles.fileInfoCard}>
            <View style={styles.fileInfoRow}>
              <MaterialCommunityIcons
                name={importResult.fileType === 'OFX' ? 'bank' : 'file-delimited'}
                size={24}
                color={colors.primary}
              />
              <View style={styles.fileInfoText}>
                <Text style={[styles.fileName, { color: colors.text }]}>
                  {importResult.fileName}
                </Text>
                <Text style={[styles.fileDetails, { color: colors.textSecondary }]}>
                  {importResult.transactions.length} transações •{' '}
                  {importResult.startDate && importResult.endDate
                    ? `${format(parseISO(importResult.startDate), 'dd/MM')} a ${format(parseISO(importResult.endDate), 'dd/MM/yy')}`
                    : 'Período não identificado'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setImportResult(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </Card>

          {/* Seleção de conta */}
          <View style={styles.accountSection}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Conta de destino
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {accounts.map(account => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountOption,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedAccount === account.id && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + '10',
                    },
                  ]}
                  onPress={() => setSelectedAccount(account.id)}
                >
                  <MaterialCommunityIcons
                    name={(account.icon as any) || 'bank'}
                    size={20}
                    color={selectedAccount === account.id ? colors.primary : colors.text}
                  />
                  <Text
                    style={[
                      styles.accountName,
                      { color: selectedAccount === account.id ? colors.primary : colors.text },
                    ]}
                  >
                    {account.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Ações de seleção */}
          <View style={styles.selectionActions}>
            <TouchableOpacity onPress={selectAll} style={styles.selectionButton}>
              <MaterialCommunityIcons name="checkbox-multiple-marked" size={20} color={colors.primary} />
              <Text style={[styles.selectionButtonText, { color: colors.primary }]}>
                Selecionar todas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={deselectAll} style={styles.selectionButton}>
              <MaterialCommunityIcons name="checkbox-multiple-blank-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.selectionButtonText, { color: colors.textSecondary }]}>
                Desmarcar todas
              </Text>
            </TouchableOpacity>
            <Text style={[styles.selectedCount, { color: colors.text }]}>
              {selectedTransactions.size}/{importResult.transactions.length}
            </Text>
          </View>

          {/* Lista de transações */}
          <FlatList
            data={importResult.transactions}
            renderItem={renderTransaction}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={styles.transactionsList}
          />

          {/* Botão de importar */}
          <View style={[styles.footer, { backgroundColor: colors.card }]}>
            <Button
              title={`Importar ${selectedTransactions.size} Transações`}
              onPress={handleImport}
              loading={importing}
              disabled={selectedTransactions.size === 0}
              style={styles.importButton}
            />
          </View>
        </>
      )}

      {/* Modal de seleção de categoria */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Selecionar Categoria
              </Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={getFlatCategories()}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    { backgroundColor: colors.background },
                    item.isSubcategory && styles.subcategoryOption,
                  ]}
                  onPress={() => selectCategory(item.id)}
                >
                  {item.isSubcategory && (
                    <MaterialCommunityIcons
                      name="subdirectory-arrow-right"
                      size={16}
                      color={colors.textSecondary}
                      style={styles.subcatIndicator}
                    />
                  )}
                  <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
                    <MaterialCommunityIcons
                      name={(item.icon as any) || 'tag'}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {item.name}
                  </Text>
                  <View
                    style={[
                      styles.categoryTypeBadge,
                      { backgroundColor: item.type === 'income' ? colors.income : colors.expense },
                    ]}
                  >
                    <Text style={styles.categoryTypeText}>
                      {item.type === 'income' ? 'Receita' : 'Despesa'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    emptyContent: {
      flex: 1,
      padding: 16,
      justifyContent: 'center',
    },
    instructionCard: {
      alignItems: 'center',
      padding: 24,
    },
    instructionTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
    },
    instructionText: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    formatsList: {
      width: '100%',
      marginTop: 24,
      gap: 12,
    },
    formatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    formatText: {
      fontSize: 14,
      flex: 1,
    },
    selectButton: {
      marginTop: 24,
      width: '100%',
    },
    fileInfoCard: {
      margin: 16,
      marginBottom: 0,
    },
    fileInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    fileInfoText: {
      flex: 1,
    },
    fileName: {
      fontSize: 16,
      fontWeight: '600',
    },
    fileDetails: {
      fontSize: 13,
      marginTop: 2,
    },
    accountSection: {
      padding: 16,
      paddingBottom: 8,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 12,
    },
    accountOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1,
    },
    accountName: {
      fontSize: 14,
      fontWeight: '500',
    },
    selectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 16,
    },
    selectionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    selectionButtonText: {
      fontSize: 13,
      fontWeight: '500',
    },
    selectedCount: {
      marginLeft: 'auto',
      fontSize: 14,
      fontWeight: '600',
    },
    transactionsList: {
      padding: 16,
      paddingBottom: 100,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
    },
    checkboxContainer: {
      marginRight: 12,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionDate: {
      fontSize: 12,
      marginBottom: 2,
    },
    transactionDesc: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 6,
    },
    categoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    categoryBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '500',
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: '700',
      marginLeft: 12,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      paddingBottom: 32,
    },
    importButton: {},
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      maxHeight: '70%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    categoryOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 4,
    },
    subcategoryOption: {
      paddingLeft: 32,
    },
    subcatIndicator: {
      position: 'absolute',
      left: 12,
    },
    categoryIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    categoryName: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
    },
    categoryTypeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    categoryTypeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '600',
    },
  });
