import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Button } from '../components';
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useGoals } from '../hooks/useGoals';
import { exportToCSV, exportBackup, exportSummaryToCSV, exportFullReport, exportToExcel } from '../utils/exportData';
import { COLORS } from '../types';
import { wp, hp, fs, spacing, borderRadius } from '../utils/responsive';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  action: () => Promise<void>;
}

export function BackupScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { transactions } = useTransactions();
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { goals } = useGoals();

  const [loading, setLoading] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const data = { transactions, accounts, categories };

  const handleExport = async (option: ExportOption) => {
    try {
      setLoading(option.id);
      await option.action();
      Alert.alert('Sucesso', 'Exportacao realizada com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Nao foi possivel exportar');
    } finally {
      setLoading(null);
    }
  };

  const exportOptions: ExportOption[] = [
    {
      id: 'backup',
      title: 'Backup Completo',
      description: 'Todos os dados em JSON (para restauracao)',
      icon: 'cloud-upload',
      color: COLORS.primary,
      action: () => exportBackup(data),
    },
    {
      id: 'csv',
      title: 'Transacoes (CSV)',
      description: 'Ultimos 3 meses em formato planilha',
      icon: 'file-delimited',
      color: '#10B981',
      action: () => exportToCSV(data, subMonths(new Date(), 3), new Date()),
    },
    {
      id: 'excel',
      title: 'Dados Completos (Excel)',
      description: 'Transacoes, contas e categorias',
      icon: 'microsoft-excel',
      color: '#217346',
      action: () => exportToExcel(data, subMonths(new Date(), 12), new Date()),
    },
    {
      id: 'summary',
      title: 'Resumo Mensal',
      description: `Resumo de ${format(selectedMonth, 'MMMM/yyyy', { locale: ptBR })}`,
      icon: 'chart-pie',
      color: '#F59E0B',
      action: () => exportSummaryToCSV(data, selectedMonth),
    },
    {
      id: 'report',
      title: 'Relatorio Formatado',
      description: 'Relatorio em texto para impressao',
      icon: 'file-document',
      color: '#8B5CF6',
      action: () => exportFullReport(data, selectedMonth),
    },
  ];

  const stats = {
    transactions: transactions.length,
    accounts: accounts.length,
    categories: categories.length,
    goals: goals.length,
  };

  return (
    <ScrollView
      style={[styles.container, { paddingBottom: insets.bottom }]}
      contentContainerStyle={styles.content}
    >
      {/* Info Card */}
      <Card style={styles.infoCard}>
        <MaterialCommunityIcons name="information" size={24} color={COLORS.primary} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Backup e Exportacao</Text>
          <Text style={styles.infoText}>
            Exporte seus dados para manter uma copia de seguranca ou analisar em outras ferramentas.
          </Text>
        </View>
      </Card>

      {/* Import Button */}
      <TouchableOpacity
        style={styles.importButton}
        onPress={() => navigation.navigate('Import')}
      >
        <View style={styles.importContent}>
          <View style={[styles.importIcon, { backgroundColor: COLORS.income + '20' }]}>
            <MaterialCommunityIcons name="file-import" size={28} color={COLORS.income} />
          </View>
          <View style={styles.importInfo}>
            <Text style={styles.importTitle}>Importar Extrato</Text>
            <Text style={styles.importDescription}>
              Importe transacoes de arquivos OFX ou CSV do seu banco
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>

      {/* Stats */}
      <Text style={styles.sectionTitle}>Seus Dados</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: COLORS.primary + '15' }]}>
          <Text style={styles.statValue}>{stats.transactions}</Text>
          <Text style={styles.statLabel}>Transacoes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.income + '15' }]}>
          <Text style={styles.statValue}>{stats.accounts}</Text>
          <Text style={styles.statLabel}>Contas</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.warning + '15' }]}>
          <Text style={styles.statValue}>{stats.categories}</Text>
          <Text style={styles.statLabel}>Categorias</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.info + '15' }]}>
          <Text style={styles.statValue}>{stats.goals}</Text>
          <Text style={styles.statLabel}>Metas</Text>
        </View>
      </View>

      {/* Month Selector */}
      <Text style={styles.sectionTitle}>Mes para Relatorios</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
        {Array.from({ length: 6 }, (_, i) => subMonths(new Date(), i)).map((month, index) => {
          const isSelected = format(month, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM');
          return (
            <TouchableOpacity
              key={index}
              style={[styles.monthChip, isSelected && styles.monthChipSelected]}
              onPress={() => setSelectedMonth(month)}
            >
              <Text style={[styles.monthText, isSelected && styles.monthTextSelected]}>
                {format(month, 'MMM/yy', { locale: ptBR })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Export Options */}
      <Text style={styles.sectionTitle}>Opcoes de Exportacao</Text>
      {exportOptions.map(option => (
        <TouchableOpacity
          key={option.id}
          onPress={() => handleExport(option)}
          disabled={loading !== null}
        >
          <Card style={styles.optionCard}>
            <View style={styles.optionContent}>
              <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                <MaterialCommunityIcons
                  name={option.icon as any}
                  size={24}
                  color={option.color}
                />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {loading === option.id ? (
                <ActivityIndicator size="small" color={option.color} />
              ) : (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={COLORS.textSecondary}
                />
              )}
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      {/* Tips */}
      <Card style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Dicas</Text>
        <View style={styles.tipItem}>
          <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.income} />
          <Text style={styles.tipText}>
            Faca backups regulares para nao perder dados
          </Text>
        </View>
        <View style={styles.tipItem}>
          <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.income} />
          <Text style={styles.tipText}>
            Arquivos CSV abrem no Excel e Google Sheets
          </Text>
        </View>
        <View style={styles.tipItem}>
          <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.income} />
          <Text style={styles.tipText}>
            Backups JSON podem ser usados para restaurar dados
          </Text>
        </View>
      </Card>
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
    paddingBottom: hp(40),
  },
  infoCard: {
    flexDirection: 'row',
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
  sectionTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: wp(70),
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fs(20),
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: fs(11),
    color: COLORS.textSecondary,
    marginTop: hp(2),
  },
  monthScroll: {
    marginBottom: spacing.md,
  },
  monthChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  monthText: {
    fontSize: fs(13),
    fontWeight: '500',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  monthTextSelected: {
    color: '#FFF',
  },
  optionCard: {
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: wp(48),
    height: wp(48),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  optionTitle: {
    fontSize: fs(15),
    fontWeight: '600',
    color: COLORS.text,
  },
  optionDescription: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginTop: hp(2),
  },
  tipsCard: {
    padding: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: COLORS.income + '10',
  },
  tipsTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: fs(13),
    color: COLORS.text,
    flex: 1,
  },
  importButton: {
    backgroundColor: COLORS.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.income + '40',
    borderStyle: 'dashed',
  },
  importContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  importIcon: {
    width: wp(56),
    height: wp(56),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  importTitle: {
    fontSize: fs(16),
    fontWeight: '600',
    color: COLORS.income,
  },
  importDescription: {
    fontSize: fs(12),
    color: COLORS.textSecondary,
    marginTop: hp(2),
  },
});
