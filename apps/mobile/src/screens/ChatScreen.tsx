import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { API_BASE } from '../config';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Type, Shape, Spacing, Elevation, MarkdownStyles } from '../components/shared';

import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_HISTORY_KEY = '@finetra_chat_history';

interface Message { role: 'user' | 'ai'; content: string; thoughts?: string[] }


type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const SUGGESTIONS: { icon: IoniconsName; text: string }[] = [
  { icon: 'analytics-outline',   text: 'What is my savings rate?' },
  { icon: 'trending-up-outline', text: 'Which stock should I increase?' },
  { icon: 'flame-outline',       text: 'Am I on track for FIRE?' },
  { icon: 'warning-outline',     text: 'What are my biggest risks?' },
];

const ThoughtProcess = ({ thoughts }: { thoughts: string[] }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.thoughtBox}>
      <TouchableOpacity 
        onPress={() => setExpanded(!expanded)} 
        style={styles.thoughtHeader}
        activeOpacity={0.7}
      >
        <Ionicons name="git-branch-outline" size={12} color={Colors.onSurfaceVariant} />
        <Text style={styles.thoughtTitle}> Thought Process</Text>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={12} 
          color={Colors.onSurfaceVariant} 
          style={{ marginLeft: 'auto' }} 
        />
      </TouchableOpacity>
      {expanded && thoughts.map((t, tidx) => (
        <Text key={tidx} style={styles.thoughtText}>• {t}</Text>
      ))}
    </View>
  );
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    AsyncStorage.getItem(CHAT_HISTORY_KEY).then(val => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        } catch (e) {}
      }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    }
    if (messages.length > 0) {
      // Small delay to ensure layout has happened
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isLoaded, loading]);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.answer, thoughts: data.thoughts }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `Could not reach Oracle. Check your connection.\n\nError: ${e.message}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Welcome */}
        {messages.length === 0 && (
          <View style={styles.welcome}>
            <View style={styles.welcomeOrb}>
              <Ionicons name="sparkles" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Finetra Oracle</Text>
            <Text style={styles.welcomeSub}>
              Ask anything about your portfolio, cashflow, or FIRE timeline.
            </Text>

            <View style={styles.suggestions}>
              {SUGGESTIONS.map(s => (
                <TouchableOpacity
                  key={s.text}
                  style={styles.suggBtn}
                  onPress={() => sendMessage(s.text)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={s.icon} size={20} color={Colors.primary} style={{ width: 28 }} />
                  <Text style={styles.suggText}>{s.text}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.onSurfaceVariant} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Messages */}
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {m.role === 'ai' && (
              <View style={styles.aiHeader}>
                <View style={styles.aiDot} />
                <Text style={styles.aiLabel}>Oracle</Text>
              </View>
            )}
            {m.role === 'user' ? (
              <Text style={styles.userText}>{m.content}</Text>
            ) : (
              <View>
                {m.thoughts && m.thoughts.length > 0 && (
                  <ThoughtProcess thoughts={m.thoughts} />
                )}
                <Markdown style={MarkdownStyles}>{m.content}</Markdown>
              </View>
            )}
          </View>
        ))}

        {/* Typing */}
        {loading && (
          <View style={[styles.bubble, styles.aiBubble]}>
            <View style={styles.aiHeader}>
              <View style={styles.aiDot} />
              <Text style={styles.aiLabel}>Oracle</Text>
            </View>
            <View style={styles.typingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.typingText}>Analysing your data…</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask the Oracle…"
          placeholderTextColor={Colors.onSurfaceVariant}
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  messages:   { flex: 1 },
  content:    { padding: Spacing.xl, paddingBottom: 8 },

  welcome:      { alignItems: 'center', paddingTop: 32, paddingBottom: Spacing.xl },
  welcomeOrb:   {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Elevation.level2,
  },
  welcomeTitle: { ...Type.headlineSmall, color: Colors.onSurface, marginBottom: Spacing.sm },
  welcomeSub:   { ...Type.bodyMedium, color: Colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 24, marginBottom: Spacing.xxl },

  suggestions: { width: '100%', gap: 10 },
  suggBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Shape.large,
    padding: Spacing.lg,
    ...Elevation.level1,
  },
  suggText:  { flex: 1, ...Type.bodyMedium, color: Colors.onSurface },

  bubble: {
    borderRadius: Shape.extraLarge,
    padding: Spacing.lg,
    marginBottom: 10,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Shape.small,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Shape.small,
    ...Elevation.level1,
  },
  aiHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  aiDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  aiLabel:   { ...Type.labelSmall, color: Colors.primary, fontWeight: '700', letterSpacing: 0.5 },
  userText:  { ...Type.bodyMedium, color: '#FFFFFF' },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText:{ ...Type.bodySmall, color: Colors.onSurfaceVariant },
  
  thoughtBox: {
    backgroundColor: Colors.surfaceVariant,
    padding: Spacing.sm,
    borderRadius: Shape.medium,
    marginBottom: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primaryContainer,
  },
  thoughtHeader: {
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 2,
  },
  thoughtTitle: { ...Type.labelSmall, color: Colors.onSurfaceVariant, fontWeight: 'bold' },
  thoughtText: { ...Type.bodySmall, color: Colors.onSurfaceVariant, fontStyle: 'italic', marginBottom: 2, marginTop: 4 },

  inputBar: {
    flexDirection: 'row',
    padding: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.outlineVariant,
    backgroundColor: Colors.surface,
    gap: 10,
    alignItems: 'flex-end',
    ...Elevation.level4,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Shape.extraLarge,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    ...Type.bodyMedium,
    color: Colors.onSurface,
    maxHeight: 120,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...Elevation.level3,
  },
  sendDisabled: { backgroundColor: Colors.primaryContainer, elevation: 0 },
  sendIcon:     { color: Colors.onPrimary, fontSize: 22, fontWeight: '900' },
});
