import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import logo from '../assets/logo.png';
import { ArrowRight, ArrowLeft, CheckCircle, Mail, Lock, User, Eye, EyeOff, X } from 'lucide-react';
import './AuthModal.css';

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
            
            <button className="landing-btn landing-btn-login" onClick={() => goTo('login')}>
              <Mail size={20} />
              Se connecter
            </button>

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
            
            <button className="landing-btn landing-btn-login" onClick={() => goTo('login')}>
              <Mail size={20} />
              Se connecter
            </button>

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
        <button className="auth-back-btn" onClick={() => step > 1 ? prevStep() : goTo('landing')}>
          <ArrowLeft size={20} /> {step > 1 ? 'Retour' : 'Accueil'}
        </button>

        <div className="auth-header text-center">
          <img src={logo} alt="Orbit" className="auth-logo-small" />
          <h2 className="font-black text-2xl mt-4">Créer votre compte</h2>
        </div>

        {/* Progress */}
        <div className="wizard-progress">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
            <div key={s} className="progress-step">
              <div className={`progress-circle ${step >= s ? 'active' : ''} ${step === s ? 'current' : ''}`}>
                {step > s ? <CheckCircle size={16} /> : s}
              </div>
              {s < TOTAL_STEPS && <div className={`progress-line ${step > s ? 'active' : ''}`}></div>}
            </div>
          ))}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={step === TOTAL_STEPS ? handleSignupSubmit : handleNextStep}>
          <div className={`wizard-step-wrapper ${animClass}`}>
            {step === 1 && (
              <div className="wizard-step">
                <div className="step-emoji">📧</div>
                <h3 className="step-title">Votre adresse email</h3>
                <p className="step-subtitle text-secondary">Vous recevrez un email de confirmation</p>
                <div className={`input-group ${invalidField === 'email' ? 'invalid shake' : ''}`}>
                  <label>Email <span className="text-primary">*</span></label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input 
                      type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      autoFocus
                      required
                      aria-invalid={invalidField === 'email'}
                    />
                  </div>
                </div>
              </div>
            )}
 
            {step === 2 && (
              <div className="wizard-step">
                <div className="step-emoji">🔐</div>
                <h3 className="step-title">Créez un mot de passe</h3>
                <p className="step-subtitle text-secondary">8 caractères, une majuscule et un chiffre pour sécuriser votre compte</p>
                <div className={`input-group ${invalidField === 'password' ? 'invalid shake' : ''}`}>
                  <label>Mot de passe <span className="text-primary">*</span></label>
                  <div className="input-with-icon input-with-toggle">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoFocus
                      required
                      minLength={8}
                      aria-invalid={invalidField === 'password'}
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
                <div className="password-strength">
                  <div className={`strength-bar ${password.length >= 8 ? 'good' : password.length >= 5 ? 'medium' : ''}`}></div>
                  <span className="text-xs text-secondary">
                    {password.length === 0 ? '' : password.length < 8 ? 'Trop court' : 'Bon mot de passe ✓'}
                  </span>
                </div>
              </div>
            )}
          </div>
 
          <div className="wizard-actions">
            {step < TOTAL_STEPS ? (
              <button
                type="submit"
                className="btn btn-primary auth-submit w-full"
              >
                Suivant <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary auth-submit w-full"
                disabled={loading}
              >
                {loading ? <div className="spinner"></div> : (
                  <>Créer mon compte <CheckCircle size={18} /></>
                )}
              </button>
            )}
          </div>
        </form>

        <p className="text-center text-secondary text-sm mt-6">
          Déjà un compte ?{' '}
          <button className="text-primary font-bold" onClick={() => goTo('login')}>Se connecter</button>
        </p>
      </div>
    </div>
  );
}
