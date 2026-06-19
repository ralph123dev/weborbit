import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Mail, RefreshCw } from 'lucide-react';
import logo from '../assets/logo.png';
import { supabase } from '../services/supabase';
import '../components/AuthModal.css';

interface VerifyLocationState {
  email?: string;
}

const RESEND_COOLDOWN_SEC = 60;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as VerifyLocationState | null)?.email ?? '';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SEC);

  useEffect(() => {
    if (!email) {
      navigate('/', { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.trim();

    if (token.length !== 6) {
      setError('Le code doit contenir 6 chiffres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (verifyError) throw verifyError;

      navigate('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Code invalide ou expiré.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    setError(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (resendError) throw resendError;

      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de renvoyer le code.';
      setError(message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value.replace(/\D/g, '').slice(0, 6));
    if (error) setError(null);
  };

  if (!email) {
    return null;
  }

  return (
    <div className="auth-page-full">
      <div className="auth-page-card glass page-enter">
        <button
          type="button"
          className="auth-back-btn"
          onClick={() => navigate('/', { replace: true })}
        >
          <ArrowLeft size={20} /> Retour
        </button>

        <div className="auth-header text-center">
          <img src={logo} alt="Orbit" className="auth-logo-small" />
          <h2 className="font-black text-2xl mt-4">Vérifiez votre email</h2>
          <p className="text-secondary mt-2">
            Un code à 6 chiffres a été envoyé à<br />
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{email}</span>
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleVerify} className="auth-form">
          <div className="input-group">
            <label htmlFor="otp-code">Code de vérification</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
                style={{ letterSpacing: '0.35em', fontWeight: 700 }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit w-full"
            disabled={loading || code.length !== 6}
          >
            {loading ? <div className="spinner" /> : (
              <>Vérifier <CheckCircle size={18} /></>
            )}
          </button>
        </form>

        <p className="text-center text-secondary text-sm mt-6">
          <button
            type="button"
            className="text-primary font-bold"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            style={{ opacity: resendCooldown > 0 || resendLoading ? 0.55 : 1, cursor: resendCooldown > 0 || resendLoading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={16} />
            {resendLoading
              ? 'Envoi...'
              : resendCooldown > 0
                ? `Renvoyer le code (${resendCooldown}s)`
                : 'Renvoyer le code'}
          </button>
        </p>
      </div>
    </div>
  );
}
