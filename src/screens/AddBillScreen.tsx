import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, Input, Card } from '../components';
import { useBills } from '../hooks/useBills';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { COLORS } from '../types';
import { getIconName, toBrazilianDate, parseBrazilianDate } from '../utils/formatters';
import { extractBillDataFromImage, mapExtractedCategory } from '../services/ocrService';
import { format } from 'date-fns';
import { wp, hp, fs, spacing, borderRadius, iconSize } from '../utils/responsive';

export function AddBillScreen({ navigation, route }: any) {
  const editingBill = route.params?.bill;
  const { createBill, updateBill } = useBills();
  const { expenseCategories } = useCategories();
  const { accounts } = useAccounts();

  const [name, setName] = useState(editingBill?.name || '');
  const [amount, setAmount] = useState(editingBill?.amount?.toString() || '');
  const [dueDate, setDueDate] = useState(
    toBrazilianDate(editingBill?.due_date || format(new Date(), 'yyyy-MM-dd'))
  );
  const [selectedCategory, setSelectedCategory] = useState(
    editingBill?.category_id || ''
  );
  const [selectedAccount, setSelectedAccount] = useState(
    editingBill?.account_id || ''
  );
  const [isRecurring, setIsRecurring] = useState(editingBill?.is_recurring ?? true);
  const [reminderDays, setReminderDays] = useState(
    editingBill?.reminder_days_before?.toString() || '3'
  );
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  const handleScanImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissao necessaria', 'Precisamos de acesso a sua galeria para escanear imagens.');
        return;
      }

      Alert.alert(
        'Escanear Conta',
        'Como voce deseja adicionar a imagem?',
        [
          {
            text: 'Tirar Foto',
            onPress: async () => {
              const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
              if (cameraPermission.status !== 'granted') {
                Alert.alert('Permissao necessaria', 'Precisamos de acesso a camera.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                processImage(result.assets[0].uri);
              }
            },
          },
          {
            text: 'Escolher da Galeria',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                processImage(result.assets[0].uri);
              }
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Nao foi possivel selecionar a imagem');
    }
  };

  const processImage = async (imageUri: string) => {
    setScanning(true);
    setScannedImage(imageUri);

    try {
      const extractedData = await extractBillDataFromImage(imageUri);

      if (extractedData.name) {
        setName(extractedData.name);
      }
      if (extractedData.amount) {
        setAmount(extractedData.amount.toString());
      }
      if (extractedData.dueDate) {
        setDueDate(extractedData.dueDate);
      }
      if (extractedData.category) {
        const categoryId = mapExtractedCategory(extractedData.category, expenseCategories);
        if (categoryId) {
          setSelectedCategory(categoryId);
        }
      }

      Alert.alert(
        'Dados extraidos!',
        'Verifique se as informacoes estao corretas e complete os campos que faltam.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Erro ao processar imagem:', error);
      Alert.alert(
        'Erro ao escanear',
        'Nao foi possivel extrair os dados da imagem. Tente novamente ou preencha manualmente.'
      );
      setScannedImage(null);
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome da conta');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erro', 'Informe um valor valido');
      return;
    }
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(dueDate)) {
      Alert.alert('Erro', 'Data de vencimento invalida. Use o formato DD/MM/AAAA');
      return;
    }

    setLoading(true);

    const billData = {
      name: name.trim(),
      amount: parseFloat(amount),
      due_date: parseBrazilianDate(dueDate),
      category_id: selectedCategory,
      account_id: selectedAccount || undefined,
      is_recurring: isRecurring,
      is_paid: editingBill?.is_paid ?? false,
      reminder_days_before: parseInt(reminderDays) || 3,
    };

    let result;
    if (editingBill) {
      result = await updateBill(editingBill.id, billData);
    } else {
      result = await createBill(billData);
    }

    setLoading(false);

    if (result.error) {
      Alert.alert('Erro', result.error.message);
    } else {
      navigation.goBack();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Scan Button */}
      {!editingBill && (
        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScanImage}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <MaterialCommunityIcons name="camera-plus" size={iconSize.md} color={COLORS.primary} />
              <View style={styles.scanTextContainer}>
                <Text style={styles.scanTitle}>Escanear Conta</Text>
                <Text style={styles.scanSubtitle}>
                  Tire foto ou selecione imagem de uma conta, boleto ou comprovante
                </Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Scanned Image Preview */}
      {scannedImage && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: scannedImage }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.removeImage}
            onPress={() => setScannedImage(null)}
          >
            <MaterialCommunityIcons name="close-circle" size={iconSize.md} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* Name */}
      <Input
        label="Nome da Conta"
        value={name}
        onChangeText={setName}
        placeholder="Ex: Aluguel, Internet, etc."
      />

      {/* Amount */}
      <Input
        label="Valor"
        value={amount}
        onChangeText={text => setAmount(text.replace(',', '.'))}
        placeholder="0,00"
        keyboardType="decimal-pad"
        prefix="R$"
      />

      {/* Due Date */}
      <Input
        label="Data do Vencimento"
        value={dueDate}
        onChangeText={setDueDate}
        placeholder="DD/MM/AAAA"
      />

      {/* Category */}
      <Text style={styles.sectionLabel}>Categoria</Text>
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {expenseCategories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.selectItem,
              selectedCategory === category.id && { backgroundColor: category.color },
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <MaterialCommunityIcons
              name={getIconName(category.icon) as any}
              size={iconSize.xs}
              color={selectedCategory === category.id ? '#FFFFFF' : category.color}
            />
            <Text
              style={[
                styles.selectText,
                selectedCategory === category.id && styles.selectTextActive,
              ]}
              numberOfLines={1}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Account (optional) */}
      <Text style={styles.sectionLabel}>Conta para Debito (opcional)</Text>
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        <TouchableOpacity
          style={[
            styles.selectItem,
            !selectedAccount && styles.selectItemActive,
          ]}
          onPress={() => setSelectedAccount('')}
        >
          <Text style={styles.selectText}>Nenhuma</Text>
        </TouchableOpacity>
        {accounts.map(account => (
          <TouchableOpacity
            key={account.id}
            style={[
              styles.selectItem,
              selectedAccount === account.id && styles.selectItemActive,
            ]}
            onPress={() => setSelectedAccount(account.id)}
          >
            <MaterialCommunityIcons
              name={getIconName(account.icon, 'bank') as any}
              size={iconSize.xs}
              color={selectedAccount === account.id ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.selectText,
                selectedAccount === account.id && styles.selectTextActive,
              ]}
              numberOfLines={1}
            >
              {account.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Options */}
      <Card style={styles.optionsCard}>
        <View style={styles.optionRow}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionLabel}>Conta Recorrente</Text>
            <Text style={styles.optionDescription}>
              Repete todo mes automaticamente
            </Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: COLORS.border, true: `${COLORS.primary}50` }}
            thumbColor={isRecurring ? COLORS.primary : COLORS.textSecondary}
          />
        </View>

        <View style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: COLORS.border }]}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionLabel}>Lembrete</Text>
            <Text style={styles.optionDescription}>
              Dias antes do vencimento
            </Text>
          </View>
          <View style={styles.reminderInput}>
            <TouchableOpacity
              style={styles.reminderButton}
              onPress={() => setReminderDays((prev: string) => Math.max(0, parseInt(prev) - 1).toString())}
            >
              <Text style={styles.reminderButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.reminderValue}>{reminderDays}</Text>
            <TouchableOpacity
              style={styles.reminderButton}
              onPress={() => setReminderDays((prev: string) => Math.min(30, parseInt(prev) + 1).toString())}
            >
              <Text style={styles.reminderButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>

      {/* Save Button */}
      <Button
        title={editingBill ? 'Salvar' : 'Adicionar Conta'}
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
    padding: spacing.lg,
    paddingBottom: spacing.bottomSafe,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  scanTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  scanTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.primary,
  },
  scanSubtitle: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginTop: hp(2),
  },
  imagePreview: {
    position: 'relative',
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: hp(150),
    borderRadius: borderRadius.md,
  },
  removeImage: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.md,
  },
  sectionLabel: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  horizontalScroll: {
    marginBottom: spacing.lg,
  },
  selectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: hp(14),
    paddingVertical: hp(10),
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  selectText: {
    fontSize: fs(14),
    color: COLORS.text,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  selectTextActive: {
    color: '#FFFFFF',
  },
  optionsCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(12),
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fs(15),
    fontWeight: '500',
    color: COLORS.text,
  },
  optionDescription: {
    fontSize: fs(13),
    color: COLORS.textSecondary,
    marginTop: hp(2),
  },
  reminderInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderButton: {
    width: wp(32),
    height: wp(32),
    borderRadius: borderRadius.sm,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderButtonText: {
    fontSize: fs(18),
    fontWeight: '600',
    color: COLORS.text,
  },
  reminderValue: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.text,
    marginHorizontal: spacing.lg,
    minWidth: wp(24),
    textAlign: 'center',
  },
  saveButton: {
    marginTop: spacing.sm,
  },
});
