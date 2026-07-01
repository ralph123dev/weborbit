import { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Shield, CheckCircle, ArrowRight, RefreshCw, UserPlus, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';
import './EmailVerificationPopup.css';

// ─── Confetti Engine ───────────────────────────────────────────
function launchConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#6A5AFF', '#FF2D55', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8B5CF6', '#14b8a6'];
  const confettiCount = 150;
  const pieces = [];

  for (let i = 0; i < confettiCount; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    });
  }

  let frame = 0;
  const maxFrames = 180;

  function animate() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of pieces) {
      p.x += p.vx;
      p.vy += 0.06;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      if (frame > maxFrames - 40) {
        p.opacity = Math.max(0, p.opacity - 0.025);
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (frame < maxFrames) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  animate();
}

// ─── Main Component ────────────────────────────────────────────
const RESEND_COOLDOWN = 60;

export default function EmailVerificationPopup({ profile, onVerified }) {
  const [step, setStep] = useState('email'); // 'email' | 'code' | 'success'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notRegistered, setNotRegistered] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const canvasRef = useRef(null);

  // Pre-fill email from profile if available
  useEffect(() => {
    if (profile?.email) {
      setEmail(profile.email);
    }
  }, [profile]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Check if email exists in profiles
  const checkEmailExists = useCallback(async (emailToCheck) => {
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', emailToCheck.trim().toLowerCase())
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking email:', fetchError);
      return false;
    }
    return !!data;
  }, []);

  // Send OTP code
  const handleSendCode = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Veuillez entrer une adresse email valide.');
      return;
    }

    setLoading(true);
    setError(null);
    setNotRegistered(false);

    try {
      // Check if email exists in profiles
      const exists = await checkEmailExists(trimmedEmail);
      if (!exists) {
        setNotRegistered(true);
        setLoading(false);
        return;
      }

      // Send OTP via Supabase (resend signup confirmation which sends the 6-digit code)
      const { error: otpError } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
      });

      if (otpError) {
        // Si l'utilisateur est déjà vérifié côté Auth Supabase, on le valide directement
        if (otpError.message?.toLowerCase().includes('already verified')) {
          await supabase.from('profiles').update({ is_verified: true }).eq('email', trimmedEmail);
          setStep('success');
          if (canvasRef.current) launchConfetti(canvasRef.current);
          if (onVerified) setTimeout(() => onVerified(), 3000);
          setLoading(false);
          return;
        }
        throw otpError;
      }

      setStep('code');
      setResendCooldown(RESEND_COOLDOWN);
    } catch (err) {
      console.error('OTP send error:', err);
      setError(err.message || "Erreur lors de l'envoi du code. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP code
  const handleVerifyCode = async (e) => {
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
        email: email.trim().toLowerCase(),
        token,
        type: 'signup',
      });

      if (verifyError) throw verifyError;

      // Update is_verified in profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('email', email.trim().toLowerCase());

      if (updateError) {
        console.error('Profile update error:', updateError);
      }

      // Show success
      setStep('success');

      // Launch confetti
      if (canvasRef.current) {
        launchConfetti(canvasRef.current);
      }

      // Notify parent
      if (onVerified) {
        setTimeout(() => onVerified(), 3000);
      }
    } catch (err) {
      console.error('Verify error:', err);
      setError('Code invalide ou expiré. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;

    setLoading(true);
    setError(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });

      if (resendError) throw resendError;
      setResendCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err.message || 'Impossible de renvoyer le code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle code input (digits only, max 6)
  const handleCodeChange = (value) => {
    setCode(value.replace(/\D/g, '').slice(0, 6));
    if (error) setError(null);
  };

  // Handle dismiss
  const handleDismiss = () => {
    setDismissed(true);
  };

  // Handle redirect to signup
  const handleGoToSignup = () => {
    // Sign out and reload to show AuthModal in signup mode
    supabase.auth.signOut().then(() => {
      window.location.reload();
    });
  };

  // Don't show if dismissed or already on success (after auto-close)
  if (dismissed) return null;

  return (
    <>
      {/* Confetti Canvas */}
      <canvas ref={canvasRef} className="verify-confetti-canvas" />

      {/* Overlay */}
      <div className="verify-overlay">
        <div className="verify-card glass">

          {/* ─── STEP 1: Email ─── */}
          {step === 'email' && (
            <div className="verify-step-enter">
              <div className="verify-header">
                <div className="verify-icon-wrapper">
                  <Shield size={32} />
                </div>
                <h2>Vérifiez votre compte</h2>
                <p>
                  Pour sécuriser votre compte et accéder à toutes les fonctionnalités,
                  veuillez confirmer votre adresse email.
                </p>
              </div>

              {error && <div className="verify-error">{error}</div>}

              {notRegistered ? (
                <div className="verify-not-registered verify-step-enter">
                  <p>
                    <strong>Cet email n'est pas enregistré</strong> sur Orbit Post.
                  </p>
                  <p>Souhaitez-vous créer un nouveau compte ?</p>
                  <button className="verify-create-account-btn" onClick={handleGoToSignup}>
                    <UserPlus size={18} />
                    Créer un compte
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendCode} className="verify-form">
                  <div className="verify-input-group">
                    <label>Adresse email</label>
                    <div className="verify-input-wrapper">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setNotRegistered(false); if (error) setError(null); }}
                        placeholder="votre@email.com"
                        autoFocus
                        required
                      />
                      <Mail size={18} className="verify-input-icon" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="verify-submit-btn"
                    disabled={loading || !email.includes('@')}
                  >
                    {loading ? <div className="verify-spinner" /> : (
                      <>Envoyer le code <ArrowRight size={18} /></>
                    )}
                  </button>
                </form>
              )}

              <button className="verify-skip-btn" onClick={handleDismiss}>
                Plus tard
              </button>
            </div>
          )}

          {/* ─── STEP 2: Code ─── */}
          {step === 'code' && (
            <div className="verify-step-enter">
              <div className="verify-header">
                <div className="verify-icon-wrapper">
                  <Mail size={32} />
                </div>
                <h2>Entrez le code</h2>
                <p>
                  Un code à 6 chiffres a été envoyé à<br />
                  <span className="verify-email-highlight">{email}</span>
                </p>
              </div>

              {error && <div className="verify-error">{error}</div>}

              <form onSubmit={handleVerifyCode} className="verify-form">
                <div className="verify-input-group">
                  <label>Code de vérification</label>
                  <div className="verify-input-wrapper">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                      className="verify-otp-input"
                      autoFocus
                      required
                    />
                    <Shield size={18} className="verify-input-icon" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="verify-submit-btn"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? <div className="verify-spinner" /> : (
                    <>Vérifier <CheckCircle size={18} /></>
                  )}
                </button>
              </form>

              <div className="verify-resend">
                <button
                  type="button"
                  className="verify-resend-btn"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                >
                  <RefreshCw size={15} />
                  {resendCooldown > 0
                    ? `Renvoyer le code (${resendCooldown}s)`
                    : 'Renvoyer le code'}
                </button>
              </div>

              <button className="verify-skip-btn" onClick={handleDismiss}>
                Plus tard
              </button>
            </div>
          )}

          {/* ─── STEP 3: Success ─── */}
          {step === 'success' && (
            <div className="verify-success verify-step-enter">
              <div className="verify-success-icon">
                <Sparkles size={40} />
              </div>
              <h2>Compte vérifié ! 🎉</h2>
              <p>
                Félicitations ! Votre compte est maintenant vérifié.<br />
                Profitez de toutes les fonctionnalités d'Orbit Post.
              </p>
              <button className="verify-done-btn" onClick={() => onVerified?.()}>
                <CheckCircle size={18} />
                C'est parti !
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
