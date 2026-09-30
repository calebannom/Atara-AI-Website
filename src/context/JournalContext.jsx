import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import {
  collection, addDoc, query, where, orderBy,
  doc, deleteDoc, updateDoc, serverTimestamp, onSnapshot,
} from 'firebase/firestore';

const JournalContext = createContext({
  journals: [],
  addJournal: async () => {},
  updateJournal: async () => {},
  deleteJournal: async () => {},
  loading: true,
});

export function JournalProvider({ children }) {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setJournals([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'journals'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJournals(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching journals:', error);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const addJournal = async (entry) => {
    if (!user) return;
    await addDoc(collection(db, 'journals'), {
      ...entry, userId: user.uid, createdAt: serverTimestamp(),
    });
  };

  const updateJournal = async (id, entry) => {
    if (!user) return;
    await updateDoc(doc(db, 'journals', id), entry);
  };

  const deleteJournal = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'journals', id));
  };

  return (
    <JournalContext.Provider value={{ journals, addJournal, updateJournal, deleteJournal, loading }}>
      {children}
    </JournalContext.Provider>
  );
}

export const useJournal = () => useContext(JournalContext);
