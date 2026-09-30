import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import {
  collection, addDoc, query, where, orderBy, limit,
  getDocs, onSnapshot, serverTimestamp,
} from 'firebase/firestore';

const ReviewContext = createContext({
  myReviewedAppointmentIds: [],
  submitReview: async () => {},
  getCounselorReviews: async () => ({ avg: null, count: 0, reviews: [] }),
});

export function ReviewProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [myReviewedAppointmentIds, setMyReviewedAppointmentIds] = useState([]);

  // Tracks which of the current user's own appointments already have a
  // review, so the UI can hide the "rate this session" prompt once done.
  useEffect(() => {
    if (authLoading || !user) {
      setMyReviewedAppointmentIds([]);
      return;
    }
    const q = query(collection(db, 'reviews'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setMyReviewedAppointmentIds(snap.docs.map((d) => d.data().appointmentId));
    }, (err) => {
      if (import.meta.env.DEV) console.warn('[reviews] my reviews error:', err);
    });
    return unsub;
  }, [user, authLoading]);

  const submitReview = async ({ appointmentId, counselorId, counselorName, rating, comment, anonymous }) => {
    if (!user) throw new Error('Not signed in');
    await addDoc(collection(db, 'reviews'), {
      appointmentId,
      userId: user.uid,
      userDisplayName: anonymous ? null : (user.displayName || 'User'),
      anonymous: anonymous !== false,
      counselorId,
      counselorName: counselorName || 'Counselor',
      rating: Math.max(1, Math.min(5, Math.round(rating))),
      comment: (comment || '').trim().slice(0, 800),
      createdAt: serverTimestamp(),
    });
  };

  // One-off read (not realtime) — used by the counselor profile page.
  // Small dataset assumption: pulls up to 200 reviews for a counselor to
  // compute an accurate average + show the most recent comments, rather
  // than maintaining a separate stored aggregate (which would need a
  // Cloud Function to update safely across users).
  const getCounselorReviews = async (counselorId) => {
    const snap = await getDocs(query(
      collection(db, 'reviews'),
      where('counselorId', '==', counselorId),
      orderBy('createdAt', 'desc'),
      limit(200)
    ));
    const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const count = reviews.length;
    const avg = count === 0 ? null : reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / count;
    return { avg, count, reviews: reviews.slice(0, 10) };
  };

  return (
    <ReviewContext.Provider value={{ myReviewedAppointmentIds, submitReview, getCounselorReviews }}>
      {children}
    </ReviewContext.Provider>
  );
}

export const useReviews = () => useContext(ReviewContext);
