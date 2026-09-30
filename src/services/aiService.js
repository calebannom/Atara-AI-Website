import { getGenerativeModel } from 'firebase/ai';
import { ai } from '../firebase';
import { AI_CONFIG } from '../constants/aiConfig';

const IS_DEV = import.meta.env.DEV;
const noop = () => {};
const log = IS_DEV ? (...a) => console.log('[AI]', ...a) : noop;
const warn = IS_DEV ? (...a) => console.warn('[AI]', ...a) : noop;

// ─── Firebase AI Logic (Gemini Developer API backend, free tier) ──────────────
// Runs on this Firebase project directly — no separate API key needed.
// New primary provider, tried before Groq/OpenRouter/Gemini.
//
// One model instance per distinct system prompt (i.e. per persona), since
// systemInstruction is baked in at construction time and each persona in
// constants/personas.js has its own. Keyed by the prompt text itself
// rather than a persona id, so this file doesn't need to know personas
// exist — it just caches whatever prompt it's handed.
const firebaseModels = new Map();
function getFirebaseModel(systemPrompt) {
  let model = firebaseModels.get(systemPrompt);
  if (!model) {
    model = getGenerativeModel(ai, {
      model: 'gemini-3.1-flash-lite',
      systemInstruction: systemPrompt,
    });
    firebaseModels.set(systemPrompt, model);
  }
  return model;
}

async function callFirebaseAI(conversationHistory, userContext, systemPrompt) {
  log('Trying Firebase AI Logic (gemini-3.1-flash-lite)');
  const model = getFirebaseModel(systemPrompt);

  const history = conversationHistory
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  // Gemini's chat history must start with a 'user' turn. The chat UI always
  // includes Atara's opening greeting as the first message (role 'model'),
  // so without this it fails on every single call with:
  // "First Content should be with role 'user', got model (AI/invalid-content)"
  while (history.length > 0 && history[0].role !== 'user') {
    history.shift();
  }

  // Prepend user context (mood/journal/goal summary) to the first user turn,
  // same pattern used for the other providers, since systemInstruction alone
  // doesn't carry per-request personalization.
  if (userContext && history.length > 0 && history[0].role === 'user') {
    history[0].parts[0].text = `${userContext}\n\n${history[0].parts[0].text}`;
  }

  const lastTurn = history.pop();
  if (!lastTurn) throw new Error('No message to send');

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastTurn.parts[0].text);
  const text = result.response.text();
  if (!text) throw new Error('Firebase AI returned no text');

  log('Success with Firebase AI Logic!');
  return text;
}

// ─── Simple, Proven Gemini API Call ───────────────────────────────────────────
async function callGemini(conversationHistory, userContext, systemPrompt) {
  const modelsToTry = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite'];

  const contents = conversationHistory
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  if (contents.length > 0 && contents[0].role === 'user') {
    const fullPreamble = userContext
      ? `${systemPrompt}\n\n${userContext}`
      : systemPrompt;
    contents[0].parts[0].text = fullPreamble + "\n\n" + contents[0].parts[0].text;
  }

  for (const model of modelsToTry) {
    log(`Trying model: ${model}`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': AI_CONFIG.apiKey,
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 500
          }
        })
      });

      log(`${model} status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          log(`Success with ${model}!`);
          return text;
        }
      } else {
        const err = await response.json();
        warn(`${model} failed:`, err?.error?.message);
      }
    } catch (err) {
      warn(`Error with ${model}:`, err);
    }
  }

  throw new Error('All models failed');
}

// ─── Groq (free, no billing, very generous limits) — primary provider ─────────
async function callGroq(conversationHistory, userContext, systemPrompt) {
  const fullSystemPrompt = userContext
    ? `${systemPrompt}\n\n${userContext}`
    : systemPrompt;

  const messages = [
    { role: 'system', content: fullSystemPrompt },
    ...conversationHistory
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content })),
  ];

  log('Trying Groq (openai/gpt-oss-120b)');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.groqApiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages,
      temperature: 0.9,
      max_tokens: 500,
    }),
  });

  log(`Groq status: ${response.status}`);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    warn('Groq failed:', err?.error?.message);
    throw new Error('Groq failed');
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned no text');

  log('Success with Groq!');
  return text;
}

// ─── OpenRouter Fallback (free, no billing required) ──────────────────────────
async function callOpenRouter(conversationHistory, userContext, systemPrompt) {
  const fullSystemPrompt = userContext
    ? `${systemPrompt}\n\n${userContext}`
    : systemPrompt;

  const messages = [
    { role: 'system', content: fullSystemPrompt },
    ...conversationHistory
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content })),
  ];

  log('Trying OpenRouter (meta-llama/llama-3.3-70b-instruct:free)');
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.openrouterApiKey}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages,
      temperature: 0.9,
      max_tokens: 500,
    }),
  });

  log(`OpenRouter status: ${response.status}`);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    warn('OpenRouter failed:', err?.error?.message);
    throw new Error('OpenRouter failed');
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenRouter returned no text');

  log('Success with OpenRouter!');
  return text;
}

// ─── Friendly Mock Fallback ───────────────────────────────────────────────────
const getMockResponse = (conversationHistory) => {
  const userMessages = conversationHistory.filter(m => m.role === 'user');
  const lastMsg = userMessages.pop()?.content?.toLowerCase() || '';

  const randomSuffix = [
    "I'm here to listen to whatever is on your mind. 💛",
    "How does that make you feel when you think about it? 🌿",
    "Thank you for being so open with me. What else are you noticing?",
    "I appreciate you sharing that. It's okay to feel this way. 💛",
  ][Math.floor(Math.random() * 4)];

  if (lastMsg.includes('hello') || lastMsg.includes('hi') || lastMsg.includes('hey'))
    return "Hi there! 🌿 I'm Atara, your mental health companion. I'm here to listen without judgment. How are you feeling?";

  if (lastMsg.includes('anxious') || lastMsg.includes('anxiety'))
    return "I hear the anxiety in your words, and I want you to know it's okay to feel this way. 😔 Would you like to try a quick breathing exercise or talk more about it?";

  if (lastMsg.includes('sad') || lastMsg.includes('depressed'))
    return "I'm so sorry things feel heavy right now. 💛 It takes so much strength to show up when you're feeling this way. I'm right here with you.";

  return `Thanks for sharing that with me. 🌿 ${randomSuffix}`;
};

// ─── Main Export (Guaranteed to Work!) ─────────────────────────────────────────
// `systemPrompt` lets a caller give Atara a distinct tone (see
// constants/personas.js) without duplicating this fallback chain per
// persona. Defaults to the shared core prompt when omitted.
export async function callAI(conversationHistory, userContext, systemPrompt = AI_CONFIG.systemPrompt) {
  log('Starting...');

  try {
    return await callFirebaseAI(conversationHistory, userContext, systemPrompt);
  } catch (err) {
    warn('Firebase AI Logic failed, trying Groq...', err?.message || err);
  }

  if (AI_CONFIG.groqApiKey && AI_CONFIG.groqApiKey.trim() !== '') {
    try {
      log('Calling Groq...');
      return await callGroq(conversationHistory, userContext, systemPrompt);
    } catch (err) {
      warn('Groq failed, trying OpenRouter...');
    }
  } else {
    log('No Groq key, trying OpenRouter...');
  }

  if (AI_CONFIG.openrouterApiKey && AI_CONFIG.openrouterApiKey.trim() !== '') {
    try {
      return await callOpenRouter(conversationHistory, userContext, systemPrompt);
    } catch (err) {
      warn('OpenRouter failed, trying Gemini...');
    }
  } else {
    log('No OpenRouter key, trying Gemini...');
  }

  if (AI_CONFIG.apiKey && AI_CONFIG.apiKey.trim() !== '') {
    try {
      return await callGemini(conversationHistory, userContext, systemPrompt);
    } catch (err) {
      warn('Gemini failed too, using mock fallback');
    }
  }

  await new Promise(r => setTimeout(r, 800));
  return getMockResponse(conversationHistory);
}
