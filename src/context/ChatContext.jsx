import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import {
  collection, addDoc, doc, writeBatch, query, where, orderBy, limit,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { PERSONAS, DEFAULT_PERSONA_ID, getPersona } from '../constants/personas';

const DEFAULT_SESSION_ID = 'default';

function openingMessageFor(personaId) {
  return {
    id: `opening_${personaId}`,
    text: getPersona(personaId).greeting,
    sender: 'atara',
    timestamp: new Date(),
    isOpening: true,
  };
}

function newSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const ChatContext = createContext({
  activePersonaId: DEFAULT_PERSONA_ID,
  setActivePersonaId: () => {},
  getPersonaMessages: () => [],
  getPersonaSessions: () => [],
  hasConversation: () => false,
  addMessage: async () => {},
  startNewChat: () => {},
  switchSession: () => {},
  deleteSession: async () => {},
  loading: true,
});

const ACTIVE_PERSONA_KEY = 'atara_active_persona';
const ACTIVE_SESSION_KEY = 'atara_active_session_by_persona';

export function ChatProvider({ children }) {
  // messagesByPersona holds ONLY real Firestore messages per persona — the
  // opening greeting is synthesized on read (see getPersonaMessages) so it
  // never has to be written, deleted, or migrated. Each message carries a
  // sessionId (see below) so past "chats" stay browsable instead of being
  // hidden or destroyed once a new one starts.
  const [messagesByPersona, setMessagesByPersona] = useState({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Which session is "live" for each persona right now — new messages get
  // tagged with this id, and it's what getPersonaMessages shows by default.
  // Messages written before this feature existed have no sessionId field at
  // all; those are bucketed under DEFAULT_SESSION_ID so old conversations
  // keep showing up exactly where they always did.
  const [activeSessionByPersona, setActiveSessionByPersona] = useState(() => {
    try {
      const raw = window.localStorage.getItem(ACTIVE_SESSION_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [activePersonaId, setActivePersonaIdState] = useState(() => {
    try {
      const raw = window.localStorage.getItem(ACTIVE_PERSONA_KEY);
      return raw && PERSONAS.some((p) => p.id === raw) ? raw : DEFAULT_PERSONA_ID;
    } catch {
      return DEFAULT_PERSONA_ID;
    }
  });

  const setActivePersonaId = (id) => {
    const safe = PERSONAS.some((p) => p.id === id) ? id : DEFAULT_PERSONA_ID;
    setActivePersonaIdState(safe);
    try { window.localStorage.setItem(ACTIVE_PERSONA_KEY, safe); } catch {}
  };

  useEffect(() => {
    if (!user) {
      setMessagesByPersona({});
      setLoading(false);
      return undefined;
    }

    // One query for every persona's history, same as before this feature
    // existed — a single onSnapshot per user rather than one per persona.
    // Bucketed client-side by `personaId`. Older messages, written before
    // personas existed, have no personaId field at all; those fall back to
    // "base" here, which is how existing conversations keep showing up
    // instead of appearing to vanish once this shipped.
    const q = query(
      collection(db, 'chatMessages'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(400)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const buckets = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        const personaId = PERSONAS.some((p) => p.id === data.personaId)
          ? data.personaId
          : DEFAULT_PERSONA_ID;
        (buckets[personaId] ||= []).push({
          id: d.id,
          text: data.text,
          sender: data.sender,
          sessionId: data.sessionId || DEFAULT_SESSION_ID,
          timestamp: data.createdAt?.toDate() || new Date(data.createdAt || Date.now()),
        });
      });
      setMessagesByPersona(buckets);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching chat messages:', error);
      setMessagesByPersona({});
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const activeSessionFor = (personaId) => activeSessionByPersona[personaId] || DEFAULT_SESSION_ID;

  // Newest-first in Firestore (matches the query order); callers want
  // oldest-first with the persona's greeting in front, scoped to whichever
  // session is currently active for that persona.
  const getPersonaMessages = (personaId) => {
    const real = messagesByPersona[personaId] || [];
    const activeSession = activeSessionFor(personaId);
    const inSession = real.filter((m) => m.sessionId === activeSession);
    const ordered = inSession.length > 0 ? [...inSession].reverse() : [];
    return [openingMessageFor(personaId), ...ordered];
  };

  // A browsable list of every past chat with a persona, most recent first,
  // so "New chat" never actually loses anything — it's just a way to start
  // a new thread while the old ones stay a click away.
  const getPersonaSessions = (personaId) => {
    const real = messagesByPersona[personaId] || [];
    const bySession = {};
    real.forEach((m) => {
      (bySession[m.sessionId] ||= []).push(m);
    });
    const activeSession = activeSessionFor(personaId);
    return Object.entries(bySession)
      .map(([sessionId, msgs]) => {
        const ordered = [...msgs].reverse();
        const firstUserMsg = ordered.find((m) => m.sender === 'user');
        return {
          id: sessionId,
          isActive: sessionId === activeSession,
          preview: (firstUserMsg || ordered[0])?.text || 'New chat',
          messageCount: ordered.length,
          lastTimestamp: ordered[ordered.length - 1].timestamp,
        };
      })
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  };

  const hasConversation = (personaId) =>
    Boolean(messagesByPersona[personaId] && messagesByPersona[personaId].length > 0);

  const addMessage = async (msg, personaId = activePersonaId) => {
    if (!user) return;
    if (msg.isOpening) return;

    await addDoc(collection(db, 'chatMessages'), {
      userId: user.uid,
      personaId,
      sessionId: activeSessionFor(personaId),
      text: msg.text,
      sender: msg.sender,
      createdAt: serverTimestamp(),
    });
  };

  const persistActiveSessions = (next) => {
    setActiveSessionByPersona(next);
    try { window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(next)); } catch {}
  };

  // Starts a fresh conversation with a persona: the greeting reappears and
  // a brand-new session id takes over, but the previous session's messages
  // are untouched in Firestore and stay reachable via getPersonaSessions /
  // switchSession.
  const startNewChat = (personaId = activePersonaId) => {
    persistActiveSessions({ ...activeSessionByPersona, [personaId]: newSessionId() });
  };

  // Makes a past (or the current) session the live one again for a persona
  // — viewing it and sending a new message both just work, continuing that
  // same thread.
  const switchSession = (personaId, sessionId) => {
    persistActiveSessions({ ...activeSessionByPersona, [personaId]: sessionId });
  };

  // Permanently removes one chat's messages from Firestore. The ids come
  // straight from what's already loaded client-side (messagesByPersona)
  // rather than a fresh query, since the messages are already bucketed by
  // sessionId locally and re-querying would need a composite index.
  const deleteSession = async (personaId, sessionId) => {
    const real = messagesByPersona[personaId] || [];
    const ids = real.filter((m) => m.sessionId === sessionId).map((m) => m.id);

    if (ids.length > 0) {
      const batch = writeBatch(db);
      ids.forEach((id) => batch.delete(doc(db, 'chatMessages', id)));
      await batch.commit();
    }

    // Deleting the session you're currently in leaves nothing to show —
    // start a fresh one so the chat doesn't keep pointing at a dead id.
    if (activeSessionFor(personaId) === sessionId) {
      persistActiveSessions({ ...activeSessionByPersona, [personaId]: newSessionId() });
    }
  };

  const value = useMemo(() => ({
    activePersonaId,
    setActivePersonaId,
    getPersonaMessages,
    getPersonaSessions,
    hasConversation,
    addMessage,
    startNewChat,
    switchSession,
    deleteSession,
    loading,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [activePersonaId, messagesByPersona, activeSessionByPersona, loading, user]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
