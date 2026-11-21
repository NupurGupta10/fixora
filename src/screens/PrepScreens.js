import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, PhaseHeader, Title, Subtitle, Label, Button, Card, Loading } from '../components/UI';
import { pickImage } from '../components/pickImage';
import { colors, radius } from '../theme';
import { useApp } from '../context';
import { compareDevice } from '../gemini';

// ---------------- Phase 3: pre-repair preparation ----------------
function Stat({ label, value }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: 12,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 4 }}>{value}</Text>
    </View>
  );
}

export function PrepScreen() {
  const { go, session, patchSession } = useApp();
  const t = session.tutorial;
  const checked = session.toolsChecked || [];

  const toggle = (i) =>
    patchSession({ toolsChecked: checked.includes(i) ? checked.filter((x) => x !== i) : [...checked, i] });

  return (
    <Screen footer={<Button title="Continue" onPress={() => go('AddDevice')} />}>
      <PhaseHeader phase={3} />
      <Title>Before you start</Title>
      <View style={{ height: 8 }} />
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <Stat label="Difficulty" value={t.difficulty || '-'} />
        <Stat label="Time" value={t.timeMinutes ? `${t.timeMinutes} min` : '-'} />
        <Stat label="Tools" value={`${t.tools.length} needed`} />
      </View>

      <Label>Tools you need</Label>
      <Card style={{ paddingVertical: 6 }}>
        {t.tools.map((tool, i) => {
          const on = checked.includes(i);
          return (
            <TouchableOpacity
              key={i}
              onPress={() => toggle(i)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: on ? colors.primary : colors.faint,
                  backgroundColor: on ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                {on && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>{tool}</Text>
            </TouchableOpacity>
          );
        })}
      </Card>

      <View
        style={{
          borderWidth: 1,
          borderColor: colors.amber,
          backgroundColor: colors.amberBg,
          borderRadius: radius.md,
          padding: 14,
          marginTop: 6,
        }}
      >
        <Text style={{ color: colors.amber, fontWeight: '700', marginBottom: 6 }}>Safety first</Text>
        {t.safety.map((s, i) => (
          <Text key={i} style={{ color: colors.text, fontSize: 12, lineHeight: 18, marginTop: i ? 4 : 0 }}>
            {t.safety.length > 1 ? '• ' : ''}
            {s}
          </Text>
        ))}
      </View>
    </Screen>
  );
}

// ---------------- Phase 4: add device + materials photos ----------------
function PhotoTile({ label, icon, image, onPress }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={{
          height: 150,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: colors.primary,
          backgroundColor: colors.card,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {image ? (
          <Image source={{ uri: image.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <Ionicons name={icon} size={22} color={colors.pink} />
            </View>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Take or upload a photo</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function AddDeviceScreen() {
  const { go, session, patchSession, languageName } = useApp();
  const [busy, setBusy] = useState(false);

  const pick = async (key) => {
    const img = await pickImage();
    if (img) patchSession({ [key]: img });
  };

  const next = async () => {
    if (!session.deviceImg) return Alert.alert('Add your device', 'Please add a photo of your device first.');
    setBusy(true);
    try {
      const compat = await compareDevice({
        deviceB64: session.deviceImg.base64,
        materialsB64: session.materialsImg ? session.materialsImg.base64 : null,
        tutorial: session.tutorial,
        problem: session.problem,
        language: languageName,
      });
      patchSession({ compat });
      go('RepairCheck');
    } catch (e) {
      Alert.alert('Could not compare your photos', e.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen footer={<Button title="Continue" onPress={next} disabled={busy} />}>
        <PhaseHeader phase={4} />
        <Title>Add your device</Title>
        <Subtitle>Upload a photo of your device and of the tools and materials you have.</Subtitle>
        <PhotoTile label="Your device" icon="camera-outline" image={session.deviceImg} onPress={() => pick('deviceImg')} />
        <PhotoTile
          label="Materials you have"
          icon="construct-outline"
          image={session.materialsImg}
          onPress={() => pick('materialsImg')}
        />
      </Screen>
      {busy && <Loading text="Gemini is comparing your photos with the tutorial..." />}
    </View>
  );
}

// ---------------- Phase 5: repair check ----------------
const STATUS = {
  found: { text: 'Found', color: colors.green },
  missing: { text: 'Missing', color: colors.amber },
  replace: { text: 'Replace', color: colors.amber },
};

export function RepairCheckScreen() {
  const { go, session } = useApp();
  const c = session.compat;
  const ok = !!c.compatible;
  const diy = !!c.doItYourself;

  return (
    <Screen footer={<Button title="Continue" onPress={() => go('Live')} />}>
      <PhaseHeader phase={5} />
      <Title>Repair check</Title>
      <Subtitle>AI compared your photos with the tutorial.</Subtitle>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: ok ? colors.green : colors.amber,
          backgroundColor: ok ? colors.greenBg : colors.amberBg,
          borderRadius: radius.md,
          padding: 14,
          marginBottom: 20,
        }}
      >
        <Ionicons name={ok ? 'checkmark' : 'warning-outline'} size={18} color={ok ? colors.green : colors.amber} />
        <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 10, flex: 1 }}>
          {c.summary || (ok ? 'Device matches this tutorial' : 'Device may not match this tutorial')}
        </Text>
      </View>

      <Label>Parts check</Label>
      <Card style={{ paddingVertical: 4 }}>
        {c.parts.map((p, i) => {
          const s = STATUS[p.status] || STATUS.found;
          return (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ color: colors.text, fontSize: 13 }}>{p.name}</Text>
                {p.note ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{p.note}</Text> : null}
              </View>
              <Text style={{ color: s.color, fontSize: 12, fontWeight: '700' }}>{s.text}</Text>
            </View>
          );
        })}
      </Card>

      <Label>Who should fix it?</Label>
      <View
        style={{
          borderWidth: 1,
          borderColor: diy ? colors.green : colors.amber,
          backgroundColor: diy ? colors.greenBg : colors.amberBg,
          borderRadius: radius.md,
          padding: 14,
        }}
      >
        <Text style={{ color: diy ? colors.green : colors.amber, fontWeight: '700', fontSize: 15 }}>
          {diy ? 'You can do this yourself' : 'We recommend a professional'}
        </Text>
        {c.advice ? <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18, marginTop: 6 }}>{c.advice}</Text> : null}
        {c.callProIf ? (
          <Text style={{ color: colors.amber, fontSize: 12, lineHeight: 18, marginTop: 8 }}>{c.callProIf}</Text>
        ) : null}
      </View>
    </Screen>
  );
}
