/**
 * Finetra Design System – Material You inspired
 *
 * Color tokens, typography scale, elevation helpers, and
 * shared atomic components used across every screen.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, FC, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableNativeFeedback,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// ─── Color Tokens ────────────────────────────────────────────────────────────
// ─── Color Tokens (Lux Edition) ────────────────────────────────────────────────
export const Colors = {
  // Brand - Deep Indigo to Vibrant Purple
  primary:         '#4F46E5',
  primaryDark:     '#3730A3',
  primaryLight:    '#EEF2FF',
  primaryContainer:'#E0E7FF',
  primaryGradient: ['#4F46E5', '#9333EA'] as string[],

  // Accent - Emerald/Teal
  secondary:       '#0D9488',
  secondaryLight:  '#F0FDFA',
  secondaryContainer:'#CCFBF1',
  secondaryGradient: ['#0D9488', '#2DD4BF'] as string[],

  // Tertiary - Amber/Gold
  tertiary:        '#D97706',
  tertiaryLight:   '#FFFBEB',
  tertiaryContainer:'#FEF3C7',

  // Semantic
  positive:        '#10B981',
  positiveContainer:'#D1FAE5',
  onPositive:      '#064E3B',

  negative:        '#EF4444',
  negativeContainer:'#FEE2E2',
  onNegative:      '#7F1D1D',

  warning:         '#F59E0B',
  warningContainer:'#FEF3C7',

  // Surfaces
  surface:         '#FFFFFF',
  surface2:        '#F8FAFC',
  surfaceVariant:  '#F1F5F9',
  background:      '#F8FAFC',
  onSurface:       '#0F172A',
  onSurfaceVariant:'#64748B',
  onSurfaceMuted:  '#64748B',
  onBackground:    '#0F172A',

  outline:         '#E2E8F0',
  outlineVariant:  '#CBD5E1',

  // Chart palette - Vibrant
  chart: ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
};

// ─── Typography ──────────────────────────────────────────────────────────────
export const Type = {
  displayLarge:  { fontSize: 57, fontWeight: '400' as const, lineHeight: 64, letterSpacing: -0.25 },
  displayMedium: { fontSize: 45, fontWeight: '400' as const, lineHeight: 52 },
  displaySmall:  { fontSize: 36, fontWeight: '400' as const, lineHeight: 44 },
  headlineLarge: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  headlineMedium:{ fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  headlineSmall: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  titleLarge:    { fontSize: 22, fontWeight: '600' as const, lineHeight: 28 },
  titleMedium:   { fontSize: 16, fontWeight: '600' as const, lineHeight: 24, letterSpacing: 0.15 },
  titleSmall:    { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0.1 },
  labelLarge:    { fontSize: 14, fontWeight: '500' as const, lineHeight: 20, letterSpacing: 0.1 },
  labelMedium:   { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.5 },
  labelSmall:    { fontSize: 11, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.5 },
  bodyLarge:     { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, letterSpacing: 0.15 },
  bodyMedium:    { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0.25 },
  bodySmall:     { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, letterSpacing: 0.4 },
};

export const MarkdownStyles = {
  body: {
    ...Type.bodyMedium,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  bullet_list: {
    marginBottom: 8,
  },
  ordered_list: {
    marginBottom: 8,
  },
  heading1: { ...Type.headlineSmall, color: Colors.primary, marginBottom: 8 },
  heading2: { ...Type.titleLarge, color: Colors.primary, marginBottom: 8 },
  heading3: { ...Type.titleMedium, color: Colors.primary, marginBottom: 4 },
  code_inline: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fence: {
    backgroundColor: Colors.surfaceVariant,
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  strong: { fontWeight: '700', color: Colors.onSurface },
  em: { fontStyle: 'italic' },
  link: { color: Colors.primary, textDecorationLine: 'underline' },
};

// ─── Elevation shadows ────────────────────────────────────────────────────────
export const Elevation = {
  level0: { elevation: 0 },
  level1: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  level2: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  level3: {
    elevation: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
};

// ─── Shape ────────────────────────────────────────────────────────────────────
export const Shape = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 9999,
};

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ─── Modern Components ───────────────────────────────────────────────────────

export const GradientCard: FC<{
  colors?: string[];
  children: ReactNode;
  style?: any;
}> = ({ colors = Colors.primaryGradient, children, style }) => (
  <View style={[styles.cardContainer, Elevation.level2, style]}>
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientFill}
    >
      {children}
    </LinearGradient>
  </View>
);

export const GlassCard: FC<{
  children: ReactNode;
  style?: any;
}> = ({ children, style }) => (
  <View style={[styles.glassCardBase, style]}>
    <BlurView intensity={Platform.OS === 'android' ? 80 : 40} tint="light" style={StyleSheet.absoluteFill} />
    <View style={styles.glassCardOverlay} />
    {children}
  </View>
);

// ─── Ripple helper ────────────────────────────────────────────────────────────
export function Ripple({
  children,
  onPress,
  borderless = false,
  rippleColor = Colors.primary,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  borderless?: boolean;
  rippleColor?: string;
  style?: any;
}) {
  if (Platform.OS === 'android') {
    return (
      <TouchableNativeFeedback
        onPress={onPress}
        background={TouchableNativeFeedback.Ripple(rippleColor + '30', borderless)}
        useForeground
      >
        <View style={style}>{children}</View>
      </TouchableNativeFeedback>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} style={style} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
}

// ─── M3 Card ─────────────────────────────────────────────────────────────────
export function M3Card({
  children,
  variant = 'elevated',
  style,
  onPress,
}: {
  children: ReactNode;
  variant?: 'elevated' | 'filled' | 'outlined';
  style?: any;
  onPress?: () => void;
}) {
  const cardStyle = [
    styles.card,
    variant === 'elevated' && { backgroundColor: Colors.surface, ...Elevation.level2 },
    variant === 'filled'   && { backgroundColor: Colors.surfaceVariant, elevation: 0 },
    variant === 'outlined' && { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.outlineVariant, elevation: 0 },
    style,
  ];

  if (onPress) {
    return (
      <View style={cardStyle}>
        <Ripple onPress={onPress} style={styles.cardRipple}>{children}</Ripple>
      </View>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

// ─── Stat Card (M3) ──────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  subtitle,
  color = Colors.primary,
  gradientColors,
  icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
  gradientColors?: string[];
  icon?: ComponentProps<typeof Ionicons>['name'];
}) {
  const CardContainer = gradientColors ? LinearGradient : View;
  const gradientProps = gradientColors ? { colors: gradientColors as any, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } : {};
  
  return (
    <CardContainer
      {...gradientProps}
      style={[statStyles.card, gradientColors ? { borderColor: color + '30', borderWidth: 1 } : { borderLeftColor: color, borderLeftWidth: 3 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        {icon && (
          <View style={[statStyles.iconWrap, { backgroundColor: color + '15', marginRight: 8 }]}>
            <Ionicons name={icon} size={14} color={color} />
          </View>
        )}
        <Text style={statStyles.label} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[statStyles.value, { color }]} numberOfLines={1}>{value}</Text>
      {subtitle && <Text style={statStyles.subtitle} numberOfLines={1}>{subtitle}</Text>}
    </CardContainer>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Shape.large,
    padding: Spacing.md,
  },
  iconWrap: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  label:   { ...Type.labelSmall, color: Colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  value:   { ...Type.titleLarge, marginBottom: 2 },
  subtitle:{ ...Type.bodySmall, color: Colors.onSurfaceVariant },
});

// ─── Loading Skeleton (pulse) ─────────────────────────────────────────────────
export function LoadingCard({ lines = 3 }: { lines?: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

  return (
    <View style={skeletonStyles.wrap}>
      {Array.from({ length: lines }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            skeletonStyles.line,
            { opacity, width: i === 0 ? '55%' : i === 1 ? '80%' : '35%', marginBottom: i < lines - 1 ? 10 : 0 },
          ]}
        />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  wrap: { backgroundColor: Colors.surfaceVariant, borderRadius: Shape.large, padding: Spacing.lg },
  line: { height: 14, backgroundColor: Colors.outline + '50', borderRadius: Shape.small },
});

// ─── Error Banner ─────────────────────────────────────────────────────────────
export function ErrorBanner({
  message,
  error,
  onRetry,
}: {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
}) {
  const text = error || message;
  if (!text) return null;

  return (
    <View style={errStyles.banner}>
      <View style={errStyles.iconWrap}>
        <Text style={errStyles.icon}>⚠</Text>
      </View>
      <Text style={errStyles.text} numberOfLines={2}>{text}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={errStyles.btn}>
          <Text style={errStyles.btnText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const errStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.negativeContainer,
    borderRadius: Shape.medium,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  iconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.negative, alignItems: 'center', justifyContent: 'center' },
  icon:   { color: '#fff', fontSize: 14, fontWeight: '700' },
  text:   { flex: 1, ...Type.bodySmall, color: Colors.onNegative, color: Colors.negative },
  btn:    { backgroundColor: Colors.negative, borderRadius: Shape.extraSmall, paddingHorizontal: 12, paddingVertical: 6 },
  btnText:{ ...Type.labelSmall, color: '#fff', fontWeight: '700' },
});

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action, onAction }: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={secStyles.row}>
      <View style={{ flex: 1 }}>
        <Text style={secStyles.title}>{title}</Text>
        {subtitle && <Text style={secStyles.sub}>{subtitle}</Text>}
      </View>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} style={secStyles.action}>
          <Text style={secStyles.actionText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  title:      { ...Type.titleMedium, color: Colors.onSurface },
  sub:        { ...Type.bodySmall, color: Colors.onSurfaceVariant, marginTop: 2 },
  action:     { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.surface2, borderRadius: Shape.full },
  actionText: { ...Type.labelMedium, color: Colors.primary },
});

// ─── Chip ─────────────────────────────────────────────────────────────────────
export function Chip({
  label,
  selected,
  onPress,
  color = Colors.primary,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        chipStyles.base,
        selected && { backgroundColor: color + '20', borderColor: color },
      ]}
      activeOpacity={0.7}
    >
      <Text style={[chipStyles.text, { color: selected ? color : Colors.onSurfaceVariant }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  base: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Shape.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surface,
  },
  text: { ...Type.labelLarge },
});

// ─── Data Row ─────────────────────────────────────────────────────────────────
export function DataRow({
  label,
  value,
  valueColor,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <View style={[rowStyles.row, !last && rowStyles.border]}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.outlineVariant },
  label:  { ...Type.bodyMedium, color: Colors.onSurfaceVariant, flex: 1 },
  value:  { ...Type.titleSmall, color: Colors.onSurface },
});

// ─── Progress Bar ─────────────────────────────────────────────────────────────
export function LinearProgress({
  value,
  color = Colors.primary,
  trackColor,
  height = 8,
}: {
  value: number; // 0-100
  color?: string;
  trackColor?: string;
  height?: number;
}) {
  return (
    <View style={[pgStyles.track, { backgroundColor: trackColor ?? color + '25', height, borderRadius: height }]}>
      <View
        style={[
          pgStyles.fill,
          {
            width: `${Math.max(0, Math.min(100, value))}%`,
            backgroundColor: color,
            height,
            borderRadius: height,
          },
        ]}
      />
    </View>
  );
}

const pgStyles = StyleSheet.create({
  track: { overflow: 'hidden', width: '100%' },
  fill:  {},
});

const styles = StyleSheet.create({
  card:      { borderRadius: Shape.large, overflow: 'hidden' },
  cardRipple:{ padding: Spacing.lg },
  cardContainer: {
    borderRadius: Shape.large,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  glassCardBase: {
    borderRadius: Shape.large,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    // Removed Elevation.level1 because elevation causes grey shadow boxing on transparent views in Android
  },
  glassCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.45)', // A semi-transparent overlay to keep content readable
  },
  gradientFill: {
    padding: 20,
    borderRadius: Shape.large,
  },
});
