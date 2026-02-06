import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSearch, useFilterPresets, SearchFilters } from '../hooks/useSearch';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { Card, TransactionItem } from '../components';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { debounce } from '../utils/helpers';

export function SearchScreen({ navigation }: any) {
  const { colors } = useTheme();
  const {
    results,
    loading,
    search,
    clearSearch,
    getSearchSuggestions,
    quickSearch,
  } = useSearch();
  const { presets } = useFilterPresets();
  const { categories } = useCategories();
  const { accounts } = useAccounts();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchResult, setSearchResult] = useState<{
    totalCount: number;
    incomeTotal: number;
    expenseTotal: number;
  } | null>(null);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.trim()) {
        const result = await quickSearch(searchQuery);
        setSearchResult({
          totalCount: result.totalCount,
          incomeTotal: result.incomeTotal,
          expenseTotal: result.expenseTotal,
        });
      }
    }, 300),
    []
  );

  // Debounced suggestions
  const debouncedSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length >= 2) {
        const sug = await getSearchSuggestions(searchQuery);
        setSuggestions(sug);
      } else {
        setSuggestions([]);
      }
    }, 200),
    []
  );

  useEffect(() => {
    if (query) {
      debouncedSearch(query);
      debouncedSuggestions(query);
    } else {
      clearSearch();
      setSearchResult(null);
      setSuggestions([]);
    }
  }, [query]);

  const handlePresetSelect = async (preset: typeof presets[0]) => {
    setFilters(preset.filters);
    const result = await search(preset.filters);
    setSearchResult({
      totalCount: result.totalCount,
      incomeTotal: result.incomeTotal,
      expenseTotal: result.expenseTotal,
    });
    setShowFilters(false);
  };

  const handleFilterApply = async () => {
    const result = await search({ ...filters, query });
    setSearchResult({
      totalCount: result.totalCount,
      incomeTotal: result.incomeTotal,
      expenseTotal: result.expenseTotal,
    });
    setShowFilters(false);
  };

  const handleClear = () => {
    setQuery('');
    setFilters({});
    clearSearch();
    setSearchResult(null);
    setSuggestions([]);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const getCategoryById = (id: string) => categories.find((c) => c.id === id);
  const getAccountById = (id: string) => accounts.find((a) => a.id === id);

  const styles = createStyles(colors);

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const category = getCategoryById(item.category_id);
    const account = getAccountById(item.account_id);

    return (
      <TransactionItem
        transaction={item}
        category={category}
        account={account}
        onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <MaterialCommunityIcons name="magnify" size={24} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar transações..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <MaterialCommunityIcons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.filterButton, showFilters && { backgroundColor: colors.primary }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={20}
            color={showFilters ? '#FFFFFF' : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { backgroundColor: colors.card }]}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionSelect(suggestion)}
            >
              <MaterialCommunityIcons name="history" size={16} color={colors.textSecondary} />
              <Text style={[styles.suggestionText, { color: colors.text }]}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: colors.card }]}>
          <Text style={[styles.filterTitle, { color: colors.text }]}>Filtros Rápidos</Text>
          <View style={styles.presetsContainer}>
            {presets.map((preset, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.presetChip, { backgroundColor: colors.background }]}
                onPress={() => handlePresetSelect(preset)}
              >
                <Text style={[styles.presetText, { color: colors.text }]}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterTitle, { color: colors.text, marginTop: 16 }]}>
            Filtrar por Tipo
          </Text>
          <View style={styles.typeFilters}>
            {(['all', 'income', 'expense'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  filters.type === type && { backgroundColor: colors.primary },
                ]}
                onPress={() => setFilters({ ...filters, type })}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: filters.type === type ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {type === 'all' ? 'Todos' : type === 'income' ? 'Receitas' : 'Despesas'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterTitle, { color: colors.text, marginTop: 16 }]}>
            Filtrar por Categoria
          </Text>
          <View style={styles.categoryFilters}>
            {categories.slice(0, 8).map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  filters.categoryIds?.includes(category.id) && {
                    backgroundColor: category.color,
                  },
                ]}
                onPress={() => {
                  const current = filters.categoryIds || [];
                  const newIds = current.includes(category.id)
                    ? current.filter((id) => id !== category.id)
                    : [...current, category.id];
                  setFilters({ ...filters, categoryIds: newIds });
                }}
              >
                <MaterialCommunityIcons
                  name={category.icon as any}
                  size={14}
                  color={
                    filters.categoryIds?.includes(category.id) ? '#FFFFFF' : category.color
                  }
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color: filters.categoryIds?.includes(category.id)
                        ? '#FFFFFF'
                        : colors.text,
                    },
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: colors.primary }]}
            onPress={handleFilterApply}
          >
            <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results Summary */}
      {searchResult && searchResult.totalCount > 0 && (
        <View style={[styles.resultsSummary, { backgroundColor: colors.card }]}>
          <Text style={[styles.resultsCount, { color: colors.text }]}>
            {searchResult.totalCount} {searchResult.totalCount === 1 ? 'resultado' : 'resultados'}
          </Text>
          <View style={styles.resultsTotals}>
            <Text style={[styles.resultsIncome, { color: colors.income }]}>
              +{formatCurrency(searchResult.incomeTotal)}
            </Text>
            <Text style={[styles.resultsExpense, { color: colors.expense }]}>
              -{formatCurrency(searchResult.expenseTotal)}
            </Text>
          </View>
        </View>
      )}

      {/* Results List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : query.length > 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="magnify-close" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhum resultado encontrado
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Tente usar outros termos ou filtros
          </Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="magnify" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Busque suas transações
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
            Digite um termo ou use os filtros
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      gap: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
    },
    filterButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    suggestionsContainer: {
      marginHorizontal: 16,
      marginTop: -8,
      borderRadius: 12,
      padding: 8,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    suggestionText: {
      fontSize: 14,
    },
    filtersPanel: {
      margin: 16,
      marginTop: 0,
      padding: 16,
      borderRadius: 12,
    },
    filterTitle: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 12,
    },
    presetsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
    },
    presetText: {
      fontSize: 13,
    },
    typeFilters: {
      flexDirection: 'row',
      gap: 8,
    },
    typeButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    typeButtonText: {
      fontSize: 13,
      fontWeight: '500',
    },
    categoryFilters: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 16,
      backgroundColor: colors.background,
    },
    categoryChipText: {
      fontSize: 12,
    },
    applyButton: {
      marginTop: 16,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    applyButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    resultsSummary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 12,
      borderRadius: 8,
    },
    resultsCount: {
      fontSize: 14,
      fontWeight: '500',
    },
    resultsTotals: {
      flexDirection: 'row',
      gap: 12,
    },
    resultsIncome: {
      fontSize: 14,
      fontWeight: '600',
    },
    resultsExpense: {
      fontSize: 14,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      padding: 16,
      paddingTop: 0,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 100,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      marginTop: 4,
    },
  });
