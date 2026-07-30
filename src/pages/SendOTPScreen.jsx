import { useState, useEffect } from 'react';
import { useOTPAuth } from '../hooks/useOTPAuth';
import './OTPScreens.css';

export const SendOTPScreen = ({ onSuccess, onEmailChange }) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { loading, error, success, sendOTP, lastEmailSent } = useOTPAuth();

  // Email validation
  const isValidEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  // Cooldown timer
  useEffect(() => {
    if (!lastEmailSent) {
      setCooldownSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const timeSinceLastSend = Date.now() - new Date(lastEmailSent).getTime();
      const remaining = Math.max(0, Math.ceil((60000 - timeSinceLastSend) / 1000));
      setCooldownSeconds(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastEmailSent]);

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError('');

    if (value && !isValidEmail(value)) {
      setEmailError('Email invalide');
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();

    if (!email) {
      setEmailError('Email requis');
      return;
    }

    if (!isValidEmail(email)) {
      setEmailError('Email invalide');
      return;
    }

    const result = await sendOTP(email);
    if (result.success) {
      onEmailChange(email);
      onSuccess();
    }
  };

  return (
    <div className="otp-screen send-otp-screen">
      <div className="otp-container">
        <div className="otp-header">
          <h1>Vérification par Email</h1>
          <p>Entrez votre adresse email pour recevoir un code de vérification</p>
        </div>

        <form onSubmit={handleSendCode} className="otp-form">
          <div className="form-group">
            <label htmlFor="email">Adresse Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="vous@exemple.com"
              disabled={loading || cooldownSeconds > 0}
              className={emailError ? 'input-error' : ''}
            />
            {emailError && <span className="error-message">{emailError}</span>}
          </div>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <span>✓</span> Code envoyé ! Vérifiez votre email.
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              !email ||
              !isValidEmail(email) ||
              cooldownSeconds > 0
            }
            className="btn btn-primary btn-block"
          >
            {loading ? (
              <>
                <span className="spinner"></span> Envoi en cours...
              </>
            ) : cooldownSeconds > 0 ? (
              `Réessayer dans ${cooldownSeconds}s`
            ) : (
              'Envoyer le Code'
            )}
          </button>
        </form>

        <div className="otp-info">
          <p>
            <strong>Conseil :</strong> Vérifiez votre dossier spam si vous
            ne recevez pas le code.
          </p>
        </div>
      </div>
    </div>
  );
};
