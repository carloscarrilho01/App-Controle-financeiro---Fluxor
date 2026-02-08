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
import { useAccounts } from '../hooks/useAccounts';
import { ACCOUNT_TYPES, COLORS, AVAILABLE_ICONS } from '../types';
import { spacing } from '../utils/responsive';

const COLORS_LIST = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#F59E0B', '#84CC16', '#22C55E', '#14B8A6', '#06B6D4',
];

export function AddAccountScreen({ navigation, route }: any) {
  const editingAccount = route.params?.account;
  const { createAccount, updateAccount } = useAccounts();

  const [name, setName] = useState(editingAccount?.name || '');
  const [type, setType] = useState<keyof typeof ACCOUNT_TYPES>(
    editingAccount?.type || 'checking'
  );
  const [balance, setBalance] = useState(
    editingAccount?.balance?.toString() || '0'
  );
  const [color, setColor] = useState(editingAccount?.color || COLORS_LIST[0]);
  const [icon, setIcon] = useState(editingAccount?.icon || 'cash');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome da conta');
      return;
    }

    setLoading(true);

    const accountData = {
      name: name.trim(),
      type,
      balance: parseFloat(balance) || 0,
      color,
      icon,
    };

    let result;
    if (editingAccount) {
      result = await updateAccount(editingAccount.id, accountData);
    } else {
      result = await createAccount(accountData);
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
      {/* Name */}
      <Input
        label="Nome da Conta"
        value={name}
        onChangeText={setName}
        placeholder="Ex: Conta Principal"
      />

      {/* Account Type */}
      <Text style={styles.sectionLabel}>Tipo de Conta</Text>
      <View style={styles.typeContainer}>
        {(Object.keys(ACCOUNT_TYPES) as Array<keyof typeof ACCOUNT_TYPES>).map(t => (
          <TouchableOpacity
            key={t}
            style={[
              styles.typeItem,
              type === t && styles.typeItemActive,
            ]}
            onPress={() => setType(t)}
          >
            <MaterialCommunityIcons
              name={ACCOUNT_TYPES[t].icon as any}
              size={20}
              color={type === t ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.typeText,
                type === t && styles.typeTextActive,
              ]}
            >
              {ACCOUNT_TYPES[t].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Initial Balance */}
      <Input
        label={editingAccount ? 'Saldo Atual' : 'Saldo Inicial'}
        value={balance}
        onChangeText={text => setBalance(text.replace(',', '.'))}
        placeholder="0,00"
        keyboardType="decimal-pad"
        prefix="R$"
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
            {color === c && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Icon */}
      <Text style={styles.sectionLabel}>Ícone</Text>
      <View style={styles.iconsContainer}>
        {AVAILABLE_ICONS.slice(0, 20).map(i => (
          <TouchableOpacity
            key={i}
            style={[
              styles.iconItem,
              icon === i && styles.iconItemActive,
            ]}
            onPress={() => setIcon(i)}
          >
            <MaterialCommunityIcons
              name={i as any}
              size={24}
              color={icon === i ? COLORS.primary : COLORS.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Preview */}
      <Text style={styles.sectionLabel}>Preview</Text>
      <Card style={{...styles.previewCard, borderLeftColor: color}}>
        <View style={styles.previewHeader}>
          <View style={[styles.previewIconContainer, { backgroundColor: `${color}20` }]}>
            <MaterialCommunityIcons name={icon as any} size={24} color={color} />
          </View>
          <View style={styles.previewInfo}>
            <Text style={styles.previewName}>{name || 'Nome da Conta'}</Text>
            <Text style={styles.previewType}>{ACCOUNT_TYPES[type].label}</Text>
          </View>
        </View>
        <Text style={styles.previewBalance}>
          R$ {parseFloat(balance || '0').toFixed(2).replace('.', ',')}
        </Text>
      </Card>

      {/* Save Button */}
      <Button
        title={editingAccount ? 'Salvar' : 'Criar Conta'}
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
    paddingBottom: spacing.bottomSafe,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  typeItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    marginRight: '2%',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  typeIcon: {
    marginRight: 8,
  },
  typeText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  typeTextActive: {
    color: COLORS.primary,
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
  iconsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  iconItem: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    marginRight: 10,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  previewCard: {
    borderLeftWidth: 4,
    marginBottom: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  previewType: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  previewBalance: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'right',
  },
  saveButton: {
    marginTop: 8,
  },
});
