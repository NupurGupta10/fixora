// `name` is passed to Gemini so it answers in that language.
// `speech` is the BCP-47 tag passed to expo-speech for voice-guided mode.
export const LANGUAGES = [
  { code: 'en', label: 'English', name: 'English', speech: 'en-IN' },
  { code: 'hi', label: 'हिन्दी', name: 'Hindi', speech: 'hi-IN' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', name: 'Punjabi (Gurmukhi script)', speech: 'pa-IN' },
  { code: 'bn', label: 'বাংলা', name: 'Bengali', speech: 'bn-IN' },
  { code: 'ta', label: 'தமிழ்', name: 'Tamil', speech: 'ta-IN' },
  { code: 'te', label: 'తెలుగు', name: 'Telugu', speech: 'te-IN' },
  { code: 'mr', label: 'मराठी', name: 'Marathi', speech: 'mr-IN' },
];

export const getLanguage = (code) => LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
