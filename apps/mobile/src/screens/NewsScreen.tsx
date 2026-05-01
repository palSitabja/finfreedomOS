import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { API_BASE } from '../config';
import {
  Colors, Type, Shape, Spacing, Elevation,
  LoadingCard, ErrorBanner, GradientCard, GlassCard,
} from '../components/shared';
import { Ionicons } from '@expo/vector-icons';

interface NewsItem {
  ticker: string;
  headline?: string;
  title?: string;
  sentiment: string;
  summary?: string;
  impact?: string;
  source?: string;
  publisher?: string;
}

function getSentimentUI(s: string) {
  const l = s.toLowerCase();
  if (l === 'positive') return { color: Colors.positive, icon: 'trending-up' as const, bg: Colors.positive + '15' };
  if (l === 'negative') return { color: Colors.negative, icon: 'trending-down' as const, bg: Colors.negative + '15' };
  return { color: Colors.warning, icon: 'remove-outline' as const, bg: Colors.warning + '15' };
}

export default function NewsScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/news/portfolio?_t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNews(Array.isArray(data) ? data : data.news || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  };

  const grouped = news.reduce<Record<string, NewsItem[]>>((acc, n) => {
    if (!acc[n.ticker]) acc[n.ticker] = [];
    acc[n.ticker].push(n);
    return acc;
  }, {});

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="newspaper" size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={Type.headlineSmall}>Portfolio Pulse</Text>
            <Text style={styles.headerSubtitle}>AI market intelligence for your holdings</Text>
          </View>
        </View>
      </View>

      {error && <ErrorBanner error={error} onRetry={fetchNews} />}

      {loading && (
        <View style={{ gap: 16 }}>
          <LoadingCard lines={3} />
          <LoadingCard lines={3} />
          <LoadingCard lines={3} />
        </View>
      )}

      {!loading && news.length === 0 && !error && (
        <GlassCard style={styles.emptyCard}>
          <Ionicons name="cafe-outline" size={48} color={Colors.onSurfaceVariant} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>All quiet on the front</Text>
          <Text style={styles.emptySubtext}>We'll notify you when there's relevant news for your portfolio.</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Text style={styles.refreshBtnText}>Check Again</Text>
          </TouchableOpacity>
        </GlassCard>
      )}

      {Object.entries(grouped).map(([ticker, items]) => {
        const avg = items.map(n => {
          const s = n.sentiment.toLowerCase();
          return s === 'positive' ? 1 : s === 'negative' ? -1 : 0;
        });
        const avgScore = avg.reduce((a, b) => a + b, 0) / avg.length;
        const overallSentiment = avgScore > 0.2 ? 'Positive' : avgScore < -0.2 ? 'Negative' : 'Neutral';
        const ui = getSentimentUI(overallSentiment);

        return (
          <View key={ticker} style={styles.tickerGroup}>
            <GradientCard colors={overallSentiment === 'Positive' ? Colors.secondaryGradient : overallSentiment === 'Negative' ? ['#EF4444', '#B91C1C'] : Colors.primaryGradient} style={styles.tickerHeader}>
              <View style={styles.tickerHeaderContent}>
                <View>
                  <Text style={styles.tickerName}>{ticker}</Text>
                  <Text style={styles.tickerSub}>Current Outlook</Text>
                </View>
                <View style={styles.sentimentBadge}>
                  <Ionicons name={ui.icon} size={14} color="#FFF" />
                  <Text style={styles.sentimentText}>{overallSentiment}</Text>
                </View>
              </View>
            </GradientCard>

            <View style={styles.newsList}>
              {items.map((item, i) => {
                const itemUi = getSentimentUI(item.sentiment);
                return (
                  <GlassCard key={i} style={styles.newsCard}>
                    <View style={[styles.sentimentBar, { backgroundColor: itemUi.color }]} />
                    <View style={styles.newsContent}>
                      <View style={styles.newsMeta}>
                        <Text style={styles.sourceText}>{item.publisher || item.source || 'Market Intelligence'}</Text>
                        <View style={[styles.miniBadge, { backgroundColor: itemUi.bg }]}>
                          <Text style={[styles.miniBadgeText, { color: itemUi.color }]}>{item.sentiment}</Text>
                        </View>
                      </View>
                      <Text style={styles.headline}>{item.title || item.headline}</Text>
                      {(item.impact || item.summary) && (
                        <Text style={styles.summary} numberOfLines={3}>{item.impact || item.summary}</Text>
                      )}
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: Spacing.lg, paddingBottom: 60 },

  header: { marginBottom: Spacing.xl, marginTop: Spacing.sm },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  headerSubtitle: { ...Type.bodySmall, color: Colors.onSurfaceVariant },

  tickerGroup: { marginBottom: Spacing.xxl },
  tickerHeader: { marginBottom: -12, zIndex: 1 },
  tickerHeaderContent: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4,
  },
  tickerName: { ...Type.headlineSmall, color: '#FFF', fontWeight: '800' },
  tickerSub:  { ...Type.labelSmall, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' },
  sentimentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Shape.full,
  },
  sentimentText: { ...Type.labelSmall, color: '#FFF', fontWeight: '700' },

  newsList: { gap: 10 },
  newsCard: { padding: 0, flexDirection: 'row', overflow: 'hidden' },
  sentimentBar: { width: 4 },
  newsContent:  { flex: 1, padding: 16 },
  newsMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sourceText: { ...Type.labelSmall, color: Colors.onSurfaceVariant, fontWeight: '600' },
  miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  headline: { ...Type.titleSmall, color: Colors.onSurface, lineHeight: 22, marginBottom: 6 },
  summary:  { ...Type.bodySmall, color: Colors.onSurfaceVariant, lineHeight: 18 },

  emptyCard: { padding: 40, alignItems: 'center' },
  emptyText: { ...Type.titleMedium, color: Colors.onSurface, marginBottom: 8 },
  emptySubtext: { ...Type.bodyMedium, color: Colors.onSurfaceVariant, textAlign: 'center', marginBottom: 20 },
  refreshBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: Shape.full,
  },
  refreshBtnText: { ...Type.labelLarge, color: '#FFF' },
});
