import { useState } from 'react';
import { supabase } from '../services/supabase';
import { Turnstile } from '@marsidev/react-turnstile';
import logo from '../assets/logo.png';
import './AuthModal.css';

export default function AuthModal() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        if (!turnstileToken) {
          throw new Error('Veuillez valider le captcha pour continuer.');
        }

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
        
        // Also add profile immediately
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
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal glass">
        <div className="auth-header flex flex-col items-center">
          <img src={logo} alt="Orbit Logo" className="auth-logo" style={{ width: '120px', height: 'auto', marginBottom: '1rem' }} />
          <h2 className="font-black text-primary">Bienvenue sur Orbit</h2>
          <p className="text-secondary">
            {isLogin ? 'Connectez-vous pour continuer' : 'Créez un compte pour nous rejoindre'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <label>Prénom</label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Votre prénom"
                required={!isLogin}
              />
            </div>
          )}

          {!isLogin && (
            <div className="input-group">
              <label>Nom</label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Votre nom"
              />
            </div>
          )}

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
              minLength={6}
            />
          </div>

          {!isLogin && (
            <div className="flex justify-center my-4">
              <Turnstile 
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAADdYECWgRvvjBv1E'} 
                onSuccess={(token) => setTurnstileToken(token)}
                options={{ theme: 'auto' }}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading || (!isLogin && !turnstileToken)}>
            {loading ? <div className="spinner"></div> : (isLogin ? 'Se connecter' : "S'inscrire")}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
            <button 
              type="button" 
              className="toggle-auth-btn text-primary font-bold"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setTurnstileToken(null);
              }}
            >
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
