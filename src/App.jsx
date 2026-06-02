import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

// Pages
import FeedPage from './pages/FeedPage';
import ShortsPage from './pages/ShortsPage';
import MessengerPage from './pages/MessengerPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

// Components
import Layout from './components/Layout';
import AuthModal from './components/AuthModal';
import ProfileSetupModal from './components/ProfileSetupModal';
import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './services/supabase';

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
          let message = 'Nouvelle notification';
          if (notif.type === 'like') message = 'Quelqu\'un a aimé votre post ❤️';
          if (notif.type === 'comment') message = 'Nouveau commentaire sur votre post 💬';
          if (notif.type === 'follow') message = 'Vous avez un nouvel abonné ! 👤';
          
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
      {!user && <AuthModal />}
      
      {showProfileSetup && <ProfileSetupModal onClose={handleSkipSetup} />}

      {user && (
        <>
          <Toaster position="top-center" />
          <Layout>
            <Routes>
              <Route path="/" element={<FeedPage />} />
            <Route path="/shorts" element={<ShortsPage />} />
            <Route path="/messenger" element={<MessengerPage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
        </>
      )}
    </Router>
  );
}

export default App;
