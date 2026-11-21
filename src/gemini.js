// Gemini REST client + one function per AI phase of Fixora.
// NOTE: EXPO_PUBLIC_* values are bundled into the app. That is fine for a demo / personal
// use, but for a public release put the key behind your own backend.

const KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const img = (base64) => ({ inline_data: { mime_type: 'image/jpeg', data: base64 } });

function parseJson(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const s = cleaned.indexOf('{');
    const eIdx = cleaned.lastIndexOf('}');
    if (s >= 0 && eIdx > s) return JSON.parse(cleaned.slice(s, eIdx + 1));
    throw new Error('Gemini returned an unreadable answer. Please try again.');
  }
}

async function call(parts, { json = true, system } = {}) {
  if (!KEY) {
    throw new Error(
      'Gemini API key missing. Add EXPO_PUBLIC_GEMINI_API_KEY to the .env file, then restart with: npx expo start -c'
    );
  }
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.4, ...(json ? { responseMimeType: 'application/json' } : {}) },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error('No internet connection, or Gemini could not be reached.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini error ${res.status}`;
    throw new Error(msg);
  }
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  if (!text) throw new Error('Gemini returned an empty answer. Please try again.');
  return json ? parseJson(text) : text.trim();
}

const SYSTEM =
  'You are Fixora, a careful, friendly repair assistant for ordinary people. ' +
  'Prioritise safety. Never invent parts or steps that are not supported by the tutorial or the photos. ' +
  'Keep sentences short and simple.';

// Phases 2-5 (prep + video analysis): analyse the YouTube tutorial.
export async function analyzeTutorial({ problem, url, problemType, language }) {
  const prompt = `
The user wants to fix this problem: "${problem}" (category: ${problemType || 'unknown'}).
They are following the tutorial video provided. Analyse the whole video.

Write every human-readable string in ${language}. Keep JSON keys in English.
Return ONLY JSON in exactly this shape:
{
  "title": "short title of the repair",
  "difficulty": "Easy | Medium | Hard (in ${language})",
  "timeMinutes": number,
  "tools": ["tool or material needed, in order of use"],
  "safety": ["safety precaution", "..."],
  "steps": [
    {
      "title": "very short step name",
      "instruction": "1-2 short sentences telling the user what to do",
      "component": "the main physical part involved in this step (short noun phrase)",
      "timestamp": "mm:ss where this step appears in the video"
    }
  ]
}
Use 4 to 12 steps. Include safety precautions that apply to this specific repair (power off, unplug, battery, static, sharp edges...).`;
  const parts = [{ file_data: { file_uri: url } }, { text: prompt }];
  const out = await call(parts, { system: SYSTEM });
  out.tools = Array.isArray(out.tools) ? out.tools : [];
  out.safety = Array.isArray(out.safety) ? out.safety : [];
  out.steps = Array.isArray(out.steps) ? out.steps : [];
  if (!out.steps.length) throw new Error('Could not find repair steps in that video. Try another tutorial.');
  return out;
}

// Phase 3/5: compare the user's photos with the tutorial.
export async function compareDevice({ deviceB64, materialsB64, tutorial, problem, language }) {
  const prompt = `
Tutorial: "${tutorial.title}". Problem: "${problem}".
Tools/materials the tutorial needs: ${JSON.stringify(tutorial.tools)}.
Steps summary: ${tutorial.steps.map((s, i) => `${i + 1}. ${s.title} (${s.component})`).join('; ')}.

Image 1 is the user's device. ${materialsB64 ? 'Image 2 shows the tools and materials the user has.' : 'The user did not upload a photo of their tools.'}
Decide whether the device is compatible with this tutorial, and check the parts/tools.

Write human-readable strings in ${language}. Return ONLY JSON:
{
  "compatible": true | false,
  "summary": "one short sentence, e.g. Device matches this tutorial",
  "parts": [ { "name": "part or tool", "status": "found | missing | replace", "note": "optional short note" } ],
  "doItYourself": true | false,
  "advice": "2 short sentences: difficulty, time and what to do first",
  "callProIf": "one sentence: when to call a professional"
}
Only mark "found" if you can actually see it or it is clearly part of the device. List 3 to 8 parts.`;
  const parts = [img(deviceB64)];
  if (materialsB64) parts.push(img(materialsB64));
  parts.push({ text: prompt });
  const out = await call(parts, { system: SYSTEM });
  out.parts = Array.isArray(out.parts) ? out.parts : [];
  return out;
}

// Phase 6: find the part for the current step in a live camera frame.
export async function locateComponent({ frameB64, step, language }) {
  const prompt = `
Current repair step: "${step.title}" - ${step.instruction}
Target part: "${step.component}".
Find that part in the image. Write "label" in ${language} (max 3 words).
Return ONLY JSON: { "found": true|false, "label": "...", "x": 0-1, "y": 0-1, "radius": 0-0.5 }
x and y are the centre of the part as a fraction of image width/height; radius is a fraction of image width.`;
  return call([img(frameB64), { text: prompt }], { system: SYSTEM });
}

// Phase 6: the user asks a question during a step.
export async function askQuestion({ question, step, stepIndex, total, tutorial, frameB64, language }) {
  const prompt = `
The user is repairing: "${tutorial.title}". They are on step ${stepIndex + 1} of ${total}: "${step.title}" - ${step.instruction}.
Question: "${question}"
${frameB64 ? 'The image is what their camera currently sees.' : ''}
Answer in ${language}, in at most 3 short sentences. If there is a safety risk, say so first.`;
  const parts = frameB64 ? [img(frameB64), { text: prompt }] : [{ text: prompt }];
  return call(parts, { json: false, system: SYSTEM });
}

// Phase 7: verify the finished repair.
export async function finalCheck({ beforeB64, afterB64, tutorial, language }) {
  const prompt = `
Repair: "${tutorial.title}".
Steps that should have been done: ${tutorial.steps.map((s, i) => `${i + 1}. ${s.title}`).join('; ')}.
Image 1 is BEFORE the repair, image 2 is the current state AFTER.
Check for mistakes, loose or unseated parts, missing screws, leftover parts or incomplete steps.

Write strings in ${language}. Return ONLY JSON:
{
  "results": [ { "ok": true|false, "text": "short finding" } ],
  "allGood": true|false,
  "summary": "one short sentence"
}
Give 2 to 5 findings. Be honest: only say ok when you can see evidence.`;
  const parts = [];
  if (beforeB64) parts.push(img(beforeB64));
  parts.push(img(afterB64));
  parts.push({ text: prompt });
  const out = await call(parts, { system: SYSTEM });
  out.results = Array.isArray(out.results) ? out.results : [];
  return out;
}

// Phase 7: reverse repair (reassembly) guide.
export async function reassemblySteps({ tutorial, language }) {
  const prompt = `
These are the disassembly/repair steps for "${tutorial.title}":
${tutorial.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.instruction}`).join('\n')}

Write the reassembly (reverse) procedure, in reverse order, with tips for correct re-seating of parts and screws.
Write strings in ${language}. Return ONLY JSON: { "steps": [ { "title": "...", "instruction": "..." } ] }`;
  const out = await call([{ text: prompt }], { system: SYSTEM });
  return Array.isArray(out.steps) ? out.steps : [];
}
