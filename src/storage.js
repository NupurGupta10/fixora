import AsyncStorage from '@react-native-async-storage/async-storage';

const K_USER = 'fixora:user';
const K_HISTORY = 'fixora:history';

async function read(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

async function write(key, value) {
  try {
    if (value === null || value === undefined) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // storage failures should never crash the app
  }
}

export const loadUser = () => read(K_USER, null);
export const saveUser = (u) => write(K_USER, u);

// Sample entries so the Home screen looks like the design on first launch.
const DEMO_HISTORY = [
  { id: 'd1', title: 'Laptop fan noise', date: '2026-11-12T10:00:00.000Z', status: 'fixed' },
  { id: 'd2', title: 'Mixer grinder motor', date: '2026-11-03T10:00:00.000Z', status: 'fixed' },
  { id: 'd3', title: 'Cycle brake cable', date: '2026-10-28T10:00:00.000Z', status: 'fixed' },
];

export async function loadHistory() {
  const h = await read(K_HISTORY, null);
  return h === null ? DEMO_HISTORY : h;
}
export const saveHistory = (h) => write(K_HISTORY, h);
