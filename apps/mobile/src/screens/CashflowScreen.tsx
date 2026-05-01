import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import {
  Colors, Type, Shape, Spacing, Elevation,
  LoadingCard, ErrorBanner, SectionHeader, Chip, GradientCard,
} from '../components/shared';
import { API_BASE } from '../config';
import { Ionicons } from '@expo/vector-icons';

const YEARS  = ['2026', '2025', '2024', '2023', '2022', '2021'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n: number) {
  if (!n || isNaN(n)) return '₹0';
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function useDetailedStats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear]   = useState(YEARS[0]);
  const [month, setMonth] = useState<string | null>(null);

  const fetchData = useCallback(async (y: string, m: string | null) => {
    setLoading(true); setError(null);
    try {
      const url = m
        ? `${API_BASE}/stats/detailed?year=${y}&month=${MONTHS.indexOf(m) + 1}&_t=${Date.now()}`
        : `${API_BASE}/stats/detailed?year=${y}&_t=${Date.now()}`;
      console.log(`[Cashflow] Fetching: ${url}`);
      const res = await global.fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      console.log(`[Cashflow] Data received: Income=${json.summary?.total_income}`);
      setData(json);
    } catch (e: any) {
      console.error(`[Cashflow] Error: ${e.message}`);
      setError(e.message ?? 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(year, month); }, [year, month, fetchData]);

  return { data, loading, error, year, setYear, month, setMonth, refetch: () => fetchData(year, month) };
}

export default function CashflowScreen() {
  const { data, loading, error, year, setYear, month, setMonth, refetch } = useDetailedStats();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const income   = month ? (data?.months?.[month]?.Income ?? 0) : (data?.summary?.total_income ?? 0);
  const expenses = month ? (data?.months?.[month]?.Expenses ?? 0) : (data?.summary?.total_expenses ?? 0);
  const savings  = month ? (data?.months?.[month]?.["Cash surplus"] ?? 0) : (data?.summary?.net_savings ?? 0);

  const categoryData = month && data?.months?.[month]?.categories?.Expense
    ? Object.entries(data.months[month].categories.Expense as Record<string, number>)
        .map(([category, amount]) => ({ category, amount }))
        .filter(c => c.amount > 0)
        .sort((a, b) => b.amount - a.amount)
    : [];

  const trendData = !month && data?.months
    ? MONTHS.map(m => ({
        month: m,
        income: data.months[m]?.Income ?? 0,
        expenses: data.months[m]?.Expenses ?? 0,
        net: data.months[m]?.["Cash surplus"] ?? 0
      })).filter(t => t.income > 0 || t.expenses > 0)
    : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} progressBackgroundColor={Colors.surface} />}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {YEARS.map(y => (
          <Chip key={y} label={y} selected={year === y} onPress={() => { setYear(y); setMonth(null); }} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <Chip label="All Months" selected={!month} onPress={() => setMonth(null)} />
        {MONTHS.map(m => (
          <Chip key={m} label={m} selected={month === m} onPress={() => setMonth(m)} />
        ))}
      </ScrollView>

      <GradientCard
        colors={savings >= 0 ? Colors.primaryGradient : ['#EF4444', '#991B1B']}
        style={styles.summaryCard}
      >
        <Text style={styles.summaryLabel}>
          {month ? `${month} ${year}` : `${year} Overall`}
        </Text>
        {loading
          ? <LoadingCard lines={1} style={{ backgroundColor: 'transparent' }} />
          : <Text style={styles.summaryAmount}>{fmt(savings)}</Text>
        }
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>INCOME</Text>
            <Text style={styles.summaryItemValue}>{fmt(income)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>EXPENSES</Text>
            <Text style={styles.summaryItemValue}>{fmt(expenses)}</Text>
          </View>
        </View>
      </GradientCard>

      <ErrorBanner error={error} onRetry={refetch} />

      {loading && !error && (
        <View style={{ gap: 16, marginTop: 16 }}>
          <LoadingCard lines={2} />
          <LoadingCard lines={2} />
          <LoadingCard lines={2} />
        </View>
      )}

      {!loading && month && categoryData.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Top Categories" subtitle={`Spent in ${month}`} />
          {categoryData.map((item, idx) => (
            <View key={item.category} style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: Colors.chart[idx % Colors.chart.length] + '20' }]}>
                <View style={[styles.categoryDot, { backgroundColor: Colors.chart[idx % Colors.chart.length] }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryName}>{item.category}</Text>
                <Text style={styles.categoryPct}>
                  {((item.amount / expenses) * 100).toFixed(0)}% of expenses
                </Text>
              </View>
              <Text style={styles.categoryAmount}>{fmt(item.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {!loading && !month && trendData.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Monthly Trend" subtitle={year} />
          {trendData.map((m) => (
            <View key={m.month} style={styles.categoryCard}>
              <View style={styles.categoryIcon}>
                <Ionicons 
                  name={m.net >= 0 ? "trending-up" : "trending-down"} 
                  size={20} 
                  color={m.net >= 0 ? Colors.positive : Colors.negative} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryName}>{m.month}</Text>
                <Text style={styles.categoryPct}>
                  Savings: {m.income > 0 ? ((m.net / m.income) * 100).toFixed(0) : 0}%
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.categoryAmount, { color: m.net >= 0 ? Colors.positive : Colors.negative }]}>
                  {fmt(m.net)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: Spacing.xl, paddingBottom: 40 },
  filterRow: { marginHorizontal: -Spacing.xl, marginBottom: 8 },
  filterContent: { paddingHorizontal: Spacing.xl, gap: 8, paddingBottom: 12 },
  summaryCard: { marginVertical: Spacing.md },
  summaryLabel: { ...Type.labelLarge, color: 'rgba(255,255,255,0.8)', letterSpacing: 1.5 },
  summaryAmount: { ...Type.headlineLarge, color: '#FFFFFF', fontWeight: '800', marginVertical: 4 },
  summaryRow: { flexDirection: 'row', marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  summaryItem: { flex: 1 },
  summaryItemLabel: { ...Type.labelSmall, color: 'rgba(255,255,255,0.7)' },
  summaryItemValue: { ...Type.titleSmall, color: '#FFFFFF', marginTop: 2 },
  summaryDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: Spacing.md },
  section: { marginTop: Spacing.xl },
  categoryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Shape.medium, marginBottom: 8, ...Elevation.level1 },
  categoryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryName: { ...Type.titleSmall, color: Colors.onSurface },
  categoryPct: { ...Type.labelSmall, color: Colors.onSurfaceMuted },
  categoryAmount: { ...Type.titleSmall, color: Colors.onSurface, fontWeight: '700' },
});
