import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const ROLE = {
  USER: 'user',
  PENDING_COUNSELOR: 'pending_counselor',
  COUNSELOR: 'counselor',
  ADMIN: 'admin',
};

const AuthContext = createContext({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signUpCounselor: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  resetPassword: async () => {},
  role: ROLE.USER,
  isCounselor: false,
  isAdmin: false,
  isPendingCounselor: false,
});

const formatUser = async (firebaseUser) => {
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    const role = resolveEffectiveRole(data);
    const application = data.counselorApplication || null;
    return {
      uid: firebaseUser.uid,
      displayName: data.displayName || firebaseUser.displayName || 'User',
      email: data.email || firebaseUser.email || '',
      streakCount: data.streakCount ?? 0,
      bio: data.bio || '',
      photoURL: data.photoURL || '',
      role,
      isCounselor: role === ROLE.COUNSELOR || role === ROLE.ADMIN,
      specialization: data.specialization || application?.specialization || '',
      licenseNumber: data.licenseNumber || application?.licenseNumber || '',
      yearsExperience: data.yearsExperience ?? application?.yearsExperience ?? null,
      approvedAt: data.approvedAt || null,
      approvedBy: data.approvedBy || null,
      createdAt: data.createdAt || null,
      requestedAt: data.requestedAt || application?.submittedAt || null,
      counselorApplication: application,
    };
  }
  return {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || 'User',
    email: firebaseUser.email || '',
    streakCount: 0,
    bio: '',
    photoURL: '',
    role: ROLE.USER,
    isCounselor: false,
    specialization: '',
    licenseNumber: '',
    yearsExperience: null,
    approvedAt: null,
    approvedBy: null,
    createdAt: null,
    requestedAt: null,
    counselorApplication: null,
  };
};

const resolveEffectiveRole = (data) => {
  const stored = data.role || ROLE.USER;
  if (stored === ROLE.COUNSELOR || stored === ROLE.ADMIN) return stored;
  const application = data.counselorApplication;
  if (application && application.status === 'pending' && !data.approvedAt) {
    return ROLE.PENDING_COUNSELOR;
  }
  return stored || ROLE.USER;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const role = user?.role || ROLE.USER;
  const isCounselor = Boolean(user?.isCounselor) || role === ROLE.COUNSELOR || role === ROLE.ADMIN;
  const isAdmin = role === ROLE.ADMIN;
  const isPendingCounselor = role === ROLE.PENDING_COUNSELOR;

  useEffect(() => {
    let cancelled = false;
    // Paint from cache immediately for a fast first render — but only if it's
    // for the account Firebase Auth's own synchronous snapshot (auth.currentUser)
    // says is actually signed in right now. Without this check, a stale
    // cached account (e.g. a counselor test account previously used in this
    // browser) could flash in — or worse, persist — for a completely
    // different account that's actually signed in, until the async
    // onAuthStateChanged callback below corrects it a moment later.
    const stored = window.localStorage.getItem('atara_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (auth.currentUser && parsed.uid === auth.currentUser.uid) {
          setUser(parsed);
        } else {
          window.localStorage.removeItem('atara_user');
        }
      } catch {}
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return;
      if (firebaseUser) {
        const formattedUser = await formatUser(firebaseUser);
        if (cancelled) return;
        setUser(formattedUser);
        window.localStorage.setItem('atara_user', JSON.stringify(formattedUser));
      } else {
        // Firebase is the source of truth. If Firebase says there is no
        // session, we must not keep showing a stale cached user from a
        // previous session — even if one is sitting in localStorage.
        setUser(null);
        window.localStorage.removeItem('atara_user');
      }
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const formattedUser = await formatUser(userCredential.user);
    setUser(formattedUser);
    window.localStorage.setItem('atara_user', JSON.stringify(formattedUser));
  };

  const signUp = async (name, email, password) => {
    let userCredential = null;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await firebaseUpdateProfile(userCredential.user, { displayName: name });

      const newUser = {
        uid: userCredential.user.uid,
        displayName: name,
        email,
        streakCount: 0,
        bio: '',
        photoURL: '',
        role: ROLE.USER,
        isCounselor: false,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
      const effectiveUser = { ...newUser, createdAt: null };
      setUser(effectiveUser);
      window.localStorage.setItem('atara_user', JSON.stringify(effectiveUser));
    } catch (err) {
      if (userCredential?.user) {
        try { await deleteUser(userCredential.user); } catch {}
      }
      throw err;
    }
  };

  const signUpCounselor = async ({ name, email, password, specialization, licenseNumber, yearsExperience, bio }) => {
    let userCredential = null;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await firebaseUpdateProfile(userCredential.user, { displayName: name });

      const submittedAt = serverTimestamp();
      const userPayload = {
        uid: userCredential.user.uid,
        displayName: name,
        email,
        streakCount: 0,
        bio: bio || '',
        photoURL: '',
        role: ROLE.USER,
        isCounselor: false,
        createdAt: submittedAt,
        requestedAt: submittedAt,
        counselorApplication: {
          status: 'pending',
          submittedAt,
          specialization: specialization || '',
          licenseNumber: licenseNumber || '',
          yearsExperience: yearsExperience ?? null,
          bio: bio || '',
        },
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userPayload);

      const effectiveUser = {
        ...userPayload,
        role: ROLE.PENDING_COUNSELOR,
        createdAt: null,
        requestedAt: null,
        specialization: specialization || '',
        licenseNumber: licenseNumber || '',
        yearsExperience: yearsExperience ?? null,
        counselorApplication: userPayload.counselorApplication,
      };
      setUser(effectiveUser);
      window.localStorage.setItem('atara_user', JSON.stringify(effectiveUser));
    } catch (err) {
      if (userCredential?.user) {
        try { await deleteUser(userCredential.user); } catch {}
      }
      if (err?.message?.toLowerCase?.().includes('permission') || err?.message?.toLowerCase?.().includes('unauthorized')) {
        const friendly = new Error(
          'Atara security rules blocked this request — this is expected. Ask a project admin to deploy the included firestore.rules file (RBAC rules) via Firebase CLI. Once deployed, counselor applications submit cleanly. No account was created.'
        );
        friendly.cause = err;
        throw friendly;
      }
      throw err;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    window.localStorage.removeItem('atara_user');
  };

  const updateProfile = async (updates) => {
    if (!user || !auth.currentUser) return;
    const updatedUser = { ...user, ...updates };
    if (updates.role) {
      updatedUser.isCounselor = updates.role === ROLE.COUNSELOR || updates.role === ROLE.ADMIN;
    }
    setUser(updatedUser);
    window.localStorage.setItem('atara_user', JSON.stringify(updatedUser));

    try {
      if (updates.displayName || updates.photoURL) {
        await firebaseUpdateProfile(auth.currentUser, {
          displayName: updates.displayName,
          photoURL: updates.photoURL,
        });
      }
      const PROTECTED_FIELDS = ['role', 'isCounselor', 'approvedAt', 'approvedBy', 'uid', 'createdAt', 'requestedAt'];
      const dbUpdates = Object.fromEntries(
        Object.entries(updates).filter(([k]) => !PROTECTED_FIELDS.includes(k))
      );
      if (Object.keys(dbUpdates).length > 0) {
        await setDoc(doc(db, 'users', user.uid), dbUpdates, { merge: true });
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('Error updating profile:', e);
    }
  };

  const resetPassword = async (email) => {
    if (!email?.trim()) throw new Error('Email is required.');
    await sendPasswordResetEmail(auth, email.trim());
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signUpCounselor,
      signOut,
      updateProfile,
      resetPassword,
      role,
      isCounselor,
      isAdmin,
      isPendingCounselor,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
