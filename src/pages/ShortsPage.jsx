import { AlertTriangle, Code, Copy, Heart, Link, MessageSquare, Share2, Sparkles, Upload, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
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

  // Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPublishProgress, setShowPublishProgress] = useState(false);
  const [publishComplete, setPublishComplete] = useState(false);
  const [publishedShortLocal, setPublishedShortLocal] = useState(null);
  
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
      setShowUploadModal(true);
      // Clean up the URL
      routerNavigate('/shorts', { replace: true });
    }
  }, [location.search, routerNavigate]);

  // Listen for sidebar event to open modal (when already on /shorts)
  useEffect(() => {
    const handleOpenModal = () => {
      setShowUploadModal(true);
    };
    
    window.addEventListener('open-publish-short-modal', handleOpenModal);
    return () => {
      window.removeEventListener('open-publish-short-modal', handleOpenModal);
    };
  }, []);

  useEffect(() => {
    fetchShorts(0, true);
  }, [user]);

  useEffect(() => {
    // Play active video, pause others
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === activeShortIndex) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  }, [activeShortIndex, shorts]);

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
    const link = `${window.location.origin}/shorts?id=${item.id}`;
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

  const uploadToCloudinaryWithProgress = (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data.secure_url);
          } catch (parseError) {
            reject(new Error('Erreur de réponse Cloudinary')); 
          }
        } else {
          reject(new Error('Erreur lors du téléchargement du short'));
        }
      };

      xhr.onerror = () => reject(new Error('Erreur réseau pendant le téléchargement'));
      xhr.send(formData);
    });
  };

  const pauseAllShorts = () => {
    videoRefs.current.forEach(video => {
      if (video && !video.paused) {
        video.pause();
      }
    });
  };

  useEffect(() => {
    if (showUploadModal || showPublishProgress || isUploading) {
      pauseAllShorts();
    }
  }, [showUploadModal, showPublishProgress, isUploading]);

  const handleUploadShort = async () => {
    if (!uploadFile) return toast.error('Sélectionnez une vidéo');
    if (!user) return toast.error('Connectez-vous pour publier');
    if (!uploadTitle.trim() || !uploadDescription.trim()) return toast.error('Veuillez renseigner le titre et la description du short');

    setShowUploadModal(false);
    setUploadProgress(5);
    setPublishComplete(false);
    setShowPublishProgress(true);
    setIsUploading(true);

    try {
      const url = await uploadToCloudinaryWithProgress(uploadFile, (percent) => {
        setUploadProgress(percent);
      });

      const { data: inserted, error } = await supabase.from('shorts').insert({
        user_id: user.id,
        media_url: url,
        media_type: 'video',
        title: uploadTitle.trim(),
        description: uploadDescription.trim(),
        status: 'published'
      }).select().single();

      if (error) throw error;

      // Keep local reference and notify other parts of the app that a short was published
      setPublishedShortLocal(inserted);
      try { window.dispatchEvent(new CustomEvent('short-published', { detail: inserted })); } catch (e) { /* ignore */ }

      setUploadProgress(100);
      setPublishComplete(true);
      await new Promise(resolve => setTimeout(resolve, 900));

      toast.success('Short publié avec succès ! 🚀');
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      fetchShorts(0, true);
      setTimeout(() => {
        setShowPublishProgress(false);
        setPublishComplete(false);
        setUploadProgress(0);
      }, 900);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la publication du Short');
      setShowPublishProgress(false);
      setUploadProgress(0);
      setPublishComplete(false);
    } finally {
      setIsUploading(false);
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

  const getEmbedCode = (item) => {
    const link = `${window.location.origin}/shorts?id=${item.id}`;
    return `<iframe src="${link}" width="100%" height="600" style="border:none;border-radius:12px;background:#000;" allowfullscreen></iframe>`;
  };

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

      {/* Upload Short Modal - Premium Design */}
      {showUploadModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[110] p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUploadModal(false); }}
        >
          <div style={{
            background: 'linear-gradient(145deg, #1a1a2e 0%, #16162a 50%, #0f0f1a 100%)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 80px rgba(168,85,247,0.08)',
            animation: 'modalSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            color: 'white'
          }}>
            {/* Header with gradient */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(59,130,246,0.1))',
              padding: '1.5rem 1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(168,85,247,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(168,85,247,0.4)'
                }}>
                  <Upload size={22} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.3px' }}>Publier un Short</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#a1a1aa' }}>Partagez un moment avec la communauté</p>
                </div>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)} 
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '12px',
                  width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#a1a1aa', transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#a1a1aa'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Video Upload Zone */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#d4d4d8', marginBottom: '8px' }}>
                  📹 Vidéo du Short
                </label>
                <label
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    border: uploadFile ? '2px solid #a855f7' : '2px dashed rgba(168,85,247,0.3)',
                    borderRadius: '16px', padding: uploadFile ? '12px' : '2rem', cursor: 'pointer',
                    background: uploadFile ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.3s', minHeight: uploadFile ? 'auto' : '120px'
                  }}
                  onMouseOver={e => { if (!uploadFile) e.currentTarget.style.background = 'rgba(168,85,247,0.05)'; }}
                  onMouseOut={e => { if (!uploadFile) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                >
                  <input 
                    type="file" 
                    accept="video/mp4,video/webm,video/quicktime" 
                    onChange={e => setUploadFile(e.target.files?.[0])}
                    style={{ display: 'none' }}
                  />
                  {uploadFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <Sparkles size={22} color="white" />
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e4e4e7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {uploadFile.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#a855f7', marginTop: '2px' }}>
                          {(uploadFile.size / (1024 * 1024)).toFixed(1)} Mo · Prêt à publier ✓
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '12px'
                      }}>
                        <Upload size={24} color="#a855f7" />
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#d4d4d8' }}>Cliquez pour sélectionner une vidéo</span>
                      <span style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '4px' }}>MP4, WebM · Max 100 Mo</span>
                    </>
                  )}
                </label>
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#d4d4d8', marginBottom: '8px' }}>
                  ✨ Titre
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="Donnez un titre accrocheur..."
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', padding: '12px 16px', fontSize: '0.9rem', color: 'white',
                    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(168,85,247,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#d4d4d8', marginBottom: '8px' }}>
                  📝 Description
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  placeholder="Décrivez votre short, ajoutez des #hashtags..."
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', padding: '12px 16px', fontSize: '0.9rem', color: 'white',
                    outline: 'none', transition: 'border-color 0.2s', height: '80px', resize: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(168,85,247,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              {/* Publish Button */}
              <button
                onClick={handleUploadShort}
                disabled={isUploading || !uploadFile}
                style={{
                  width: '100%',
                  background: isUploading 
                    ? 'linear-gradient(135deg, #6b21a8, #581c87)' 
                    : 'linear-gradient(135deg, #a855f7, #7c3aed, #6d28d9)',
                  border: 'none', borderRadius: '14px', padding: '14px', color: 'white',
                  fontSize: '0.95rem', fontWeight: 800, cursor: isUploading || !uploadFile ? 'not-allowed' : 'pointer',
                  opacity: !uploadFile ? 0.4 : 1, transition: 'all 0.3s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  boxShadow: uploadFile ? '0 8px 25px rgba(168,85,247,0.35)' : 'none',
                  marginTop: '4px'
                }}
                onMouseOver={e => { if (!isUploading && uploadFile) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {isUploading ? (
                  <>
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    Publication en cours...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Publier le Short
                  </>
                )}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes modalSlideUp {
              from { opacity: 0; transform: translateY(30px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Small floating progress circle (top-left) */}
      {showPublishProgress && (
        <div className="progress-widget" aria-live="polite" aria-label="Publication du short">
          <div className="circle-wrap">
            <svg viewBox="0 0 40 40" width="40" height="40">
              <circle className="track" cx="20" cy="20" r="18" />
              <circle
                className={`bar${publishComplete ? ' complete' : ''}`}
                cx="20"
                cy="20"
                r="18"
                strokeDasharray="113"
                strokeDashoffset={113 - (uploadProgress / 100) * 113}
              />
            </svg>
            <div className="pct-label">{publishComplete ? '' : `${uploadProgress}%`}</div>
          </div>
          <span className={`widget-text${publishComplete ? ' hidden' : ''}`}>
            {uploadProgress === 0 ? 'Publication...' : uploadProgress < 30 ? 'Préparation...' : uploadProgress < 60 ? 'Encodage...' : uploadProgress < 90 ? 'Envoi en cours...' : 'Finalisation...'}
          </span>
          <span className={`status-badge${publishComplete ? ' visible' : ''}`}>✓ Short publié !</span>
        </div>
      )}

      {/* Post-publish action panel (appears when finished) */}
      {publishComplete && publishedShortLocal && (
        <div className={`short-publish-actions ${showPublishProgress ? 'with-progress' : ''}`} role="dialog">
          <div className="actions-content">
            <div className="actions-title">{publishedShortLocal.title || 'Short publié'}</div>
            <div className="actions-buttons">
              <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/shorts?id=${publishedShortLocal.id}`)}>Partager (lien)</button>
              <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(`<iframe src="${window.location.origin}/shorts?id=${publishedShortLocal.id}" style="width:100%;height:360px;border:0"></iframe>`)}>Copier embed</button>
              <button className="btn btn-primary" onClick={() => {
                // open edit inline
                const evt = new CustomEvent('open-edit-published-short', { detail: publishedShortLocal });
                window.dispatchEvent(evt);
              }}>Modifier</button>
              <button className="btn" onClick={() => { setPublishedShortLocal(null); setPublishComplete(false); setShowPublishProgress(false); setUploadProgress(0); }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Embed Modal */}
      {showEmbedModal && activeShareShort && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-lg p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-zinc-950 to-zinc-900 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-zinc-950 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30">
                  <Code size={22} />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-purple-300">Intégration</p>
                  <h3 className="text-xl font-bold text-white">Embed du Short</h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEmbedModal(false);
                  setActiveShareShort(null);
                }}
                className="text-zinc-400 transition hover:text-white"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-4">
                <p className="text-sm text-zinc-400">Collez ce code sur votre site pour afficher le Short directement dans une iframe responsive.</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-4">
                <label className="mb-2 block text-sm font-semibold text-white">Code d'intégration HTML</label>
                <pre className="max-h-44 overflow-auto rounded-2xl bg-zinc-900 p-4 text-xs leading-6 text-zinc-200"><code>{getEmbedCode(activeShareShort)}</code></pre>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getEmbedCode(activeShareShort));
                    toast.success('Code d\'intégration copié !');
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
                >
                  <Copy size={16} /> Copier le code
                </button>
                <button
                  onClick={() => {
                    setShowEmbedModal(false);
                    setActiveShareShort(null);
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
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
