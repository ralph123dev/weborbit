import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

admin.initializeApp();
const db = admin.firestore();
const resend = new Resend(process.env.RESEND_API_KEY);

// Validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Generate random 6-digit code
const generateOTPCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Cloud Function: sendCode
 * Sends a 6-digit OTP to the provided email via Resend
 * Rate-limited to 1 request per 60 seconds per email
 */
export const sendCode = functions.https.onCall(async (data, context) => {
  const { email } = data;

  // Validate email format
  if (!email || !isValidEmail(email)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email invalide. Veuillez entrer une adresse email valide.'
    );
  }

  const emailLower = email.toLowerCase();
  const otpDocRef = db.collection('otps').doc(emailLower);
  const now = Date.now();
  const rateLimitWindow = 60000; // 60 seconds

  try {
    // Check rate limit
    const otpDoc = await otpDocRef.get();
    if (otpDoc.exists) {
      const lastSentTime = otpDoc.data().lastSentTime || 0;
      const timeSinceLastRequest = now - lastSentTime;

      if (timeSinceLastRequest < rateLimitWindow) {
        const waitSeconds = Math.ceil((rateLimitWindow - timeSinceLastRequest) / 1000);
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Veuillez attendre ${waitSeconds} secondes avant de renvoyer un code.`
        );
      }
    }

    // Generate new OTP code
    const code = generateOTPCode();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    // Store OTP in Firestore
    await otpDocRef.set({
      code,
      email: emailLower,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      lastSentTime: now,
      attempts: 0,
      blocked: false,
      blockedUntil: null,
    }, { merge: true });

    // Send email via Resend
    try {
      await resend.emails.send({
        from: 'noreply@weborbit.com',
        to: emailLower,
        subject: 'Votre code de vérification WebOrbit',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Vérification de votre email</h2>
            <p style="font-size: 16px; color: #555;">
              Voici votre code de vérification :
            </p>
            <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="font-size: 32px; font-weight: bold; color: #007bff; margin: 0; letter-spacing: 2px;">
                ${code}
              </p>
            </div>
            <p style="font-size: 14px; color: #999;">
              Ce code expirera dans 10 minutes. Ne le partagez avec personne.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999;">
              Si vous n'avez pas demandé ce code, ignorez ce message.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Resend API error:', emailError);
      // Delete the OTP record if email sending fails
      await otpDocRef.delete();
      throw new functions.https.HttpsError(
        'internal',
        'Erreur lors de l\'envoi du code. Veuillez réessayer.'
      );
    }

    return {
      success: true,
      message: `Code envoyé à ${emailLower}`,
      expiresIn: 10 * 60, // seconds
    };
  } catch (error) {
    console.error('Error in sendCode:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Une erreur est survenue. Veuillez réessayer.'
    );
  }
});

/**
 * Cloud Function: verifyCode
 * Verifies the OTP code and creates a Firebase Custom Token
 * Rate-limited to 5 attempts per code
 */
export const verifyCode = functions.https.onCall(async (data, context) => {
  const { email, code } = data;

  // Validate inputs
  if (!email || !isValidEmail(email)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email invalide.'
    );
  }

  if (!code || code.toString().length !== 6 || !/^\d+$/.test(code.toString())) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Code invalide. Le code doit contenir 6 chiffres.'
    );
  }

  const emailLower = email.toLowerCase();
  const otpDocRef = db.collection('otps').doc(emailLower);
  const now = Date.now();

  try {
    const otpDoc = await otpDocRef.get();

    if (!otpDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Aucun code trouvé pour cet email. Demandez un nouveau code.'
      );
    }

    const otpData = otpDoc.data();

    // Check if blocked due to too many attempts
    if (otpData.blocked && otpData.blockedUntil > now) {
      const remainingMinutes = Math.ceil((otpData.blockedUntil - now) / 60000);
      throw new functions.https.HttpsError(
        'permission-denied',
        `Trop de tentatives. Réessayez dans ${remainingMinutes} minute(s).`
      );
    }

    // Check if code has expired
    if (otpData.expiresAt <= now) {
      await otpDocRef.delete();
      throw new functions.https.HttpsError(
        'deadline-exceeded',
        'Le code a expiré. Demandez un nouveau code.'
      );
    }

    // Check if code matches
    if (otpData.code !== code.toString()) {
      const newAttempts = (otpData.attempts || 0) + 1;
      const blockThreshold = 5;

      let updateData = { attempts: newAttempts };

      if (newAttempts >= blockThreshold) {
        updateData.blocked = true;
        updateData.blockedUntil = now + 15 * 60 * 1000; // Block for 15 minutes
        await otpDocRef.update(updateData);
        throw new functions.https.HttpsError(
          'permission-denied',
          'Trop de tentatives incorrectes. Veuillez réessayer dans 15 minutes.'
        );
      }

      await otpDocRef.update(updateData);
      const remainingAttempts = blockThreshold - newAttempts;
      throw new functions.https.HttpsError(
        'unauthenticated',
        `Code incorrect. ${remainingAttempts} tentative(s) restante(s).`
      );
    }

    // Code is valid! Create custom token
    let uid = emailLower; // Use email as UID for consistency

    try {
      // Check if user exists, if not create one
      const user = await admin.auth().getUser(uid).catch(() => null);
      if (!user) {
        await admin.auth().createUser({
          uid,
          email: emailLower,
          emailVerified: true,
        });
      }
    } catch (authError) {
      console.error('Auth error:', authError);
      // Continue - we'll try to create custom token anyway
    }

    // Create custom token
    const customToken = await admin.auth().createCustomToken(uid, {
      email: emailLower,
      verified: true,
    });

    // Delete OTP record (single-use)
    await otpDocRef.delete();

    return {
      success: true,
      token: customToken,
      message: 'Authentification réussie',
    };
  } catch (error) {
    console.error('Error in verifyCode:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Une erreur est survenue lors de la vérification du code.'
    );
  }
});
