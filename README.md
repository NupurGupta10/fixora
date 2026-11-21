# Fixora – Fix it right, step by step

An Android app (React Native + Expo) that guides you through a repair using a YouTube tutorial, your phone camera and Google Gemini. The UI follows the Fixora UI/UX design (dark purple theme, 13 screens).

## The 7 phases

| Phase | What happens | Code |
|---|---|---|
| 1 | Pick language (English, Hindi, Punjabi, Bengali, Tamil, Telugu, Marathi), voice or text mode, device check, problem type | `src/screens/SetupScreens.js` |
| 2 | Describe the problem + paste the YouTube link; Gemini watches the video | `ProblemScreen`, `gemini.js → analyzeTutorial` |
| 3 | Pre-repair checklist: difficulty, time, tools, safety | `src/screens/PrepScreens.js → PrepScreen` |
| 4 | Upload photos of your device and your tools | `AddDeviceScreen` |
| 5 | Gemini compares photos with the tutorial: compatible? parts found/missing? DIY or professional? | `RepairCheckScreen`, `compareDevice` |
| 6 | Live camera with highlight circle on the part, spoken or written steps, Repeat, Ask a question | `src/screens/LiveScreen.js` |
| 7 | Before/after check, mistake detection, reassembly (reverse) guide, mark as fixed | `src/screens/FinalScreen.js` |

---

## PART A – One-time setup on your computer

1. **Install Node.js (LTS)** from https://nodejs.org. Check: open a terminal and run `node -v` (should print v20 or higher).
2. **Install VS Code** from https://code.visualstudio.com.
3. **Install Git** from https://git-scm.com. Check: `git --version`.
4. **Get a free Gemini API key**: open https://aistudio.google.com/apikey, sign in, click **Create API key**, copy it.
5. On your Android phone install **Expo Go** from the Play Store (for the quick test in Part C).

## PART B – Open the project in VS Code

1. Unzip `fixora.zip` somewhere easy, e.g. `Documents/fixora`.
2. VS Code → **File → Open Folder…** → select the `fixora` folder.
3. Open the built-in terminal: **Terminal → New Terminal**.
4. Create your key file: copy `.env.example` to `.env` and paste your key.
   ```bash
   cp .env.example .env        # Windows (cmd): copy .env.example .env
   ```
   Then edit `.env`:
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=your_real_key_here
   ```
5. Install the packages:
   ```bash
   npm install
   npx expo install expo-camera expo-image-picker expo-speech expo-status-bar @react-native-async-storage/async-storage react-native-safe-area-context @expo/vector-icons
   ```
   `npx expo install` automatically picks versions that match your Expo version.

## PART C – Run it on your phone (fastest way)

1. Connect your phone and computer to the **same Wi-Fi**.
2. In the VS Code terminal:
   ```bash
   npx expo start -c
   ```
   A QR code appears.
3. Open **Expo Go** on the phone → **Scan QR code** → scan it. The app loads and opens on the Welcome screen.
4. If the QR doesn't connect (office/college Wi-Fi, firewall), stop the server (Ctrl+C) and run `npx expo start --tunnel` (it offers to install `@expo/ngrok`; answer yes).

**Login in this version is a demo:** type any 10-digit number, then any 6 digits as the code. "Continue with Google" also signs in as a demo user. See "Next steps" to make these real.

**"Project is incompatible with this version of Expo Go"?** Expo Go only runs one SDK version. Fix it with either:
```bash
npx expo install expo@latest
npx expo install --fix
```
or install the Expo Go build that matches your project from https://expo.dev/go.

**Gemini error "model not found"?** Google retires models. Change `EXPO_PUBLIC_GEMINI_MODEL` in `.env` to a current Flash model from https://ai.google.dev/gemini-api/docs/models, then restart with `npx expo start -c`.

## PART D – Install it as a real app (APK file) on your phone

This makes a standalone Android app, no Expo Go or computer needed. It uses Expo's free cloud build service.

1. Create a free account at https://expo.dev/signup.
2. In the VS Code terminal:
   ```bash
   npm install -g eas-cli
   eas login
   eas build:configure        # if it asks, choose Android
   eas build -p android --profile preview
   ```
3. When the build finishes (about 10-20 minutes) the terminal prints a link and a QR code to the **.apk**. Open it on your phone and download.
4. On the phone: open the downloaded file → if asked, allow **"Install unknown apps"** for your browser/files app → **Install** → open **Fixora**.
5. The `.env` key is bundled into the APK when you build. Keep the APK private (see the security note below).

## PART E – Upload to GitHub

1. Create an empty repository on https://github.com/new (name: `fixora`, **don't** tick "Add README"). Copy its URL.
2. In the VS Code terminal, inside the project folder:
   ```bash
   git init
   git add .
   git status                 # make sure ".env" is NOT listed (it is in .gitignore)
   git commit -m "Initial commit: Fixora app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/fixora.git
   git push -u origin main
   ```
   When asked to sign in, use the browser window that opens (or a Personal Access Token as the password).
3. Anyone who clones the repo repeats Part B (they create their own `.env`).

**Never commit `.env`.** If your key ever leaks, delete it at https://aistudio.google.com/apikey and create a new one.

---

## How the Gemini integration works

* `src/gemini.js` calls the Gemini REST API. The YouTube link is passed straight to Gemini as video input, so Gemini can only analyse **public** videos (not private/unlisted).
* Photos are sent as base64 images. Live highlighting takes a low-quality frame every ~9 seconds and asks Gemini for the position of the part for the current step.
* Every answer is requested in the language you chose in Phase 1. Voice mode reads steps aloud with the phone's text-to-speech (`expo-speech`); the phone needs a voice installed for that language (Settings → Language → Text-to-speech).

## Known limits of this version

* **Login is a demo** (no real SMS or Google sign-in).
* **UI labels are English**; Gemini's content (steps, tools, answers) and spoken guidance follow your language.
* **"Ask a question" is typed.** Speech-to-text needs a native module that does not run inside Expo Go; it can be added in a custom build (e.g. `expo-speech-recognition`).
* **Before/after images come from your camera**, not from frames of the tutorial video.
* **The API key is inside the app bundle.** Fine for a personal demo; for a public release, move the Gemini calls to a small backend (Cloud Functions, Express, etc.) and keep the key there.
* AI results can be wrong. The safety messages are guidance only; for swollen batteries, mains electricity or anything you are unsure about, call a professional.

## Next steps (to make it production-ready)

1. Real auth: Firebase Authentication (phone OTP + Google) replaces `loginUser` in `src/screens/AuthScreens.js`.
2. Backend proxy for Gemini calls (hide the key, add rate limits).
3. Cloud sync of repair history (replace `src/storage.js`).
4. Speech-to-text for hands-free questions.
