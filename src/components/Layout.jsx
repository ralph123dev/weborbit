import { Home, Search, Send, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePostsCount } from '../hooks/usePostsCount';
import { supabase } from '../services/supabase';
import CreatePostModal from './CreatePostModal';
import './Layout.css';
import PublishShortModal from './PublishShortModal';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const postsCount = usePostsCount();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPublishShortModalOpen, setIsPublishShortModalOpen] = useState(false);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userStatuses, setUserStatuses] = useState({});

  const isMessengerPage = location.pathname.startsWith('/messenger');

  useEffect(() => {
    const handleOpenModal = () => {
      if (!user) {
        window.dispatchEvent(new Event('open-auth-modal'));
      } else {
        setIsCreateModalOpen(true);
      }
    };
    window.addEventListener('openCreatePostModal', handleOpenModal);
    return () => window.removeEventListener('openCreatePostModal', handleOpenModal);
  }, [user]);

  useEffect(() => {
    const handleOpenPublishShort = () => {
      if (!user) {
        window.dispatchEvent(new Event('open-auth-modal'));
      } else {
        setIsPublishShortModalOpen(true);
      }
    };
    window.addEventListener('open-publish-short-modal', handleOpenPublishShort);
    return () => window.removeEventListener('open-publish-short-modal', handleOpenPublishShort);
  }, [user]);

  useEffect(() => {
    // Permanent search in messenger
    if (isMessengerPage) {
      setIsSearchOpen(true);
    } else {
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  }, [isMessengerPage]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery.trim());
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async (query) => {
    if (!user) return;
    setIsSearching(true);
    try {
      // 1. Search users (excluding self)
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10);
      
      if (error) throw error;
      setSearchResults(users || []);

      // 2. Determine relationship status for these users
      const statuses = {};
      for (const u of users) {
        // Check if there are messages between them
        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${u.id}),and(sender_id.eq.${u.id},receiver_id.eq.${user.id})`)
          .limit(1);

        if (messages && messages.length > 0) {
          statuses[u.id] = 'contact';
          continue;
        }

        // Check if there is an accepted invitation
        const { data: acceptedInv } = await supabase
          .from('invitations')
          .select('id')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${u.id},status.eq.accepted),and(sender_id.eq.${u.id},receiver_id.eq.${user.id},status.eq.accepted)`)
          .limit(1);

        if (acceptedInv && acceptedInv.length > 0) {
          statuses[u.id] = 'contact';
          continue;
        }

        // Check pending invitations sent by me
        const { data: pendingSent } = await supabase
          .from('invitations')
          .select('id')
          .eq('sender_id', user.id)
          .eq('receiver_id', u.id)
          .eq('status', 'pending')
          .limit(1);

        if (pendingSent && pendingSent.length > 0) {
          statuses[u.id] = 'pending_sent';
          continue;
        }

        statuses[u.id] = 'none';
      }
      setUserStatuses(statuses);
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendInvitation = async (receiverId) => {
    try {
      await supabase.from('invitations').insert({
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending'
      });
      setUserStatuses(prev => ({ ...prev, [receiverId]: 'pending_sent' }));
      
      // Notify receiver
      await supabase.from('notifications').insert({
        user_id: receiverId,
        sender_id: user.id,
        type: 'invitation',
        content: "vous a envoyé une invitation"
      });
    } catch (err) {
      console.error('Error sending invitation:', err);
    }
  };

  return (
    <div className="layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {isSearchOpen ? (
          <div className="layout-search-container">
            <div className="layout-search-input-wrapper">
              <Search size={16} className="layout-search-icon" />
              <input 
                type="text" 
                placeholder="Rechercher un profil..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus={!isMessengerPage}
              />
              {!isMessengerPage && (
                <button className="layout-search-close" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                  &times;
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="layout-search-dropdown">
                {isSearching ? (
                  <div className="p-4 text-center text-secondary text-sm">Recherche...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-secondary text-sm">Aucun profil trouvé.</div>
                ) : (
                  searchResults.map(u => (
                    <div key={u.id} className="layout-search-result-item">
                      <img src={u.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{u.first_name} {u.last_name}</div>
                        <div className="text-xs text-secondary truncate">@{u.username}</div>
                      </div>
                      
                      {userStatuses[u.id] === 'contact' ? (
                        <button 
                          className="btn btn-primary layout-search-action-btn"
                          onClick={() => {
                            setIsSearchOpen(isMessengerPage); 
                            setSearchQuery(''); 
                            navigate(`/messenger?userId=${u.id}`);
                          }}
                        >
                          <MessageCircle size={14} /> Msg
                        </button>
                      ) : userStatuses[u.id] === 'pending_sent' ? (
                        <button className="btn btn-outline layout-search-action-btn disabled">
                          Envoyé
                        </button>
                      ) : (
                        <button 
                          className="btn btn-outline layout-search-action-btn"
                          onClick={() => handleSendInvitation(u.id)}
                        >
                          <Send size={14} /> Inviter
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="logo-text font-black text-primary cursor-pointer" onClick={() => setIsSearchOpen(true)}>
            Orbit
          </div>
        )}

        <div className="header-right-actions">
          <div 
            className="header-home-icon-container cursor-pointer relative" 
            onClick={() => navigate('/')}
          >
            <Home size={24} className={location.pathname === '/' ? 'text-primary' : 'text-secondary'} />
            {postsCount > 0 && (
              <span className="header-home-badge">
                {postsCount > 99 ? '99+' : postsCount}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        onCreatePost={() => setIsCreateModalOpen(true)}
      />

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Create Post Modal */}
      <CreatePostModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />

      {/* Publish Short Modal */}
      <PublishShortModal 
        isOpen={isPublishShortModalOpen} 
        onClose={() => setIsPublishShortModalOpen(false)} 
      />
    </div>
  );
}
