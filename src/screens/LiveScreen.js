import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Screen, PhaseHeader, Button, Card } from '../components/UI';
import { colors, radius } from '../theme';
import { useApp } from '../context';
import { locateComponent, askQuestion } from '../gemini';
import { speak, stopSpeaking } from '../speech';

const SCAN_EVERY_MS = 9000;

// ---------------- Phase 6: live camera + voice/text guidance ----------------
export default function LiveScreen() {
  const { go, back, session, patchSession, languageName, speechTag, saveProgress } = useApp();
  const tutorial = session.tutorial;
  const steps = tutorial.steps;
  const idx = Math.min(session.stepIndex || 0, steps.length - 1);
  const step = steps[idx];
  const isLast = idx === steps.length - 1;
  const voice = session.mode === 'voice' && session.device.audio;
  const cameraOk = session.device.camera;

  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef(null);
  const busy = useRef(false);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ w: 1, h: 1 });
  const [overlay, setOverlay] = useState(null);
  const [scanning, setScanning] = useState(false);

  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);

  const useCam = cameraOk && perm && perm.granted;

  useEffect(() => {
    if (cameraOk && perm && !perm.granted && perm.canAskAgain) requestPerm();
  }, [cameraOk, perm, requestPerm]);

  // Speak each step in voice mode, and save progress.
  useEffect(() => {
    setOverlay(null);
    setAnswer('');
    saveProgress(idx);
    if (voice) speak(`${step.title}. ${step.instruction}`, speechTag);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const snap = useCallback(async (quality = 0.3) => {
    if (!camRef.current) return null;
    const pic = await camRef.current.takePictureAsync({ quality, base64: true, skipProcessing: true });
    return pic;
  }, []);

  const scan = useCallback(async () => {
    if (busy.current || !ready || !camRef.current) return;
    busy.current = true;
    setScanning(true);
    try {
      const pic = await snap(0.3);
      if (!pic || !pic.base64) return;
      const r = await locateComponent({ frameB64: pic.base64, step, language: languageName });
      setOverlay(r && r.found ? r : null);
    } catch (e) {
      // live scanning is best-effort; ignore transient errors
    } finally {
      busy.current = false;
      setScanning(false);
    }
  }, [ready, step, languageName, snap]);

  useEffect(() => {
    if (!useCam || !ready) return undefined;
    scan();
    const t = setInterval(scan, SCAN_EVERY_MS);
    return () => clearInterval(t);
  }, [useCam, ready, idx, scan]);

  // Grab a "before" frame on the very first step.
  useEffect(() => {
    if (useCam && ready && idx === 0 && !session.beforeImg) {
      const t = setTimeout(async () => {
        try {
          const pic = await snap(0.5);
          if (pic && pic.base64) patchSession({ beforeImg: { uri: pic.uri, base64: pic.base64 } });
        } catch (e) {}
      }, 1500);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCam, ready]);

  const repeat = () => {
    if (voice) speak(`${step.title}. ${step.instruction}`, speechTag);
    else Alert.alert(step.title, step.instruction);
  };

  const next = () => {
    if (isLast) {
      stopSpeaking();
      go('Final');
    } else {
      patchSession({ stepIndex: idx + 1 });
    }
  };

  const prev = () => {
    if (idx > 0) patchSession({ stepIndex: idx - 1 });
    else back();
  };

  const ask = async () => {
    if (!question.trim()) return;
    setAsking(true);
    try {
      let frameB64 = null;
      if (useCam && ready) {
        try {
          const pic = await snap(0.3);
          frameB64 = pic && pic.base64;
        } catch (e) {}
      }
      const text = await askQuestion({
        question: question.trim(),
        step,
        stepIndex: idx,
        total: steps.length,
        tutorial,
        frameB64,
        language: languageName,
      });
      setAnswer(text);
      if (voice) speak(text, speechTag);
    } catch (e) {
      Alert.alert('Could not get an answer', e.message || 'Please try again.');
    } finally {
      setAsking(false);
    }
  };

  const showOverlay = overlay && typeof overlay.x === 'number' && typeof overlay.y === 'number';
  const r = showOverlay ? Math.max(24, Math.min(90, (overlay.radius || 0.12) * box.w)) : 0;

  return (
    <Screen
      scroll
      footer={<Button title={isLast ? 'Finish and verify' : 'Next step'} onPress={next} />}
    >
      <PhaseHeader phase={6} />

      <View
        onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={{
          height: 300,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: '#000',
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        {useCam ? (
          <CameraView ref={camRef} style={{ flex: 1 }} facing="back" onCameraReady={() => setReady(true)} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Ionicons name="videocam-off-outline" size={34} color={colors.faint} />
            <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 10, fontSize: 12 }}>
              {cameraOk ? 'Allow camera access to see live highlights.' : 'Camera is off. Follow the written steps below.'}
            </Text>
            {cameraOk && perm && !perm.granted && (
              <TouchableOpacity onPress={requestPerm} style={{ marginTop: 12 }}>
                <Text style={{ color: colors.pink, fontWeight: '700' }}>Allow camera</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {useCam && (
          <View
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.55)',
              borderRadius: radius.pill,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.pink, marginRight: 6 }} />
            <Text style={{ color: '#fff', fontSize: 11 }}>Live</Text>
            {scanning && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8, transform: [{ scale: 0.7 }] }} />}
          </View>
        )}

        {showOverlay && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: Math.max(0, overlay.x * box.w - r),
              top: Math.max(0, overlay.y * box.h - r),
              width: r * 2,
              alignItems: 'center',
            }}
          >
            {overlay.label ? (
              <View
                style={{
                  backgroundColor: colors.amber,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  marginBottom: 6,
                }}
              >
                <Text style={{ color: '#000', fontSize: 11, fontWeight: '700' }}>{overlay.label}</Text>
              </View>
            ) : null}
            <View style={{ width: r * 2, height: r * 2, borderRadius: r, borderWidth: 3, borderColor: colors.amber }} />
          </View>
        )}
      </View>

      <Card style={{ padding: 16 }}>
        <Text style={{ color: colors.orange, fontSize: 11, marginBottom: 6 }}>
          Step {idx + 1} of {steps.length}
          {step.timestamp ? `  ·  video ${step.timestamp}` : ''}
        </Text>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6 }}>{step.title}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{step.instruction}</Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Repeat" variant="outline" onPress={repeat} style={{ flex: 1, height: 44 }} />
        <Button title="Ask a question" variant="outline" onPress={() => setAskOpen(true)} style={{ flex: 1, height: 44 }} />
      </View>
      <TouchableOpacity onPress={prev} style={{ alignSelf: 'center', marginTop: 14 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{idx === 0 ? 'Back' : 'Previous step'}</Text>
      </TouchableOpacity>

      <Modal visible={askOpen} animationType="slide" transparent onRequestClose={() => setAskOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.bg,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding: 20,
              maxHeight: '80%',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Ask a question</Text>
              <TouchableOpacity onPress={() => { setAskOpen(false); stopSpeaking(); }}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Example: which screw do I remove first?"
              placeholderTextColor={colors.faint}
              multiline
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                color: colors.text,
                padding: 12,
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: 12,
              }}
            />
            <Button title="Ask Gemini" onPress={ask} loading={asking} />
            {answer ? (
              <ScrollView style={{ marginTop: 14 }}>
                <Card>
                  <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21 }}>{answer}</Text>
                </Card>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
