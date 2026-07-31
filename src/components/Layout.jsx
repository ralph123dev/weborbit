import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import CreatePostModal from './CreatePostModal';
import './Layout.css';
import PublishShortModal from './PublishShortModal';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPublishShortModalOpen, setIsPublishShortModalOpen] = useState(false);

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
    // sidebar open handled by parent state; legacy listener removed
    return () => {};
  }, []);

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
        <div className="logo-text font-black text-primary">Orbit</div>
        <div className="w-6"></div> {/* spacer */}
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
