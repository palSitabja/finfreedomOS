import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_IP   = process.env.EXPO_PUBLIC_API_IP   || '10.0.2.2';
const DEFAULT_PORT = process.env.EXPO_PUBLIC_API_PORT || '8000';

export const DEFAULT_API_BASE = `http://${DEFAULT_IP}:${DEFAULT_PORT}`;

const STORAGE_KEY = '@finetra/api_base';

// In-memory cache so every hook doesn't hit AsyncStorage
let _apiBase: string = DEFAULT_API_BASE;

export async function loadApiBase(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) _apiBase = stored;
  } catch (_) {}
  return _apiBase;
}

export async function saveApiBase(base: string): Promise<void> {
  _apiBase = base.replace(/\/+$/, ''); // strip trailing slash
  await AsyncStorage.setItem(STORAGE_KEY, _apiBase);
}

export function getApiBase(): string {
  return _apiBase;
}

// Legacy named export kept for backward compat with existing hooks
export const API_BASE = new Proxy({} as { toString(): string }, {
  get(_, prop) {
    if (prop === 'toString' || prop === Symbol.toPrimitive) {
      return () => _apiBase;
    }
    return undefined;
  }
});
