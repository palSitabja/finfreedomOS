import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { useAnalytics } from '../hooks/useApi';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Type, Shape, Spacing, Elevation, ErrorBanner, LinearProgress, DataRow, SectionHeader, LoadingCard } from '../components/shared';

const { width } = Dimensions.get('window');
const BAR_MAX_WIDTH = width - 40 - 32 - 80; // screen - padding - card padding - label

function fmt(n: number): string {
  if (!n || isNaN(n)) return '₹0';
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

const SECTOR_COLORS = [
  '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16',
];

export default function AnalyticsScreen() {
  const { allocation, performance, risk, loading, error, refetch } = useAnalytics();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const maxSectorVal = allocation?.sectors?.[0]?.value ?? 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}>
      {loading ? (
        <View style={{ gap: 16, marginTop: 12 }}>
          <LoadingCard lines={3} />
          <LoadingCard lines={4} />
          <LoadingCard lines={5} />
        </View>
      ) : (
        <>
          <ErrorBanner error={error} onRetry={refetch} />
          {/* Benchmark Performance */}
          {performance && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="bar-chart-outline" size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Performance vs Nifty 50</Text>
              </View>
              <View style={styles.perfRow}>
                <View style={[styles.perfCard, { borderColor: '#7c3aed' }]}>
                  <Text style={styles.perfLabel}>Portfolio CAGR</Text>
                  <Text style={[styles.perfValue, { color: Colors.primary }]}>
                    {(performance.portfolio_cagr ?? 0).toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.vsBadge}>
                  <Text style={styles.vsText}>VS</Text>
                </View>
                <View style={[styles.perfCard, { borderColor: '#0ea5e9' }]}>
                  <Text style={styles.perfLabel}>Nifty 50 (1Y)</Text>
                  <Text style={[styles.perfValue, { color: '#0ea5e9' }]}>
                    {(performance.nifty_1y_return ?? 0).toFixed(1)}%
                  </Text>
                </View>
              </View>
                <View style={[styles.statusBanner,
                  performance.status === 'Outperforming' ? styles.statusGreen : styles.statusRed]}>
                  <Ionicons
                    name={performance.status === 'Outperforming' ? 'rocket-outline' : 'warning-outline'}
                    size={14}
                    color={performance.status === 'Outperforming' ? Colors.positive : Colors.negative}
                  />
                  <Text style={[styles.statusText,
                    { color: performance.status === 'Outperforming' ? Colors.positive : Colors.negative }]}>
                    {performance.status} the Benchmark
                  </Text>
                </View>
            </View>
          )}

          {/* Risk Metrics */}
          {risk && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="shield-outline" size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Risk Analysis</Text>
              </View>
              <View style={styles.riskRow}>
                <View style={styles.riskCard}>
                  <Text style={styles.riskLabel}>Diversification</Text>
                  <Text style={[styles.riskValue,
                    { color: risk.diversification_status === 'Well Diversified' ? '#10b981' : '#f59e0b' }]}>
                    {risk.diversification_status ?? '—'}
                  </Text>
                </View>
                <View style={styles.riskCard}>
                  <Text style={styles.riskLabel}>HHI Score</Text>
                  <Text style={[styles.riskValue,
                    { color: (risk.hhi ?? 0) < 2000 ? '#10b981' : '#ef4444' }]}>
                    {Math.round(risk.hhi ?? 0)}
                  </Text>
                </View>
                <View style={styles.riskCard}>
                  <Text style={styles.riskLabel}>Max Position</Text>
                  <Text style={styles.riskValue}>{(risk.max_position_pct ?? 0).toFixed(1)}%</Text>
                </View>
              </View>
              {risk.alerts?.length > 0 && (
                <View style={styles.alertsCard}>
                  <View style={styles.alertsTitleRow}>
                    <Ionicons name="warning-outline" size={14} color={Colors.negative} />
                    <Text style={styles.alertsTitle}>Concentration Alerts</Text>
                  </View>
                  {risk.alerts.map((a: any, i: number) => (
                    <View key={i} style={styles.alertRow}>
                      <Text style={styles.alertTicker}>{a.ticker}</Text>
                      <Text style={[styles.alertPct,
                        { color: a.severity === 'High' ? '#dc2626' : '#f59e0b' }]}>
                        {a.pct.toFixed(1)}%  ({a.severity})
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Sector Allocation */}
          {allocation?.sectors?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="layers-outline" size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Sector Allocation</Text>
              </View>
              <Text style={styles.sectionSub}>Total Equity: {fmt(allocation.total_equity_value)}</Text>
              <View style={styles.card}>
                {allocation.sectors.map((sector: any, i: number) => {
                  const barWidth = (sector.value / maxSectorVal) * BAR_MAX_WIDTH;
                  const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
                  return (
                    <View key={sector.name} style={styles.sectorRow}>
                      <Text style={styles.sectorName} numberOfLines={1}>{sector.name}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} />
                      </View>
                      <Text style={styles.sectorPct}>{sector.percent.toFixed(1)}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
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
  section: { marginBottom: 24 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  alertsTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.onSurface, letterSpacing: -0.2 },

  sectionSub: { fontSize: 12, fontWeight: '600', color: Colors.onSurfaceVariant, marginBottom: 12 },
  perfRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  perfCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Shape.large, padding: Spacing.lg, borderWidth: 2 },
  perfLabel: { fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant, marginBottom: 6 },
  perfValue: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  vsBadge: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  vsText: { fontSize: 11, fontWeight: '800', color: Colors.onSurfaceVariant },
  statusBanner: { borderRadius: 12, padding: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  statusGreen: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  statusRed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusText: { fontWeight: '800', fontSize: 14, textAlign: 'center' },
  riskRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  riskCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Shape.large, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  riskLabel: { fontSize: 10, fontWeight: '700', color: Colors.onSurfaceVariant, marginBottom: 6, letterSpacing: 0.3 },
  riskValue: { fontSize: 14, fontWeight: '800', color: Colors.onSurface },
  alertsCard: { backgroundColor: '#fffbeb', borderRadius: Shape.large, padding: 14, borderWidth: 1, borderColor: '#fde68a' },
  alertsTitle: { fontSize: 13, fontWeight: '800', color: '#92400e', marginBottom: 10 },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  alertTicker: { fontWeight: '700', color: Colors.onSurface, fontSize: 14 },
  alertPct: { fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: Colors.surface, borderRadius: Shape.extraLarge, padding: Spacing.lg, borderWidth: 1, borderColor: '#e2e8f0' },
  sectorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectorName: { width: 90, fontSize: 12, fontWeight: '600', color: '#334155' },
  barTrack: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  sectorPct: { width: 42, fontSize: 12, fontWeight: '700', color: Colors.onSurface, textAlign: 'right' },
});
