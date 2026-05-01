import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useStats, useInsights } from '../hooks/useApi';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors, Type, Shape, Spacing, Elevation,
  StatCard, LoadingCard, ErrorBanner, SectionHeader, Chip, LinearProgress,
  GradientCard, GlassCard, MarkdownStyles,
} from '../components/shared';
import Markdown from 'react-native-markdown-display';

function fmt(n: number) {
  if (!n || isNaN(n)) return '₹0';
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

const YEARS = ['All Time', '2026', '2025', '2024', '2023', '2022', '2021'];

export default function DashboardScreen() {
  const [year, setYear] = useState('All Time');
  const { stats, loading: sl, error: se, refetch: rs } = useStats(year);
  const { insights, loading: il, error: ie, refetch: ri } = useInsights();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([rs(), ri()]);
    setRefreshing(false);
  };

  const savingsRate = stats?.total_income > 0
    ? (stats.net_savings / stats.total_income) * 100 : 0;
  const investRate = stats?.total_income > 0
    ? (stats.investments / stats.total_income) * 100 : 0;
  const netPositive = (stats?.net_savings ?? 0) >= 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} progressBackgroundColor={Colors.surface} />}
    >
      {/* Year Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
        {YEARS.map(y => (
          <Chip key={y} label={y} selected={year === y} onPress={() => setYear(y)} />
        ))}
      </ScrollView>

      {/* Hero Card */}
      <GradientCard
        colors={netPositive ? Colors.primaryGradient : ['#EF4444', '#991B1B']}
        style={styles.heroCard}
      >
        <Text style={styles.heroEyebrow}>
          {year === 'All Time' ? 'NET SAVINGS' : `${year} FINANCIAL SUMMARY`}
        </Text>
        {sl
          ? <View style={styles.heroSkeleton} />
          : <Text style={styles.heroAmount}>{fmt(stats?.net_savings ?? 0)}</Text>
        }
        <View style={styles.heroMeta}>
          <View style={styles.heroMetaItem}>
            <Text style={styles.heroMetaLabel}>SAVINGS RATE</Text>
            <Text style={styles.heroMetaValue}>{savingsRate.toFixed(1)}%</Text>
          </View>
          <View style={styles.heroMetaDivider} />
          <View style={styles.heroMetaItem}>
            <Text style={styles.heroMetaLabel}>INVESTED</Text>
            <Text style={styles.heroMetaValue}>{investRate.toFixed(1)}%</Text>
          </View>
          <View style={styles.heroMetaDivider} />
          <View style={styles.heroMetaItem}>
            <Text style={styles.heroMetaLabel}>INCOME</Text>
            <Text style={styles.heroMetaValue}>{fmt(stats?.total_income ?? 0)}</Text>
          </View>
        </View>
      </GradientCard>

      {/* Error */}
      <ErrorBanner error={se} onRetry={rs} />

      {/* Stat Cards */}
      {sl
        ? <View style={[styles.cardRow, { marginBottom: Spacing.lg }]}><LoadingCard /><View style={{ width: 12 }} /><LoadingCard /></View>
        : (
          <View style={{ marginBottom: Spacing.lg }}>
            <View style={styles.cardRow}>
              <StatCard label="Expenses" value={fmt(stats?.actual_expenses ?? 0)} color={Colors.negative} gradientColors={['#FFFFFF', '#FEF2F2']} subtitle="Excl. investments" icon="card-outline" />
              <View style={{ width: 12 }} />
              <StatCard label="Invested" value={fmt(stats?.investments ?? 0)} color={Colors.primary} gradientColors={['#FFFFFF', Colors.primaryLight]} subtitle={`${investRate.toFixed(0)}% of income`} icon="trending-up-outline" />
            </View>
            <View style={[styles.cardRow, { marginTop: 12 }]}>
              <StatCard label="Bank Balance" value={fmt(stats?.bank_balance ?? 0)} color={netPositive ? Colors.positive : Colors.negative} gradientColors={netPositive ? ['#FFFFFF', '#F0FDF4'] : ['#FFFFFF', '#FEF2F2']} icon={netPositive ? 'checkmark-circle-outline' : 'alert-circle-outline'} />
              <View style={{ width: 12 }} />
              <StatCard label="Months" value={String(stats?.transaction_count ?? '—')} color={Colors.secondary} gradientColors={['#FFFFFF', Colors.secondaryLight]} subtitle="Tracked" icon="calendar-outline" />
            </View>
          </View>
        )
      }

      {/* Rate Visualisation */}
      {!sl && stats && (
        <View style={styles.rateCard}>
          <SectionHeader title="Financial Efficiency" subtitle={`${year} overview`} />
          <Text style={styles.rateLabel}>Savings Rate</Text>
          <LinearProgress value={savingsRate} color={Colors.positive} />
          <Text style={styles.rateCaption}>{savingsRate.toFixed(1)}% of income saved</Text>

          <View style={{ height: 16 }} />

          <Text style={styles.rateLabel}>Investment Rate</Text>
          <LinearProgress value={investRate} color={Colors.primary} />
          <Text style={styles.rateCaption}>{investRate.toFixed(1)}% of income deployed</Text>
        </View>
      )}

      {/* AI Insight */}
      <GlassCard style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <View style={styles.insightIconWrap}>
              <Ionicons name="sparkles" size={18} color={Colors.primary} />
            </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>Portfolio Intelligence</Text>
            <Text style={styles.insightSub}>AI portfolio analysis</Text>
          </View>
          {!il && (
            <TouchableOpacity onPress={ri} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {il
          ? <LoadingCard lines={4} />
          : ie
            ? <ErrorBanner error={ie} onRetry={ri} />
            : (
              <View style={{ marginTop: 12 }}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: Colors.positiveContainer }]}>
                    <Text style={[styles.badgeText, { color: Colors.positive }]}>{insights?.status ?? 'Stable'}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: Colors.primaryLight }]}>
                    <Text style={[styles.badgeText, { color: Colors.primary }]}>Risk: {insights?.risk_level ?? 'Moderate'}</Text>
                  </View>
                </View>
                <Markdown style={MarkdownStyles}>{insights?.analysis ?? 'No analysis available.'}</Markdown>
              </View>
            )
        }
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: Spacing.xl, paddingBottom: 40 },

  chipRow:        { marginHorizontal: -Spacing.xl, marginBottom: Spacing.xl },
  chipRowContent: { paddingHorizontal: Spacing.xl, gap: 8 },

  heroCard: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  heroSkeleton: {
    height: 48,
    width: '60%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Shape.small,
    marginVertical: 4,
  },
  heroEyebrow: {
    ...Type.labelLarge,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.5,
  },
  heroAmount: {
    ...Type.displaySmall,
    color: '#FFFFFF',
    fontWeight: '800',
    marginVertical: 4,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroMetaItem: {
    flex: 1,
  },
  heroMetaLabel: {
    ...Type.labelSmall,
    color: 'rgba(255,255,255,0.7)',
  },
  heroMetaValue: {
    ...Type.titleSmall,
    color: '#FFFFFF',
    marginTop: 2,
  },
  heroMetaDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: Spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
  },
  rateCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Shape.large,
    marginBottom: Spacing.lg,
    ...Elevation.level1,
  },
  rateLabel: {
    ...Type.titleSmall,
    color: Colors.onSurface,
    marginBottom: 8,
  },
  rateCaption: {
    ...Type.bodySmall,
    color: Colors.onSurfaceMuted,
    marginTop: 4,
    textAlign: 'right',
  },
  insightCard: {
    marginBottom: Spacing.xxxl,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightTitle: {
    ...Type.titleMedium,
    color: Colors.onSurface,
  },
  insightSub: {
    ...Type.labelSmall,
    color: Colors.onSurfaceMuted,
  },
  refreshBtn: {
    padding: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 8,
  },
  badgeText: {
    ...Type.labelSmall,
    fontWeight: '700',
  },
  insightText: {
    ...Type.bodyMedium,
    color: Colors.onSurface,
    lineHeight: 22,
  },
});
