# Système d'Authentification OTP par Email

Guide complet d'implémentation d'un système d'authentification par code OTP (One-Time Password) envoyé par email pour WeborBit.

## 🏗️ Architecture

### Stack Technologique
- **Frontend**: React Native / React
- **Backend**: Firebase Cloud Functions (Node.js)
- **Base de données**: Firestore
- **Service Email**: Resend (https://resend.com)
- **Authentification**: Firebase Authentication avec Custom Token

## 📁 Structure des Fichiers

```
weborbit/
├── functions/
│   ├── package.json          # Dépendances Cloud Functions
│   └── index.js              # Cloud Functions (sendCode, verifyCode)
├── src/
│   ├── services/
│   │   └── firebase.js       # Configuration Firebase
│   ├── hooks/
│   │   └── useOTPAuth.js     # Hook d'authentification OTP
│   └── pages/
│       ├── SendOTPScreen.jsx # Écran d'envoi du code
│       ├── VerifyOTPScreen.jsx # Écran de vérification
│       ├── OTPAuth.jsx       # Composant complet d'authentification
│       └── OTPScreens.css    # Styles
├── .env                      # Variables d'environnement
├── firebase.json             # Configuration Firebase
├── firestore.rules           # Règles de sécurité Firestore
└── firestore.indexes.json    # Indexes Firestore
```

## 🔑 Configuration Initiale

### 1. Création d'un Projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Créez un nouveau projet
3. Activez Firestore
4. Activez Firebase Authentication
5. Activez Cloud Functions

### 2. Configuration de Resend

1. Créez un compte sur [Resend](https://resend.com)
2. Obtenez votre clé API
3. Vérifiez votre domaine d'envoi
4. Configurez l'adresse email "from" (ex: noreply@weborbit.com)

### 3. Variables d'Environnement

Complétez le fichier `.env` avec vos données Firebase:

```env
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre-project-id
VITE_FIREBASE_STORAGE_BUCKET=votre-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre-messaging-sender-id
VITE_FIREBASE_APP_ID=votre-app-id
VITE_FIREBASE_FUNCTIONS_REGION=europe-west1
```

### 4. Installation des Dépendances

```bash
# Dépendances du frontend
npm install

# Dépendances des Cloud Functions
cd functions
npm install
```

## ☁️ Cloud Functions

### Fonction `sendCode`

**Endpoint**: `sendCode`
**Paramètres**: `{ email: string }`

**Fonctionnalités**:
- ✅ Validation du format email
- ✅ Génération d'un code OTP à 6 chiffres
- ✅ Stockage du code dans Firestore (collection: `otps`)
- ✅ Expiration du code après 10 minutes
- ✅ Rate limiting: 1 envoi toutes les 60 secondes par email
- ✅ Envoi du code via API Resend
- ✅ Gestion des erreurs complète

**Structure Firestore (otps/{email})**:
```json
{
  "code": "123456",
  "email": "user@example.com",
  "createdAt": "2024-07-25T10:30:00Z",
  "expiresAt": 1721901000000,
  "lastSentTime": 1721899800000,
  "attempts": 0,
  "blocked": false,
  "blockedUntil": null
}
```

**Réponse Succès**:
```json
{
  "success": true,
  "message": "Code envoyé à user@example.com",
  "expiresIn": 600
}
```

**Erreurs**:
- `invalid-argument`: Email invalide
- `resource-exhausted`: Rate limiting (attendre 60 secondes)
- `internal`: Erreur d'envoi email

### Fonction `verifyCode`

**Endpoint**: `verifyCode`
**Paramètres**: `{ email: string, code: string }`

**Fonctionnalités**:
- ✅ Validation de l'email et du code
- ✅ Vérification de l'expiration du code
- ✅ Vérification du code correspondant
- ✅ Rate limiting: max 5 tentatives par code
- ✅ Blocage temporaire après 5 tentatives incorrectes (15 minutes)
- ✅ Création/récupération de l'utilisateur Firebase Auth
- ✅ Génération d'un Custom Token
- ✅ Suppression du code (single-use)

**Réponse Succès**:
```json
{
  "success": true,
  "token": "custom_firebase_token",
  "message": "Authentification réussie"
}
```

**Erreurs**:
- `invalid-argument`: Email ou code invalide
- `not-found`: Pas de code trouvé pour cet email
- `deadline-exceeded`: Code expiré
- `unauthenticated`: Code incorrect
- `permission-denied`: Trop de tentatives / compte bloqué

## 🎨 Interface Utilisateur

### SendOTPScreen
**Fichier**: `src/pages/SendOTPScreen.jsx`

**Composant**:
```jsx
<SendOTPScreen 
  onSuccess={handleEmailSubmit} 
  onEmailChange={handleEmailChange} 
/>
```

**Fonctionnalités**:
- 📧 Champ input email avec validation en temps réel
- ⏱️ Compte à rebours de 60 secondes avant de pouvoir renvoyer un code
- 🔄 Messages d'erreur et de succès
- ♿ Accessibilité complète

### VerifyOTPScreen
**Fichier**: `src/pages/VerifyOTPScreen.jsx`

**Composant**:
```jsx
<VerifyOTPScreen 
  email={email} 
  onSuccess={handleVerifySuccess} 
  onBack={handleBackToEmail} 
/>
```

**Fonctionnalités**:
- 🔢 6 champs pour les 6 chiffres du code
- ⌨️ Navigation automatique entre les champs
- 📋 Support du copier-coller pour le code complet
- ⏳ Minuteur d'expiration du code
- 🔙 Bouton retour pour demander un nouveau code
- ♿ Accessibilité complète

### OTPAuth (Composant Complet)
**Fichier**: `src/pages/OTPAuth.jsx`

**Utilisation**:
```jsx
import { OTPAuth } from './pages/OTPAuth';

function App() {
  return (
    <OTPAuth 
      onAuthSuccess={(user) => console.log('Connecté:', user)}
      onAuthError={(error) => console.log('Erreur:', error)}
    />
  );
}
```

## 🪝 Hook useOTPAuth

**Fichier**: `src/hooks/useOTPAuth.js`

**Propriétés**:
```javascript
const {
  loading,           // Boolean: en cours de traitement
  error,            // String | null: message d'erreur
  success,          // Boolean: dernière opération réussie
  sendOTP,          // Function: envoyer un code OTP
  verifyOTP,        // Function: vérifier un code OTP
  reset,            // Function: réinitialiser l'état
  lastEmailSent,    // String | null: email du dernier envoi
  codeExpiration,   // Number | null: timestamp d'expiration
  getRemainingTime, // Function: obtenir le temps restant en secondes
  canResendOTP,     // Function: vérifier si on peut renvoyer un code
} = useOTPAuth();
```

**Exemples**:
```javascript
// Envoyer un code
const result = await sendOTP('user@example.com');

// Vérifier un code
const result = await verifyOTP('user@example.com', '123456');

// Vérifier si on peut renvoyer un code
if (useOTPAuth().canResendOTP()) {
  // Afficher le bouton renvoyer
}

// Temps restant
const remaining = useOTPAuth().getRemainingTime();
console.log(`${remaining} secondes restantes`);
```

## 🚀 Déploiement

### Déploiement des Cloud Functions

```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Se connecter à Firebase
firebase login

# Configurer le projet
firebase init functions

# Déployer les functions
firebase deploy --only functions

# Voir les logs
firebase functions:log
```

### Déploiement du Frontend

```bash
# Build
npm run build

# Déployer sur Firebase Hosting
firebase deploy --only hosting
```

### Variables d'Environnement Cloud Functions

Définissez la clé API Resend dans les variables d'environnement Cloud Functions:

```bash
firebase functions:config:set resend.api_key="your_resend_api_key"
```

Ou modifiez directement `functions/index.js` pour utiliser une variable d'environnement:

```javascript
const resendApiKey = process.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey);
```

## 🔐 Sécurité

### Bonnes Pratiques Implémentées

1. **Validation des inputs**
   - Validation du format email côté backend
   - Validation du format du code (6 chiffres)
   - Sanitization des inputs

2. **Rate Limiting**
   - Max 1 envoi toutes les 60 secondes par email
   - Max 5 tentatives de vérification par code
   - Blocage temporaire (15 minutes) après 5 tentatives

3. **Codes à Usage Unique (Single-Use)**
   - Suppression du code après vérification réussie
   - Expiration automatique après 10 minutes

4. **Stockage Sécurisé**
   - Codes stockés en base de données (pas en cache client)
   - Pas de logging des codes en clair
   - Règles Firestore restrictives

5. **Authentification**
   - Custom Tokens générés côté serveur uniquement
   - Validation côté serveur avant génération du token
   - Sessions Firebase gérées par le SDK

6. **Communications**
   - HTTPS obligatoire (via Firebase)
   - Pas d'exposition de clés API côté client
   - Clé API Resend stockée côté serveur uniquement

## 🧪 Tests Locaux

### Utiliser les Emulators

```bash
# Démarrer les emulators
firebase emulators:start

# Dans le code, les emulators seront automatiquement utilisés
# si VITE_USE_EMULATOR=true dans le .env
```

### Test Complet du Flux

```javascript
import { useOTPAuth } from './hooks/useOTPAuth';

function TestOTP() {
  const { sendOTP, verifyOTP } = useOTPAuth();

  const test = async () => {
    // 1. Envoyer un code
    const sendResult = await sendOTP('test@example.com');
    console.log('Code envoyé:', sendResult);

    // 2. Vérifier le code (remplacer par le code reçu)
    const verifyResult = await verifyOTP('test@example.com', '123456');
    console.log('Vérification:', verifyResult);
  };

  return <button onClick={test}>Test OTP</button>;
}
```

## 📊 Monitoring

### Firebase Console

1. **Cloud Functions** → Voir les logs et les erreurs
2. **Firestore** → Visualiser les documents OTP
3. **Authentication** → Voir les utilisateurs créés

### Logs des Cloud Functions

```bash
firebase functions:log
```

## 🐛 Dépannage

### Problème: Code non reçu par email

**Solutions**:
1. Vérifiez le dossier spam
2. Vérifiez la clé API Resend dans les variables d'environnement
3. Vérifiez que le domaine est vérifié dans Resend
4. Vérifiez les logs Firebase: `firebase functions:log`

### Problème: "Rate limit - Attendre X secondes"

**Normal**: C'est le comportement attendu pour éviter les abus. Attendez avant de renvoyer un code.

### Problème: Code invalide ou expiré

**Solutions**:
1. Demandez un nouveau code (le précédent a peut-être expiré)
2. Vérifiez que vous entrez le bon code
3. Vérifiez que le code a moins de 10 minutes

### Problème: "Trop de tentatives"

**Solutions**:
1. Attendez 15 minutes avant de réessayer
2. Demandez un nouveau code (cela réinitialise le compteur)

## 📖 Ressources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Resend Documentation](https://resend.com/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

## 📝 Notes

- **Région Cloud Functions**: Par défaut `europe-west1`. Adapter selon votre localisation.
- **Expiration du code**: 10 minutes (configurable dans `functions/index.js`)
- **Rate limit**: 60 secondes (configurable dans `functions/index.js`)
- **Tentatives**: 5 tentatives max (configurable dans `functions/index.js`)
- **Blocage**: 15 minutes après 5 tentatives (configurable dans `functions/index.js`)

## 🎯 Prochaines Étapes

1. ✅ Tester localement avec les emulators
2. ✅ Obtenir les credentials Firebase
3. ✅ Configurer Resend et obtenir la clé API
4. ✅ Déployer les Cloud Functions
5. ✅ Déployer le frontend
6. ✅ Tester le flux complet en production
7. ✅ Ajouter une page de profil utilisateur après authentification

---

**Créé avec ❤️ pour WebOrbit**
