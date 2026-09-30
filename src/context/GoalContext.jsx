import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import {
  collection, addDoc, query, where, orderBy,
  doc, deleteDoc, updateDoc, serverTimestamp, onSnapshot,
} from 'firebase/firestore';

const GoalContext = createContext({
  goals: [],
  addGoal: async () => {},
  updateGoal: async () => {},
  deleteGoal: async () => {},
  logProgress: async () => {},
  toggleComplete: async () => {},
  loading: true,
});

export function GoalProvider({ children }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'goals'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGoals(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching goals:', error);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const addGoal = async (goal) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    await addDoc(collection(db, 'goals'), {
      userId: user.uid,
      title: goal.title,
      description: goal.description || '',
      category: goal.category || 'other',
      target: goal.target,
      progress: 0,
      unit: goal.unit,
      completed: false,
      createdAt: serverTimestamp(),
      date: today,
    });
  };

  const updateGoal = async (id, updates) => {
    if (!user) return;
    await updateDoc(doc(db, 'goals', id), updates);
  };

  const deleteGoal = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'goals', id));
  };

  const logProgress = async (id) => {
    if (!user) return;
    const goal = goals.find((g) => g.id === id);
    if (!goal || goal.completed) return;
    const next = Math.min((goal.progress || 0) + 1, goal.target);
    await updateDoc(doc(db, 'goals', id), {
      progress: next,
      completed: next >= goal.target,
    });
  };

  const toggleComplete = async (id) => {
    if (!user) return;
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    await updateDoc(doc(db, 'goals', id), {
      completed: !goal.completed,
    });
  };

  return (
    <GoalContext.Provider value={{
      goals, addGoal, updateGoal, deleteGoal, logProgress, toggleComplete, loading,
    }}>
      {children}
    </GoalContext.Provider>
  );
}

export const useGoals = () => useContext(GoalContext);
