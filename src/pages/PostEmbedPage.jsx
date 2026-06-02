import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Heart, MessageSquare, Share2, ExternalLink } from 'lucide-react';
import { formatTimeAgo, formatTextWithLinks } from '../utils/helpers';
import logo from '../assets/logo.png';
import './PostEmbedPage.css';

export default function PostEmbedPage() {
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
            src={post.profiles?.avatar_url || 'https://via.placeholder.com/40'} 
            alt="Avatar" 
            className="embed-avatar"
            onError={(e) => e.target.src = 'https://via.placeholder.com/40'}
          />
          <div className="embed-author-meta">
            <span className="embed-author-name font-bold">
              {post.profiles?.first_name} {post.profiles?.last_name}
              {post.profiles?.is_verified && <span className="text-primary ml-1">✓</span>}
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
          dangerouslySetInnerHTML={{ __html: formatTextWithLinks(post.content) }}
        />
        
        {/* Images */}
        {post.image_urls && post.image_urls.length > 0 ? (
          <div className={`embed-images-grid grid-${Math.min(post.image_urls.length, 3)}`}>
            {post.image_urls.map((imgUrl, index) => (
              <div key={index} className="embed-image-wrapper">
                <img src={imgUrl} alt={`Post attachment ${index + 1}`} className="embed-img" />
              </div>
            ))}
          </div>
        ) : post.image_url ? (
          <div className="embed-image-wrapper mt-3">
            <img src={post.image_url} alt="Post attachment" className="embed-img single-img" />
          </div>
        ) : null}
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
    </div>
  );
}
