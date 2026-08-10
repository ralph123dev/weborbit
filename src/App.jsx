import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

// Pages
import FeedPage from './pages/FeedPage';
import GroupFeedPage from './pages/GroupFeedPage';
import InvitationsPage from './pages/InvitationsPage';
import MessengerPage from './pages/MessengerPage';
import PostEmbedPage from './pages/PostEmbedPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ShortEmbedPage from './pages/ShortEmbedPage';
import ShortsPage from './pages/ShortsPage';
import VerifyEmail from './pages/VerifyEmail';

// Components
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import notificationSound from './assets/tir.ogg';
import AnnouncementPopup from './components/AnnouncementPopup';
import AuthModal from './components/AuthModal';
import EmailVerificationPopup from './components/EmailVerificationPopup';
import InterestsModal from './components/InterestsModal';
import Layout from './components/Layout';
import MaintenanceModal from './components/MaintenanceModal';
import ProfileSetupModal from './components/ProfileSetupModal';
import { supabase } from './services/supabase';

const MAINTENANCE_ACTIVE =
  import.meta.env.VITE_MAINTENANCE_ACTIVE === 'true' ||
  import.meta.env.VITE_MAINTENANCE_ACTIVE === '1';

function App() {
  const { user, profile, loading, setProfile } = useAuth();
  useTheme(); // Init theme
  
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showInterestsSetup, setShowInterestsSetup] = useState(false);

  useEffect(() => {
    if (user && profile) {
      if (profile.is_verified) {
        const isSetupCompleted = localStorage.getItem('profileSetupCompleted') === 'true';
        
        if (!isSetupCompleted) {
          // Show profile setup if essential fields are missing
          const needsFirstName = !profile.first_name;
          const needsAvatar = !profile.avatar_url;
          
          if (needsFirstName || needsAvatar) {
            setShowProfileSetup(true);
          } else {
            setShowProfileSetup(false);
            // Si les champs existent déjà, on marque comme complété
            localStorage.setItem('profileSetupCompleted', 'true');
          }
        } else {
          setShowProfileSetup(false);
        }
      } else {
        setShowProfileSetup(false);
      }
    }
  }, [user, profile]);

  // Show email verification popup for unverified users
  useEffect(() => {
    if (user && profile && !profile.is_verified) {
      setShowEmailVerification(true);
    } else {
      setShowEmailVerification(false);
    }
  }, [user, profile]);

  // Show interests setup
  useEffect(() => {
    if (user && profile) {
      const isInterestsCompleted = localStorage.getItem('interestsSetupCompleted') === 'true';
      if (!isInterestsCompleted) {
        setShowInterestsSetup(true);
      } else {
        setShowInterestsSetup(false);
      }
    } else {
      setShowInterestsSetup(false);
    }
  }, [user, profile]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [loaderProgress, setLoaderProgress] = useState(0);

  useEffect(() => {
    const handleOpenAuth = () => setShowAuthModal(true);
    window.addEventListener('open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  useEffect(() => {
    if (!user || !profile) {
      setShowAnnouncement(false);
      return;
    }

    setShowAnnouncement(true);
  }, [user, profile]);

  useEffect(() => {
    if (!loading) {
      setLoaderProgress(100);
      return;
    }

    setLoaderProgress(0);
    let progress = 0;
    let timeoutId;

    const tick = () => {
      const remaining = 100 - progress;
      progress = Math.min(98, progress + Math.max(0.4, remaining * 0.045));
      setLoaderProgress(progress);
      if (progress < 98) {
        timeoutId = window.setTimeout(tick, 16);
      }
    };

    timeoutId = window.setTimeout(tick, 16);
    return () => window.clearTimeout(timeoutId);
  }, [loading]);

  const handleSkipSetup = () => {
    localStorage.setItem('profileSetupCompleted', 'true');
    setShowProfileSetup(false);
  };

  const handleEmailVerified = () => {
    setShowEmailVerification(false);
    // Update profile state to reflect verification
    if (profile) {
      setProfile({ ...profile, is_verified: true });
    }
    toast.success('Votre compte est maintenant vérifié ! ✅', {
      style: { borderRadius: '10px', background: '#333', color: '#fff' },
      duration: 4000,
    });
  };

  // Global Notification Listener
  useEffect(() => {
    if (!user) return;

    // Request native notification permission if not yet granted or denied
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        const notif = payload.new;
        if (!notif.is_read) {
          // Play notification sound
          try {
            const audio = new Audio(notificationSound);
            audio.volume = 0.7;
            audio.play().catch(() => {});
          } catch (e) {
            // Ignore audio errors (e.g. autoplay blocked)
          }

          let message = 'Nouvelle notification';
          if (notif.type === 'like') message = 'Quelqu\'un a aimé votre post ❤️';
          if (notif.type === 'comment') message = 'Nouveau commentaire sur votre post 💬';
          if (notif.type === 'follow') message = 'Vous avez un nouvel abonné ! 👤';
          if (notif.type === 'invitation') message = 'Vous avez reçu une nouvelle invitation ! 🤝';
          if (notif.type === 'invitation_accepted') message = 'Votre invitation a été acceptée ! ✅';
          
          // Send Native Push Notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Orbit', {
              body: message,
              icon: '/logo.png', // Assuming logo.png is in public folder
            });
          }

          toast(message, {
            icon: '🔔',
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (MAINTENANCE_ACTIVE) {
    return <MaintenanceModal />;
  }

  if (loading) {
    return (
      <div className="orbit-loader-overlay">
        <div className="orbit-loader-stars" />
        <div className="orbit-loader-stage">
          <div className="orbit-system">
            <div className="orbit-ring orbit-ring--3" />
            <div className="orbit-ring orbit-ring--2" />
            <div className="orbit-ring orbit-ring--1" />

            <div className="orbit-orbiter orbit-orbiter--3"><div className="orbit-satellite" /></div>
            <div className="orbit-orbiter orbit-orbiter--2"><div className="orbit-satellite orbit-satellite--violet" /></div>
            <div className="orbit-orbiter orbit-orbiter--1"><div className="orbit-satellite orbit-satellite--white" /></div>

            <div className="orbit-core" />
          </div>

          <div className="orbit-label">
            <div className="orbit-label-title">
              Chargement <span>{Math.round(loaderProgress)}%</span>
            </div>
            <div className="orbit-progress-track">
              <div className="orbit-progress-fill" style={{ width: `${loaderProgress}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ProtectedRoute({ user, children }) {
    useEffect(() => {
      if (!user) {
        window.dispatchEvent(new Event('open-auth-modal'));
      }
    }, [user]);

    if (!user) {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  return (
    <Router>
      <Toaster position="top-center" />
      {showProfileSetup && <ProfileSetupModal onClose={handleSkipSetup} />}
      {showEmailVerification && !showProfileSetup && (
        <EmailVerificationPopup
          profile={profile}
          onVerified={handleEmailVerified}
        />
      )}
      {showInterestsSetup && !showProfileSetup && !showEmailVerification && (
        <InterestsModal onClose={() => {
          localStorage.setItem('interestsSetupCompleted', 'true');
          setShowInterestsSetup(false);
        }} />
      )}
      {showAuthModal && (
        <AuthModal isOverlay={true} onClose={() => setShowAuthModal(false)} />
      )}
      {showAnnouncement && (
        <AnnouncementPopup
          isOpen={showAnnouncement}
          onClose={() => {
            localStorage.setItem('hasSeenAnnouncement', 'true');
            setShowAnnouncement(false);
          }}
        />
      )}

      <Routes>
        {/* Public Embed Pages */}
        <Route path="/post/:postId" element={<PostEmbedPage />} />
        <Route path="/short/:shortId" element={<ShortEmbedPage />} />
        <Route path="/verify" element={<VerifyEmail />} />

        {/* Public/Private routes nested in Layout */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<FeedPage />} />
              <Route path="/shorts" element={<ShortsPage />} />
              <Route path="/messenger" element={
                <ProtectedRoute user={user}>
                  <MessengerPage />
                </ProtectedRoute>
              } />
              <Route path="/profile/:userId" element={<ProfilePage />} />
              <Route path="/group/:groupId" element={<GroupFeedPage />} />
              <Route path="/settings" element={
                <ProtectedRoute user={user}>
                  <SettingsPage />
                </ProtectedRoute>
              } />
              <Route path="/invitations" element={
                <ProtectedRoute user={user}>
                  <InvitationsPage />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
//j