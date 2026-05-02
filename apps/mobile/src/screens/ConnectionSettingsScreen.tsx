import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Switch, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Type, Shape, Spacing, Elevation } from '../components/shared';
import { getApiBase, saveApiBase, DEFAULT_API_BASE } from '../config';

type TestStatus = 'idle' | 'testing' | 'ok' | 'error';

interface DiagRow {
  label: string;
  status: 'ok' | 'error' | 'skip';
  detail: string;
  latencyMs?: number;
}

export default function ConnectionSettingsScreen({ navigation }: any) {
  const [inputValue, setInputValue] = useState('');
  const [saved, setSaved] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [diag, setDiag] = useState<DiagRow[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load current setting on mount
  useEffect(() => {
    const current = getApiBase();
    setInputValue(current);
    setSaved(current);
  }, []);

  // Normalise: strip trailing slash
  const normalise = (raw: string) => {
    const trimmed = raw.trim().replace(/\/+$/, '');
    // Auto-prefix http:// if missing
    if (trimmed && !trimmed.startsWith('http')) return `http://${trimmed}`;
    return trimmed;
  };

  const handleSave = async () => {
    const normalised = normalise(inputValue);
    await saveApiBase(normalised);
    setInputValue(normalised);
    setSaved(normalised);
  };

  const handleReset = async () => {
    await saveApiBase(DEFAULT_API_BASE);
    setInputValue(DEFAULT_API_BASE);
    setSaved(DEFAULT_API_BASE);
  };

  const runDiagnostics = useCallback(async () => {
    const base = normalise(inputValue);
    setTestStatus('testing');
    setDiag([]);

    const rows: DiagRow[] = [];

    // Helper: fetch with a timeout using AbortController (Hermes-compatible)
    const fetchWithTimeout = (url: string, timeoutMs: number, options: RequestInit = {}) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
    };

    // ── 1. Parse URL ─────────────────────────────────────────────────────────
    let host = '';
    let port = '';
    try {
      const u = new URL(base);
      host = u.hostname;
      port = u.port || '80';
      rows.push({ label: 'URL format', status: 'ok', detail: `host=${host}  port=${port}` });
    } catch {
      rows.push({ label: 'URL format', status: 'error', detail: 'Invalid URL — could not parse' });
      setDiag([...rows]);
      setTestStatus('error');
      return;
    }

    // ── 2. Health endpoint ────────────────────────────────────────────────────
    const t0 = Date.now();
    try {
      const res = await fetchWithTimeout(`${base}/health`, 6000, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const latencyMs = Date.now() - t0;
      if (res.ok) {
        const body = await res.json();
        rows.push({
          label: 'GET /health',
          status: 'ok',
          detail: `${res.status} — ${JSON.stringify(body)}`,
          latencyMs,
        });
      } else {
        rows.push({ label: 'GET /health', status: 'error', detail: `HTTP ${res.status}`, latencyMs });
      }
    } catch (e: any) {
      const latencyMs = Date.now() - t0;
      rows.push({
        label: 'GET /health',
        status: 'error',
        detail: e?.name === 'AbortError' ? 'Timed out after 6s — server unreachable' : (e?.message ?? 'Network error'),
        latencyMs,
      });
    }

    // ── 3. Root endpoint ──────────────────────────────────────────────────────
    try {
      const t1 = Date.now();
      const res = await fetchWithTimeout(`${base}/`, 5000);
      rows.push({
        label: 'GET /',
        status: res.ok ? 'ok' : 'error',
        detail: `HTTP ${res.status}`,
        latencyMs: Date.now() - t1,
      });
    } catch (e: any) {
      rows.push({
        label: 'GET /',
        status: 'error',
        detail: e?.name === 'AbortError' ? 'Timed out after 5s' : (e?.message ?? 'Network error'),
      });
    }

    // ── 4. Cleartext warning ──────────────────────────────────────────────────
    if (base.startsWith('http://')) {
      rows.push({
        label: 'Protocol',
        status: Platform.OS === 'android' ? 'ok' : 'error',
        detail: Platform.OS === 'android'
          ? 'HTTP allowed (usesCleartextTraffic=true in app.json)'
          : 'HTTP may be blocked on iOS; consider using HTTPS or a local tunnel',
      });
    } else {
      rows.push({ label: 'Protocol', status: 'ok', detail: 'HTTPS — secure' });
    }

    setDiag(rows);
    const allOk = rows.every(r => r.status === 'ok');
    setTestStatus(allOk ? 'ok' : 'error');

    // Auto-save on success
    if (allOk) {
      await saveApiBase(base);
      setSaved(base);
    }
  }, [inputValue]);

  const isDirty = normalise(inputValue) !== saved;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="server-outline" size={22} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Backend Connection</Text>
          <Text style={styles.sub}>Configure the API server this app connects to</Text>
        </View>
      </View>

      {/* ── Current saved value ─────────────────────────────────────────── */}
      <View style={styles.savedRow}>
        <Ionicons name="link-outline" size={14} color={Colors.onSurfaceMuted} />
        <Text style={styles.savedLabel} numberOfLines={1}>Active: {saved || '—'}</Text>
      </View>

      {/* ── Input ───────────────────────────────────────────────────────── */}
      <Text style={styles.fieldLabel}>Server URL or IP:Port</Text>
      <TextInput
        style={styles.input}
        value={inputValue}
        onChangeText={setInputValue}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="http://192.168.x.x:8001"
        placeholderTextColor={Colors.onSurfaceMuted}
        returnKeyType="done"
        onSubmitEditing={handleSave}
      />
      <Text style={styles.hint}>
        Include the protocol and port — e.g. <Text style={styles.mono}>http://192.168.0.107:8001</Text>
      </Text>

      {/* ── Action buttons ──────────────────────────────────────────────── */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnOutline, { flex: 1 }]}
          onPress={handleReset}
        >
          <Ionicons name="refresh-outline" size={16} color={Colors.onSurfaceVariant} />
          <Text style={[styles.btnText, { color: Colors.onSurfaceVariant }]}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, isDirty ? styles.btnPrimary : styles.btnOutline, { flex: 1 }]}
          onPress={handleSave}
          disabled={!isDirty}
        >
          <Ionicons name="save-outline" size={16} color={isDirty ? '#FFF' : Colors.onSurfaceVariant} />
          <Text style={[styles.btnText, { color: isDirty ? '#FFF' : Colors.onSurfaceVariant }]}>
            {isDirty ? 'Save' : 'Saved'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnTest, { flex: 1 }]}
          onPress={runDiagnostics}
          disabled={testStatus === 'testing'}
        >
          {testStatus === 'testing'
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Ionicons name="wifi-outline" size={16} color="#FFF" />
          }
          <Text style={[styles.btnText, { color: '#FFF' }]}>
            {testStatus === 'testing' ? 'Testing…' : 'Test'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Status banner ───────────────────────────────────────────────── */}
      {testStatus === 'ok' && (
        <View style={[styles.statusBanner, { backgroundColor: Colors.positiveContainer }]}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.positive} />
          <Text style={[styles.statusText, { color: Colors.positive }]}>
            Connected successfully — settings saved!
          </Text>
        </View>
      )}
      {testStatus === 'error' && (
        <View style={[styles.statusBanner, { backgroundColor: '#FEF2F2' }]}>
          <Ionicons name="alert-circle" size={18} color="#DC2626" />
          <Text style={[styles.statusText, { color: '#DC2626' }]}>
            Connection failed — see diagnostics below
          </Text>
        </View>
      )}

      {/* ── Diagnostics table ───────────────────────────────────────────── */}
      {diag.length > 0 && (
        <View style={styles.diagCard}>
          <Text style={styles.diagTitle}>Diagnostics</Text>
          {diag.map((row, i) => (
            <View key={i} style={[styles.diagRow, i < diag.length - 1 && styles.diagRowBorder]}>
              <Ionicons
                name={row.status === 'ok' ? 'checkmark-circle' : row.status === 'skip' ? 'remove-circle' : 'close-circle'}
                size={16}
                color={row.status === 'ok' ? Colors.positive : row.status === 'skip' ? Colors.onSurfaceMuted : '#DC2626'}
                style={{ marginTop: 1 }}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <View style={styles.diagLabelRow}>
                  <Text style={styles.diagLabel}>{row.label}</Text>
                  {row.latencyMs !== undefined && (
                    <Text style={styles.diagLatency}>{row.latencyMs}ms</Text>
                  )}
                </View>
                <Text style={styles.diagDetail}>{row.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Tips ────────────────────────────────────────────────────────── */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Troubleshooting tips</Text>
        {[
          'Make sure your phone and the server are on the same Wi-Fi network.',
          'Check the server is running: python main.py or uvicorn main:app --host 0.0.0.0 --port 8001',
          'If on Android, the app has usesCleartextTraffic=true so HTTP is allowed.',
          'Raspberry Pi static IP can be set in your router\'s DHCP settings.',
          'Test from a browser on the same phone: http://192.168.0.107:8001/health',
        ].map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.tipNum}>{i + 1}</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: 48 },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: 12 },
  iconWrap:  {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { ...Type.titleLarge, color: Colors.onSurface },
  sub:   { ...Type.bodySmall, color: Colors.onSurfaceMuted, marginTop: 2 },

  savedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Shape.small, marginBottom: Spacing.lg,
  },
  savedLabel: { ...Type.labelSmall, color: Colors.onSurfaceMuted, flex: 1 },

  fieldLabel: { ...Type.labelLarge, color: Colors.onSurface, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    borderRadius: Shape.medium,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    ...Type.bodyLarge,
    color: Colors.onSurface,
    fontFamily: 'monospace',
    ...Elevation.level1,
  },
  hint: { ...Type.bodySmall, color: Colors.onSurfaceMuted, marginTop: 6, marginBottom: Spacing.lg },
  mono: { fontFamily: 'monospace', color: Colors.primary },

  btnRow:    { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    borderRadius: Shape.medium,
  },
  btnText: { ...Type.labelLarge, fontWeight: '600' },
  btnOutline: { borderWidth: 1.5, borderColor: Colors.outlineVariant, backgroundColor: Colors.surface },
  btnPrimary: { backgroundColor: Colors.primary },
  btnTest:    { backgroundColor: '#6366F1' },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: Spacing.md, borderRadius: Shape.medium,
    marginBottom: Spacing.lg,
  },
  statusText: { ...Type.bodyMedium, fontWeight: '600', flex: 1 },

  diagCard: {
    backgroundColor: Colors.surface, borderRadius: Shape.large,
    padding: Spacing.lg, marginBottom: Spacing.lg,
    ...Elevation.level1,
  },
  diagTitle: { ...Type.titleSmall, color: Colors.onSurface, marginBottom: 12 },
  diagRow:   { flexDirection: 'row', paddingVertical: 10 },
  diagRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.outlineVariant },
  diagLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  diagLabel:   { ...Type.labelLarge, color: Colors.onSurface },
  diagLatency: { ...Type.labelSmall, color: Colors.onSurfaceMuted, backgroundColor: Colors.surfaceVariant, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  diagDetail:  { ...Type.bodySmall, color: Colors.onSurfaceMuted, marginTop: 2 },

  tipsCard: {
    backgroundColor: Colors.surface, borderRadius: Shape.large,
    padding: Spacing.lg, ...Elevation.level1,
  },
  tipsTitle: { ...Type.titleSmall, color: Colors.onSurface, marginBottom: Spacing.md },
  tipRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  tipNum:    {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    textAlign: 'center', lineHeight: 20,
    ...Type.labelSmall, color: Colors.primary, fontWeight: '700',
  },
  tipText:   { ...Type.bodySmall, color: Colors.onSurfaceVariant, flex: 1, lineHeight: 18 },
});
