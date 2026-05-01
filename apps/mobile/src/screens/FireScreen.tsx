import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, TextInput,
} from 'react-native';
import { useFireStatus } from '../hooks/useApi';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Type, Shape, Spacing, Elevation, ErrorBanner, LinearProgress, DataRow, SectionHeader, LoadingCard } from '../components/shared';
import { API_BASE } from '../config';

function fmt(n: number): string {
  if (!n || isNaN(n)) return '₹0';
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function FireScreen() {
  const { fireStatus, loading, error, refetch } = useFireStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [expectedReturn, setExpectedReturn] = useState('10');
  const [inflationRate, setInflationRate] = useState('6');
  const [currentAge, setCurrentAge] = useState('30');
  const [retirementAge, setRetirementAge] = useState('45');
  const [projecting, setProjecting] = useState(false);
  const [projection, setProjection] = useState<any>(null);
  const [projError, setProjError] = useState<string | null>(null);

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const runProjection = async () => {
    setProjecting(true); setProjError(null);
    try {
      const res = await fetch(`${API_BASE}/fire/projection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected_return: parseFloat(expectedReturn) || 10,
          inflation_rate: parseFloat(inflationRate) || 6,
          current_age: parseInt(currentAge) || 30,
          retirement_age: parseInt(retirementAge) || 45,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProjection(await res.json());
    } catch (e: any) {
      setProjError(e.message || 'Projection failed');
    } finally { setProjecting(false); }
  };

  const cappedPct = Math.min(fireStatus?.progress_pct ?? 0, 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}>
      {loading ? (
        <View style={{ gap: 16, marginTop: 12 }}>
          <LoadingCard lines={4} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><LoadingCard lines={2} /></View>
            <View style={{ flex: 1 }}><LoadingCard lines={2} /></View>
          </View>
        </View>
      ) : (
        <>
          <ErrorBanner error={error} onRetry={refetch} />
          {fireStatus && (
            <>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>FINANCIAL INDEPENDENCE PROGRESS</Text>
            <Text style={styles.heroPct}>{(fireStatus.progress_pct ?? 0).toFixed(1)}%</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${cappedPct}%` as any }]} />
            </View>
            <View style={styles.heroRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Current Corpus</Text>
                <Text style={styles.heroStatVal}>{fmt(fireStatus.current_corpus)}</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>FI Target (25x)</Text>
                <Text style={styles.heroStatVal}>{fmt(fireStatus.fi_number_25x)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Annual Expenses</Text>
              <Text style={styles.metricValue}>{fmt(fireStatus.annual_expenses)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Monthly Savings</Text>
              <Text style={styles.metricValue}>{fmt(fireStatus.avg_monthly_savings)}</Text>
            </View>
          </View>
            </>
          )}
        </>
      )}

      <View style={styles.calcCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="sparkles-outline" size={18} color={Colors.primary} />
          <Text style={styles.calcTitle}>Project My FIRE Date</Text>
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Expected Return (%)</Text>
            <TextInput style={styles.input} value={expectedReturn} onChangeText={setExpectedReturn} keyboardType="numeric" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Inflation Rate (%)</Text>
            <TextInput style={styles.input} value={inflationRate} onChangeText={setInflationRate} keyboardType="numeric" />
          </View>
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Age</Text>
            <TextInput style={styles.input} value={currentAge} onChangeText={setCurrentAge} keyboardType="numeric" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Target Retirement Age</Text>
            <TextInput style={styles.input} value={retirementAge} onChangeText={setRetirementAge} keyboardType="numeric" />
          </View>
        </View>
        <TouchableOpacity style={styles.calcBtn} onPress={runProjection} disabled={projecting}>
          {projecting ? <ActivityIndicator color="#fff" size="small" />
            : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.calcBtnText}>Calculate FIRE Date</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            )}
        </TouchableOpacity>
        {projError && (
          <View style={styles.projErrorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={Colors.negative} />
            <Text style={styles.projError}>{projError}</Text>
          </View>
        )}
      </View>

      {projection && (
        <View style={styles.resultCard}>
          {projection.fi_year ? (<>
            <View style={styles.resultHeaderRow}>
              <Ionicons name="trophy-outline" size={24} color={Colors.positive} />
              <Text style={styles.resultTitle}>You'll reach FI in</Text>
            </View>
            <Text style={styles.resultYear}>{projection.fi_year}</Text>
            <Text style={styles.resultSub}>Age {projection.fi_age}  ·  {projection.years_to_fi} years away</Text>
          </>) : <Text style={styles.resultTitle}>Adjust savings rate to reach FI sooner.</Text>}
          <Text style={styles.timelineHeader}>Corpus Trajectory (10yr)</Text>
          <View style={styles.timeline}>
            {projection.timeline?.slice(0, 10).map((entry: any) => (
              <View key={entry.year} style={[styles.timelineRow, entry.is_fi && styles.timelineRowFI]}>
                <Text style={[styles.timelineYear, entry.is_fi && styles.timelineYearFI]}>
                  {entry.year} (Age {entry.age})
                </Text>
                <Text style={[styles.timelineCorpus, entry.is_fi && styles.timelineCorpusFI]}>
                  {fmt(entry.corpus)}
                </Text>
                {entry.is_fi && <Text style={styles.fiBadge}>🏁</Text>}
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: 40 },
  errorCard: { backgroundColor: '#fef2f2', borderRadius: Shape.large, padding: Spacing.xl, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { color: '#dc2626', fontWeight: '600' },
  hero: { backgroundColor: Colors.onSurface, borderRadius: 24, padding: 24, marginBottom: 16 },
  heroLabel: { fontSize: 10, fontWeight: '800', color: Colors.onSurfaceVariant, letterSpacing: 1.2, marginBottom: 8 },
  heroPct: { fontSize: 52, fontWeight: '900', color: Colors.positive, letterSpacing: -2, marginBottom: 12 },
  progressTrack: { height: 10, backgroundColor: '#1e293b', borderRadius: 5, overflow: 'hidden', marginBottom: 20 },
  progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 5 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatLabel: { fontSize: 11, color: Colors.onSurfaceVariant, fontWeight: '600', marginBottom: 4 },
  heroStatVal: { fontSize: 16, fontWeight: '800', color: '#fff' },
  heroDivider: { width: 1, height: 32, backgroundColor: '#334155' },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Shape.large, padding: Spacing.lg, borderWidth: 1, borderColor: '#e2e8f0' },
  metricLabel: { fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant, marginBottom: 6 },
  metricValue: { fontSize: 16, fontWeight: '800', color: Colors.onSurface },
  calcCard: { backgroundColor: Colors.surface, borderRadius: Shape.extraLarge, padding: Spacing.xl, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  calcTitle: { fontSize: 17, fontWeight: '700', color: Colors.onSurface, letterSpacing: -0.2 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant, marginBottom: 6 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '600', color: Colors.onSurface },
  calcBtn: { backgroundColor: '#7c3aed', borderRadius: Shape.large, padding: Spacing.lg, alignItems: 'center', marginTop: 4 },
  calcBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  projErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  projError: { fontSize: 13, color: Colors.negative, fontWeight: '600' },
  resultCard: { backgroundColor: '#f0fdf4', borderRadius: Shape.extraLarge, padding: Spacing.xl, borderWidth: 1, borderColor: '#bbf7d0', marginTop: 20 },
  resultHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  resultTitle: { fontSize: 16, fontWeight: '700', color: '#16a34a' },
  resultYear: { fontSize: 52, fontWeight: '900', color: Colors.primary, letterSpacing: -2 },
  resultSub: { fontSize: 14, color: Colors.onSurfaceVariant, fontWeight: '600', marginBottom: 20 },
  timelineHeader: { fontSize: 14, fontWeight: '800', color: Colors.onSurface, marginBottom: 12 },
  timeline: { backgroundColor: Colors.background, borderRadius: Shape.large, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  timelineRowFI: { backgroundColor: '#f0fdf4' },
  timelineYear: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant },
  timelineYearFI: { color: '#16a34a', fontWeight: '800' },
  timelineCorpus: { fontSize: 13, fontWeight: '700', color: Colors.onSurface },
  timelineCorpusFI: { color: '#16a34a' },
  fiBadge: { fontSize: 12, marginLeft: 8 },
});
