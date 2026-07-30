import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { auth, functions } from '../services/firebase';

export const useOTPAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [lastEmailSent, setLastEmailSent] = useState(null);
  const [codeExpiration, setCodeExpiration] = useState(null);

  // Send OTP code to email
  const sendOTP = useCallback(async (email) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const sendCodeFn = httpsCallable(functions, 'sendCode');
      const response = await sendCodeFn({ email });

      setLastEmailSent(email);
      setCodeExpiration(Date.now() + response.data.expiresIn * 1000);
      setSuccess(true);

      return {
        success: true,
        expiresIn: response.data.expiresIn,
        message: response.data.message,
      };
    } catch (err) {
      const errorMessage =
        err.message || 'Erreur lors de l\'envoi du code. Veuillez réessayer.';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify OTP code and sign in
  const verifyOTP = useCallback(
    async (email, code) => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const verifyCodeFn = httpsCallable(functions, 'verifyCode');
        const response = await verifyCodeFn({ email, code });

        // Sign in with custom token
        const userCredential = await signInWithCustomToken(
          auth,
          response.data.token
        );

        setSuccess(true);

        return {
          success: true,
          user: userCredential.user,
          message: response.data.message,
        };
      } catch (err) {
        const errorMessage = err.message || 'Erreur lors de la vérification du code.';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Reset state
  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
    setLoading(false);
  }, []);

  // Get remaining time before code expiration
  const getRemainingTime = useCallback(() => {
    if (!codeExpiration) return null;
    const remaining = codeExpiration - Date.now();
    if (remaining <= 0) return null;
    return Math.ceil(remaining / 1000);
  }, [codeExpiration]);

  // Check if can resend OTP (60 second cooldown)
  const canResendOTP = useCallback(() => {
    if (!lastEmailSent) return true;
    const timeSinceLastSend = Date.now() - new Date(lastEmailSent).getTime();
    return timeSinceLastSend >= 60000;
  }, [lastEmailSent]);

  return {
    loading,
    error,
    success,
    sendOTP,
    verifyOTP,
    reset,
    lastEmailSent,
    codeExpiration,
    getRemainingTime,
    canResendOTP,
  };
};
