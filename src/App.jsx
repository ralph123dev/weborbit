import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

// Pages
import FeedPage from './pages/FeedPage';
import ShortsPage from './pages/ShortsPage';
import MessengerPage from './pages/MessengerPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import PostEmbedPage from './pages/PostEmbedPage';
import InvitationsPage from './pages/InvitationsPage';

// Components
import Layout from './components/Layout';
import AuthModal from './components/AuthModal';
import ProfileSetupModal from './components/ProfileSetupModal';
import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './services/supabase';
import notificationSound from './assets/tir.ogg';

function App() {
  const { user, profile, loading } = useAuth();
  useTheme(); // Init theme
  
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  useEffect(() => {
    if (user && profile && !profile.avatar_url && !localStorage.getItem('avatarSetupSkipped')) {
      // Check if it's a new account: we can assume if created recently
      const createdAge = new Date() - new Date(profile.created_at);
      if (createdAge < 1000 * 60 * 60) { // Less than 1 hour old
        setShowProfileSetup(true);
      }
    }
  }, [user, profile]);

  const handleSkipSetup = () => {
    localStorage.setItem('avatarSetupSkipped', 'true');
    setShowProfileSetup(false);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ height: '100vh' }}>
        <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" />
      {showProfileSetup && <ProfileSetupModal onClose={handleSkipSetup} />}

      <Routes>
        {/* Public Post Embed Page */}
        <Route path="/post/:postId" element={<PostEmbedPage />} />

        {/* Private Routes requiring Authentication */}
        <Route path="/*" element={
          user ? (
            <Layout>
              <Routes>
                <Route path="/" element={<FeedPage />} />
                <Route path="/shorts" element={<ShortsPage />} />
                <Route path="/messenger" element={<MessengerPage />} />
                <Route path="/profile/:userId" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/invitations" element={<InvitationsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          ) : (
            <AuthModal />
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;
