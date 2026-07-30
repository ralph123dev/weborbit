import { useState, useEffect, useRef } from 'react';
import { useOTPAuth } from '../hooks/useOTPAuth';
import './OTPScreens.css';

export const VerifyOTPScreen = ({ email, onSuccess, onBack }) => {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const codeInputRefs = useRef([]);
  const { loading, error, verifyOTP, getRemainingTime, codeExpiration } =
    useOTPAuth();

  // Expiration timer
  useEffect(() => {
    if (!codeExpiration) return;

    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      setRemainingSeconds(remaining);

      if (remaining === null || remaining <= 0) {
        clearInterval(interval);
        setCodeError('Le code a expiré. Demandez un nouveau code.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [codeExpiration, getRemainingTime]);

  // Format remaining time as MM:SS
  const formatTime = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle individual digit input
  const handleDigitInput = (index, value) => {
    // Only allow digits
    if (!/^\d?$/.test(value)) return;

    const newCode = code.split('');
    newCode[index] = value;
    setCode(newCode.join(''));
    setCodeError('');

    // Auto-focus next field
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  // Paste handler
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedCode = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d{6}$/.test(pastedCode)) {
      setCode(pastedCode);
      codeInputRefs.current[5]?.focus();
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      setCodeError('Code incomplet');
      return;
    }

    const result = await verifyOTP(email, code);
    if (result.success) {
      onSuccess();
    }
  };

  const isCodeComplete = code.length === 6;
  const isCodeExpired = remainingSeconds === 0;

  return (
    <div className="otp-screen verify-otp-screen">
      <div className="otp-container">
        <button className="btn-back" onClick={onBack} title="Retour">
          ← Retour
        </button>

        <div className="otp-header">
          <h1>Entrez le Code</h1>
          <p>
            Code envoyé à{' '}
            <span className="email-highlight">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="otp-form">
          <div className="code-input-group">
            {Array(6)
              .fill(null)
              .map((_, index) => (
                <input
                  key={index}
                  ref={(el) => (codeInputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={code[index] || ''}
                  onChange={(e) => handleDigitInput(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={loading || isCodeExpired}
                  className="code-input-digit"
                  aria-label={`Chiffre ${index + 1}`}
                />
              ))}
          </div>

          {codeError && (
            <div className="alert alert-error">
              <span>⚠️</span> {codeError}
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="code-timer">
            {remainingSeconds !== null && (
              <span
                className={
                  remainingSeconds <= 60
                    ? 'timer-warning'
                    : 'timer-normal'
                }
              >
                Code expire dans : {formatTime(remainingSeconds)}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!isCodeComplete || loading || isCodeExpired}
            className="btn btn-primary btn-block"
          >
            {loading ? (
              <>
                <span className="spinner"></span> Vérification...
              </>
            ) : (
              'Vérifier le Code'
            )}
          </button>
        </form>

        <div className="otp-info">
          <p>
            Vous n'avez pas reçu le code ?{' '}
            <button
              type="button"
              onClick={onBack}
              className="btn-link"
            >
              Demander un nouveau code
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
