import * as Speech from 'expo-speech';

export function speak(text, langTag) {
  try {
    Speech.stop();
    if (!text) return;
    Speech.speak(String(text), { language: langTag, rate: 0.95 });
  } catch (e) {
    // speech is optional; ignore failures
  }
}

export function stopSpeaking() {
  try {
    Speech.stop();
  } catch (e) {}
}
