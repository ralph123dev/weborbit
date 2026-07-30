/**
 * TESTS ET DÉPANNAGE DU SYSTÈME D'AUTHENTIFICATION OTP
 * 
 * Utilisez ce fichier pour tester votre implémentation OTP
 */

// ============================================================================
// TEST 1 : Vérifier la configuration Firebase
// ============================================================================

export const testFirebaseConfig = async () => {
  try {
    const { app, auth, db, functions } = await import('./src/services/firebase.js');
    
    console.log('✅ Configuration Firebase chargée');
    console.log('App ID:', app.options.appId);
    console.log('Project ID:', app.options.projectId);
    console.log('Auth:', auth);
    console.log('Firestore:', db);
    console.log('Functions:', functions);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur de configuration Firebase:', error);
    return false;
  }
};

// ============================================================================
// TEST 2 : Tester l'envoi d'un code OTP
// ============================================================================

export const testSendOTP = async (email) => {
  try {
    const { functions } = await import('./src/services/firebase.js');
    const { httpsCallable } = await import('firebase/functions');
    
    console.log(`📧 Test d'envoi d'OTP à ${email}...`);
    
    const sendCodeFn = httpsCallable(functions, 'sendCode');
    const response = await sendCodeFn({ email });
    
    console.log('✅ Code envoyé avec succès');
    console.log('Réponse:', response.data);
    console.log(`⏱️  Code expire dans: ${response.data.expiresIn} secondes`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du code:', error.message);
    console.error('Details:', error);
    return null;
  }
};

// ============================================================================
// TEST 3 : Tester la vérification d'un code OTP
// ============================================================================

export const testVerifyOTP = async (email, code) => {
  try {
    const { functions } = await import('./src/services/firebase.js');
    const { httpsCallable } = await import('firebase/functions');
    
    console.log(`🔐 Test de vérification du code ${code} pour ${email}...`);
    
    const verifyCodeFn = httpsCallable(functions, 'verifyCode');
    const response = await verifyCodeFn({ email, code });
    
    console.log('✅ Code vérifié avec succès');
    console.log('Token:', response.data.token.substring(0, 50) + '...');
    
    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du code:', error.message);
    console.error('Details:', error);
    return null;
  }
};

// ============================================================================
// TEST 4 : Flux complet (Envoi + Vérification + Connexion)
// ============================================================================

export const testCompleteOTPFlow = async (testEmail) => {
  console.log('\n🚀 Démarrage du test de flux complet OTP\n');
  
  // Step 1: Send OTP
  console.log('ÉTAPE 1 : Envoi du code OTP');
  console.log('-----------------------------------');
  const sendResult = await testSendOTP(testEmail);
  if (!sendResult) {
    console.error('❌ Arrêt du test: Erreur lors de l\'envoi');
    return false;
  }
  
  // Step 2: Get code from user
  console.log('\nÉTAPE 2 : Entrée du code');
  console.log('-----------------------------------');
  console.log('⚠️  Pour le test automatisé, vous devrez entrer le code manuellement');
  console.log('💡 Conseil: Vérifiez votre email pour obtenir le code');
  
  const userCode = prompt('Entrez le code reçu par email:');
  if (!userCode) {
    console.error('❌ Arrêt du test: Pas de code fourni');
    return false;
  }
  
  // Step 3: Verify code and sign in
  console.log('\nÉTAPE 3 : Vérification du code et authentification');
  console.log('-----------------------------------');
  const verifyResult = await testVerifyOTP(testEmail, userCode);
  if (!verifyResult) {
    console.error('❌ Arrêt du test: Erreur lors de la vérification');
    return false;
  }
  
  // Step 4: Sign in with custom token
  console.log('\nÉTAPE 4 : Connexion avec Custom Token');
  console.log('-----------------------------------');
  try {
    const { auth } = await import('./src/services/firebase.js');
    const { signInWithCustomToken } = await import('firebase/auth');
    
    const userCredential = await signInWithCustomToken(auth, verifyResult.token);
    console.log('✅ Utilisateur connecté avec succès');
    console.log('Email:', userCredential.user.email);
    console.log('UID:', userCredential.user.uid);
    console.log('Email vérifié:', userCredential.user.emailVerified);
  } catch (error) {
    console.error('❌ Erreur lors de la connexion:', error.message);
    return false;
  }
  
  console.log('\n✅ Flux complet réussi!\n');
  return true;
};

// ============================================================================
// TEST 5 : Test de Rate Limiting
// ============================================================================

export const testRateLimiting = async (email) => {
  console.log('\n🚀 Test de Rate Limiting\n');
  
  // First attempt
  console.log('Tentative 1: Premier envoi...');
  const result1 = await testSendOTP(email);
  if (!result1) {
    console.error('❌ Premier envoi échoué');
    return false;
  }
  console.log('✅ Premier envoi réussi');
  
  // Second attempt immediately
  console.log('\nTentative 2: Envoi immédiat (devrait échouer)...');
  const result2 = await testSendOTP(email);
  if (!result2) {
    console.log('✅ Rate limiting fonctionne correctement');
    return true;
  } else {
    console.error('❌ Rate limiting ne fonctionne pas');
    return false;
  }
};

// ============================================================================
// TEST 6 : Vérifier l'état Firestore
// ============================================================================

export const inspectFirestoreOTP = async (email) => {
  try {
    const { db } = await import('./src/services/firebase.js');
    const { doc, getDoc } = await import('firebase/firestore');
    
    console.log(`\n📄 Inspection du document OTP pour ${email}\n`);
    
    const docRef = doc(db, 'otps', email.toLowerCase());
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('✅ Document trouvé');
      console.log('Code:', data.code ? '****' : 'N/A'); // Ne pas afficher le code
      console.log('Email:', data.email);
      console.log('Créé à:', new Date(data.createdAt?.toDate()));
      console.log('Expire à:', new Date(data.expiresAt));
      console.log('Tentatives:', data.attempts);
      console.log('Bloqué:', data.blocked);
      console.log('Bloqueé jusqu\'à:', data.blockedUntil ? new Date(data.blockedUntil) : 'N/A');
    } else {
      console.log('❌ Document non trouvé');
      console.log('Le document a probablement été supprimé (single-use)');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la lecture:', error.message);
  }
};

// ============================================================================
// COMMANDES DE DÉBOGAGE
// ============================================================================

/*
Utilisez ces commandes dans la console du navigateur pour tester :

1. Test configuration Firebase :
   testFirebaseConfig()

2. Envoyer un code OTP :
   testSendOTP('test@example.com')

3. Vérifier un code :
   testVerifyOTP('test@example.com', '123456')

4. Test complet du flux :
   testCompleteOTPFlow('test@example.com')

5. Test du rate limiting :
   testRateLimiting('test@example.com')

6. Inspecter Firestore :
   inspectFirestoreOTP('test@example.com')

*/

// ============================================================================
// CHECKLIST DE DÉPANNAGE
// ============================================================================

export const debugOTPIssue = async () => {
  console.log('\n🔍 CHECKLIST DE DÉPANNAGE\n');
  
  const checks = {
    '1. Firebase Config': await testFirebaseConfig(),
    '2. Email valide': (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  };
  
  console.log('\n✅ Checklist complètée\n');
};

// ============================================================================
// MESSAGES D'ERREUR COURANTS ET SOLUTIONS
// ============================================================================

export const commonErrors = {
  'PERMISSION_DENIED': {
    message: 'Les règles Firestore bloquent l\'accès',
    solution: [
      '1. Vérifiez que vous avez déployé firestore.rules',
      '2. Vérifiez que les règles permettent l\'accès à la collection otps',
      '3. Redéployez les règles: firebase deploy --only firestore:rules'
    ]
  },
  'UNAUTHENTICATED': {
    message: 'L\'utilisateur n\'est pas authentifié',
    solution: [
      '1. Assurez-vous que Firebase Auth est initialisé',
      '2. Vérifiez les variables d\'environnement Firebase',
      '3. Vérifiez la configuration du Custom Token'
    ]
  },
  'INVALID_EMAIL': {
    message: 'L\'adresse email est invalide',
    solution: [
      '1. Vérifiez le format de l\'email',
      '2. Assurez-vous qu\'il n\'y a pas d\'espaces avant/après',
      '3. Utilisez un email valide pour tester'
    ]
  },
  'RATE_LIMITED': {
    message: 'Trop de requêtes',
    solution: [
      '1. Attendez 60 secondes avant de renvoyer un code',
      '2. C\'est un comportement normal pour éviter les abus',
      '3. Vous pouvez configurer cette durée dans functions/index.js'
    ]
  },
  'WRONG_CODE': {
    message: 'Le code est incorrect',
    solution: [
      '1. Assurez-vous d\'avoir copié le code correctement',
      '2. Vérifiez que le code n\'a pas expiré (10 minutes)',
      '3. Demandez un nouveau code si expiré'
    ]
  },
  'TOO_MANY_ATTEMPTS': {
    message: 'Trop de tentatives incorrectes',
    solution: [
      '1. Attendez 15 minutes avant de réessayer',
      '2. Vous pouvez demander un nouveau code immédiatement',
      '3. Le nouveau code réinitialise le compteur d\'essais'
    ]
  },
  'RESEND_ERROR': {
    message: 'Erreur lors de l\'envoi de l\'email',
    solution: [
      '1. Vérifiez votre clé API Resend',
      '2. Assurez-vous que le domaine est vérifié dans Resend',
      '3. Vérifiez les logs Cloud Functions: firebase functions:log',
      '4. Vérifiez que l\'adresse email "from" est correcte'
    ]
  }
};

// ============================================================================
// FONCTION DE DÉBOGAGE COMPLÈTE
// ============================================================================

export const fullDebugReport = async (email = 'test@example.com') => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   RAPPORT DE DÉBOGAGE COMPLET          ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  // 1. Config Firebase
  console.log('1️⃣  Configuration Firebase');
  console.log('─────────────────────────────────');
  const firebaseOk = await testFirebaseConfig();
  
  // 2. Essayer d'envoyer un code
  console.log('\n2️⃣  Test d\'envoi de code');
  console.log('─────────────────────────────────');
  const sendOk = await testSendOTP(email);
  
  // 3. Inspecter Firestore
  console.log('\n3️⃣  État Firestore');
  console.log('─────────────────────────────────');
  await inspectFirestoreOTP(email);
  
  // 4. Résumé
  console.log('\n4️⃣  Résumé');
  console.log('─────────────────────────────────');
  console.log(`Firebase Config: ${firebaseOk ? '✅' : '❌'}`);
  console.log(`Envoi de code: ${sendOk ? '✅' : '❌'}`);
  
  if (!firebaseOk) {
    console.log('\n⚠️  Problème détecté: Configuration Firebase');
  }
  if (!sendOk) {
    console.log('\n⚠️  Problème détecté: Envoi de code');
  }
  
  console.log('\n✅ Rapport complété\n');
};

// Export pour utilisation en console
if (typeof window !== 'undefined') {
  window.otpDebug = {
    testFirebaseConfig,
    testSendOTP,
    testVerifyOTP,
    testCompleteOTPFlow,
    testRateLimiting,
    inspectFirestoreOTP,
    fullDebugReport,
    commonErrors,
  };
}
