import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useBudgets } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { Card, Button, Input } from '../components';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function BudgetsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const {
    budgets,
    budgetsWithProgress,
    loading,
    createBudget,
    updateBudget,
    deleteBudget,
    fetchBudgets,
    getSummary
  } = useBudgets();
  const { expenseCategories } = useCategories();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [editingBudget, setEditingBudget] = useState<any>(null);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBudgets();
    setRefreshing(false);
  };

  const handleSaveBudget = async () => {
    if (!selectedCategory) {
      Alert.alert('Erro', 'Selecione uma categoria');
      return;
    }
    if (!budgetAmount || parseFloat(budgetAmount) <= 0) {
      Alert.alert('Erro', 'Informe um valor válido');
      return;
    }

    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, {
          amount: parseFloat(budgetAmount),
        });
      } else {
        await createBudget({
          category_id: selectedCategory,
          amount: parseFloat(budgetAmount),
          month: currentMonth,
          year: currentYear,
        });
      }
      setShowAddModal(false);
      setSelectedCategory('');
      setBudgetAmount('');
      setEditingBudget(null);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar');
    }
  };

  const handleEditBudget = (budget: any) => {
    setEditingBudget(budget);
    setSelectedCategory(budget.category_id);
    setBudgetAmount(budget.amount.toString());
    setShowAddModal(true);
  };

  const handleDeleteBudget = (budget: any) => {
    Alert.alert(
      'Excluir Orçamento',
      `Deseja excluir o orçamento de ${budget.category?.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteBudget(budget.id);
          },
        },
      ]
    );
  };

  const summary = getSummary();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'under':
        return colors.income;
      case 'warning':
        return colors.warning;
      case 'over':
        return colors.expense;
      default:
        return colors.textSecondary;
    }
  };

  const categoriesWithoutBudget = expenseCategories.filter(
    (cat) => !budgets.some((b) => b.category_id === cat.id)
  );

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <Text style={[styles.summaryMonth, { color: colors.textSecondary }]}>
          {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
        </Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Orçado</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              R$ {summary.totalBudget.toFixed(2).replace('.', ',')}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Gasto</Text>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>
              R$ {summary.totalSpent.toFixed(2).replace('.', ',')}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Disponível</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: summary.totalRemaining >= 0 ? colors.income : colors.expense },
              ]}
            >
              R$ {summary.totalRemaining.toFixed(2).replace('.', ',')}
            </Text>
          </View>
        </View>

        {/* Overall Progress */}
        {summary.totalBudget > 0 && (
          <View style={styles.overallProgress}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor:
                      summary.overallPercentage > 100
                        ? colors.expense
                        : summary.overallPercentage > 80
                        ? colors.warning
                        : colors.primary,
                    width: `${Math.min(100, summary.overallPercentage)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressPercent, { color: colors.textSecondary }]}>
              {summary.overallPercentage.toFixed(0)}%
            </Text>
          </View>
        )}
      </Card>

      {/* Add Budget Button */}
      {categoriesWithoutBudget.length > 0 && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setEditingBudget(null);
            setSelectedCategory('');
            setBudgetAmount('');
            setShowAddModal(true);
          }}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Novo Orçamento</Text>
        </TouchableOpacity>
      )}

      {/* Budget List */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Orçamentos por Categoria</Text>

      {budgetsWithProgress.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="wallet-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhum orçamento definido
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Defina orçamentos para controlar seus gastos por categoria
          </Text>
        </Card>
      ) : (
        budgetsWithProgress.map((budget) => {
          const percentUsed = budget.percentage;

          return (
            <Card key={budget.id} style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <View style={styles.budgetCategoryInfo}>
                  <View style={[styles.categoryIcon, { backgroundColor: budget.category?.color || colors.primary }]}>
                    <MaterialCommunityIcons
                      name={(budget.category?.icon as any) || 'tag'}
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                  <View>
                    <Text style={[styles.budgetCategory, { color: colors.text }]}>
                      {budget.category?.name || 'Categoria'}
                    </Text>
                    <Text style={[styles.budgetStatus, { color: getStatusColor(budget.status) }]}>
                      {budget.status === 'over'
                        ? 'Acima do orçamento'
                        : budget.status === 'warning'
                        ? 'Atenção'
                        : 'Dentro do orçamento'}
                    </Text>
                  </View>
                </View>
                <View style={styles.budgetActions}>
                  <TouchableOpacity onPress={() => handleEditBudget(budget)}>
                    <MaterialCommunityIcons name="pencil" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteBudget(budget)}>
                    <MaterialCommunityIcons name="delete" size={20} color={colors.expense} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Values */}
              <View style={styles.budgetValues}>
                <View style={styles.budgetValueItem}>
                  <Text style={[styles.budgetValueLabel, { color: colors.textSecondary }]}>Gasto</Text>
                  <Text style={[styles.budgetValueAmount, { color: colors.expense }]}>
                    R$ {budget.spent.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                <View style={styles.budgetValueItem}>
                  <Text style={[styles.budgetValueLabel, { color: colors.textSecondary }]}>Orçado</Text>
                  <Text style={[styles.budgetValueAmount, { color: colors.text }]}>
                    R$ {budget.amount.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                <View style={styles.budgetValueItem}>
                  <Text style={[styles.budgetValueLabel, { color: colors.textSecondary }]}>Restante</Text>
                  <Text
                    style={[
                      styles.budgetValueAmount,
                      { color: budget.remaining >= 0 ? colors.income : colors.expense },
                    ]}
                  >
                    R$ {budget.remaining.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.budgetProgress}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: getStatusColor(budget.status),
                        width: `${Math.min(100, percentUsed)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressPercent, { color: colors.textSecondary }]}>
                  {percentUsed.toFixed(0)}%
                </Text>
              </View>
            </Card>
          );
        })
      )}

      {/* Add Budget Modal */}
      {showAddModal && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Card style={styles.modal}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}
            </Text>

            {!editingBudget && (
              <>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Categoria</Text>
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {categoriesWithoutBudget.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: colors.card },
                        selectedCategory === category.id && { backgroundColor: category.color },
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      <MaterialCommunityIcons
                        name={category.icon as any}
                        size={18}
                        color={selectedCategory === category.id ? '#FFFFFF' : category.color}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: selectedCategory === category.id ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Input
              label="Valor do Orçamento"
              value={budgetAmount}
              onChangeText={setBudgetAmount}
              placeholder="0,00"
              keyboardType="decimal-pad"
              leftIcon={<Text style={{ color: colors.textSecondary }}>R$</Text>}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                onPress={() => {
                  setShowAddModal(false);
                  setEditingBudget(null);
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Salvar"
                onPress={handleSaveBudget}
                style={styles.modalButton}
              />
            </View>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    summaryCard: {
      padding: 16,
      marginBottom: 16,
    },
    summaryMonth: {
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'capitalize',
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryItem: {
      flex: 1,
      alignItems: 'center',
    },
    summaryDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: '700',
      marginTop: 4,
    },
    overallProgress: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 16,
    },
    progressBar: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    progressPercent: {
      fontSize: 12,
      fontWeight: '600',
      width: 36,
      textAlign: 'right',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      marginBottom: 20,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    emptyCard: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '500',
      marginTop: 12,
    },
    emptySubtext: {
      fontSize: 14,
      marginTop: 4,
      textAlign: 'center',
    },
    budgetCard: {
      padding: 16,
      marginBottom: 12,
    },
    budgetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    budgetCategoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    categoryIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    budgetCategory: {
      fontSize: 16,
      fontWeight: '600',
    },
    budgetStatus: {
      fontSize: 12,
      marginTop: 2,
    },
    budgetActions: {
      flexDirection: 'row',
      gap: 12,
    },
    budgetValues: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    budgetValueItem: {
      alignItems: 'center',
    },
    budgetValueLabel: {
      fontSize: 11,
      fontWeight: '500',
    },
    budgetValueAmount: {
      fontSize: 14,
      fontWeight: '600',
      marginTop: 4,
    },
    budgetProgress: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modal: {
      width: '100%',
      maxWidth: 400,
      padding: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    modalLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
    categoryScroll: {
      marginBottom: 16,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 20,
      marginRight: 8,
    },
    categoryChipText: {
      fontSize: 14,
      fontWeight: '500',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    modalButton: {
      flex: 1,
    },
  });
