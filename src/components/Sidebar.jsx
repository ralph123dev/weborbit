import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Home, Video, MessageCircle, User, Settings, Bot, LogOut } from 'lucide-react';
import { supabase } from '../services/supabase';
import logo from '../assets/logo.png';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const { user, profile } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Accueil' },
    { path: '/shorts', icon: Video, label: 'Shorts' },
    { path: '/messenger', icon: MessageCircle, label: 'Messenger' },
    { path: `/profile/${user?.id}`, icon: User, label: 'Profil' },
    { path: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header flex items-center justify-center">
        <img src={logo} alt="Orbit Post Logo" style={{ width: '150px', height: 'auto', objectFit: 'contain' }} />
        <button className="close-btn" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              if (window.innerWidth <= 768) onClose();
            }}
          >
            <item.icon className="nav-icon" size={24} />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-divider"></div>
        
        <button className="nav-item orbit-ia-btn">
          <Bot className="nav-icon text-primary" size={24} />
          <span className="nav-label font-bold text-primary">Orbit IA</span>
        </button>
      </nav>

      {profile && (
        <div className="sidebar-footer">
          <div className="user-mini-profile">
            <img 
              src={profile.avatar_url || 'https://via.placeholder.com/40'} 
              alt={profile.first_name || 'User'} 
              className="user-avatar"
            />
            <div className="user-info">
              <div className="user-name font-bold">{profile.first_name} {profile.last_name}</div>
              <div className="user-handle text-secondary">@{profile.username || 'user'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Déconnexion">
            <LogOut size={20} />
          </button>
        </div>
      )}
    </aside>
  );
}
