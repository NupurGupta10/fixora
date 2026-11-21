import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppContext } from './src/context';
import { colors } from './src/theme';
import { getLanguage } from './src/languages';
import { loadUser, saveUser, loadHistory, saveHistory } from './src/storage';

import { WelcomeScreen, CreateAccountScreen, OtpScreen } from './src/screens/AuthScreens';
import HomeScreen from './src/screens/HomeScreen';
import { LanguageScreen, DeviceCheckScreen, ProblemTypeScreen, ProblemScreen } from './src/screens/SetupScreens';
import { PrepScreen, AddDeviceScreen, RepairCheckScreen } from './src/screens/PrepScreens';
import LiveScreen from './src/screens/LiveScreen';
import FinalScreen from './src/screens/FinalScreen';

const SCREENS = {
  Welcome: WelcomeScreen,
  CreateAccount: CreateAccountScreen,
  Otp: OtpScreen,
  Home: HomeScreen,
  Language: LanguageScreen,
  DeviceCheck: DeviceCheckScreen,
  ProblemType: ProblemTypeScreen,
  Problem: ProblemScreen,
  Prep: PrepScreen,
  AddDevice: AddDeviceScreen,
  RepairCheck: RepairCheckScreen,
  Live: LiveScreen,
  Final: FinalScreen,
};

const freshSession = () => ({
  language: 'en',
  mode: 'voice',
  device: { camera: true, audio: true },
  problemType: 'hardware',
  problem: '',
  url: '',
  tutorial: null,
  toolsChecked: [],
  deviceImg: null,
  materialsImg: null,
  beforeImg: null,
  afterImg: null,
  compat: null,
  stepIndex: 0,
  repairId: null,
});

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [stack, setStack] = useState([{ name: 'Welcome' }]);
  const [session, setSession] = useState(freshSession());

  // ---- boot: restore login + history ----
  useEffect(() => {
    (async () => {
      const [u, h] = await Promise.all([loadUser(), loadHistory()]);
      setHistory(h);
      if (u) {
        setUser(u);
        setStack([{ name: 'Home' }]);
      }
      setBooting(false);
    })();
  }, []);

  // ---- navigation ----
  const go = useCallback((name, params = {}) => setStack((s) => [...s, { name, params }]), []);
  const reset = useCallback((name, params = {}) => setStack([{ name, params }]), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        back();
        return true;
      }
      return false; // let Android close the app from the root screen
    });
    return () => sub.remove();
  }, [stack, back]);

  // ---- session ----
  const patchSession = useCallback((patch) => setSession((s) => ({ ...s, ...patch })), []);

  const startNewRepair = useCallback(() => {
    setSession(freshSession());
    go('Language');
  }, [go]);

  const lang = getLanguage(session.language);

  // ---- history ----
  const persistHistory = useCallback((next) => {
    setHistory(next);
    saveHistory(next);
  }, []);

  // Called by the Live screen on every step so the repair can be resumed later.
  const saveProgress = useCallback(
    (stepIdx) => {
      if (!session.tutorial || !session.repairId) return;
      const entry = {
        id: session.repairId,
        title: session.tutorial.title || session.problem,
        date: new Date().toISOString(),
        status: 'progress',
        step: stepIdx + 1,
        total: session.tutorial.steps.length,
        // photos are large, so they are not stored for resuming
        session: { ...session, stepIndex: stepIdx, deviceImg: null, materialsImg: null, beforeImg: null, afterImg: null },
      };
      setHistory((h) => {
        const next = [entry, ...h.filter((x) => x.id !== entry.id)];
        saveHistory(next);
        return next;
      });
    },
    [session]
  );

  const markFixed = useCallback(() => {
    const id = session.repairId;
    const next = history.map((x) => (x.id === id ? { ...x, status: 'fixed', session: undefined, date: new Date().toISOString() } : x));
    persistHistory(next);
    reset('Home');
  }, [session.repairId, history, persistHistory, reset]);

  const resumeRepair = useCallback(
    (entry) => {
      setSession({ ...freshSession(), ...entry.session });
      setStack((s) => [...s, { name: 'Live' }]);
    },
    []
  );

  // ---- auth ----
  const loginUser = useCallback(
    (u) => {
      setUser(u);
      saveUser(u);
      reset('Home');
    },
    [reset]
  );
  const logout = useCallback(() => {
    setUser(null);
    saveUser(null);
    reset('Welcome');
  }, [reset]);

  const ctx = useMemo(
    () => ({
      user,
      history,
      session,
      patchSession,
      startNewRepair,
      resumeRepair,
      saveProgress,
      markFixed,
      loginUser,
      logout,
      go,
      back,
      reset,
      languageName: lang.name,
      speechTag: lang.speech,
    }),
    [user, history, session, patchSession, startNewRepair, resumeRepair, saveProgress, markFixed, loginUser, logout, go, back, reset, lang]
  );

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  }

  const top = stack[stack.length - 1];
  const Current = SCREENS[top.name];

  return (
    <SafeAreaProvider>
      <AppContext.Provider value={ctx}>
        <StatusBar style="light" />
        <Current params={top.params || {}} />
      </AppContext.Provider>
    </SafeAreaProvider>
  );
}
