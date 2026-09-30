<div align="center">

# 🧠 Atara AI

**A mental health support platform that connects people with AI-assisted wellness tools and professional counselors.**

[![Live Demo](https://img.shields.io/badge/Live-Demo-2ea44f?style=for-the-badge&logo=netlify&logoColor=white)](https://atara-ai-website.netlify.app)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)

[Live Demo](https://atara-ai-website.netlify.app) · [Features](#-features) · [Getting Started](#-getting-started) · [Roadmap](#-roadmap)

</div>

---

## 📖 About

Atara AI is the **web companion to the Atara mobile app**. It makes emotional wellness and professional counseling more accessible, and it shares the same Firebase backend as the mobile app, so one account works on both.

It offers **two connected experiences** in one platform:

| Platform | Who it's for | What it does |
| --- | --- | --- |
| 👤 **User Platform** | Individuals seeking support | Mood tracking, journaling, goals, AI wellness chat, and counselor booking |
| 🧑‍⚕️ **Counselor Platform** | Professional counselors | Profile management, availability, appointments, and client communication |

Access is separated using **role-based authentication and protected routes**, so each person lands in the right experience.

> ⚠️ **Disclaimer:** Atara AI is a wellness support tool and is **not a substitute for professional medical advice, diagnosis, or emergency care**. If you or someone you know is in crisis, contact local emergency services or a qualified professional immediately.

---

## 📸 Screenshots

> <img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/314d70c3-6aa7-42cf-90e1-cc40e2ba7fda" />
. Put images in a `docs/screenshots/` folder, then uncomment and edit the block below.

<!--
<p align="center">
  <img src="docs/screenshots/dashboard.png" width="45%" alt="User dashboard" />
  <img src="docs/screenshots/chat.png" width="45%" alt="AI chat" />
</p>
<p align="center">
  <img src="docs/screenshots/booking.png" width="45%" alt="Appointment booking" />
  <img src="docs/screenshots/counselor.png" width="45%" alt="Counselor dashboard" />
</p>
-->

---

## ✨ Features

### 👤 User Platform

- **Account management** — sign up, log in, and manage your profile
- **Mood tracking** — log how you feel and view mood insights over time
- **Journaling** — write and manage personal journal entries
- **Goal setting** — set and track personal goals
- **AI wellness assistant** — chat with an AI-powered support companion that personalizes replies using your recent mood and journal activity
- **Discover** — browse mental health and wellness content
- **Find a counselor** — search counselors and view their profiles
- **Book appointments** — schedule and manage upcoming sessions
- **Messaging** — communicate with counselors

### 🧑‍⚕️ Counselor Platform

- **Counselor registration and login** through a dedicated authentication flow
- **Profile management** — maintain a professional profile
- **Availability** — set when you can take sessions
- **Appointments** — view and manage scheduled sessions
- **Messaging** — communicate with users
- **Counselor workspace** — a dedicated area for counseling-related activities

### 🔄 Shared with the mobile app

- **Same Firebase project** — sign up on web and log in on mobile with the same account, and vice versa
- **Moods and journal entries sync in real time** between web and mobile
- **Same AI logic** — the web and mobile apps use the same AI provider fallback chain (see below)

---

## 🤖 How the AI Chat Works

`src/services/aiService.js` tries several AI providers in order and moves to the next one if a provider fails or runs out of quota. This keeps the chat working even when one service is down.

```text
Firebase AI Logic (Gemini)  →  Groq  →  OpenRouter  →  Gemini REST API  →  Mock response
```

`src/services/userContext.js` builds a short summary of the user's recent mood, journal and goal data, which is added to the prompt so replies feel personal. The system prompt and safety instructions live in `src/constants/aiConfig.js`.

---

## 🏗️ Architecture

```text
                    ATARA AI
                       │
             ┌─────────┴─────────┐
             │                   │
        USER PLATFORM       COUNSELOR PLATFORM
             │                   │
       ┌─────┼─────┐       ┌─────┼─────┐
       │     │     │       │     │     │
      Mood  Chat  Journal  Profile Appointments
       │     │     │       │     │     │
       └─────┴─────┘       └─────┴─────┘
             │                   │
             └─────────┬─────────┘
                       │
                    Firebase
                       │
              Authentication + Firestore
                       │
              (shared with mobile app)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React (plain JavaScript, no TypeScript), Vite |
| **Routing** | React Router |
| **Styling** | Plain CSS, one `.css` file per page or component, no utility framework |
| **Authentication** | Firebase Authentication |
| **Database** | Cloud Firestore |
| **Access control** | Firestore Security Rules, role-based protected routes |
| **AI** | Firebase AI Logic (Gemini), Groq, OpenRouter, Gemini API |
| **Hosting** | Netlify |
| **Tooling** | Git, GitHub, VS Code, npm |

---

## 📁 Project Structure

```text
Atara-AI-Website/
├── public/                     # Logo assets (logo-icon.png, logo-full.png)
├── src/
│   ├── components/             # AppShell (navigation), AuthGate, RoleProtectedRoute, ...
│   ├── constants/              # theme.js, aiConfig.js, availability.js, personas.js, ...
│   ├── context/                # Auth, Mood, Journal, Goal, Chat, Counselor providers
│   ├── pages/                  # One .jsx + .css per page
│   │   ├── Landing / Login / Register
│   │   ├── Dashboard / Mood / Journal / Goals / Chat
│   │   ├── BookAppointment.jsx
│   │   ├── CounselorDashboard.jsx
│   │   ├── CounselorProfile.jsx
│   │   ├── CounselorAppointments.jsx
│   │   ├── CounselorAvailability.jsx
│   │   └── CounselorChat.jsx
│   ├── services/               # aiService.js, userContext.js
│   ├── styles/global.css       # CSS variables (colors, fonts, shadows) + resets
│   ├── firebase.js             # Firebase initialization
│   ├── App.jsx                 # Routes (React Router)
│   └── main.jsx                # React entry point
├── .env.example                # Environment variable template
├── firebase.json
├── firestore.rules             # Database security rules
├── firestore.indexes.json
├── vite.config.js
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (comes with Node.js)
- [Git](https://git-scm.com/)

Check your installs:

```bash
node --version
npm --version
git --version
```

### 1. Clone the repository

```bash
git clone https://github.com/calebannom/Atara-AI-Website.git
cd Atara-AI-Website
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root from the provided template.

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Then fill in your own values. Every variable must start with `VITE_`, otherwise Vite will not load it:

```env
# Firebase
VITE_FIREBASE_API_KEY=your_value
VITE_FIREBASE_AUTH_DOMAIN=your_value
VITE_FIREBASE_PROJECT_ID=your_value
VITE_FIREBASE_STORAGE_BUCKET=your_value
VITE_FIREBASE_MESSAGING_SENDER_ID=your_value
VITE_FIREBASE_APP_ID=your_value

# AI providers (you only need one to get the chat working)
VITE_GROQ_API_KEY=your_value
VITE_OPENROUTER_API_KEY=your_value
VITE_GEMINI_API_KEY=your_value
```

> 🔒 **Never commit your `.env` file.** It is already listed in `.gitignore`.

### 4. Configure Firebase

Create your own Firebase project, enable **Authentication** and **Cloud Firestore**, and add the credentials from step 3. The repository includes the configuration you need:

- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`

Deploy the rules so your data is protected (requires the [Firebase CLI](https://firebase.google.com/docs/cli)):

```bash
firebase deploy --only firestore:rules
```

### 5. Run the app

```bash
npm run dev
```

Open the local address shown in your terminal (usually `http://localhost:5173`).

---

## 🏭 Build and Deploy

**Create a production build:**

```bash
npm run build
```

Output goes to the `dist/` folder. To preview it locally:

```bash
npm run preview
```

**Deploying to Netlify:**

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |

Add your environment variables in the Netlify dashboard under **Site settings → Environment variables** instead of committing them.

---

## 🔐 Security

- Authentication is handled by **Firebase Authentication**
- Database access is controlled with **Firestore Security Rules**
- Routes are protected by **user role** (user vs. counselor)
- `.env` is excluded from version control, so secrets stay out of the repository
- Only commit `.env.example` with placeholder values

> **Note on client-side keys:** Vite exposes any `VITE_`-prefixed variable in the browser bundle. Firebase web config values are designed to be public (your Security Rules protect the data), but third-party AI keys (Groq, OpenRouter, Gemini) should ideally be called through a server-side proxy, such as a serverless function, in production so they are never shipped to the browser.

---

## ⚠️ Known Limitations

- **Goals are local-only** — they are not yet saved to Firestore, so goals set on one device will not appear on another.
- **AI keys run client-side** — see the security note above.

---

## 🗺️ Roadmap

- [ ] Sync goals to Firestore across web and mobile
- [ ] Move AI calls behind a serverless proxy
- [ ] Enhanced AI personalization
- [ ] Counselor verification
- [ ] Video counseling
- [ ] Notifications and reminders
- [ ] Advanced analytics and wellness insights
- [ ] Accessibility improvements
- [ ] Additional security and privacy hardening

---

## 👨‍💻 Author

**Caleb Annom**
BSc Computer Science, KNUST

[![GitHub](https://img.shields.io/badge/GitHub-calebannom-181717?style=flat&logo=github)](https://github.com/calebannom)

---

## 📄 License

This project is licensed under the terms in the repository's [`LICENSE`](LICENSE) file.
