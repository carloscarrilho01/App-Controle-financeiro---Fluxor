import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Input, Card } from '../components';
import { useGoals } from '../hooks/useGoals';
import { COLORS } from '../types';
import { format, addMonths } from 'date-fns';
import { formatCurrency, toBrazilianDate, parseBrazilianDate } from '../utils/formatters';

const COLORS_LIST = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#F59E0B', '#84CC16', '#22C55E', '#14B8A6', '#06B6D4',
];

export function AddGoalScreen({ navigation, route }: any) {
  const editingGoal = route.params?.goal;
  const { createGoal, updateGoal, addToGoal } = useGoals();

  const [name, setName] = useState(editingGoal?.name || '');
  const [targetAmount, setTargetAmount] = useState(
    editingGoal?.target_amount?.toString() || ''
  );
  const [currentAmount, setCurrentAmount] = useState(
    editingGoal?.current_amount?.toString() || '0'
  );
  const [deadline, setDeadline] = useState(
    toBrazilianDate(editingGoal?.deadline || format(addMonths(new Date(), 6), 'yyyy-MM-dd'))
  );
  const [color, setColor] = useState(editingGoal?.color || COLORS_LIST[0]);
  const [loading, setLoading] = useState(false);
  const [addAmount, setAddAmount] = useState('');

  const progress = targetAmount
    ? Math.min((parseFloat(currentAmount) / parseFloat(targetAmount)) * 100, 100)
    : 0;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome da meta');
      return;
    }
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      Alert.alert('Erro', 'Informe um valor válido para a meta');
      return;
    }

    setLoading(true);

    const goalData = {
      name: name.trim(),
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(currentAmount) || 0,
      deadline: parseBrazilianDate(deadline),
      color,
    };

    let result;
    if (editingGoal) {
      result = await updateGoal(editingGoal.id, goalData);
    } else {
      result = await createGoal(goalData);
    }

    setLoading(false);

    if (result.error) {
      Alert.alert('Erro', result.error.message);
    } else {
      navigation.goBack();
    }
  };

  const handleAddAmount = async () => {
    if (!addAmount || parseFloat(addAmount) <= 0) {
      Alert.alert('Erro', 'Informe um valor válido');
      return;
    }

    if (editingGoal) {
      const { error } = await addToGoal(editingGoal.id, parseFloat(addAmount));
      if (error) {
        Alert.alert('Erro', error.message);
      } else {
        setCurrentAmount((prev: string) => (parseFloat(prev) + parseFloat(addAmount)).toString());
        setAddAmount('');
        Alert.alert('Sucesso', 'Valor adicionado à meta!');
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Name */}
      <Input
        label="Nome da Meta"
        value={name}
        onChangeText={setName}
        placeholder="Ex: Viagem de férias"
      />

      {/* Target Amount */}
      <Input
        label="Valor da Meta"
        value={targetAmount}
        onChangeText={text => setTargetAmount(text.replace(',', '.'))}
        placeholder="0,00"
        keyboardType="decimal-pad"
        prefix="R$"
      />

      {/* Deadline */}
      <Input
        label="Data Limite"
        value={deadline}
        onChangeText={setDeadline}
        placeholder="DD/MM/AAAA"
      />

      {/* Color */}
      <Text style={styles.sectionLabel}>Cor</Text>
      <View style={styles.colorsContainer}>
        {COLORS_LIST.map(c => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorItem,
              { backgroundColor: c },
              color === c && styles.colorItemActive,
            ]}
            onPress={() => setColor(c)}
          >
            {color === c && <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Current Progress (for editing) */}
      {editingGoal && (
        <>
          <Text style={styles.sectionLabel}>Progresso Atual</Text>
          <Card style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressAmount}>
                {formatCurrency(parseFloat(currentAmount))}
              </Text>
              <Text style={styles.progressTarget}>
                de {formatCurrency(parseFloat(targetAmount || '0'))}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%`, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{progress.toFixed(0)}% concluído</Text>

            {/* Add to goal */}
            <View style={styles.addSection}>
              <Input
                label="Adicionar valor"
                value={addAmount}
                onChangeText={text => setAddAmount(text.replace(',', '.'))}
                placeholder="0,00"
                keyboardType="decimal-pad"
                prefix="R$"
                style={styles.addInput}
              />
              <Button
                title="Adicionar"
                onPress={handleAddAmount}
                size="small"
                style={styles.addButton}
              />
            </View>
          </Card>
        </>
      )}

      {/* Preview (for new goals) */}
      {!editingGoal && (
        <>
          <Text style={styles.sectionLabel}>Preview</Text>
          <Card style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={[styles.colorDot, { backgroundColor: color }]} />
              <Text style={styles.previewName}>{name || 'Nome da Meta'}</Text>
            </View>
            <Text style={styles.previewTarget}>
              Meta: {formatCurrency(parseFloat(targetAmount || '0'))}
            </Text>
            <View style={styles.previewProgressBar}>
              <View style={[styles.progressFill, { width: '0%', backgroundColor: color }]} />
            </View>
            <Text style={styles.previewDeadline}>
              Prazo: {deadline || 'Não definido'}
            </Text>
          </Card>
        </>
      )}

      {/* Save Button */}
      <Button
        title={editingGoal ? 'Salvar' : 'Criar Meta'}
        onPress={handleSave}
        loading={loading}
        style={styles.saveButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 8,
  },
  colorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  colorItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorItemActive: {
    borderWidth: 3,
    borderColor: COLORS.text,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  progressCard: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  progressAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressTarget: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  progressBar: {
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  addSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  addInput: {
    marginBottom: 8,
  },
  addButton: {
    marginTop: 0,
  },
  previewCard: {
    marginBottom: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  previewTarget: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  previewProgressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  previewDeadline: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  saveButton: {
    marginTop: 8,
  },
});
