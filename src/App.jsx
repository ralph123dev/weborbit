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

function App() {
  const { user, loading } = useAuth();
  useTheme(); // Init theme

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
      
      {user && (
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
      )}
    </Router>
  );
}

export default App;
