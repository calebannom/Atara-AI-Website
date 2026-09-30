import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, ROLE } from './AuthContext';
import { db } from '../firebase';
import {
  collection, addDoc, query, where, orderBy, doc, getDoc, getDocs,
  updateDoc, deleteDoc, serverTimestamp, onSnapshot, runTransaction, limit,
} from 'firebase/firestore';
import { generateSlotsForDay } from '../constants/availability';

const AppointmentContext = createContext({
  userAppointments: [],
  counselorAppointments: [],
  loading: true,

  getAvailableSlots: async () => [],
  bookAppointment: async () => '',
  cancelAppointment: async () => {},
  completeAppointment: async () => {},

  getAppointmentMessages: () => [],
  subscribeToAppointmentMessages: () => () => {},
  sendAppointmentMessage: async () => {},
});

// A serverTimestamp() reads back as null on the sender's own device until
// the write round-trips, so fall back to the locally stamped _sort to keep
// a just-sent message at the bottom of the thread.
const messageTime = (m) =>
  m?.createdAt?.toMillis?.() ?? (typeof m?._sort === 'number' ? m._sort : 0);

function slotId(counselorId, dateStr, time) {
  return `${counselorId}__${dateStr}__${time}`;
}

export function AppointmentProvider({ children }) {
  const { user, loading: authLoading, role } = useAuth();

  const [userAppointments, setUserAppointments] = useState([]);
  const [counselorAppointments, setCounselorAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesByAppointment, setMessagesByAppointment] = useState({});
  // Reference-counted live listeners, one per appointment thread. Held in a
  // ref so subscribeToAppointmentMessages can keep a stable identity.
  const messageListeners = useRef({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setUserAppointments([]);
      setCounselorAppointments([]);
      setLoading(false);
      Object.values(messageListeners.current).forEach((entry) => entry.unsub?.());
      messageListeners.current = {};
      setMessagesByAppointment({});
      return;
    }

    const qUser = query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
    );
    const unsubUser = onSnapshot(qUser, (snap) => {
      setUserAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      if (import.meta.env.DEV) console.warn('[appointments] user query error:', err);
      setLoading(false);
    });

    let unsubCounselor = null;
    if (role === ROLE.COUNSELOR) {
      const qCounselor = query(
        collection(db, 'appointments'),
        where('counselorId', '==', user.uid),
        orderBy('date', 'desc'),
      );
      unsubCounselor = onSnapshot(qCounselor, (snap) => {
        setCounselorAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }, (err) => {
        if (import.meta.env.DEV) console.warn('[appointments] counselor query error:', err);
      });
    } else {
      setCounselorAppointments([]);
    }

    return () => {
      unsubUser();
      if (typeof unsubCounselor === 'function') unsubCounselor();
    };
  }, [user, authLoading, role]);

  // Reads a counselor's weekly availability + already-booked slots for one
  // date, and returns the open time slots. A plain one-off read (not
  // realtime) — good enough for a booking page the user is actively on.
  const getAvailableSlots = async (counselorId, dateStr, availability) => {
    const bookedQuery = query(
      collection(db, 'bookedSlots'),
      where('counselorId', '==', counselorId),
      where('date', '==', dateStr),
    );
    const snap = await getDocs(bookedQuery);
    const bookedTimes = snap.docs.map((d) => d.data().time);
    return generateSlotsForDay(availability, dateStr, bookedTimes);
  };

  const bookAppointment = async ({ counselorId, counselorName, date, time, subject, anonymous }) => {
    if (!user) throw new Error('Not signed in');
    const id = slotId(counselorId, date, time);
    const slotRef = doc(db, 'bookedSlots', id);
    const apptRef = doc(collection(db, 'appointments'));

    await runTransaction(db, async (tx) => {
      const slotSnap = await tx.get(slotRef);
      if (slotSnap.exists()) {
        throw new Error('That time was just booked by someone else — please pick another slot.');
      }
      tx.set(slotRef, {
        counselorId,
        date,
        time,
        userId: user.uid,
        appointmentId: apptRef.id,
      });
      tx.set(apptRef, {
        userId: user.uid,
        userDisplayName: anonymous ? null : (user.displayName || 'User'),
        anonymous: anonymous !== false,
        counselorId,
        counselorName: counselorName || 'Counselor',
        date,
        time,
        slotId: id,
        subject: (subject || '').trim().slice(0, 200),
        status: 'confirmed',
        createdAt: serverTimestamp(),
      });
    });

    return apptRef.id;
  };

  const cancelAppointment = async (appointmentId) => {
    const apptSnap = await getDoc(doc(db, 'appointments', appointmentId));
    if (!apptSnap.exists()) return;
    const appt = apptSnap.data();
    await updateDoc(doc(db, 'appointments', appointmentId), { status: 'cancelled' });
    if (appt.slotId) {
      try {
        await deleteDoc(doc(db, 'bookedSlots', appt.slotId));
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[appointments] slot cleanup error:', e);
      }
    }
  };

  const completeAppointment = async (appointmentId) => {
    await updateDoc(doc(db, 'appointments', appointmentId), { status: 'completed' });
  };

  // Same contract as the counselor-ticket subscription: stable identity via
  // useCallback plus a ref-held, reference-counted listener. When this was a
  // plain function stored in state, the consuming effect re-ran on every
  // provider render, its cleanup cancelled the listener, and the re-subscribe
  // returned the already-cancelled unsubscribe rather than opening a new
  // one — leaving the session chat with no live updates at all.
  const subscribeToAppointmentMessages = useCallback((appointmentId) => {
    if (!appointmentId) return () => {};

    let entry = messageListeners.current[appointmentId];
    if (!entry) {
      entry = { count: 0, unsub: null };
      messageListeners.current[appointmentId] = entry;
      const q = query(
        collection(db, 'appointments', appointmentId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(500),
      );
      entry.unsub = onSnapshot(q, (snap) => {
        const msgs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => messageTime(a) - messageTime(b));
        setMessagesByAppointment((prev) => ({ ...prev, [appointmentId]: msgs }));
      }, (err) => {
        console.warn('[appointments] messages error:', err);
      });
    }
    entry.count += 1;

    let released = false;
    return () => {
      if (released) return;
      released = true;
      const current = messageListeners.current[appointmentId];
      if (!current) return;
      current.count -= 1;
      if (current.count <= 0) {
        current.unsub?.();
        delete messageListeners.current[appointmentId];
      }
    };
  }, []);

  const getAppointmentMessages = (appointmentId) => messagesByAppointment[appointmentId] || [];

  const sendAppointmentMessage = async (appointmentId, text, senderRole) => {
    if (!user || !text?.trim()) return;
    await addDoc(collection(db, 'appointments', appointmentId, 'messages'), {
      sender: senderRole,
      senderId: user.uid,
      senderName: user.displayName || (senderRole === 'counselor' ? 'Counselor' : 'User'),
      text: text.trim().slice(0, 4000),
      createdAt: serverTimestamp(),
      _sort: Date.now(),
    });
  };

  return (
    <AppointmentContext.Provider value={{
      userAppointments,
      counselorAppointments,
      loading: loading || authLoading,
      getAvailableSlots,
      bookAppointment,
      cancelAppointment,
      completeAppointment,
      getAppointmentMessages,
      subscribeToAppointmentMessages,
      sendAppointmentMessage,
    }}>
      {children}
    </AppointmentContext.Provider>
  );
}

export const useAppointments = () => useContext(AppointmentContext);
