import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Button, Input } from '../components';
import { useTemplates } from '../hooks/useTemplates';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { TransactionTemplate, COLORS, AVAILABLE_ICONS, AVAILABLE_COLORS } from '../types';
import { formatCurrency } from '../utils/formatters';
import { wp, hp, fs, spacing, borderRadius } from '../utils/responsive';

export function TemplatesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUsage,
    fetchTemplates,
  } = useTemplates();
  const { categories } = useCategories();
  const { accounts } = useAccounts();

  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TransactionTemplate | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('lightning-bolt');
  const [selectedColor, setSelectedColor] = useState(COLORS.primary);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTemplates();
    setRefreshing(false);
  };

  const resetForm = () => {
    setName('');
    setType('expense');
    setAmount('');
    setDescription('');
    setCategoryId('');
    setAccountId('');
    setSelectedIcon('lightning-bolt');
    setSelectedColor(COLORS.primary);
    setEditingTemplate(null);
  };

  const handleOpenModal = (template?: TransactionTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setName(template.name);
      setType(template.type);
      setAmount(template.amount.toString());
      setDescription(template.description);
      setCategoryId(template.category_id);
      setAccountId(template.account_id);
      setSelectedIcon(template.icon || 'lightning-bolt');
      setSelectedColor(template.color || COLORS.primary);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe um nome para o template');
      return;
    }
    if (!categoryId) {
      Alert.alert('Erro', 'Selecione uma categoria');
      return;
    }
    if (!accountId) {
      Alert.alert('Erro', 'Selecione uma conta');
      return;
    }

    const templateData = {
      name: name.trim(),
      type,
      amount: parseFloat(amount) || 0,
      description: description.trim(),
      category_id: categoryId,
      account_id: accountId,
      icon: selectedIcon,
      color: selectedColor,
    };

    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, templateData);
    } else {
      await createTemplate(templateData);
    }

    setShowModal(false);
    resetForm();
  };

  const handleDelete = (template: TransactionTemplate) => {
    Alert.alert(
      'Excluir Template',
      `Deseja excluir "${template.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteTemplate(template.id),
        },
      ]
    );
  };

  const handleUseTemplate = async (template: TransactionTemplate) => {
    await incrementUsage(template.id);
    navigation.navigate('AddTransaction', {
      prefill: {
        type: template.type,
        amount: template.amount,
        description: template.description,
        category_id: template.category_id,
        account_id: template.account_id,
      },
    });
  };

  const filteredCategories = categories.filter(c => c.type === type);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Info */}
        <Card style={styles.infoCard}>
          <MaterialCommunityIcons name="lightning-bolt" size={24} color={COLORS.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Templates de Transações</Text>
            <Text style={styles.infoText}>
              Crie atalhos para transações frequentes e economize tempo ao lançar
            </Text>
          </View>
        </Card>

        {/* Add Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleOpenModal()}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Novo Template</Text>
        </TouchableOpacity>

        {/* Templates List */}
        {templates.length === 0 ? (
          <Card style={styles.emptyCard}>
            <MaterialCommunityIcons name="flash-off" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Nenhum template criado</Text>
            <Text style={styles.emptySubtext}>
              Templates facilitam o lançamento de transações recorrentes
            </Text>
          </Card>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Seus Templates ({templates.length})</Text>
            {templates.map(template => {
              const category = categories.find(c => c.id === template.category_id);
              const account = accounts.find(a => a.id === template.account_id);

              return (
                <TouchableOpacity
                  key={template.id}
                  onPress={() => handleUseTemplate(template)}
                  onLongPress={() => handleOpenModal(template)}
                >
                  <Card style={styles.templateCard}>
                    <View style={styles.templateHeader}>
                      <View
                        style={[
                          styles.templateIcon,
                          { backgroundColor: template.color || COLORS.primary },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={(template.icon || 'lightning-bolt') as any}
                          size={24}
                          color="#FFF"
                        />
                      </View>
                      <View style={styles.templateInfo}>
                        <Text style={styles.templateName}>{template.name}</Text>
                        <Text style={styles.templateDescription}>
                          {template.description || category?.name || 'Sem descrição'}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.templateAmount,
                          { color: template.type === 'income' ? COLORS.income : COLORS.expense },
                        ]}
                      >
                        {template.type === 'income' ? '+' : '-'} {formatCurrency(template.amount)}
                      </Text>
                    </View>

                    <View style={styles.templateFooter}>
                      <View style={styles.templateMeta}>
                        {category && (
                          <View style={styles.metaItem}>
                            <MaterialCommunityIcons
                              name={(category.icon as any) || 'tag'}
                              size={14}
                              color={COLORS.textSecondary}
                            />
                            <Text style={styles.metaText}>{category.name}</Text>
                          </View>
                        )}
                        {account && (
                          <View style={styles.metaItem}>
                            <MaterialCommunityIcons
                              name="bank"
                              size={14}
                              color={COLORS.textSecondary}
                            />
                            <Text style={styles.metaText}>{account.name}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.templateActions}>
                        <Text style={styles.usageCount}>
                          {template.usage_count} {template.usage_count === 1 ? 'uso' : 'usos'}
                        </Text>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDelete(template)}
                        >
                          <MaterialCommunityIcons name="delete" size={18} color={COLORS.expense} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Modal de Criação/Edição */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Nome */}
              <Input
                label="Nome do Template"
                value={name}
                onChangeText={setName}
                placeholder="Ex: Café da manhã"
              />

              {/* Tipo */}
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    type === 'expense' && styles.typeButtonActive,
                    type === 'expense' && { backgroundColor: COLORS.expense },
                  ]}
                  onPress={() => setType('expense')}
                >
                  <MaterialCommunityIcons
                    name="arrow-down"
                    size={18}
                    color={type === 'expense' ? '#FFF' : COLORS.text}
                  />
                  <Text style={[styles.typeButtonText, type === 'expense' && { color: '#FFF' }]}>
                    Despesa
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    type === 'income' && styles.typeButtonActive,
                    type === 'income' && { backgroundColor: COLORS.income },
                  ]}
                  onPress={() => setType('income')}
                >
                  <MaterialCommunityIcons
                    name="arrow-up"
                    size={18}
                    color={type === 'income' ? '#FFF' : COLORS.text}
                  />
                  <Text style={[styles.typeButtonText, type === 'income' && { color: '#FFF' }]}>
                    Receita
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Valor */}
              <Input
                label="Valor (opcional)"
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                keyboardType="decimal-pad"
                leftIcon={<Text style={{ color: COLORS.textSecondary }}>R$</Text>}
              />

              {/* Descrição */}
              <Input
                label="Descrição"
                value={description}
                onChangeText={setDescription}
                placeholder="Ex: Padaria do João"
              />

              {/* Categoria */}
              <Text style={styles.label}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {filteredCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.chip,
                      categoryId === cat.id && { backgroundColor: cat.color },
                    ]}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    <MaterialCommunityIcons
                      name={cat.icon as any}
                      size={16}
                      color={categoryId === cat.id ? '#FFF' : cat.color}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        categoryId === cat.id && { color: '#FFF' },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Conta */}
              <Text style={styles.label}>Conta</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {accounts.map(acc => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.chip,
                      accountId === acc.id && { backgroundColor: COLORS.primary },
                    ]}
                    onPress={() => setAccountId(acc.id)}
                  >
                    <MaterialCommunityIcons
                      name={acc.icon as any}
                      size={16}
                      color={accountId === acc.id ? '#FFF' : COLORS.text}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        accountId === acc.id && { color: '#FFF' },
                      ]}
                    >
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Ícone */}
              <Text style={styles.label}>Ícone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {AVAILABLE_ICONS.slice(0, 20).map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconChip,
                      selectedIcon === icon && { backgroundColor: selectedColor },
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <MaterialCommunityIcons
                      name={icon as any}
                      size={20}
                      color={selectedIcon === icon ? '#FFF' : COLORS.text}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Cor */}
              <Text style={styles.label}>Cor</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {AVAILABLE_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorChip,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorChipSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancelar"
                onPress={() => setShowModal(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
              <View style={{ width: spacing.md }} />
              <Button
                title="Salvar"
                onPress={handleSave}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.bottomSafe,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: hp(4),
  },
  infoText: {
    fontSize: fs(13),
    color: COLORS.textSecondary,
    lineHeight: hp(18),
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: hp(14),
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: fs(15),
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: fs(18),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fs(16),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fs(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  templateCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  templateIcon: {
    width: wp(48),
    height: wp(48),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.text,
  },
  templateDescription: {
    fontSize: fs(13),
    color: COLORS.textSecondary,
    marginTop: hp(2),
  },
  templateAmount: {
    fontSize: fs(16),
    fontWeight: '700',
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  templateMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
  },
  templateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  usageCount: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: fs(18),
    fontWeight: '600',
    color: COLORS.text,
  },
  modalContent: {
    padding: spacing.lg,
    maxHeight: hp(500),
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  label: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: hp(12),
    borderRadius: borderRadius.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeButtonActive: {
    borderColor: 'transparent',
  },
  typeButtonText: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.text,
  },
  chipScroll: {
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: hp(8),
    paddingHorizontal: wp(12),
    borderRadius: borderRadius.full,
    backgroundColor: COLORS.background,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: fs(13),
    color: COLORS.text,
  },
  iconChip: {
    width: wp(40),
    height: wp(40),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  colorChip: {
    width: wp(36),
    height: wp(36),
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorChipSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
