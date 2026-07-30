/**
 * EXEMPLE D'INTÉGRATION DU SYSTÈME OTP
 * 
 * Ce fichier montre comment intégrer le composant OTPAuth dans votre application.
 * L'authentification par OTP peut être utilisée en parallèle ou en remplacement
 * du système Supabase existant.
 * 
 * OPTION 1 : Utiliser OTPAuth comme écran d'authentification principal
 * OPTION 2 : Ajouter un onglet "Se connecter par OTP" dans l'AuthModal existant
 * OPTION 3 : Créer une route dédiée pour l'authentification OTP
 */

// ============================================================================
// OPTION 1 : REMPLACER AuthModal PAR OTPAuth
// ============================================================================

import { OTPAuth } from './pages/OTPAuth';

function AppWithOTPAuth() {
  const { user, profile, loading } = useAuth();
  
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/post/:postId" element={<PostEmbedPage />} />
        <Route path="/short/:shortId" element={<ShortEmbedPage />} />
        
        {/* Auth or main routes */}
        <Route path="/*" element={
          user ? (
            <Layout>
              {/* Routes protégées */}
            </Layout>
          ) : (
            // Remplacer <AuthModal /> par <OTPAuth />
            <OTPAuth 
              onAuthSuccess={(user) => {
                console.log('Utilisateur connecté:', user.email);
                // Vous pouvez ajouter une logique après l'authentification
              }}
              onAuthError={(error) => {
                console.error('Erreur d\'authentification:', error);
              }}
            />
          )
        } />
      </Routes>
    </Router>
  );
}

// ============================================================================
// OPTION 2 : AJOUTER UN ONGLET OTP DANS L'AuthModal EXISTANT
// ============================================================================

/**
 * Modifier src/components/AuthModal.jsx pour ajouter un onglet OTP :
 */

// import { SendOTPScreen } from '../pages/SendOTPScreen';
// import { VerifyOTPScreen } from '../pages/VerifyOTPScreen';
// 
// function AuthModal() {
//   const [method, setMethod] = useState('supabase'); // 'supabase' | 'otp'
//   const [otpStep, setOtpStep] = useState('email'); // 'email' | 'verify'
//   const [otpEmail, setOtpEmail] = useState('');
// 
//   return (
//     <div className="auth-modal">
//       <div className="auth-tabs">
//         <button 
//           className={method === 'supabase' ? 'active' : ''}
//           onClick={() => setMethod('supabase')}
//         >
//           Email/Mot de passe
//         </button>
//         <button 
//           className={method === 'otp' ? 'active' : ''}
//           onClick={() => setMethod('otp')}
//         >
//           OTP par Email
//         </button>
//       </div>
//       
//       {method === 'supabase' && <AuthForm />}
//       
//       {method === 'otp' && (
//         <>
//           {otpStep === 'email' && (
//             <SendOTPScreen 
//               onSuccess={() => setOtpStep('verify')}
//               onEmailChange={setOtpEmail}
//             />
//           )}
//           {otpStep === 'verify' && (
//             <VerifyOTPScreen 
//               email={otpEmail}
//               onSuccess={() => {
//                 // Refresh user data or redirect
//               }}
//               onBack={() => setOtpStep('email')}
//             />
//           )}
//         </>
//       )}
//     </div>
//   );
// }

// ============================================================================
// OPTION 3 : ROUTE DÉDIÉE POUR L'AUTHENTIFICATION OTP
// ============================================================================

// Dans App.jsx :

// <Routes>
//   <Route path="/auth/otp" element={<OTPAuth />} />
//   {/* Autres routes */}
// </Routes>

// Lien vers la page OTP depuis votre AuthModal :
// <Link to="/auth/otp">Se connecter par OTP</Link>

// ============================================================================
// UTILISATION AVEC FIREBASE CUSTOM TOKENS ET SUPABASE
// ============================================================================

/**
 * Si vous voulez utiliser à la fois Firebase Custom Tokens et Supabase,
 * vous pouvez créer un hook qui synchronise les deux :
 */

// import { useEffect } from 'react';
// import { auth } from '../services/firebase';
// import { supabase } from '../services/supabase';
//
// export const useSyncFirebaseSupabase = () => {
//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
//       if (firebaseUser) {
//         // Récupérer le token Firebase
//         const firebaseToken = await firebaseUser.getIdToken();
//         
//         // Créer ou mettre à jour l'utilisateur Supabase
//         const { data, error } = await supabase.auth.signInWithIdToken({
//           provider: 'custom',
//           token: firebaseToken,
//         });
//         
//         if (error) {
//           console.error('Erreur de synchronisation:', error);
//         }
//       } else {
//         // Se déconnecter de Supabase
//         await supabase.auth.signOut();
//       }
//     });
//
//     return () => unsubscribe();
//   }, []);
// };

// ============================================================================
// EXEMPLE D'UTILISATION COMPLET
// ============================================================================

/*
Voici un exemple complet avec gestion d'état :

```jsx
import { useState, useEffect } from 'react';
import { OTPAuth } from './pages/OTPAuth';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading } = useAuth();
  const [showOTPAuth, setShowOTPAuth] = useState(false);

  useEffect(() => {
    // Si l'utilisateur n'est pas connecté et que le flag est activé, montrer OTP
    if (!user && showOTPAuth) {
      // Afficher le composant OTPAuth
    }
  }, [user, showOTPAuth]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {user ? (
        <Layout>
          {/* Votre application */}
        </Layout>
      ) : (
        <div>
          {/* Choix entre les méthodes d'authentification */}
          <button onClick={() => setShowOTPAuth(false)}>
            Email/Mot de passe
          </button>
          <button onClick={() => setShowOTPAuth(true)}>
            Se connecter par OTP
          </button>
          
          {showOTPAuth ? (
            <OTPAuth 
              onAuthSuccess={(user) => {
                console.log('Connecté avec OTP:', user);
              }}
            />
          ) : (
            <AuthModal />
          )}
        </div>
      )}
    </>
  );
}
```
*/

// ============================================================================
// NOTES D'IMPLÉMENTATION
// ============================================================================

/*
1. ÉTAT UTILISATEUR APRÈS AUTHENTIFICATION OTP :
   - Firebase User est créé automatiquement via Custom Token
   - Pour intégrer avec Supabase, créez un utilisateur Supabase correspondant
   - Vous pouvez utiliser le email comme identifiant unique

2. GESTION DE SESSIONS MULTIPLES :
   - Firebase gère ses propres sessions
   - Supabase gère ses propres sessions
   - Vous devrez décider quelle source de vérité utiliser

3. POINTS DE RUPTURE POSSIBLES :
   - Assurez-vous que la clé API Resend est correctement configurée
   - Les variables d'environnement Firebase doivent être correctes
   - Les règles Firestore doivent permettre l'accès à la collection 'otps'

4. PROCHAINES ÉTAPES :
   - Tester le flux complet avec les emulators Firebase
   - Ajouter une page de profil utilisateur après authentification
   - Implémenter la synchronisation Supabase-Firebase si nécessaire
   - Ajouter un système de "Se souvenir de moi" (rappel d'email)

*/

export default OTPAuthIntegrationExample;
