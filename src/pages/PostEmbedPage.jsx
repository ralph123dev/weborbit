import { ExternalLink, Heart, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import logo from '../assets/logo.png';
import { supabase } from '../services/supabase';
import { formatTextWithLinks, formatTimeAgo } from '../utils/helpers';
import CustomAudioPlayer from '../components/CustomAudioPlayer';
import ImageCarousel from '../components/ImageCarousel';
import UserBadge from '../components/UserBadge';
import './PostEmbedPage.css';

export default function PostEmbedPage() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [originalTextPopup, setOriginalTextPopup] = useState(null);

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (id, first_name, last_name, username, avatar_url, is_verified, is_ambassador),
          comments(count),
          likes(count)
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;
      setPost(data);
    } catch (err) {
      console.error('Error fetching post for embed:', err);
      setError("Cette publication n'existe pas ou a été supprimée.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApp = () => {
    window.open(`${window.location.origin}/`, '_blank');
  };

  if (loading) {
    return (
      <div className="embed-container glass flex items-center justify-center">
        <div className="embed-loader">
          <div className="spinner"></div>
          <span className="text-secondary text-sm mt-2">Chargement du post Orbit...</span>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="embed-container glass flex flex-col items-center justify-center text-center p-6">
        <img src={logo} alt="Orbit" className="embed-logo-small mb-4" />
        <p className="text-secondary font-bold text-sm mb-4">{error || "Impossible de charger le post."}</p>
        <button className="btn btn-primary btn-sm" onClick={handleOpenApp}>
          Découvrir Orbit Post
        </button>
      </div>
    );
  }

  const commentCount = post.comments?.[0]?.count || post.comments_count || 0;
  const likeCount = post.likes?.[0]?.count || post.likes_count || 0;

  return (
    <div className="embed-container glass">
      {/* Embed Header */}
      <div className="embed-header">
        <div className="embed-author" onClick={handleOpenApp}>
          <img 
            src={post.profiles?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
            alt="Avatar" 
            className="embed-avatar"
            onError={(e) => e.target.src = 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'}
          />
          <div className="embed-author-meta">
            <span className="embed-author-name font-bold" style={{ display: 'inline-flex', alignItems: 'center' }}>
              {post.profiles?.first_name} {post.profiles?.last_name}
              <UserBadge username={post.profiles?.username} />
            </span>
            <span className="embed-username text-secondary text-xs">@{post.profiles?.username}</span>
          </div>
        </div>
        <div className="embed-logo-wrapper" onClick={handleOpenApp}>
          <img src={logo} alt="Orbit" className="embed-logo" />
        </div>
      </div>

      {/* Embed Body */}
      <div className="embed-body" onClick={handleOpenApp}>
        <div 
          className="embed-content"
          style={{ fontFamily: post.card_style && post.card_style !== 'standard' ? post.card_style : undefined }}
          dangerouslySetInnerHTML={{ __html: formatTextWithLinks(post.content) }}
        />

        {post.original_content && (
          <button
            className="view-original-lang-btn"
            style={{ marginTop: '4px', position: 'relative', zIndex: 10 }}
            onClick={(e) => {
              e.stopPropagation();
              setOriginalTextPopup({ content: post.original_content, lang: post.translation_lang });
            }}
          >
            Voir langue d'origine
          </button>
        )}
        
        {/* Images */}
        {post.image_urls && post.image_urls.length > 0 ? (
          <ImageCarousel images={post.image_urls} />
        ) : post.image_url ? (
          <div className="embed-image-wrapper mt-3">
            <img src={post.image_url} alt="Post attachment" className="embed-img single-img" />
          </div>
        ) : null}

        {/* Audio */}
        {post.audio_url && (
          <div className="embed-audio mt-3" onClick={(e) => e.stopPropagation()}>
            <CustomAudioPlayer src={post.audio_url} />
          </div>
        )}
      </div>

      {/* Embed Footer */}
      <div className="embed-footer">
        <div className="embed-stats">
          <span className="embed-stat-item">
            <Heart size={16} className="text-secondary" />
            <span className="text-xs font-bold">{likeCount}</span>
          </span>
          <span className="embed-stat-item">
            <MessageSquare size={16} className="text-secondary" />
            <span className="text-xs font-bold">{commentCount}</span>
          </span>
        </div>

        <div className="embed-time text-xs text-secondary">
          {formatTimeAgo(post.created_at)}
        </div>

        <button className="embed-action-btn flex items-center gap-1 text-primary text-xs font-bold" onClick={handleOpenApp}>
          <span>Rejoindre</span>
          <ExternalLink size={12} />
        </button>
      </div>

      {/* Original Text Popup */}
      {originalTextPopup && (
        <div className="modal-overlay" onClick={() => setOriginalTextPopup(null)} style={{ position: 'fixed', zIndex: 99999 }}>
          <div className="original-text-popup glass" onClick={(e) => e.stopPropagation()}>
            <div className="original-text-popup-header">
              <h3 className="font-bold text-lg">🌐 Langue d'origine</h3>
              <button className="icon-btn" onClick={() => setOriginalTextPopup(null)}><X size={20} /></button>
            </div>
            <div className="original-text-popup-body">
              <p className="original-text-content">{originalTextPopup.content}</p>
            </div>
            <div className="original-text-popup-footer">
              <button className="btn btn-primary" onClick={() => setOriginalTextPopup(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
