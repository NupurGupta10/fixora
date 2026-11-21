import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, PhaseHeader, Title, Subtitle, Label, Button, Card, Field, Loading, BackButton } from '../components/UI';
import { colors, radius } from '../theme';
import { useApp } from '../context';
import { LANGUAGES } from '../languages';
import { analyzeTutorial } from '../gemini';

// ---------------- Phase 1: language + guidance mode ----------------
export function LanguageScreen() {
  const { go, session, patchSession } = useApp();
  return (
    <Screen footer={<Button title="Continue" onPress={() => go('DeviceCheck')} />}>
      <PhaseHeader phase={1} brand />
      <Title>Fix anything, step by step</Title>
      <Subtitle>Choose your language and how you want to be guided.</Subtitle>

      <Label>Language</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18 }}>
        {LANGUAGES.map((l) => {
          const on = session.language === l.code;
          return (
            <TouchableOpacity
              key={l.code}
              onPress={() => patchSession({ language: l.code })}
              style={{
                paddingHorizontal: 16,
                height: 38,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: on ? colors.primary : colors.border,
                backgroundColor: on ? colors.primarySoft : 'transparent',
                justifyContent: 'center',
                marginRight: 10,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 13 }}>{l.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Label>Guidance mode</Label>
      <Card
        selected={session.mode === 'voice'}
        onPress={() => patchSession({ mode: 'voice' })}
        style={{ paddingVertical: 16 }}
      >
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Voice-guided</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Hands-free spoken steps while you work</Text>
      </Card>
      <Card selected={session.mode === 'text'} onPress={() => patchSession({ mode: 'text' })} style={{ paddingVertical: 16 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Text-guided</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Read each step on screen</Text>
      </Card>
    </Screen>
  );
}

// ---------------- Phase 1: quick device check ----------------
function YesNoRow({ label, value, onChange }) {
  const btn = (text, v) => {
    const on = value === v;
    const tone = v ? colors.green : colors.muted;
    return (
      <TouchableOpacity
        onPress={() => onChange(v)}
        style={{
          width: 52,
          height: 36,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: on ? tone : colors.border,
          backgroundColor: on && v ? colors.greenBg : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 8,
        }}
      >
        <Text style={{ color: on && v ? colors.green : colors.text, fontWeight: '700', fontSize: 13 }}>{text}</Text>
      </TouchableOpacity>
    );
  };
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 }}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
      <View style={{ flexDirection: 'row' }}>
        {btn('Yes', true)}
        {btn('No', false)}
      </View>
    </Card>
  );
}

export function DeviceCheckScreen() {
  const { go, session, patchSession } = useApp();
  const { camera, audio } = session.device;

  const next = () => {
    if (!audio && session.mode === 'voice') {
      patchSession({ mode: 'text' });
      Alert.alert('Switched to text mode', 'Audio is not working, so steps will be shown on screen.');
    }
    if (!camera) {
      Alert.alert(
        'Camera not working',
        'You can still follow the steps, but photo checks and live highlighting will be skipped.'
      );
    }
    go('ProblemType');
  };

  return (
    <Screen footer={<Button title="Continue" onPress={next} />}>
      <PhaseHeader phase={1} />
      <Title>Quick device check</Title>
      <Subtitle>Tell us what is working on your device.</Subtitle>
      <YesNoRow label="Camera" value={camera} onChange={(v) => patchSession({ device: { ...session.device, camera: v } })} />
      <YesNoRow label="Audio" value={audio} onChange={(v) => patchSession({ device: { ...session.device, audio: v } })} />
    </Screen>
  );
}

// ---------------- Phase 1: problem type ----------------
const TYPES = [
  { id: 'hardware', title: 'Hardware', text: 'Something physical, like a cracked screen, loud fan or weak battery' },
  { id: 'software', title: 'Software', text: 'Something digital, like slow performance, crashing apps or settings' },
  { id: 'unsure', title: 'Not sure', text: 'We will help you find out' },
];

export function ProblemTypeScreen() {
  const { go, session, patchSession } = useApp();
  return (
    <Screen footer={<Button title="Continue" onPress={() => go('Problem')} />}>
      <PhaseHeader phase={1} />
      <Title>What kind of problem is it?</Title>
      <Subtitle>Choose the closest match.</Subtitle>
      {TYPES.map((t) => (
        <Card key={t.id} selected={session.problemType === t.id} onPress={() => patchSession({ problemType: t.id })}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{t.title}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{t.text}</Text>
        </Card>
      ))}
    </Screen>
  );
}

// ---------------- Phase 2: problem + tutorial link ----------------
const YT = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?|shorts\/|live\/)|youtu\.be\/)\S+/i;

export function ProblemScreen() {
  const { go, session, patchSession, languageName } = useApp();
  const [problem, setProblem] = useState(session.problem || '');
  const [url, setUrl] = useState(session.url || '');
  const [busy, setBusy] = useState(false);
  const linked = YT.test(url.trim());

  const analyse = async () => {
    if (problem.trim().length < 5) return Alert.alert('Describe the problem', 'Tell us a little more about what is wrong.');
    if (!linked) return Alert.alert('YouTube link needed', 'Paste a public YouTube tutorial link.');
    const fullUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    setBusy(true);
    try {
      const tutorial = await analyzeTutorial({
        problem: problem.trim(),
        url: fullUrl,
        problemType: session.problemType,
        language: languageName,
      });
      patchSession({
        problem: problem.trim(),
        url: fullUrl,
        tutorial,
        toolsChecked: [],
        stepIndex: 0,
        repairId: session.repairId || `r${Date.now()}`,
      });
      go('Prep');
    } catch (e) {
      Alert.alert('Could not analyse the tutorial', e.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen footer={<Button title="Analyse tutorial" onPress={analyse} disabled={busy} />}>
        <PhaseHeader phase={2} />
        <Title>What needs fixing?</Title>
        <Subtitle>Describe the problem and link the tutorial you are following.</Subtitle>
        <Field
          label="Your problem"
          placeholder="Example: my laptop fan is loud and it overheats"
          multiline
          value={problem}
          onChangeText={setProblem}
        />
        <Field
          label="Tutorial link"
          placeholder="Paste a YouTube link"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={url}
          onChangeText={setUrl}
        />
        {linked && (
          <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="play" size={18} color={colors.pink} style={{ marginRight: 14 }} />
            <View>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Tutorial linked</Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Gemini will analyse it next</Text>
            </View>
          </Card>
        )}
      </Screen>
      {busy && <Loading text="Gemini is watching the tutorial and listing tools and steps. This can take up to a minute." />}
    </View>
  );
}
