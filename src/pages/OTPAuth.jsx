import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { SendOTPScreen } from './SendOTPScreen';
import { VerifyOTPScreen } from './VerifyOTPScreen';
import './OTPScreens.css';

/**
 * OTPAuth Component
 * Manages the complete OTP authentication flow:
 * 1. Email input → Send OTP code
 * 2. Code verification → Custom token authentication
 * 3. Success → User logged in
 */
export const OTPAuth = ({ onAuthSuccess, onAuthError }) => {
  const [step, setStep] = useState('email'); // 'email' | 'verify' | 'success'
  const [email, setEmail] = useState('');
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setStep('success');
        if (onAuthSuccess) {
          onAuthSuccess(currentUser);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [onAuthSuccess]);

  const handleEmailSubmit = () => {
    setStep('verify');
  };

  const handleEmailChange = (newEmail) => {
    setEmail(newEmail);
  };

  const handleBackToEmail = () => {
    setStep('email');
    setEmail('');
  };

  const handleVerifySuccess = () => {
    // Auth state change will be handled by the onAuthStateChanged listener
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setStep('email');
      setEmail('');
      setUser(null);
      setAuthError(null);
    } catch (error) {
      setAuthError(error.message);
      if (onAuthError) {
        onAuthError(error);
      }
    }
  };

  return (
    <div className="otp-auth-wrapper">
      {step === 'email' && (
        <SendOTPScreen
          onSuccess={handleEmailSubmit}
          onEmailChange={handleEmailChange}
        />
      )}

      {step === 'verify' && (
        <VerifyOTPScreen
          email={email}
          onSuccess={handleVerifySuccess}
          onBack={handleBackToEmail}
        />
      )}

      {step === 'success' && user && (
        <div className="otp-screen success-screen">
          <div className="otp-container success-container">
            <div className="success-icon">✓</div>
            <h1>Authentification réussie !</h1>
            <p className="user-email">{user.email}</p>
            <div className="user-info">
              <p>
                <strong>Bienvenue</strong> sur WebOrbit
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="btn btn-primary btn-block"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      )}

      {authError && (
        <div className="auth-error-toast">
          <span>⚠️</span> {authError}
        </div>
      )}
    </div>
  );
};

/**
 * Success Screen Styles (add to OTPScreens.css if needed)
 */
const successStyles = `
.success-screen {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}

.success-container {
  text-align: center;
}

.success-icon {
  font-size: 80px;
  margin-bottom: 20px;
  animation: bounce 0.8s ease-in-out;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

.success-container h1 {
  color: #065f46;
  margin: 0 0 10px 0;
}

.user-email {
  color: #047857;
  font-weight: 600;
  margin: 0 0 20px 0;
  font-size: 14px;
}

.user-info {
  background: rgba(255, 255, 255, 0.2);
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.user-info p {
  color: #065f46;
  margin: 0;
}

.auth-error-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #fee2e2;
  color: #dc2626;
  padding: 16px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease;
  z-index: 1000;
}
`;
