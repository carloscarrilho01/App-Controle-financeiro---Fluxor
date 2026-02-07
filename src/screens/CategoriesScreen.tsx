import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCategories } from '../hooks/useCategories';
import { Card, Button, Input } from '../components';
import { Category } from '../types';

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
    allIncomeCategories,
    allExpenseCategories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchCategories,
    getSubcategories,
    hasSubcategories,
    getCategoryTree,
    createSubcategory,
  } = useCategories();

  const refresh = fetchCategories;
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [isSubcategory, setIsSubcategory] = useState(false);

  // State para controlar expansão das categorias
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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
    setParentCategory(null);
    setIsSubcategory(false);
  };

  // Toggle expansão de categoria
  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Obter categorias principais (sem parent)
  const getMainCategories = (cats: Category[]) => {
    return cats.filter(cat => !cat.parent_id);
  };

  // Categorias principais por tipo
  const mainExpenseCategories = useMemo(() =>
    getMainCategories(expenseCategories), [expenseCategories]);
  const mainIncomeCategories = useMemo(() =>
    getMainCategories(incomeCategories), [incomeCategories]);

  const handleOpenAdd = (parent?: Category) => {
    resetForm();
    setType(activeTab);
    if (parent) {
      setParentCategory(parent);
      setIsSubcategory(true);
      setType(parent.type);
      setColor(parent.color); // Herdar cor do pai
    }
    setShowAddModal(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setIcon(category.icon);
    setColor(category.color);
    setType(category.type);
    setIsSubcategory(!!category.parent_id);
    if (category.parent_id) {
      const parent = categories.find(c => c.id === category.parent_id);
      setParentCategory(parent || null);
    }
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
      } else if (isSubcategory && parentCategory) {
        // Criar subcategoria
        await createSubcategory(parentCategory.id, {
          name: name.trim(),
          icon,
          color,
          type: parentCategory.type,
          is_default: false,
        });
        // Expandir a categoria pai para mostrar a nova subcategoria
        setExpandedCategories(prev => new Set([...prev, parentCategory.id]));
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

    const subcats = getSubcategories(category.id);
    const hasSubcats = subcats.length > 0;

    Alert.alert(
      'Excluir Categoria',
      hasSubcats
        ? `Deseja excluir a categoria "${category.name}" e suas ${subcats.length} subcategoria(s)? Transações com estas categorias não serão excluídas.`
        : `Deseja excluir a categoria "${category.name}"? Transações com esta categoria não serão excluídas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            // Se tem subcategorias, deletar elas primeiro
            if (hasSubcats) {
              for (const subcat of subcats) {
                await deleteCategory(subcat.id);
              }
            }
            await deleteCategory(category.id);
            refresh();
          },
        },
      ]
    );
  };

  const displayCategories = activeTab === 'expense' ? mainExpenseCategories : mainIncomeCategories;

  // Renderizar categoria com suas subcategorias
  const renderCategory = (category: Category, isSubcat = false) => {
    const subcategories = getSubcategories(category.id);
    const hasSubs = subcategories.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <View key={category.id}>
        <TouchableOpacity
          onPress={() => {
            if (hasSubs) {
              toggleExpand(category.id);
            } else {
              handleOpenEdit(category);
            }
          }}
          onLongPress={() => handleDelete(category)}
        >
          <Card style={[styles.categoryCard, isSubcat && styles.subcategoryCard]}>
            <View style={styles.categoryContent}>
              {/* Indicador de expansão */}
              {hasSubs && (
                <TouchableOpacity
                  onPress={() => toggleExpand(category.id)}
                  style={styles.expandButton}
                >
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-down' : 'chevron-right'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
              {isSubcat && !hasSubs && <View style={styles.subcatIndent} />}

              <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                <MaterialCommunityIcons
                  name={category.icon as any}
                  size={isSubcat ? 20 : 24}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.categoryInfo}>
                <View style={styles.categoryNameRow}>
                  <Text style={[styles.categoryName, { color: colors.text }, isSubcat && styles.subcatName]}>
                    {category.name}
                  </Text>
                  {hasSubs && (
                    <View style={[styles.subcatCountBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.subcatCountText, { color: colors.primary }]}>
                        {subcategories.length}
                      </Text>
                    </View>
                  )}
                </View>
                {category.is_default && (
                  <Text style={[styles.categoryBadge, { color: colors.textSecondary }]}>
                    Padrão
                  </Text>
                )}
              </View>

              {/* Botão de adicionar subcategoria */}
              {!isSubcat && (
                <TouchableOpacity
                  onPress={() => handleOpenAdd(category)}
                  style={styles.addSubButton}
                >
                  <MaterialCommunityIcons name="plus-circle" size={22} color={colors.primary} />
                </TouchableOpacity>
              )}

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

        {/* Subcategorias */}
        {isExpanded && subcategories.length > 0 && (
          <View style={styles.subcategoriesContainer}>
            {subcategories.map(subcat => renderCategory(subcat, true))}
          </View>
        )}
      </View>
    );
  };

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
            Despesas ({allExpenseCategories.length})
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
            Receitas ({allIncomeCategories.length})
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

      {/* Info sobre subcategorias */}
      <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
        <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Toque no + para criar subcategorias. Toque na seta para expandir.
        </Text>
      </View>

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
          {displayCategories.map((category) => renderCategory(category))}
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
              {isSubcategory && parentCategory && (
                <View style={[styles.parentBadge, { backgroundColor: colors.primary + '20' }]}>
                  <MaterialCommunityIcons name="subdirectory-arrow-right" size={14} color={colors.primary} />
                  <Text style={[styles.parentBadgeText, { color: colors.primary }]}>
                    Subcategoria de {parentCategory.name}
                  </Text>
                </View>
              )}
            </View>

            {/* Name Input */}
            <Input
              label="Nome"
              value={name}
              onChangeText={setName}
              placeholder="Ex: Alimentação, Lazer..."
            />

            {/* Type Selector (only for new and not subcategory) */}
            {!editingCategory && !isSubcategory && (
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

            {/* Parent Category Selector (for converting to subcategory) */}
            {!editingCategory && !isSubcategory && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>Categoria Pai (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.parentScroll}>
                  <TouchableOpacity
                    style={[
                      styles.parentOption,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      !parentCategory && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      setParentCategory(null);
                      setIsSubcategory(false);
                    }}
                  >
                    <Text style={[styles.parentOptionText, { color: !parentCategory ? colors.primary : colors.text }]}>
                      Nenhuma
                    </Text>
                  </TouchableOpacity>
                  {(type === 'expense' ? mainExpenseCategories : mainIncomeCategories).map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.parentOption,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        parentCategory?.id === cat.id && { backgroundColor: cat.color + '20', borderColor: cat.color },
                      ]}
                      onPress={() => {
                        setParentCategory(cat);
                        setIsSubcategory(true);
                        setColor(cat.color);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={cat.icon as any}
                        size={16}
                        color={parentCategory?.id === cat.id ? cat.color : colors.text}
                      />
                      <Text
                        style={[
                          styles.parentOptionText,
                          { color: parentCategory?.id === cat.id ? cat.color : colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
    },
    categoryCard: {
      padding: 12,
    },
    subcategoryCard: {
      marginLeft: 20,
      padding: 10,
    },
    categoryContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    expandButton: {
      padding: 4,
      marginRight: 4,
    },
    subcatIndent: {
      width: 32,
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
    categoryNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '600',
    },
    subcatName: {
      fontSize: 14,
      fontWeight: '500',
    },
    subcatCountBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    subcatCountText: {
      fontSize: 11,
      fontWeight: '600',
    },
    categoryBadge: {
      fontSize: 12,
      marginTop: 2,
    },
    addSubButton: {
      padding: 8,
    },
    editButton: {
      padding: 8,
    },
    deleteButton: {
      padding: 8,
    },
    subcategoriesContainer: {
      marginTop: 4,
      gap: 4,
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
    parentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginTop: 8,
    },
    parentBadgeText: {
      fontSize: 12,
      fontWeight: '500',
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
    parentScroll: {
      maxHeight: 44,
    },
    parentOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1,
    },
    parentOptionText: {
      fontSize: 13,
      fontWeight: '500',
      maxWidth: 100,
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
