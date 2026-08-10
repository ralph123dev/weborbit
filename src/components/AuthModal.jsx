import { ArrowLeft, Eye, EyeOff, Lock, Mail, User, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import {
    auth,
    createUserWithEmailAndPassword,
    hasFirebaseConfig,
    sendEmailVerification,
    signInWithEmailAndPassword,
} from '../services/firebase';
import { supabase } from '../services/supabase';
import './AuthModal.css';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

export default function AuthModal({ isOverlay, onClose }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('landing'); // 'landing', 'login', 'signup'
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Wizard State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animClass, setAnimClass] = useState('step-enter-right');
  const [invalidField, setInvalidField] = useState(null);
  const TOTAL_STEPS = 2;

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: async (response) => {
              setLoading(true);
              setError(null);
              try {
                const { error } = await supabase.auth.signInWithIdToken({
                  provider: 'google',
                  token: response.credential,
                });
                if (error) throw error;
                if (onClose) onClose();
              } catch (err) {
                setError(err.message || 'Erreur lors de la connexion avec Google');
                setLoading(false);
              }
            },
          });

          const placeholders = document.querySelectorAll(".google-signin-btn-placeholder");
          placeholders.forEach(placeholder => {
            window.google.accounts.id.renderButton(
              placeholder,
              { 
                theme: "outline", 
                size: "large", 
                width: placeholder.offsetWidth || 300,
                text: "continue_with",
                shape: "pill"
              }
            );
          });
        } catch (e) {
          console.error("Error initializing client-side Google sign-in:", e);
        }
      }
    };

    const timer = setTimeout(initializeGoogleSignIn, 500);
    return () => clearTimeout(timer);
  }, [mode, loading]);

  const animateStep = (direction, newStep) => {
    setAnimClass(direction === 'right' ? 'step-exit-left' : 'step-exit-right');
    setTimeout(() => {
      setStep(newStep);
      setAnimClass(direction === 'right' ? 'step-enter-right' : 'step-enter-left');
      setError(null);
    }, 250);
  };

  const nextStep = () => animateStep('right', step + 1);
  const prevStep = () => animateStep('left', step - 1);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (hasFirebaseConfig && auth) {
        await signInWithEmailAndPassword(auth, email, password);
        if (isOverlay && onClose) onClose();
        navigate('/');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const invalid = validateStep(step);
    if (invalid) {
      triggerInvalidField(invalid);
      setLoading(false);
      return;
    }

    try {
      if (hasFirebaseConfig && auth) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential?.user;

        if (firebaseUser) {
          const baseName = firebaseUser.email?.split('@')[0] || 'user';
          await supabase.from('profiles').upsert({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            first_name: null,
            last_name: null,
            username: baseName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
            updated_at: new Date().toISOString()
          });

          if (!firebaseUser.emailVerified) {
            await sendEmailVerification(firebaseUser);
          }
        }

        if (isOverlay && onClose) onClose();
        navigate('/verify', { state: { email } });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });
      if (error) throw error;
      if (data?.user) {
        const baseName = data.user.email.split('@')[0];
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          first_name: null,
          last_name: null,
          username: baseName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
          updated_at: new Date().toISOString()
        });
      }

      navigate('/verify', { state: { email } });
    } catch (err) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailPattern.test(email)) {
        return 'email';
      }
    }

    if (currentStep === 2) {
      const passwordPattern = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!password || !passwordPattern.test(password)) {
        return 'password';
      }
    }

    return null;
  };

  const isStepValid = () => !validateStep(step);

  const goTo = (newMode) => {
    setError(null);
    setInvalidField(null);
    setStep(1);
    setAnimClass('step-enter-right');
    setMode(newMode);
  };

  const triggerInvalidField = (field) => {
    setInvalidField(field);
    setError('Veuillez remplir correctement le champ requis.');
    window.requestAnimationFrame(() => {
      setInvalidField(field);
    });
    setTimeout(() => setInvalidField(null), 450);
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    const invalid = validateStep(step);
    if (invalid) {
      triggerInvalidField(invalid);
      return;
    }
    nextStep();
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Erreur lors de la connexion avec Google');
      setLoading(false);
    }
  };

  // --- LANDING PAGE ---
  if (mode === 'landing') {
    if (isOverlay) {
      return (
        <div className="auth-page-full" style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', zIndex: 9999 }}>
          <div className="auth-page-card glass page-enter" style={{ position: 'relative' }}>
            <button 
              className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              onClick={onClose}
              title="Fermer"
            >
              <X size={24} />
            </button>
            <div className="auth-header text-center">
              <img src={logo} alt="Orbit" className="auth-logo-small" />
              <h2 className="font-black text-2xl mt-4">Rejoignez Orbit Post</h2>
              <p className="text-secondary mt-2">Partagez, découvrez et connectez-vous avec d'autres utilisateurs.</p>
            </div>

            {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
              <div className="google-signin-btn-placeholder"></div>
            ) : (
              <button className="landing-btn landing-btn-google" onClick={handleGoogleSignIn} disabled={loading}>
                <GoogleIcon />
                Continuer avec Google
              </button>
            )}

            <div className="landing-divider"><span>ou</span></div>

            <button className="landing-btn landing-btn-signup" onClick={() => goTo('signup')}>
              <User size={20} />
              Créer un nouveau compte
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="auth-landing">
        <div className="auth-landing-left">
          <div className="landing-hero">
            <div className="landing-orbit-glow"></div>
            <img src={logo} alt="Orbit Post" className="landing-logo" />
            <h1 className="landing-tagline">
              Découvrez.<br />
              <span className="text-primary">Partagez.</span><br />
              Connectez-vous.
            </h1>
            <p className="landing-sub">Le réseau social de la nouvelle génération.</p>
          </div>
        </div>

        <div className="auth-landing-right">
          <div className="landing-card glass">
            <h2 className="landing-card-title font-black text-xl">Se connecter à Orbit Post</h2>

            {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
              <div className="google-signin-btn-placeholder"></div>
            ) : (
              <button className="landing-btn landing-btn-google" onClick={handleGoogleSignIn} disabled={loading}>
                <GoogleIcon />
                Continuer avec Google
              </button>
            )}

            <div className="landing-divider"><span>ou</span></div>

            <button className="landing-btn landing-btn-signup" onClick={() => goTo('signup')}>
              <User size={20} />
              Créer un nouveau compte
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGIN PAGE ---
  if (mode === 'login') {
    return (
      <div className="auth-page-full" style={isOverlay ? { background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', zIndex: 9999 } : {}}>
        <div className="auth-page-card glass page-enter" style={{ position: 'relative' }}>
          {isOverlay && (
            <button 
              className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              onClick={onClose}
              title="Fermer"
            >
              <X size={24} />
            </button>
          )}
          <button className="auth-back-btn" onClick={() => goTo('landing')}>
            <ArrowLeft size={20} /> Retour
          </button>
          <div className="auth-header text-center">
            <img src={logo} alt="Orbit" className="auth-logo-small" />
            <h2 className="font-black text-2xl mt-4">Content de vous revoir</h2>
            <p className="text-secondary mt-2">Connectez-vous pour continuer sur Orbit</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleLoginSubmit} className="auth-form">
            <div className="input-group">
              <label>Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="input-group">
              <label>Mot de passe</label>
              <div className="input-with-icon input-with-toggle">
                <Lock size={18} className="input-icon" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary auth-submit w-full" disabled={loading}>
              {loading ? <div className="spinner"></div> : 'Se connecter'}
            </button>
          </form>

          <div className="landing-divider"><span>ou</span></div>

          {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
            <div className="google-signin-btn-placeholder"></div>
          ) : (
            <button className="landing-btn landing-btn-google" onClick={handleGoogleSignIn} disabled={loading}>
              <GoogleIcon />
              Se connecter avec Google
            </button>
          )}

          <p className="text-center text-secondary text-sm mt-6">
            Pas de compte ?{' '}
            <button className="text-primary font-bold" onClick={() => goTo('signup')}>S'inscrire</button>
          </p>
        </div>
      </div>
    );
  }

  // --- SIGNUP WIZARD ---
  return (
    <div className="auth-page-full" style={isOverlay ? { background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', zIndex: 9999 } : {}}>
      <div className="auth-page-card glass page-enter" style={{ position: 'relative' }}>
        {isOverlay && (
          <button 
            className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
            style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            onClick={onClose}
            title="Fermer"
          >
            <X size={24} />
          </button>
        )}
        <button className="auth-back-btn" onClick={() => goTo('landing')}>
          <ArrowLeft size={20} /> Accueil
        </button>

        <div className="auth-header text-center">
          <img src={logo} alt="Orbit" className="auth-logo-small" />
          <h2 className="font-black text-2xl mt-4">Création de compte</h2>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="step-emoji" style={{ fontSize: '2rem' }}>🛠️</div>
          <h3 className="step-title">Système en maintenance</h3>
          <p className="step-subtitle text-secondary" style={{ textAlign: 'center' }}>
            Veuillez continuer avec Google pour créer votre compte pour le moment.
          </p>

          {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
            <div className="google-signin-btn-placeholder"></div>
          ) : (
            <button className="landing-btn landing-btn-google" onClick={handleGoogleSignIn} disabled={loading}>
              <GoogleIcon />
              Continuer avec Google
            </button>
          )}
        </div>

        <p className="text-center text-secondary text-sm mt-6">
          Déjà un compte ?{' '}
          <button className="text-primary font-bold" onClick={() => goTo('login')}>Se connecter</button>
        </p>
      </div>
    </div>
  );
}
