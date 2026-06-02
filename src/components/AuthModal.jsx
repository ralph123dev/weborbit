import { useState } from 'react';
import { supabase } from '../services/supabase';
import { Turnstile } from '@marsidev/react-turnstile';
import logo from '../assets/logo.png';
import { ArrowRight, ArrowLeft, CheckCircle, Mail, Lock, User } from 'lucide-react';
import './AuthModal.css';

export default function AuthModal() {
  const [mode, setMode] = useState('landing'); // 'landing', 'login', 'signup'
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  
  // Wizard State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animClass, setAnimClass] = useState('step-enter-right');

  const TOTAL_STEPS = 4;

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
    if (!turnstileToken) {
      setError('Veuillez valider le captcha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName || email.split('@')[0],
            last_name: lastName || ''
          }
        }
      });
      if (error) throw error;
      if (data?.user) {
        const baseName = firstName || data.user.email.split('@')[0];
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          first_name: firstName || data.user.email.split('@')[0],
          last_name: lastName || '',
          username: baseName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
          updated_at: new Date().toISOString()
        });
      }
    } catch (err) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    if (step === 1) return firstName.trim().length > 0;
    if (step === 2) return email.includes('@') && email.length > 5;
    if (step === 3) return password.length >= 6;
    if (step === 4) return turnstileToken !== null;
    return false;
  };

  const goTo = (newMode) => {
    setError(null);
    setStep(1);
    setAnimClass('step-enter-right');
    setTurnstileToken(null);
    setMode(newMode);
  };

  // --- LANDING PAGE ---
  if (mode === 'landing') {
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
            <h2 className="font-black text-xl mb-6">Se connecter à Orbit Post</h2>
            
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
      <div className="auth-page-full">
        <div className="auth-page-card glass page-enter">
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
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
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
    <div className="auth-page-full">
      <div className="auth-page-card glass page-enter">
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

        <form onSubmit={step === TOTAL_STEPS ? handleSignupSubmit : (e) => { e.preventDefault(); nextStep(); }}>
          <div className={`wizard-step-wrapper ${animClass}`}>
            {step === 1 && (
              <div className="wizard-step">
                <div className="step-emoji">👋</div>
                <h3 className="step-title">Comment vous appelez-vous ?</h3>
                <p className="step-subtitle text-secondary">On sera ravis de faire votre connaissance</p>
                <div className="input-group">
                  <label>Prénom <span className="text-primary">*</span></label>
                  <input 
                    type="text" value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex: John"
                    autoFocus required
                  />
                </div>
                <div className="input-group">
                  <label>Nom <span className="text-secondary text-xs">(optionnel)</span></label>
                  <input 
                    type="text" value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex: Doe"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="wizard-step">
                <div className="step-emoji">📧</div>
                <h3 className="step-title">Votre adresse email</h3>
                <p className="step-subtitle text-secondary">Vous recevrez un email de confirmation</p>
                <div className="input-group">
                  <label>Email <span className="text-primary">*</span></label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input 
                      type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      autoFocus required
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="wizard-step">
                <div className="step-emoji">🔐</div>
                <h3 className="step-title">Créez un mot de passe</h3>
                <p className="step-subtitle text-secondary">6 caractères minimum pour protéger votre compte</p>
                <div className="input-group">
                  <label>Mot de passe <span className="text-primary">*</span></label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input 
                      type="password" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoFocus required minLength={6}
                    />
                  </div>
                </div>
                <div className="password-strength">
                  <div className={`strength-bar ${password.length >= 6 ? 'good' : password.length >= 3 ? 'medium' : ''}`}></div>
                  <span className="text-xs text-secondary">
                    {password.length === 0 ? '' : password.length < 6 ? 'Trop court' : 'Bon mot de passe ✓'}
                  </span>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="wizard-step">
                <div className="step-emoji">🛡️</div>
                <h3 className="step-title">Vérification de sécurité</h3>
                <p className="step-subtitle text-secondary">Prouvez que vous êtes humain pour protéger notre communauté</p>
                <div className="turnstile-wrapper">
                  <Turnstile 
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAADdYECWgRvvjBv1E'} 
                    onSuccess={(token) => setTurnstileToken(token)}
                    options={{ theme: 'auto' }}
                  />
                </div>
                {turnstileToken && (
                  <div className="captcha-success">
                    <CheckCircle size={16} /> Vérifié avec succès
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="wizard-actions">
            {step < TOTAL_STEPS ? (
              <button 
                type="submit" 
                className="btn btn-primary auth-submit w-full"
                disabled={!isStepValid()}
              >
                Suivant <ArrowRight size={18} />
              </button>
            ) : (
              <button 
                type="submit" 
                className="btn btn-primary auth-submit w-full glow-pulse"
                disabled={loading || !turnstileToken}
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
