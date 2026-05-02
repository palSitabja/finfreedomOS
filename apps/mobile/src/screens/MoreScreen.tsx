import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Type, Shape, Spacing, Elevation } from '../components/shared';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

const TOOLS: {
  screen: string;
  icon: IoniconsName;
  title: string;
  sub: string;
  color: string;
  tint: string;
}[] = [
  {
    screen: 'FIRE',
    icon:   'flame-outline',
    title:  'FIRE Calculator',
    sub:    'Financial independence projection',
    color:  '#D97706',
    tint:   '#FEF3C7',
  },
  {
    screen: 'Tax',
    icon:   'receipt-outline',
    title:  'Tax Intelligence',
    sub:    'Regime comparison & capital gains',
    color:  '#0284C7',
    tint:   '#E0F2FE',
  },
  {
    screen: 'Analytics',
    icon:   'bar-chart-outline',
    title:  'Portfolio Analytics',
    sub:    'Benchmarks, risk & sector allocation',
    color:  Colors.positive,
    tint:   Colors.positiveContainer,
  },
  {
    screen: 'News',
    icon:   'newspaper-outline',
    title:  'Market Intelligence',
    sub:    'AI sentiment & news for your holdings',
    color:  '#8B5CF6',
    tint:   '#EDE9FE',
  },
  {
    screen: 'ConnectionSettings',
    icon:   'wifi-outline',
    title:  'Backend Connection',
    sub:    'Configure & test the API server connection',
    color:  '#0891B2',
    tint:   '#CFFAFE',
  },
];

export default function MoreScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Tools & Analysis</Text>
      <Text style={styles.pageSub}>Deep insights powered by your live data</Text>

      {TOOLS.map((t, i) => (
        <Pressable
          key={t.screen}
          onPress={() => navigation.navigate(t.screen)}
          android_ripple={{ color: t.color + '20' }}
          style={[styles.card, { marginBottom: i < TOOLS.length - 1 ? 12 : 0 }]}
        >
          <View style={[styles.cardAccent, { backgroundColor: t.color }]} />
          <View style={styles.cardBody}>
            <View style={[styles.iconWrap, { backgroundColor: t.tint }]}>
              <Ionicons name={t.icon} size={24} color={t.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: t.color }]}>{t.title}</Text>
              <Text style={styles.cardSub}>{t.sub}</Text>
            </View>
            <View style={[styles.chevronWrap, { backgroundColor: t.tint }]}>
              <Ionicons name="chevron-forward" size={18} color={t.color} />
            </View>
          </View>
        </Pressable>
      ))}

      <Text style={styles.footNote}>Finetra · Personal Finance OS</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  content:    { padding: Spacing.xl, paddingBottom: 48 },

  pageTitle: { ...Type.headlineMedium, color: Colors.onBackground, marginBottom: 4 },
  pageSub:   { ...Type.bodyMedium, color: Colors.onSurfaceVariant, marginBottom: Spacing.xxl },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Shape.extraLarge,
    overflow: 'hidden',
    ...Elevation.level2,
  },
  cardAccent: { height: 4 },
  cardBody:   { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, gap: 16 },
  iconWrap:   { width: 52, height: 52, borderRadius: Shape.large, alignItems: 'center', justifyContent: 'center' },
  cardText:   { flex: 1 },
  cardTitle:  { ...Type.titleMedium, marginBottom: 2 },
  cardSub:    { ...Type.bodySmall, color: Colors.onSurfaceVariant },
  chevronWrap:{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  footNote:   { ...Type.bodySmall, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: Spacing.xxl, opacity: 0.6 },
});
