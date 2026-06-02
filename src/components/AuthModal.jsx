import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Turnstile } from '@marsidev/react-turnstile';
import logo from '../assets/logo.png';
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import './AuthModal.css';

export default function AuthModal() {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);
  
  // UI State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [slideDirection, setSlideDirection] = useState('right');

  const nextStep = () => {
    setSlideDirection('right');
    setError(null);
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setSlideDirection('left');
    setError(null);
    setStep(prev => prev - 1);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!turnstileToken) {
      setError('Veuillez valider le captcha pour continuer.');
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
      
      // Add profile immediately
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
      setError(err.message || "Une erreur est survenue lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setStep(1);
    setTurnstileToken(null);
  };

  const isStepValid = () => {
    if (step === 1) return firstName.trim().length > 0;
    if (step === 2) return email.includes('@') && email.length > 5;
    if (step === 3) return password.length >= 6;
    if (step === 4) return turnstileToken !== null;
    return false;
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal glass">
        <div className="auth-header flex flex-col items-center">
          <img src={logo} alt="Orbit Logo" className="auth-logo" style={{ width: '120px', height: 'auto', marginBottom: '1rem' }} />
          <h2 className="font-black text-primary">
            {isLogin ? 'Bon retour !' : 'Créez votre compte'}
          </h2>
          <p className="text-secondary text-center mt-2">
            {isLogin ? 'Connectez-vous pour continuer sur Orbit' : 'Rejoignez la nouvelle galaxie sociale'}
          </p>
        </div>

        {error && <div className="auth-error animate-pulse">{error}</div>}

        <div className="auth-body">
          {isLogin ? (
            // --- LOGIN FORM ---
            <form onSubmit={handleLoginSubmit} className="auth-form fade-in">
              <div className="input-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                />
              </div>

              <div className="input-group">
                <label>Mot de passe</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary auth-submit w-full mt-4" disabled={loading}>
                {loading ? <div className="spinner"></div> : 'Se connecter'}
              </button>
            </form>
          ) : (
            // --- SIGNUP WIZARD ---
            <div className="auth-wizard">
              {/* Progress Indicators */}
              <div className="wizard-progress">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className={`progress-dot ${step >= s ? 'active' : ''}`} />
                ))}
              </div>

              <form onSubmit={step === 4 ? handleSignupSubmit : (e) => { e.preventDefault(); nextStep(); }} className={`wizard-step-container slide-${slideDirection}`}>
                
                {step === 1 && (
                  <div className="wizard-step">
                    <h3 className="text-xl font-bold mb-4 text-center">Comment vous appelez-vous ?</h3>
                    <div className="input-group">
                      <label>Prénom</label>
                      <input 
                        type="text" 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ex: John"
                        autoFocus
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label>Nom (optionnel)</label>
                      <input 
                        type="text" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Ex: Doe"
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="wizard-step">
                    <h3 className="text-xl font-bold mb-4 text-center">Votre adresse email</h3>
                    <div className="input-group">
                      <label>Email</label>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre@email.com"
                        autoFocus
                        required
                      />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="wizard-step">
                    <h3 className="text-xl font-bold mb-4 text-center">Créez un mot de passe</h3>
                    <div className="input-group">
                      <label>Mot de passe</label>
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="6 caractères minimum"
                        autoFocus
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="wizard-step">
                    <h3 className="text-xl font-bold mb-4 text-center">Dernière étape de sécurité</h3>
                    <p className="text-secondary text-center mb-6 text-sm">Prouvez que vous êtes humain pour protéger la communauté.</p>
                    <div className="flex justify-center my-4 turnstile-wrapper">
                      <Turnstile 
                        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAADdYECWgRvvjBv1E'} 
                        onSuccess={(token) => setTurnstileToken(token)}
                        options={{ theme: 'auto' }}
                      />
                    </div>
                  </div>
                )}

                <div className="wizard-actions flex justify-between mt-6">
                  {step > 1 ? (
                    <button type="button" className="btn btn-outline flex items-center gap-2" onClick={prevStep}>
                      <ArrowLeft size={18} /> Retour
                    </button>
                  ) : (
                    <div></div> // placeholder for flex space-between
                  )}

                  {step < 4 ? (
                    <button 
                      type="submit" 
                      className="btn btn-primary flex items-center gap-2" 
                      disabled={!isStepValid()}
                    >
                      Suivant <ArrowRight size={18} />
                    </button>
                  ) : (
                    <button 
                      type="submit" 
                      className="btn btn-primary flex items-center gap-2 submit-pulse" 
                      disabled={loading || !turnstileToken}
                    >
                      {loading ? <div className="spinner"></div> : (
                        <>Créer le compte <CheckCircle size={18} /></>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="auth-footer mt-6">
          <p className="text-secondary text-sm">
            {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
            <button 
              type="button" 
              className="ml-2 text-primary font-bold hover:underline"
              onClick={toggleAuthMode}
            >
               {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
