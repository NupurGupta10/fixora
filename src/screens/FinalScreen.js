import React, { useState } from 'react';
import { View, Text, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, PhaseHeader, Title, Subtitle, Button, Card, Loading, Label } from '../components/UI';
import { pickImage } from '../components/pickImage';
import { colors, radius } from '../theme';
import { useApp } from '../context';
import { finalCheck, reassemblySteps } from '../gemini';

function ImageTile({ label, image }) {
  return (
    <View
      style={{
        flex: 1,
        height: 120,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {image ? (
        <>
          <Image source={{ uri: image.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <View
            style={{
              position: 'absolute',
              bottom: 6,
              left: 6,
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 11 }}>{label}</Text>
          </View>
        </>
      ) : (
        <Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text>
      )}
    </View>
  );
}

// ---------------- Phase 7: final verification + error detection + reassembly ----------------
export default function FinalScreen() {
  const { session, patchSession, languageName, markFixed } = useApp();
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const [reassembly, setReassembly] = useState(null);

  const before = session.beforeImg || session.deviceImg;

  const recheck = async () => {
    const after = await pickImage();
    if (!after) return;
    patchSession({ afterImg: after });
    setBusy('Gemini is checking your repair against the tutorial...');
    try {
      const out = await finalCheck({
        beforeB64: before ? before.base64 : null,
        afterB64: after.base64,
        tutorial: session.tutorial,
        language: languageName,
      });
      setResult(out);
    } catch (e) {
      Alert.alert('Could not verify the repair', e.message || 'Please try again.');
    } finally {
      setBusy('');
    }
  };

  const loadReassembly = async () => {
    setBusy('Preparing the reassembly guide...');
    try {
      setReassembly(await reassemblySteps({ tutorial: session.tutorial, language: languageName }));
    } catch (e) {
      Alert.alert('Could not create the guide', e.message || 'Please try again.');
    } finally {
      setBusy('');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen footer={<Button title="Re-check repair" onPress={recheck} disabled={!!busy} />}>
        <PhaseHeader phase={7} />
        <Title>Final check</Title>
        <Subtitle>AI compared your repair with the tutorial.</Subtitle>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <ImageTile label="Before" image={before} />
          <ImageTile label="After" image={session.afterImg} />
        </View>

        {result ? (
          <>
            <Card style={{ paddingVertical: 8 }}>
              {result.results.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 }}>
                  <Ionicons
                    name={r.ok ? 'checkmark' : 'warning-outline'}
                    size={16}
                    color={r.ok ? colors.green : colors.amber}
                    style={{ marginRight: 10, marginTop: 1 }}
                  />
                  <Text style={{ color: r.ok ? colors.text : colors.amber, fontSize: 13, flex: 1, lineHeight: 19 }}>
                    {r.text}
                  </Text>
                </View>
              ))}
              {result.summary ? (
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6, marginBottom: 4 }}>{result.summary}</Text>
              ) : null}
            </Card>
            {result.allGood ? (
              <Button title="Mark as fixed" icon="checkmark-circle-outline" onPress={markFixed} style={{ marginBottom: 12 }} />
            ) : (
              <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>
                Fix the highlighted items, then tap "Re-check repair" with a new photo.
              </Text>
            )}
          </>
        ) : (
          <Card>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
              Take a photo of your finished repair and tap "Re-check repair". Gemini will look for mistakes, loose parts
              and incomplete steps.
            </Text>
          </Card>
        )}

        <Button title="Reassembly guide" variant="outline" icon="refresh-outline" onPress={loadReassembly} disabled={!!busy} />

        {reassembly && (
          <View style={{ marginTop: 16 }}>
            <Label>Reassembly steps (reverse order)</Label>
            {reassembly.map((s, i) => (
              <Card key={i}>
                <Text style={{ color: colors.orange, fontSize: 11, marginBottom: 4 }}>Step {i + 1}</Text>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{s.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 18 }}>{s.instruction}</Text>
              </Card>
            ))}
          </View>
        )}
      </Screen>
      {!!busy && <Loading text={busy} />}
    </View>
  );
}
