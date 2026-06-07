import { AlertTriangle, Code, Heart, Link, MessageSquare, Share2, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import EmbedShortModal, { getShortShareUrl } from '../components/EmbedShortModal';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import './ShortsPage.css';

const QUICK_STICKERS = ['❤️', '😂', '😍', '🔥', '👏', '😢', '🙌', '🎉', '💯', '🚀'];

export default function ShortsPage() {
  const { user } = useAuth();
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeShortIndex, setActiveShortIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);

  const [playbackLocked, setPlaybackLocked] = useState(false);

  // Comments Drawer State
  const [activeCommentShort, setActiveCommentShort] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Sticker Selector State (per-short popover above the comment button)
  const [activeReactionShortId, setActiveReactionShortId] = useState(null);

  // Share Options State (per-short menu)
  const [activeShareShort, setActiveShareShort] = useState(null);
  const [showEmbedModal, setShowEmbedModal] = useState(false);

  const videoRefs = useRef([]);

  const location = useLocation();
  const routerNavigate = useNavigate();

  // Check URL parameters on mount/navigation to open publish modal
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openPublish') === 'true') {
      window.dispatchEvent(new Event('open-publish-short-modal'));
      routerNavigate('/shorts', { replace: true });
    }
  }, [location.search, routerNavigate]);

  useEffect(() => {
    fetchShorts(0, true);
  }, [user]);

  useEffect(() => {
    const lockPlayback = () => setPlaybackLocked(true);
    const unlockPlayback = () => setPlaybackLocked(false);
    const refreshShorts = () => fetchShorts(0, true);

    window.addEventListener('pause-shorts-playback', lockPlayback);
    window.addEventListener('resume-shorts-playback', unlockPlayback);
    window.addEventListener('short-published', refreshShorts);
    window.addEventListener('shorts-updated', refreshShorts);

    return () => {
      window.removeEventListener('pause-shorts-playback', lockPlayback);
      window.removeEventListener('resume-shorts-playback', unlockPlayback);
      window.removeEventListener('short-published', refreshShorts);
      window.removeEventListener('shorts-updated', refreshShorts);
    };
  }, [user]);

  const pauseAllShorts = () => {
    videoRefs.current.forEach((video) => {
      if (video && !video.paused) video.pause();
    });
  };

  useEffect(() => {
    if (playbackLocked || showEmbedModal || activeCommentShort) {
      pauseAllShorts();
      return;
    }

    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === activeShortIndex) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  }, [activeShortIndex, shorts, playbackLocked, showEmbedModal, activeCommentShort]);

  // Set up IntersectionObserver to autoplay videos as they scroll into view
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.6 // Trigger when 60% of the video is visible
    };

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const videoElement = entry.target;
          const index = videoRefs.current.indexOf(videoElement);
          if (index !== -1) {
            setActiveShortIndex(index);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all video elements
    videoRefs.current.forEach(video => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, [shorts]);

  const fetchShorts = async (pageNumber = 0, isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setFetchingMore(true);
      }

      const from = pageNumber * 5;
      const to = from + 4;

      const { data, error } = await supabase
        .from('shorts')
        .select(`
          id, title, description, media_url, media_type, status, created_at, 
          likes_count, comments_count, views_count, shares_count, bookmarks_count,
          profiles (id, first_name, last_name, avatar_url, username, is_verified, followers_count)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (!data || data.length < 5) {
        setHasMore(false);
      }

      // Curated vertical shorts as fallback (only append to initial page or when database results are exhausted)
      const fallbackShorts = [
        {
          id: 'mock-1',
          description: 'Splendide coucher de soleil sur les montagnes. #shorts #nature #sunset',
          media_url: 'https://assets.mixkit.co/videos/preview/mixkit-beautiful-sunset-in-the-mountains-43093-large.mp4',
          likes_count: 324,
          comments_count: 45,
          profiles: {
            id: 'mock-user-1',
            first_name: 'Julie',
            last_name: 'Dumont',
            username: 'julie_nature',
            avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            is_verified: true,
            followers_count: 1420
          }
        },
        {
          id: 'mock-2',
          description: 'Délicieuse recette de pancakes moelleux ! 🥞🔥 #cooking #pancakes #shorts',
          media_url: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-honey-on-pancakes-3437-large.mp4',
          likes_count: 852,
          comments_count: 98,
          profiles: {
            id: 'mock-user-2',
            first_name: 'Chef',
            last_name: 'Antoine',
            username: 'antoine_cuisine',
            avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            is_verified: false,
            followers_count: 5310
          }
        },
        {
          id: 'mock-3',
          description: 'Petite session skate en ville. 🛹✌️ #skate #city #shorts',
          media_url: 'https://assets.mixkit.co/videos/preview/mixkit-guy-doing-a-kickflip-on-a-skateboard-34251-large.mp4',
          likes_count: 1205,
          comments_count: 142,
          profiles: {
            id: 'mock-user-3',
            first_name: 'Lucas',
            last_name: 'Skate',
            username: 'lskate_ride',
            avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
            is_verified: true,
            followers_count: 890
          }
        }
      ];

      let rawShorts = data || [];
      let enriched = [];

      if (user && rawShorts.length > 0) {
        const shortIds = rawShorts.map(s => s.id);
        const { data: myLikes } = await supabase
          .from('short_likes')
          .select('short_id')
          .eq('user_id', user.id)
          .in('short_id', shortIds);
        
        const likedIds = new Set((myLikes || []).map(l => l.short_id));

        const creatorIds = [...new Set(rawShorts.map(s => s.profiles?.id).filter(Boolean))];
        const { data: myFollows } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id)
          .in('following_id', creatorIds);

        const followingIds = new Set((myFollows || []).map(f => f.following_id));

        enriched = rawShorts.map(s => ({
          ...s,
          liked: likedIds.has(s.id),
          is_following: s.profiles?.id ? followingIds.has(s.profiles.id) : false
        }));
      } else {
        enriched = rawShorts;
      }

      setShorts(prev => {
        const existing = pageNumber === 0 ? [] : prev;
        const base = existing.filter(x => !x.id.startsWith('mock-'));
        const combined = [...base, ...enriched];
        if (data.length < 5) {
          return [...combined, ...fallbackShorts];
        }
        return combined;
      });
      setPage(pageNumber);
    } catch (e) {
      console.error('Error fetching shorts:', e);
      toast.error('Impossible de charger les Shorts');
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !fetchingMore) {
      fetchShorts(page + 1, false);
    }
  };

  const handleLike = async (item) => {
    if (!user) return toast.error('Connectez-vous pour liker');
    
    // Optimistic UI update
    setShorts(prev => prev.map(s => {
      if (s.id === item.id) {
        return { 
          ...s, 
          liked: !s.liked, 
          likes_count: (s.likes_count || 0) + (s.liked ? -1 : 1) 
        };
      }
      return s;
    }));

    try {
      if (item.liked) {
        await supabase.from('short_likes').delete().eq('short_id', item.id).eq('user_id', user.id);
        toast.success('Avis retiré');
      } else {
        await supabase.from('short_likes').insert({ short_id: item.id, user_id: user.id });
        toast.success('Short aimé ! ❤️');
      }
    } catch (e) {
      console.error('Error liking short:', e);
    }
  };

  const handleCopyLink = (item) => {
    const link = getShortShareUrl(item.id);
    navigator.clipboard.writeText(link);
    toast.success('Lien du Short copié ! 🔗');
    setActiveShareShort(null);
  };

  const handleReportShort = async (item) => {
    if (!user) return toast.error('Connectez-vous pour signaler');
    try {
      await supabase.from('reports_posts').insert({
        post_id: item.id,
        reporter_id: user.id
      });
      toast.success('Short signalé pour révision ⚠️');
    } catch (e) {
      console.error(e);
      toast.success('Short signalé pour révision ⚠️');
    }
    setActiveShareShort(null);
  };

  const handleSubscribe = async (creatorId, username, isFollowing) => {
    if (!user) return toast.error('Connectez-vous pour vous abonner');
    if (user.id === creatorId) return toast.error('Vous ne pouvez pas vous abonner à votre propre profil');
    
    const increment = isFollowing ? -1 : 1;

    // Optimistic update of subscription and followers count
    setShorts(prev => prev.map(s => {
      if (s.profiles?.id === creatorId) {
        return { 
          ...s, 
          is_following: !isFollowing,
          profiles: {
            ...s.profiles,
            followers_count: Math.max(0, (s.profiles.followers_count || 0) + increment)
          }
        };
      }
      return s;
    }));

    if (creatorId.startsWith('mock-')) {
      toast.success(isFollowing ? `Désabonné de @${username}` : `Abonné à @${username} ! ✨`);
      return;
    }

    try {
      if (isFollowing) {
        await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', creatorId);
        toast.success(`Désabonné de @${username}`);
      } else {
        await supabase.from('followers').insert({ follower_id: user.id, following_id: creatorId });
        toast.success(`Abonné à @${username} ! ✨`);
      }
    } catch (e) {
      console.error('Error toggling follow:', e);
      toast.error('Une erreur est survenue');
    }
  };

  const handleOpenComments = async (item) => {
    setActiveCommentShort(item);
    setComments([]);
    setCommentsLoading(true);

    if (item.id.startsWith('mock-')) {
      setComments([
        { id: '1', content: 'Génial cette vidéo ! 😍', profiles: { first_name: 'Sarah', last_name: 'L.', username: 'sarah_l', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' } },
        { id: '2', content: 'Trop stylé ! Merci du partage.', profiles: { first_name: 'Thomas', last_name: 'M.', username: 'thomas_m', avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' } }
      ]);
      setCommentsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('short_comments')
        .select('id, content, created_at, short_id, user_id, profiles(id, first_name, last_name, avatar_url, username)')
        .eq('short_id', item.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (e) {
      console.error('Error fetching comments:', e);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handlePostCommentContent = async (shortItem, text) => {
    if (!text.trim()) return;
    if (!user) return toast.error('Connectez-vous pour commenter');

    // Update comments count in UI
    setShorts(prev => prev.map(s => {
      if (s.id === shortItem.id) {
        return { ...s, comments_count: (s.comments_count || 0) + 1 };
      }
      return s;
    }));

    if (shortItem.id.startsWith('mock-')) {
      const mockCom = {
        id: Date.now().toString(),
        content: text,
        profiles: {
          first_name: user.email.split('@')[0],
          username: user.email.split('@')[0],
          avatar_url: 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'
        }
      };
      if (activeCommentShort?.id === shortItem.id) {
        setComments(prev => [...prev, mockCom]);
      }
      toast.success('Réaction envoyée !');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('short_comments')
        .insert({
          short_id: shortItem.id,
          user_id: user.id,
          content: text.trim()
        })
        .select('id, content, created_at, short_id, user_id, profiles(id, first_name, last_name, avatar_url, username)')
        .single();

      if (error) throw error;

      if (activeCommentShort?.id === shortItem.id) {
        setComments(prev => [...prev, data]);
      }
      toast.success('Réaction envoyée !');
    } catch (e) {
      console.error('Error posting comment:', e);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !activeCommentShort) return;
    setIsSubmittingComment(true);
    await handlePostCommentContent(activeCommentShort, newComment);
    setNewComment('');
    setIsSubmittingComment(false);
  };

  const handleSendSticker = async (item, sticker) => {
    await handlePostCommentContent(item, sticker);
    setActiveReactionShortId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full text-white bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-70px)] md:h-full bg-zinc-950 overflow-y-auto flex flex-col items-center py-8" onScroll={handleScroll}>
      {/* Styles */}
      <style>{`
        .shorts-feed-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3rem;
          width: 100%;
          max-width: 480px;
          padding-bottom: 5rem;
        }
        .short-card-instagram {
          background: #121212;
          border: 1px solid #262626;
          border-radius: 12px;
          overflow: hidden;
          width: 100%;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          position: relative;
        }
        .video-wrapper {
          position: relative;
          aspect-ratio: 9/16;
          background-color: #000;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .video-element {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .sound-btn-overlay {
          position: absolute;
          top: 15px;
          right: 15px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 50%;
          padding: 8px;
          color: white;
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
          z-index: 10;
        }
        .sound-btn-overlay:hover {
          transform: scale(1.1);
        }
        .details-under-player {
          padding: 1rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          border-top: 1px solid #262626;
        }
        .profile-row-inst {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .profile-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .avatar-inst {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #a855f7;
        }
        .username-inst {
          font-weight: 700;
          color: #f3f4f6;
          font-size: 0.95rem;
        }
        .followers-tag {
          font-size: 0.75rem;
          color: #a1a1aa;
          display: block;
          margin-top: 1px;
        }
        .verified-badge {
          color: #3b82f6;
          font-size: 0.8rem;
          margin-left: 2px;
        }
        .follow-btn-inst {
          font-size: 0.85rem;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s, color 0.2s;
        }
        .follow-btn-inst.not-following {
          background-color: #3b82f6;
          color: white;
          border: none;
        }
        .follow-btn-inst.not-following:hover {
          background-color: #2563eb;
        }
        .follow-btn-inst.following {
          background-color: transparent;
          color: #a1a1aa;
          border: 1px solid #3f3f46;
        }
        .follow-btn-inst.following:hover {
          color: white;
          background-color: rgba(255, 255, 255, 0.05);
        }
        .description-inst {
          font-size: 0.9rem;
          color: #d1d5db;
          line-height: 1.4;
          margin: 0;
          word-break: break-word;
        }
        .actions-row-inst {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-top: 0.25rem;
          border-top: 1px solid #262626;
          padding-top: 0.75rem;
          position: relative;
        }
        .action-btn-inst {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: transparent;
          border: none;
          color: #f3f4f6;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: transform 0.15s, color 0.15s;
          padding: 0;
        }
        .action-btn-inst:hover {
          color: #a855f7;
          transform: translateY(-1px);
        }
        .action-btn-inst svg {
          transition: transform 0.2s;
        }
        .action-btn-inst:active svg {
          transform: scale(1.2);
        }
        .reaction-popover {
          position: absolute;
          bottom: 45px;
          left: 50px;
          background: rgba(24, 24, 27, 0.95);
          backdrop-blur: 12px;
          border: 1px solid #3f3f46;
          border-radius: 20px;
          padding: 8px 12px;
          display: flex;
          gap: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.6);
          z-index: 50;
        }
        .reaction-sticker {
          font-size: 1.5rem;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .reaction-sticker:hover {
          transform: scale(1.3);
        }
        .open-comments-btn {
          font-size: 0.75rem;
          color: #a855f7;
          border-left: 1px solid #3f3f46;
          padding-left: 8px;
          margin-left: 4px;
          background: transparent;
          border-top: none;
          border-right: none;
          border-bottom: none;
          font-weight: 700;
          cursor: pointer;
        }
        .share-dropdown {
          position: absolute;
          bottom: 45px;
          right: 10px;
          background: #18181b;
          border: 1px solid #3f3f46;
          border-radius: 12px;
          overflow: hidden;
          width: 180px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          z-index: 50;
          display: flex;
          flex-direction: column;
        }
        .share-dropdown-item {
          width: 100%;
          background: transparent;
          border: none;
          padding: 10px 14px;
          color: #f3f4f6;
          font-size: 0.85rem;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background-color 0.2s;
        }
        .share-dropdown-item:hover {
          background-color: rgba(255,255,255,0.05);
        }
        .loading-more-indicator {
          padding: 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          color: #a855f7;
          font-weight: 600;
          font-size: 0.9rem;
        }
      `}</style>

      {/* Feed of shorts */}
      <div className="shorts-feed-container">
        {shorts.map((item, index) => (
          <div key={item.id} className="short-card-instagram">
            {/* Video Player */}
            <div className="video-wrapper">
              <video
                ref={el => videoRefs.current[index] = el}
                src={item.media_url || item.image_url || item.image_urls?.[0]}
                className="video-element"
                loop
                muted={isMuted}
                playsInline
                preload={Math.abs(index - activeShortIndex) <= 2 ? "auto" : "none"}
                onClick={() => {
                  if (videoRefs.current[index]) {
                    if (videoRefs.current[index].paused) {
                      videoRefs.current[index].play().catch(() => {});
                    } else {
                      videoRefs.current[index].pause();
                    }
                  }
                }}
                onPlay={() => setActiveShortIndex(index)}
              />

              <button className="sound-btn-overlay" onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}>
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>

            {/* Profile, Caption & Interactive Actions Underneath */}
            <div className="details-under-player">
              <div className="profile-row-inst">
                <div className="profile-left">
                  <img 
                    src={item.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                    alt="Avatar"
                    className="avatar-inst"
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="username-inst">@{item.profiles?.username || 'orbit_user'}</span>
                      {item.profiles?.is_verified && <span className="verified-badge">✓</span>}
                    </div>
                    <span className="followers-tag">{item.profiles?.followers_count || 0} abonnés</span>
                  </div>
                </div>

                {/* Hide subscribe button for user's own profile */}
                {user?.id !== item.profiles?.id && (
                  <button 
                    onClick={() => handleSubscribe(item.profiles?.id, item.profiles?.username, item.is_following)}
                    className={`follow-btn-inst ${item.is_following ? 'following' : 'not-following'}`}
                  >
                    {item.is_following ? 'Abonné' : 'S\'abonner'}
                  </button>
                )}
              </div>

              {item.description && (
                <p className="description-inst">{item.description || item.title || item.content}</p>
              )}

              <div className="actions-row-inst">
                {/* Like Button */}
                <button onClick={() => handleLike(item)} className="action-btn-inst">
                  <Heart size={22} fill={item.liked ? '#ef4444' : 'none'} className={item.liked ? 'text-red-500' : 'text-white'} />
                  <span>{item.likes_count || 0}</span>
                </button>

                {/* Comment / Sticker Button */}
                <button onClick={() => setActiveReactionShortId(activeReactionShortId === item.id ? null : item.id)} className="action-btn-inst">
                  <MessageSquare size={22} />
                  <span>{item.comments_count || 0}</span>
                </button>

                {/* Quick Stickers Popover */}
                {activeReactionShortId === item.id && (
                  <div className="reaction-popover">
                    {QUICK_STICKERS.map(sticker => (
                      <span 
                        key={sticker} 
                        className="reaction-sticker" 
                        onClick={() => handleSendSticker(item, sticker)}
                      >
                        {sticker}
                      </span>
                    ))}
                    <button className="open-comments-btn" onClick={() => {
                      handleOpenComments(item);
                      setActiveReactionShortId(null);
                    }}>
                      Ouvrir
                    </button>
                  </div>
                )}

                {/* Share Button */}
                <button onClick={() => setActiveShareShort(activeShareShort?.id === item.id ? null : item)} className="action-btn-inst">
                  <Share2 size={22} />
                  <span>Partager</span>
                </button>

                {/* Share Menu / Dropdown */}
                {activeShareShort?.id === item.id && (
                  <div className="share-dropdown">
                    <button className="share-dropdown-item" onClick={() => handleCopyLink(item)}>
                      <Link size={16} /> Copier le lien
                    </button>
                    <button className="share-dropdown-item" onClick={() => {
                      setShowEmbedModal(true);
                      setActiveShareShort(item);
                    }}>
                      <Code size={16} /> Intégrer
                    </button>
                    <button className="share-dropdown-item" style={{ color: '#ef4444' }} onClick={() => handleReportShort(item)}>
                      <AlertTriangle size={16} /> Signaler le short
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {fetchingMore && (
          <div className="loading-more-indicator">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500 mr-2"></div>
            <span>Chargement...</span>
          </div>
        )}
      </div>

      {showEmbedModal && activeShareShort && (
        <EmbedShortModal
          short={activeShareShort}
          onClose={() => {
            setShowEmbedModal(false);
            setActiveShareShort(null);
          }}
        />
      )}

      {/* Comments Drawer/Modal */}
      {activeCommentShort && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md h-[500px] flex flex-col relative text-white">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-lg">Commentaires</h3>
              <button onClick={() => setActiveCommentShort(null)} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {commentsLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center text-zinc-500 mt-8">Aucun commentaire. Soyez le premier !</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-3 items-start">
                    <img 
                      src={c.profiles?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="bg-zinc-800/50 rounded-xl p-3 flex-1">
                      <div className="font-semibold text-xs text-zinc-300">@{c.profiles?.username || 'user'}</div>
                      <div className="text-sm text-white mt-1">{c.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <div className="p-4 border-t border-zinc-800 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 text-white"
                onKeyDown={e => e.key === 'Enter' && handlePostComment()}
              />
              <button 
                onClick={handlePostComment}
                disabled={isSubmittingComment || !newComment.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold px-4 rounded-xl transition-colors"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
