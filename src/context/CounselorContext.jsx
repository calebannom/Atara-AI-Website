import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, ROLE } from './AuthContext';
import { db } from '../firebase';
import {
  collection, addDoc, query, where, orderBy, limit,
  doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot,
  getDocs, writeBatch,
} from 'firebase/firestore';
import { normalizeAvailability } from '../constants/availability';

const CounselorContext = createContext({
  userTickets: [],
  createTicket: async () => '',
  getUserTicketMessages: () => [],
  sendUserMessage: async () => {},
  closeUserTicket: async () => {},

  isCounselor: false,
  isAdmin: false,
  allTickets: [],
  claimTicket: async () => {},
  sendCounselorMessage: async () => {},
  closeTicketAsCounselor: async () => {},
  subscribeToTicketMessages: () => () => {},
  getTicketById: () => null,

  anonymousMode: true,
  toggleAnonymousMode: () => {},

  pendingApplications: [],
  approvedCounselors: [],
  rejectedApplications: [],
  approveCounselor: async () => {},
  rejectCounselor: async () => {},

  counselors: [],
  counselorsError: null,
  getCounselorProfile: () => null,
  updateAvailability: async () => {},
  syncMissingCounselorProfiles: async () => ({ synced: 0, checked: 0 }),

  loading: true,
});

const ANONYMOUS_CODE_LEN = 8;
const generateAnonymousCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < ANONYMOUS_CODE_LEN; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const ANON_MODE_KEY = 'atara_anon_mode';

// Messages are queried by createdAt, but a serverTimestamp() is still null
// on the sender's own device until the write round-trips. Falling back to
// the locally-stamped _sort keeps a just-sent message in its true place at
// the bottom of the thread instead of jumping to the top for a moment.
const messageTime = (m) =>
  m?.createdAt?.toMillis?.() ?? (typeof m?._sort === 'number' ? m._sort : 0);

export function CounselorProvider({ children }) {
  const { user, loading: authLoading, isAdmin: authIsAdmin, isCounselor: authIsCounselor, role } = useAuth();

  const isCounselor = authIsCounselor;
  const isAdmin = authIsAdmin;

  const [userTickets, setUserTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [approvedCounselors, setApprovedCounselors] = useState([]);
  const [rejectedApplications, setRejectedApplications] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [counselorsError, setCounselorsError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesByTicket, setMessagesByTicket] = useState({});
  // One live Firestore listener per open ticket thread, reference-counted so
  // several components can watch the same thread. Deliberately a ref, not
  // state: see subscribeToTicketMessages below.
  const ticketListeners = useRef({});
  const [anonymousMode, setAnonymousMode] = useState(() => {
    try {
      const raw = window.localStorage.getItem(ANON_MODE_KEY);
      return raw == null ? true : raw === 'true';
    } catch {
      return true;
    }
  });

  const toggleAnonymousMode = () => {
    setAnonymousMode((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(ANON_MODE_KEY, String(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setUserTickets([]);
      setAllTickets([]);
      setPendingApplications([]);
      setApprovedCounselors([]);
      setRejectedApplications([]);
      setCounselors([]);
      setLoading(false);
      Object.values(ticketListeners.current).forEach((entry) => entry.unsub?.());
      ticketListeners.current = {};
      setMessagesByTicket({});
      return;
    }

    let cancelled = false;
    const userId = user.uid;

    const qUser = query(
      collection(db, 'counselorTickets'),
      where('userId', '==', userId),
      orderBy('lastMessageAt', 'desc')
    );
    const unsubUser = onSnapshot(qUser, (snap) => {
      setUserTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      if (!cancelled) setLoading(false);
    }, (err) => {
      if (import.meta.env.DEV) console.warn('[counselor] user tickets error:', err);
      if (!cancelled) setLoading(false);
    });

    const qAll = query(
      collection(db, 'counselorTickets'),
      orderBy('lastMessageAt', 'desc'),
      limit(200)
    );
    const unsubAll = onSnapshot(qAll, (snap) => {
      setAllTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => {
      if (import.meta.env.DEV) console.warn('[counselor] all tickets error:', err);
    });

    let unsubPending = null;
    let unsubApproved = null;
    let unsubRejected = null;
    if (role === ROLE.ADMIN) {
      // NOTE: the stored Firestore field is always role:'user' plus
      // counselorApplication.status:'pending' — 'pending_counselor' is a
      // role that only ever exists client-side (see resolveEffectiveRole
      // in AuthContext), so it must never be used as a query filter here.
      const sortByRequestedAt = (a, b) => {
        const ta = a.requestedAt?.toMillis?.() ?? a.counselorApplication?.submittedAt?.toMillis?.() ?? 0;
        const tb = b.requestedAt?.toMillis?.() ?? b.counselorApplication?.submittedAt?.toMillis?.() ?? 0;
        return tb - ta;
      };

      const qPending = query(
        collection(db, 'users'),
        where('counselorApplication.status', '==', 'pending'),
        limit(200)
      );
      unsubPending = onSnapshot(qPending, (snap) => {
        setPendingApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(sortByRequestedAt));
      }, (err) => {
        if (import.meta.env.DEV) console.warn('[counselor] pending apps error:', err);
      });

      const qApproved = query(
        collection(db, 'users'),
        where('role', '==', ROLE.COUNSELOR),
        limit(200)
      );
      unsubApproved = onSnapshot(qApproved, (snap) => {
        setApprovedCounselors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }, (err) => {
        if (import.meta.env.DEV) console.warn('[counselor] approved counselors error:', err);
      });

      const qRejected = query(
        collection(db, 'users'),
        where('counselorApplication.status', '==', 'rejected'),
        limit(200)
      );
      unsubRejected = onSnapshot(qRejected, (snap) => {
        setRejectedApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(sortByRequestedAt));
      }, (err) => {
        if (import.meta.env.DEV) console.warn('[counselor] rejected apps error:', err);
      });
    } else {
      setPendingApplications([]);
      setApprovedCounselors([]);
      setRejectedApplications([]);
    }

    return () => {
      cancelled = true;
      unsubUser();
      unsubAll();
      if (typeof unsubPending === 'function') unsubPending();
      if (typeof unsubApproved === 'function') unsubApproved();
      if (typeof unsubRejected === 'function') unsubRejected();
    };
  }, [user, authLoading, role]);

  // Public counselor directory (for "Find a Counselor" search + profile pages).
  // Backed by its own collection so the users/{uid} collection — which holds
  // email and other private fields — never has to be opened up for reads.
  useEffect(() => {
    if (authLoading || !user) return;
    setCounselorsError(null);
    const q = query(collection(db, 'counselorProfiles'), orderBy('displayName'));
    const unsub = onSnapshot(q, (snap) => {
      setCounselors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCounselorsError(null);
    }, (err) => {
      // Surface this even in production: a silent failure here (e.g. from
      // firestore.rules never having been deployed to the live project)
      // was previously indistinguishable from "no counselors yet", which
      // made the empty-directory bug impossible to diagnose from the UI.
      console.warn('[counselor] directory error:', err);
      setCounselors([]);
      setCounselorsError(err?.code || 'unknown-error');
    });
    return unsub;
  }, [user, authLoading]);

  // Self-healing sync: whenever the signed-in user is an approved counselor,
  // make sure their public directory doc reflects their current profile.
  // This also backfills a directory entry for counselors approved before
  // this feature existed — no manual migration needed.
  useEffect(() => {
    if (authLoading || !user || role !== ROLE.COUNSELOR) return;
    setDoc(doc(db, 'counselorProfiles', user.uid), {
      displayName: user.displayName || 'Counselor',
      specialization: user.specialization || '',
      yearsExperience: user.yearsExperience ?? null,
      bio: user.bio || '',
      photoURL: user.photoURL || '',
      updatedAt: serverTimestamp(),
    }, { merge: true }).catch((err) => {
      if (import.meta.env.DEV) console.warn('[counselor] profile sync error:', err);
    });
  }, [user, authLoading, role]);

  const getCounselorProfile = (id) => counselors.find((c) => c.id === id) || null;

  // Admin utility: some counselor accounts get their role flipped directly
  // in the Firestore console (bypassing the in-app approve flow), and the
  // public directory doc only self-heals once that counselor next logs in.
  // This lets an admin backfill any missing directory entries on demand,
  // instead of waiting on that login.
  const syncMissingCounselorProfiles = async () => {
    if (role !== ROLE.ADMIN) throw new Error('Admins only');
    const usersSnap = await getDocs(
      query(collection(db, 'users'), where('role', '==', ROLE.COUNSELOR))
    );
    const counselorUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const existingIds = new Set(counselors.map((c) => c.id));
    const missing = counselorUsers.filter((u) => !existingIds.has(u.id));

    if (missing.length === 0) {
      return { synced: 0, checked: counselorUsers.length };
    }

    const batch = writeBatch(db);
    missing.forEach((u) => {
      batch.set(doc(db, 'counselorProfiles', u.id), {
        displayName: u.displayName || 'Counselor',
        specialization: u.specialization || '',
        yearsExperience: u.yearsExperience ?? null,
        bio: u.bio || '',
        photoURL: u.photoURL || '',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();

    return { synced: missing.length, checked: counselorUsers.length };
  };

  // Saves the counselor's weekly availability to their public directory
  // doc — the exact same /counselorProfiles/{uid} document the patient-side
  // search, profile and booking pages already read from, so a save is
  // visible to patients as soon as their directory listener fires.
  const updateAvailability = async (availability) => {
    if (!user) throw new Error('Not signed in');
    if (role !== ROLE.COUNSELOR && role !== ROLE.ADMIN) throw new Error('Counselors only');

    const normalized = normalizeAvailability(availability);
    const existing = getCounselorProfile(user.uid);

    await setDoc(doc(db, 'counselorProfiles', user.uid), {
      // The directory listener sorts on displayName, and Firestore drops
      // documents that are missing the field being ordered by. A merge that
      // wrote availability alone would therefore create (or leave) a doc
      // that no patient — and not even this counselor's own editor — could
      // ever read back, which looked exactly like "it didn't save".
      displayName: existing?.displayName || user.displayName || 'Counselor',
      specialization: existing?.specialization ?? (user.specialization || ''),
      yearsExperience: existing?.yearsExperience ?? user.yearsExperience ?? null,
      bio: existing?.bio ?? (user.bio || ''),
      photoURL: existing?.photoURL ?? (user.photoURL || ''),
      availability: normalized,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return normalized;
  };

  const createTicket = async (opts = {}) => {
    if (!user) throw new Error('Not signed in');
    const now = serverTimestamp();
    const nowLocal = Date.now();
    const ref = await addDoc(collection(db, 'counselorTickets'), {
      userId: user.uid,
      anonymousCode: generateAnonymousCode(),
      status: 'open',
      claimedBy: null,
      claimedByName: null,
      subject: (opts.subject || '').trim().slice(0, 120),
      initialMood: opts.initialMood || '',
      priority: opts.priority || 'normal',
      requestedCounselorId: opts.requestedCounselorId || null,
      requestedCounselorName: opts.requestedCounselorName || null,
      createdAt: now,
      lastMessageAt: now,
      messageCount: 1,
      closedAt: null,
      anonymous: opts.anonymous !== false,
    });

    const introText = (opts.introText || '').trim().slice(0, 2000);
    const greeting = opts.requestedCounselorName
      ? `Hi ${opts.requestedCounselorName} — I'd like to talk to you specifically.`
      : `Hi — I'd like to talk to someone.`;
    const firstMsg = introText
      ? `${greeting}${opts.subject ? `\n\nSubject: ${opts.subject}` : ''}${opts.initialMood ? `\n\nRight now I'm feeling: ${opts.initialMood}` : ''}\n\n${introText}`
      : `${greeting}${opts.subject ? `\n\nSubject: ${opts.subject}` : ''}${opts.initialMood ? `\n\nRight now I'm feeling: ${opts.initialMood}` : ''}`;

    await addDoc(collection(db, 'counselorTickets', ref.id, 'messages'), {
      sender: 'user',
      senderId: user.uid,
      senderName: null,
      text: firstMsg,
      createdAt: now,
      _sort: nowLocal,
    });

    return ref.id;
  };

  // Subscribing has to be idempotent AND its identity has to be stable.
  //
  // This previously kept the unsubscribe functions in React state and
  // returned an already-registered one on a repeat call. Because the
  // function itself was re-created on every provider render, the effects
  // that depend on it (the patient chat and the counselor desk both list
  // it in their dependency array) re-ran constantly: the cleanup tore the
  // listener down, and the immediate re-subscribe handed back that very
  // same, already-cancelled unsubscribe without opening a new listener.
  // From then on nobody was listening, so a counselor's reply never
  // reached the patient's open thread — the message was in Firestore, but
  // the patient's screen was frozen on the last snapshot it happened to
  // receive. useCallback([]) + a ref keeps one real listener alive for as
  // long as at least one caller still wants it.
  const subscribeToTicketMessages = useCallback((ticketId) => {
    if (!ticketId) return () => {};

    let entry = ticketListeners.current[ticketId];
    if (!entry) {
      entry = { count: 0, unsub: null };
      ticketListeners.current[ticketId] = entry;
      const q = query(
        collection(db, 'counselorTickets', ticketId, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(300)
      );
      entry.unsub = onSnapshot(q, (snap) => {
        const msgs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => messageTime(a) - messageTime(b));
        setMessagesByTicket((prev) => ({ ...prev, [ticketId]: msgs }));
      }, (err) => {
        console.warn('[counselor] messages error:', err);
      });
    }
    entry.count += 1;

    let released = false;
    return () => {
      if (released) return;
      released = true;
      const current = ticketListeners.current[ticketId];
      if (!current) return;
      current.count -= 1;
      if (current.count <= 0) {
        current.unsub?.();
        delete ticketListeners.current[ticketId];
      }
    };
  }, []);

  const getUserTicketMessages = (ticketId) => messagesByTicket[ticketId] || [];
  const getTicketById = (id) => allTickets.find((t) => t.id === id) || userTickets.find((t) => t.id === id) || null;

  const sendUserMessage = async (ticketId, text) => {
    if (!user || !ticketId || !text?.trim()) return;
    const now = serverTimestamp();
    const nowLocal = Date.now();
    await addDoc(collection(db, 'counselorTickets', ticketId, 'messages'), {
      sender: 'user',
      senderId: user.uid,
      senderName: null,
      text: text.trim().slice(0, 4000),
      createdAt: now,
      _sort: nowLocal,
    });
    await updateDoc(doc(db, 'counselorTickets', ticketId), {
      lastMessageAt: now,
      messageCount: (getTicketById(ticketId)?.messageCount || 0) + 1,
    });
  };

  const claimTicket = async (ticketId) => {
    if (!user || !isCounselor) throw new Error('Not authorized');
    const name = user.displayName || 'Counselor';
    await updateDoc(doc(db, 'counselorTickets', ticketId), {
      status: 'claimed',
      claimedBy: user.uid,
      claimedByName: name,
    });
  };

  const sendCounselorMessage = async (ticketId, text) => {
    if (!user || !isCounselor || !ticketId || !text?.trim()) return;
    const now = serverTimestamp();
    const nowLocal = Date.now();
    const ticket = getTicketById(ticketId);

    if (ticket && ticket.status === 'open') {
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'counselorTickets', ticketId, 'messages')), {
        sender: 'counselor',
        senderId: user.uid,
        senderName: user.displayName || 'Counselor',
        text: text.trim().slice(0, 4000),
        createdAt: now,
        _sort: nowLocal,
      });
      batch.update(doc(db, 'counselorTickets', ticketId), {
        status: 'claimed',
        claimedBy: user.uid,
        claimedByName: user.displayName || 'Counselor',
        lastMessageAt: now,
        messageCount: (ticket.messageCount || 0) + 1,
      });
      await batch.commit();
    } else {
      await addDoc(collection(db, 'counselorTickets', ticketId, 'messages'), {
        sender: 'counselor',
        senderId: user.uid,
        senderName: user.displayName || 'Counselor',
        text: text.trim().slice(0, 4000),
        createdAt: now,
        _sort: nowLocal,
      });
      await updateDoc(doc(db, 'counselorTickets', ticketId), {
        lastMessageAt: now,
        messageCount: (ticket?.messageCount || 0) + 1,
      });
    }
  };

  const closeUserTicket = async (ticketId) => {
    if (!user) return;
    await updateDoc(doc(db, 'counselorTickets', ticketId), {
      status: 'closed',
      closedAt: serverTimestamp(),
    });
  };

  const closeTicketAsCounselor = async (ticketId) => {
    if (!user || !isCounselor) return;
    await updateDoc(doc(db, 'counselorTickets', ticketId), {
      status: 'closed',
      closedAt: serverTimestamp(),
    });
  };

  const approveCounselor = async (userId) => {
    if (!isAdmin || !user) throw new Error('Admin only');
    const applicantSnap = await getDoc(doc(db, 'users', userId));
    const applicant = applicantSnap.exists() ? applicantSnap.data() : {};

    const batch = writeBatch(db);
    batch.update(doc(db, 'users', userId), {
      role: ROLE.COUNSELOR,
      isCounselor: true,
      approvedAt: serverTimestamp(),
      approvedBy: user.uid,
      approvedByName: user.displayName || 'Admin',
    });
    // Publish the directory entry immediately so the counselor is
    // searchable right away, rather than waiting on their next login.
    batch.set(doc(db, 'counselorProfiles', userId), {
      displayName: applicant.displayName || 'Counselor',
      specialization: applicant.specialization || applicant.counselorApplication?.specialization || '',
      yearsExperience: applicant.yearsExperience ?? applicant.counselorApplication?.yearsExperience ?? null,
      bio: applicant.bio || applicant.counselorApplication?.bio || '',
      photoURL: applicant.photoURL || '',
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await batch.commit();
  };

  const rejectCounselor = async (userId, reason = '') => {
    if (!isAdmin || !user) throw new Error('Admin only');
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', userId), {
      role: ROLE.USER,
      isCounselor: false,
      rejectedAt: serverTimestamp(),
      rejectedBy: user.uid,
      rejectedReason: reason || '',
    });
    // Pull them out of the public directory too, in case they were ever
    // approved before and are being reverted (e.g. suspension via reject).
    batch.delete(doc(db, 'counselorProfiles', userId));
    await batch.commit();
  };

  return (
    <CounselorContext.Provider value={{
      userTickets,
      createTicket,
      getUserTicketMessages,
      sendUserMessage,
      closeUserTicket,
      isCounselor,
      isAdmin,
      allTickets,
      claimTicket,
      sendCounselorMessage,
      closeTicketAsCounselor,
      subscribeToTicketMessages,
      getTicketById,
      anonymousMode,
      toggleAnonymousMode,
      pendingApplications,
      approvedCounselors,
      rejectedApplications,
      approveCounselor,
      rejectCounselor,
      counselors,
      counselorsError,
      getCounselorProfile,
      updateAvailability,
      syncMissingCounselorProfiles,
      loading: loading || authLoading,
    }}>
      {children}
    </CounselorContext.Provider>
  );
}

export const useCounselor = () => useContext(CounselorContext);
