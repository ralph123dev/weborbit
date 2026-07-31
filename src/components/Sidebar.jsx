import { Home, LogOut, MessageCircle, PlusCircle, Settings, User, UserPlus, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import notificationSound from '../assets/tir.ogg';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import GroupCreateModal from './GroupCreateModal';
import GroupListModal from './GroupListModal';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose, onCreatePost }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isGroupListOpen, setIsGroupListOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();

    const channel = supabase
      .channel('unread-messages-sidebar')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, (payload) => {
        // Play notification sound for new message
        try {
          const audio = new Audio(notificationSound);
          audio.volume = 0.7;
          audio.play().catch(() => {});
        } catch (e) { /* ignore */ }

        // Show Native Push Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          const content = payload.new.content || (payload.new.image_url ? '📷 Image reçue' : 'Nouveau message reçu 💬');
          new Notification('Orbit - Message', {
            body: content,
            icon: '/logo.png'
          });
        }

        fetchUnreadCount();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (!error) {
        setUnreadCount(count || 0);
      }
    } catch (e) {
      console.error('Error fetching unread count:', e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };



  const handleNavItemClick = (e, item) => {
    if (item.path === '/shorts') {
      e.preventDefault();
      alert('Shorts en cours de maintenance');
      return;
    }

    if (!user && (item.label === 'Profil' || item.label === 'Messenger' || item.label === 'Paramètres' || item.label === 'Invitations')) {
      e.preventDefault();
      window.dispatchEvent(new Event('open-auth-modal'));
      if (window.innerWidth <= 768) onClose();
      return;
    }

    if (window.innerWidth <= 768) onClose();
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Accueil' },
    { path: '/shorts', icon: Video, label: 'Shorts' },
    { path: '/messenger', icon: MessageCircle, label: 'Messenger' },
    { path: `/profile/${user?.id || 'undefined'}`, icon: User, label: 'Profil' },
    { path: '/settings', icon: Settings, label: 'Paramètres' },
    { path: '/invitations', icon: UserPlus, label: 'Invitations' },
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
          <div key={item.path} style={{ display: 'flex', flexDirection: 'column' }}>
            <NavLink 
              to={item.path} 
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={(e) => handleNavItemClick(e, item)}
            >
              <div className="nav-item-wrapper">
                <item.icon className="nav-icon" size={24} />
                {item.label === 'Messenger' && unreadCount > 0 && (
                  <span className="sidebar-dot-badge"></span>
                )}
              </div>
              <span className="nav-label">{item.label}</span>
            </NavLink>
            {item.path === '/shorts' && (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!user) {
                    window.dispatchEvent(new Event('open-auth-modal'));
                  } else {
                    window.dispatchEvent(new Event('open-publish-short-modal'));
                  }
                  if (window.innerWidth <= 768) onClose();
                }}
                className="nav-item publish-short-nav-btn"
                style={{ 
                  marginLeft: '2rem', 
                  padding: '8px 12px', 
                  fontSize: '0.85rem', 
                  color: '#c084fc', 
                  background: 'rgba(168,85,247,0.08)', 
                  border: '1px dashed rgba(168,85,247,0.3)', 
                  borderRadius: '8px', 
                  width: 'calc(100% - 2.5rem)', 
                  marginTop: '2px', 
                  marginBottom: '8px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  textAlign: 'left',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(168,85,247,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(168,85,247,0.08)'}
              >
                <PlusCircle size={16} /> Publier un Short
              </button>
            )}
          </div>
        ))}

        <button
          className={`nav-item group-nav-item ${isGroupMenuOpen ? 'active' : ''}`}
          onClick={() => setIsGroupMenuOpen((current) => !current)}
          type="button"
        >
          <div className="nav-item-wrapper">
            <span className="nav-icon ion-nav-icon"><ion-icon name="people-outline"></ion-icon></span>
            <span className="nav-label">Groupes</span>
          </div>
          <span className="group-toggle-arrow">{isGroupMenuOpen ? '▾' : '▸'}</span>
        </button>

        {isGroupMenuOpen && (
          <div className="group-submenu">
            <button
              className="nav-item group-submenu-item"
              onClick={() => {
                if (!user) {
                  window.dispatchEvent(new Event('open-auth-modal'));
                } else {
                  setIsGroupModalOpen(true);
                }
                if (window.innerWidth <= 768) onClose();
              }}
              type="button"
            >
              <div className="nav-item-wrapper">
                <PlusCircle className="nav-icon" size={18} />
                <span className="nav-label">Créer un groupe</span>
              </div>
            </button>
            <button
              className="nav-item group-submenu-item"
              onClick={() => {
                if (!user) {
                  window.dispatchEvent(new Event('open-auth-modal'));
                } else {
                  setIsGroupListOpen(true);
                }
                if (window.innerWidth <= 768) onClose();
              }}
              type="button"
            >
              <div className="nav-item-wrapper">
                <UserPlus className="nav-icon" size={18} />
                <span className="nav-label">Mes groupes</span>
              </div>
            </button>
          </div>
        )}

        <div className="nav-divider"></div>

        <button className="nav-item create-post-btn" onClick={() => { 
          if (!user) {
            window.dispatchEvent(new Event('open-auth-modal'));
          } else {
            onCreatePost?.(); 
          }
          if (window.innerWidth <= 768) onClose(); 
        }}>
          <PlusCircle className="nav-icon" size={24} />
          <span className="nav-label font-bold">Créer</span>
        </button>

      </nav>

      <GroupListModal isOpen={isGroupListOpen} onClose={() => setIsGroupListOpen(false)} />
      <GroupCreateModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />

      {profile ? (
        <div className="sidebar-footer">
          <div className="user-mini-profile">
            <img 
              src={profile.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
              alt={profile.first_name || 'User'} 
              className="user-avatar"
              onError={(e) => e.target.src = 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'}
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
      ) : (
        <div className="sidebar-footer" style={{ padding: '1rem', justifyContent: 'center' }}>
          <button 
            className="btn btn-primary w-full flex items-center justify-center gap-2" 
            onClick={() => window.dispatchEvent(new Event('open-auth-modal'))}
            style={{ borderRadius: 'var(--radius-full)', fontWeight: 'bold', minHeight: '44px' }}
          >
            Se connecter
          </button>
        </div>
      )}
    </aside>
  );
}
