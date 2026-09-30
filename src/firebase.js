import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAI, GoogleAIBackend } from 'firebase/ai';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDpPcv5NzL4CnjGY6hvw2Z2j3_7MXTY9ok',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'atara-d21d2.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'atara-d21d2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'atara-d21d2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID || '398264780899',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:398264780899:web:ff9773ae4bda0a59119056',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-DS6R54JH80',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics only works in a real browser with cookies/storage available
// (not in SSR, some privacy modes, etc.), so guard it with isSupported()
// rather than calling getAnalytics() directly.
export let analytics = null;
analyticsIsSupported()
  .then((supported) => {
    if (supported) analytics = getAnalytics(app);
  })
  .catch(() => {});

// ─── App Check ──────────────────────────────────────────────────────────────
// Firebase AI Logic requires App Check to be initialized before you can call
// the model. Plain "reCAPTCHA (v3)" registration has been removed from the
// Firebase console (Sept 2026) — only reCAPTCHA Enterprise is offered now —
// so this uses ReCaptchaEnterpriseProvider instead. It's still free: Google
// Cloud projects without billing enabled automatically get the "Essentials"
// tier (10,000 assessments/month at no cost), which is plenty for this app.
// In local dev there's no real reCAPTCHA site key yet, so we register a
// debug token instead — Firebase prints a token to the browser console the
// first time the app runs; copy that into the Firebase console under
// App Check → your app → Manage debug tokens so requests aren't rejected.
// In production, set VITE_RECAPTCHA_SITE_KEY to a real reCAPTCHA Enterprise
// site key from Firebase console → App Check → your web app.
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-undef
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
export let appCheck = null;
try {
  // Unlike the old v3 provider, Enterprise has no universal "always passes"
  // test key, so in dev without a real site key yet we skip provider init
  // entirely and rely on the debug token alone (still set above).
  if (recaptchaSiteKey) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
} catch (e) {
  if (import.meta.env.DEV) console.warn('[firebase] App Check init skipped:', e);
}

// ─── Firebase AI Logic (Gemini Developer API backend — free tier) ─────────
// This calls Gemini directly from the browser through your own Firebase
// project, so there's no separate API key to manage — billing/quota is
// whatever's enabled on this Firebase project's Gemini Developer API.
export const ai = getAI(app, { backend: new GoogleAIBackend() });

export default app;
