import { ExternalLink, Heart, MessageSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import logo from '../assets/logo.png';
import { supabase } from '../services/supabase';
import { formatTimeAgo } from '../utils/helpers';
import './ShortEmbedPage.css';

export default function ShortEmbedPage() {
  const { shortId } = useParams();
  const [short, setShort] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    fetchShort();
  }, [shortId]);

  useEffect(() => {
    if (short && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [short]);

  const fetchShort = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('shorts')
        .select(`
          id, title, description, media_url, media_type, created_at,
          likes_count, comments_count, views_count,
          profiles (id, first_name, last_name, username, avatar_url, is_verified)
        `)
        .eq('id', shortId)
        .eq('status', 'published')
        .single();

      if (fetchError) throw fetchError;
      setShort(data);
    } catch (err) {
      console.error('Error fetching short for embed:', err);
      setError("Ce short n'existe pas ou a été supprimé.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApp = () => {
    window.open(`${window.location.origin}/shorts?id=${shortId}`, '_blank');
  };

  if (loading) {
    return (
      <div className="short-embed-container">
        <div className="short-embed-loader">
          <div className="short-embed-spinner" />
          <span>Chargement du short...</span>
        </div>
      </div>
    );
  }

  if (error || !short) {
    return (
      <div className="short-embed-container short-embed-error">
        <img src={logo} alt="Orbit" className="short-embed-logo" />
        <p>{error || 'Impossible de charger le short.'}</p>
        <button type="button" className="short-embed-cta" onClick={() => window.open(window.location.origin, '_blank')}>
          Découvrir Orbit
        </button>
      </div>
    );
  }

  return (
    <div className="short-embed-container">
      <div className="short-embed-video-wrap">
        <video
          ref={videoRef}
          src={short.media_url}
          className="short-embed-video"
          loop
          playsInline
          muted
          controls
        />
        <div className="short-embed-gradient" />
        <div className="short-embed-overlay">
          <div className="short-embed-header">
            <div className="short-embed-author" onClick={handleOpenApp} role="button" tabIndex={0}>
              <img
                src={short.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt=""
                className="short-embed-avatar"
              />
              <div>
                <span className="short-embed-username">
                  @{short.profiles?.username || 'orbit_user'}
                  {short.profiles?.is_verified && ' ✓'}
                </span>
                <span className="short-embed-time">{formatTimeAgo(short.created_at)}</span>
              </div>
            </div>
            <img src={logo} alt="Orbit" className="short-embed-logo-sm" onClick={handleOpenApp} />
          </div>

          <div className="short-embed-caption">
            {short.title && <strong>{short.title}</strong>}
            {short.description && <p>{short.description}</p>}
          </div>

          <div className="short-embed-footer">
            <div className="short-embed-stats">
              <span><Heart size={14} /> {short.likes_count || 0}</span>
              <span><MessageSquare size={14} /> {short.comments_count || 0}</span>
            </div>
            <button type="button" className="short-embed-cta short-embed-cta-sm" onClick={handleOpenApp}>
              Voir sur Orbit <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
