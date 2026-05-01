import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useTaxSummary } from '../hooks/useApi';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Type, Shape, Spacing, Elevation, ErrorBanner, LinearProgress, DataRow, SectionHeader, LoadingCard } from '../components/shared';

function fmt(n: number): string {
  if (!n || isNaN(n)) return '₹0';
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, highlight ? { color: highlight } : undefined]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', flex: 1 },
  value: { fontSize: 14, fontWeight: '800', color: Colors.onSurface },
});

export default function TaxScreen() {
  const { taxSummary, loading, error, refetch } = useTaxSummary();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const isNew = taxSummary?.recommendation === 'New Regime';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}>
      {loading ? (
        <View style={{ gap: 16, marginTop: 12 }}>
          <LoadingCard lines={2} />
          <LoadingCard lines={5} />
          <LoadingCard lines={5} />
        </View>
      ) : (
        <>
          <ErrorBanner error={error} onRetry={refetch} />
          {taxSummary && (
            <>

          {/* Recommendation Banner */}
          <View style={[styles.banner, isNew ? styles.bannerNew : styles.bannerOld]}>
            <Text style={styles.bannerTitle}>Recommended: {taxSummary.recommendation}</Text>
            <Text style={styles.bannerSub}>
              Saves you {fmt(taxSummary.potential_savings)} vs the other regime
            </Text>
          </View>

          {/* Regime Comparison */}
          <View style={styles.regimeRow}>
            <View style={[styles.regimeCard, isNew && styles.regimeCardActive]}>
              <Text style={styles.regimeTitle}>New Regime</Text>
              {isNew && (
                <View style={styles.regimeBadge}>
                  <Ionicons name="star" size={10} color="#fff" />
                  <Text style={styles.regimeBadgeText}>Recommended</Text>
                </View>
              )}
              <Text style={styles.regimeTax}>{fmt(taxSummary.regimes?.new?.tax_liability ?? 0)}</Text>
              <Text style={styles.regimeRate}>{(taxSummary.regimes?.new?.effective_rate ?? 0).toFixed(1)}% effective</Text>
            </View>
            <View style={[styles.regimeCard, !isNew && styles.regimeCardActive]}>
              <Text style={styles.regimeTitle}>Old Regime</Text>
              {!isNew && (
                <View style={styles.regimeBadge}>
                  <Ionicons name="star" size={10} color="#fff" />
                  <Text style={styles.regimeBadgeText}>Recommended</Text>
                </View>
              )}
              <Text style={styles.regimeTax}>{fmt(taxSummary.regimes?.old?.tax_liability ?? 0)}</Text>
              <Text style={styles.regimeRate}>{(taxSummary.regimes?.old?.effective_rate ?? 0).toFixed(1)}% effective</Text>
            </View>
          </View>

          {/* Income Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Income Summary</Text>
            <View style={styles.card}>
              <Row label="Gross Salary" value={fmt(taxSummary.income_details?.gross_salary ?? 0)} />
              <Row label="Dividends" value={fmt(taxSummary.income_details?.dividends ?? 0)} />
              <Row label="Data Source" value={taxSummary.income_details?.is_from_document ? 'Form 16 (Uploaded)' : 'Sheet Estimate'} highlight="#7c3aed" />
            </View>
          </View>

          {/* Deductions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deductions</Text>
            <View style={styles.card}>
              <Row label="Section 80C" value={fmt(taxSummary.deductions?.breakdown?.['80c'] ?? 0)} />
              <Row label="Section 80D" value={fmt(taxSummary.deductions?.breakdown?.['80d'] ?? 0)} />
              <Row label="HRA Exemption" value={fmt(taxSummary.deductions?.breakdown?.hra ?? 0)} />
              <Row label="Other" value={fmt(taxSummary.deductions?.breakdown?.other ?? 0)} />
              <Row label="Total Deductions" value={fmt(taxSummary.deductions?.total ?? 0)} highlight="#16a34a" />
            </View>
          </View>

          {/* Capital Gains */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Capital Gains (FY2024-25)</Text>
            <View style={styles.card}>
              <Row label="Realized STCG" value={fmt(taxSummary.capital_gains?.realized_stcg ?? 0)} />
              <Row label="Realized LTCG" value={fmt(taxSummary.capital_gains?.realized_ltcg ?? 0)} />
              <Row label="CG Tax (est.)" value={fmt(taxSummary.capital_gains?.estimated_tax ?? 0)} highlight="#ef4444" />
            </View>
          </View>

          {/* Tax Harvesting */}
          {taxSummary.harvesting_recommendations?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="bulb-outline" size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Tax-Loss Harvesting</Text>
              </View>
              <View style={styles.card}>
                {taxSummary.harvesting_recommendations.map((h: any, i: number) => (
                  <View key={i} style={[rowStyles.row, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <Text style={{ fontWeight: '700', color: Colors.onSurface, fontSize: 14 }}>{h.name} ({h.ticker})</Text>
                    <View style={{ flexDirection: 'row', marginTop: 4, gap: 16 }}>
                      <Text style={{ color: Colors.negative, fontWeight: '600', fontSize: 13 }}>Loss: {fmt(h.unrealized_loss)}</Text>
                      <Text style={{ color: '#16a34a', fontWeight: '600', fontSize: 13 }}>Saves: {fmt(h.potential_tax_saving)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: 40 },
  errorCard: { backgroundColor: '#fef2f2', borderRadius: Shape.large, padding: Spacing.xl, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { color: '#dc2626', fontWeight: '600' },
  banner: { borderRadius: Shape.extraLarge, padding: Spacing.xl, marginBottom: 16 },
  bannerNew: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  bannerOld: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: Colors.onSurface, marginBottom: 4 },
  bannerSub: { fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  regimeRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  regimeCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Shape.large, padding: Spacing.lg, borderWidth: 1, borderColor: '#e2e8f0' },
  regimeCardActive: { borderColor: '#7c3aed', borderWidth: 2 },
  regimeTitle: { fontSize: 13, fontWeight: '800', color: Colors.onSurfaceVariant, marginBottom: 4 },
  regimeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8,
  },
  regimeBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  regimeTax: { fontSize: 20, fontWeight: '900', color: Colors.onSurface, marginBottom: 2 },
  regimeRate: { fontSize: 12, fontWeight: '600', color: Colors.onSurfaceVariant },
  section: { marginTop: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.onSurface, letterSpacing: -0.2 },
  card: { backgroundColor: Colors.surface, borderRadius: Shape.extraLarge, padding: Spacing.lg, borderWidth: 1, borderColor: '#e2e8f0' },
});
