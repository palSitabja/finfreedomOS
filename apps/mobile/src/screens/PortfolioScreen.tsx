import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors, Type, Shape, Spacing, Elevation,
  LoadingCard, ErrorBanner, SectionHeader, LinearProgress,
  GradientCard, GlassCard,
} from '../components/shared';
import { useStocks, useAssets } from '../hooks/useApi';

function fmt(n: number) {
  if (!n || isNaN(n)) return '₹0';
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

const ALLOCATION_COLORS = Colors.chart;

export default function PortfolioScreen() {
  const { stocks, loading: stocksLoading, error: stocksError, refetch: refetchStocks } = useStocks();
  const { assets, loading: assetsLoading, error: assetsError, refetch: refetchAssets } = useAssets();
  const [refreshing, setRefreshing] = useState(false);
  
  const onRefresh = async () => { 
    setRefreshing(true); 
    await Promise.all([refetchStocks(), refetchAssets()]); 
    setRefreshing(false); 
  };

  const loading = stocksLoading || assetsLoading;
  const error = stocksError || assetsError;

  // Stocks Totals
  const stockValue    = stocks.reduce((s, st) => s + (st.current_value || 0), 0);
  const stockInvested = stocks.reduce((s, st) => s + (st.buy_value || 0), 0);

  // Assets Totals
  const assetValue    = assets.reduce((s, a) => s + (a.current_amount || 0), 0);
  const assetInvested = assets.reduce((s, a) => s + (a.invested_amount || 0), 0);

  const totalValue    = stockValue + assetValue;
  const totalInvested = stockInvested + assetInvested;
  const totalGain     = totalValue - totalInvested;
  const totalGainPct  = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const positive      = totalGain >= 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <GradientCard
        colors={positive ? Colors.primaryGradient : ['#EF4444', '#B91C1C']}
        style={styles.hero}
      >
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroLabel}>Total Portfolio Value</Text>
            <Text style={styles.heroValue}>{fmt(totalValue)}</Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons name="pie-chart" size={24} color="#FFF" />
          </View>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Invested</Text>
            <Text style={styles.heroStatValue}>{fmt(totalInvested)}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatLabel}>Profit/Loss</Text>
            <Text style={[styles.heroStatValue, { color: positive ? '#A7F3D0' : '#FECACA' }]}>
              {fmt(totalGain)} ({pct(totalGainPct)})
            </Text>
          </View>
        </View>
      </GradientCard>

      <SectionHeader
        title="Asset Allocation"
        subtitle={loading ? 'Analyzing...' : `${assets.length + stocks.length} Total Assets`}
      />

      {error && <ErrorBanner error={error} onRetry={onRefresh} />}

      {loading && (
        <View style={{ gap: 12 }}>
          <LoadingCard lines={3} />
          <LoadingCard lines={3} />
        </View>
      )}

      {!loading && assets.length === 0 && stocks.length === 0 && !error && (
        <GlassCard style={styles.emptyCard}>
          <Ionicons name="briefcase-outline" size={48} color={Colors.onSurfaceVariant} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Your portfolio is empty</Text>
          <Text style={styles.emptySub}>Connect your data sources to see your wealth distribution here.</Text>
        </GlassCard>
      )}

      {/* Wealth Categories (from Assets Sheet) */}
      {!loading && assets.length > 0 && (
        <View style={[styles.section, { marginBottom: 24 }]}>
          <Text style={styles.subSectionTitle}>Wealth Categories</Text>
          <View style={styles.assetList}>
            {assets.map((asset, index) => {
              const gain = (asset.current_amount || 0) - (asset.invested_amount || 0);
              const isPos = gain >= 0;
              const weight = totalValue > 0 ? (asset.current_amount / totalValue) * 100 : 0;
              const accent = ALLOCATION_COLORS[index % ALLOCATION_COLORS.length];

              return (
                <GlassCard key={`asset-${index}`} style={styles.stockCard}>
                  <View style={styles.stockRow}>
                    <View style={styles.stockMain}>
                      <View style={styles.tickerRow}>
                        <View style={[styles.colorIndicator, { backgroundColor: accent }]} />
                        <Text style={styles.tickerText}>{asset.name}</Text>
                        <View style={[styles.weightBadge, { backgroundColor: accent + '15' }]}>
                          <Text style={[styles.weightText, { color: accent }]}>{weight.toFixed(1)}%</Text>
                        </View>
                      </View>
                      {asset.tenure_years > 0 && (
                        <Text style={styles.stockName}>{asset.tenure_years.toFixed(1)}y tenure · Invested: {fmt(asset.invested_amount)}</Text>
                      )}
                      <View style={styles.progressWrap}>
                        <LinearProgress value={weight} color={accent} height={4} trackColor={Colors.surfaceVariant} />
                      </View>
                    </View>
                    <View style={styles.stockValues}>
                      <Text style={styles.currentVal}>{fmt(asset.current_amount || 0)}</Text>
                      <View style={[styles.miniReturn, { backgroundColor: isPos ? Colors.positive + '15' : Colors.negative + '15' }]}>
                        <Text style={[styles.miniReturnText, { color: isPos ? Colors.positive : Colors.negative }]}>
                          {pct(asset.cagr || 0)} CAGR
                        </Text>
                      </View>
                    </View>
                  </View>
                </GlassCard>
              );
            })}
          </View>
        </View>
      )}

      {/* Equity Portfolio (from Stocks DB) */}
      {!loading && stocks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subSectionTitle}>Equity Holdings</Text>
          <View style={styles.stockList}>
            {stocks.map((stock: any, index: number) => {
              const gain = (stock.current_value || 0) - (stock.buy_value || 0);
              const gainPct = stock.buy_value > 0 ? (gain / stock.buy_value) * 100 : 0;
              const pos = gain >= 0;
              const weight = totalValue > 0 ? (stock.current_value / totalValue) * 100 : 0;
              const accent = ALLOCATION_COLORS[(assets.length + index) % ALLOCATION_COLORS.length];

              return (
                <GlassCard key={`stock-${index}`} style={styles.stockCard}>
                  <View style={styles.stockRow}>
                    <View style={styles.stockMain}>
                      <View style={styles.tickerRow}>
                        <View style={[styles.colorIndicator, { backgroundColor: accent }]} />
                        <Text style={styles.tickerText}>{stock.ticker}</Text>
                        <View style={[styles.weightBadge, { backgroundColor: accent + '15' }]}>
                          <Text style={[styles.weightText, { color: accent }]}>{weight.toFixed(1)}%</Text>
                        </View>
                      </View>
                      <Text style={styles.stockName} numberOfLines={1}>{stock.name}</Text>
                      <View style={styles.progressWrap}>
                        <LinearProgress value={weight} color={accent} height={4} trackColor={Colors.surfaceVariant} />
                      </View>
                    </View>

                    <View style={styles.stockValues}>
                      <Text style={styles.currentVal}>{fmt(stock.current_value || 0)}</Text>
                      <View style={[styles.miniReturn, { backgroundColor: pos ? Colors.positive + '15' : Colors.negative + '15' }]}>
                        <Ionicons name={pos ? 'caret-up' : 'caret-down'} size={10} color={pos ? Colors.positive : Colors.negative} />
                        <Text style={[styles.miniReturnText, { color: pos ? Colors.positive : Colors.negative }]}>
                          {Math.abs(gainPct).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                </GlassCard>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: Spacing.lg, paddingBottom: 60 },

  hero: { marginBottom: Spacing.xl },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xxl },
  heroLabel: { ...Type.labelSmall, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 1 },
  heroValue: { ...Type.displaySmall, color: '#FFF', fontWeight: '800', marginTop: 4 },
  heroIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: -Spacing.lg, marginBottom: -Spacing.lg,
    padding: Spacing.lg, borderBottomLeftRadius: Shape.large, borderBottomRightRadius: Shape.large,
  },
  heroStatItem: { flex: 1 },
  heroStatLabel: { ...Type.labelSmall, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  heroStatValue: { ...Type.titleSmall, color: '#FFF' },
  heroDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 16 },

  section: { gap: 12 },
  subSectionTitle: { ...Type.labelMedium, color: Colors.onSurfaceVariant, marginBottom: 4, marginLeft: 4 },
  assetList: { gap: 12 },
  stockList: { gap: 12 },
  stockCard: { padding: 12 },
  stockRow:  { flexDirection: 'row', alignItems: 'center' },
  stockMain: { flex: 1 },
  tickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  colorIndicator: { width: 8, height: 8, borderRadius: 4 },
  tickerText: { ...Type.titleSmall, color: Colors.onSurface, fontWeight: '700' },
  weightBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  weightText: { fontSize: 10, fontWeight: '800' },
  stockName: { ...Type.bodySmall, color: Colors.onSurfaceVariant, marginBottom: 8 },
  progressWrap: { width: '80%' },

  stockValues: { alignItems: 'flex-end', gap: 6 },
  currentVal:  { ...Type.titleMedium, color: Colors.onSurface, fontWeight: '700' },
  miniReturn:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  miniReturnText: { ...Type.labelSmall, fontWeight: '800' },

  emptyCard: { padding: 40, alignItems: 'center' },
  emptyTitle: { ...Type.titleMedium, color: Colors.onSurface, marginBottom: 8 },
  emptySub: { ...Type.bodyMedium, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20 },
});
