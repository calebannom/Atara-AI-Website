# Atara — Web (React + Vite, plain JS)

The web companion to the Atara mobile app — built with **HTML, CSS,
JavaScript, and React** (via Vite), sharing the same Firebase backend as the
mobile app (same users, moods, journal entries).

## Tech stack

- **React** (plain JavaScript, no TypeScript) — UI components
- **Vite** — build tool / dev server
- **React Router** — page routing (since Vite doesn't have Next.js's
  file-based routing built in)
- **Plain CSS** — one `.css` file per page/component, no utility framework
- **Firebase** — same project as mobile (`atara-70f4d`)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the env example and add your real keys (same ones from your mobile
   app's `.env`, just re-pasted here with the `VITE_` prefix):
   ```bash
   cp .env.example .env
   ```
   Then edit `.env`:
   ```
   VITE_GROQ_API_KEY=your_real_groq_key
   VITE_OPENROUTER_API_KEY=your_real_openrouter_key
   VITE_GEMINI_API_KEY=your_real_gemini_key
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```
   Open the URL it prints (usually http://localhost:5173)

## What's shared with the mobile app

- **Same Firebase project** — sign up on web, log in on mobile with the
  same account, and vice versa.
- **Moods and journal entries sync in real time** between web and mobile.
- **Same AI logic** — `src/services/aiService.js` and
  `src/services/userContext.js` carry the same Groq → OpenRouter → Gemini →
  mock fallback chain as the mobile app.

## What's NOT yet shared

- **Goals** are local-only on both mobile and web (not saved to Firestore
  yet) — so goals set on one device won't appear on the other.

## Project structure

```
src/
  main.jsx           — React entry point
  App.jsx            — routes (React Router)
  firebase.js        — Firebase config (same project as mobile)
  context/           — Auth/Mood/Journal/Goal/Chat context providers
  services/           — aiService.js, userContext.js
  constants/          — theme.js (mood colors/emojis), aiConfig.js (system prompt)
  components/         — AppShell (sidebar/nav), AuthGate (route protection)
  pages/              — one .jsx + .css per page (Landing, Login, Register,
                         Dashboard, Mood, Journal, Goals, Chat)
  styles/global.css   — CSS variables (colors, fonts, shadows) + resets
public/
  logo-icon.png, logo-full.png — your Atara logo assets
```
