import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCategories } from '../hooks/useCategories';
import { Card, Button, Input } from '../components';
import { Category, DEFAULT_CATEGORIES } from '../types';

const CATEGORY_ICONS = [
  'home', 'food', 'car', 'bus', 'medical-bag', 'school', 'shopping',
  'tshirt-crew', 'movie', 'gamepad-variant', 'dumbbell', 'beach',
  'airplane', 'gift', 'cash', 'briefcase', 'laptop', 'phone',
  'baby-carriage', 'paw', 'flower', 'tools', 'lightbulb', 'water',
  'fire', 'wifi', 'bank', 'chart-line', 'piggy-bank', 'wallet',
  'credit-card', 'tag', 'heart', 'star', 'bookmark', 'folder',
];

const CATEGORY_COLORS = [
  '#FF6B6B', '#FF8E72', '#FFC107', '#4CAF50', '#2196F3', '#9C27B0',
  '#E91E63', '#00BCD4', '#009688', '#8BC34A', '#CDDC39', '#FF9800',
  '#795548', '#607D8B', '#3F51B5', '#673AB7', '#F44336', '#03A9F4',
];

export function CategoriesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const {
    categories,
    incomeCategories,
    expenseCategories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    refresh,
  } = useCategories();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [type, setType] = useState<'income' | 'expense'>('expense');

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const resetForm = () => {
    setName('');
    setIcon('tag');
    setColor(CATEGORY_COLORS[0]);
    setType('expense');
    setEditingCategory(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setType(activeTab);
    setShowAddModal(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setIcon(category.icon);
    setColor(category.color);
    setType(category.type);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome da categoria');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: name.trim(),
          icon,
          color,
        });
      } else {
        await createCategory({
          name: name.trim(),
          icon,
          color,
          type,
          is_default: false,
        });
      }
      setShowAddModal(false);
      resetForm();
      refresh();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível salvar');
    }
  };

  const handleDelete = (category: Category) => {
    if (category.is_default) {
      Alert.alert('Aviso', 'Categorias padrão não podem ser excluídas');
      return;
    }

    Alert.alert(
      'Excluir Categoria',
      `Deseja excluir a categoria "${category.name}"? Transações com esta categoria não serão excluídas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(category.id);
            refresh();
          },
        },
      ]
    );
  };

  const displayCategories = activeTab === 'expense' ? expenseCategories : incomeCategories;

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            { backgroundColor: colors.card },
            activeTab === 'expense' && { backgroundColor: colors.expense },
          ]}
          onPress={() => setActiveTab('expense')}
        >
          <MaterialCommunityIcons
            name="arrow-down-circle"
            size={20}
            color={activeTab === 'expense' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'expense' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Despesas ({expenseCategories.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            { backgroundColor: colors.card },
            activeTab === 'income' && { backgroundColor: colors.income },
          ]}
          onPress={() => setActiveTab('income')}
        >
          <MaterialCommunityIcons
            name="arrow-up-circle"
            size={20}
            color={activeTab === 'income' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'income' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            Receitas ({incomeCategories.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={handleOpenAdd}
      >
        <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Nova Categoria</Text>
      </TouchableOpacity>

      {/* Categories List */}
      {displayCategories.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="tag-off" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhuma categoria de {activeTab === 'expense' ? 'despesa' : 'receita'}
          </Text>
        </Card>
      ) : (
        <View style={styles.categoriesList}>
          {displayCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => handleOpenEdit(category)}
              onLongPress={() => handleDelete(category)}
            >
              <Card style={styles.categoryCard}>
                <View style={styles.categoryContent}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                    <MaterialCommunityIcons
                      name={category.icon as any}
                      size={24}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: colors.text }]}>
                      {category.name}
                    </Text>
                    {category.is_default && (
                      <Text style={[styles.categoryBadge, { color: colors.textSecondary }]}>
                        Padrão
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleOpenEdit(category)}
                    style={styles.editButton}
                  >
                    <MaterialCommunityIcons name="pencil" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {!category.is_default && (
                    <TouchableOpacity
                      onPress={() => handleDelete(category)}
                      style={styles.deleteButton}
                    >
                      <MaterialCommunityIcons name="delete" size={20} color={colors.expense} />
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Card style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Preview */}
            <View style={styles.preview}>
              <View style={[styles.previewIcon, { backgroundColor: color }]}>
                <MaterialCommunityIcons name={icon as any} size={32} color="#FFFFFF" />
              </View>
              <Text style={[styles.previewName, { color: colors.text }]}>
                {name || 'Nome da categoria'}
              </Text>
            </View>

            {/* Name Input */}
            <Input
              label="Nome"
              value={name}
              onChangeText={setName}
              placeholder="Ex: Alimentação, Lazer..."
            />

            {/* Type Selector (only for new) */}
            {!editingCategory && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>Tipo</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      { backgroundColor: colors.card },
                      type === 'expense' && { backgroundColor: colors.expense },
                    ]}
                    onPress={() => setType('expense')}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        { color: type === 'expense' ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      Despesa
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeOption,
                      { backgroundColor: colors.card },
                      type === 'income' && { backgroundColor: colors.income },
                    ]}
                    onPress={() => setType('income')}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        { color: type === 'income' ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      Receita
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Icon Selector */}
            <Text style={[styles.label, { color: colors.text }]}>Ícone</Text>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
              {CATEGORY_ICONS.map((iconName) => (
                <TouchableOpacity
                  key={iconName}
                  style={[
                    styles.iconOption,
                    { backgroundColor: colors.card },
                    icon === iconName && { backgroundColor: color },
                  ]}
                  onPress={() => setIcon(iconName)}
                >
                  <MaterialCommunityIcons
                    name={iconName as any}
                    size={24}
                    color={icon === iconName ? '#FFFFFF' : colors.text}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Color Selector */}
            <Text style={[styles.label, { color: colors.text }]}>Cor</Text>
            <View style={styles.colorGrid}>
              {CATEGORY_COLORS.map((colorOption) => (
                <TouchableOpacity
                  key={colorOption}
                  style={[
                    styles.colorOption,
                    { backgroundColor: colorOption },
                    color === colorOption && styles.colorOptionSelected,
                  ]}
                  onPress={() => setColor(colorOption)}
                >
                  {color === colorOption && (
                    <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Salvar"
                onPress={handleSave}
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
    tabs: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
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
    emptyCard: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      marginTop: 12,
    },
    categoriesList: {
      gap: 8,
    },
    categoryCard: {
      padding: 12,
    },
    categoryContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    categoryIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryInfo: {
      flex: 1,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '600',
    },
    categoryBadge: {
      fontSize: 12,
      marginTop: 2,
    },
    editButton: {
      padding: 8,
    },
    deleteButton: {
      padding: 8,
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
      maxHeight: '90%',
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    preview: {
      alignItems: 'center',
      marginBottom: 20,
    },
    previewIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewName: {
      fontSize: 16,
      fontWeight: '600',
      marginTop: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
      marginTop: 16,
    },
    typeSelector: {
      flexDirection: 'row',
      gap: 12,
    },
    typeOption: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    typeOptionText: {
      fontSize: 14,
      fontWeight: '600',
    },
    iconScroll: {
      maxHeight: 50,
    },
    iconOption: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    colorOption: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    colorOptionSelected: {
      borderWidth: 3,
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    modalButton: {
      flex: 1,
    },
  });
