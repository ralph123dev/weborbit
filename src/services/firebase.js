// Firebase stub — Firebase is not installed in weborbit.
// The app uses Supabase for all authentication (email + Google OAuth).
// This file exports safe defaults so that code referencing Firebase
// (e.g. AuthModal.jsx, useAuth.js) works without errors.

const hasFirebaseConfig = false;
const app = null;
const auth = null;
const db = null;
const functions = null;

// No-op function stubs
const createUserWithEmailAndPassword = () => Promise.reject(new Error('Firebase not configured'));
const signInWithEmailAndPassword = () => Promise.reject(new Error('Firebase not configured'));
const sendEmailVerification = () => Promise.reject(new Error('Firebase not configured'));
const onAuthStateChanged = () => () => {}; // returns unsubscribe noop
const firebaseSignOut = () => Promise.resolve();

export {
    app,
    auth,
    createUserWithEmailAndPassword,
    db,
    firebaseSignOut,
    functions,
    hasFirebaseConfig,
    onAuthStateChanged,
    sendEmailVerification,
    signInWithEmailAndPassword,
};
