import { Calendar, Code, Copy, Heart, Image as ImageIcon, MapPin, MessageSquare, Mic, MoreHorizontal, Send, Share2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import CustomAudioPlayer from '../components/CustomAudioPlayer';
import ImageCarousel from '../components/ImageCarousel';
import UserBadge from '../components/UserBadge';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { buildCommentMap, canReplyTo, getCommentDepth, getEffectiveParentId, getQuotedAuthor } from '../utils/commentHelpers';
import { formatCount, formatTextWithLinks, formatTimeAgo, uploadToCloudinary } from '../utils/helpers';
import './FeedPage.css';

const FONTS = [
  { name: 'Standard (Inter)', family: 'Inter, sans-serif' },
  { name: 'Playfair Display', family: "'Playfair Display', serif" },
  { name: 'Fira Code', family: "'Fira Code', monospace" },
  { name: 'Caveat', family: "'Caveat', cursive" },
  { name: 'Lora', family: "'Lora', serif" },
  { name: 'Montserrat', family: "'Montserrat', sans-serif" },
  { name: 'Cinzel', family: "'Cinzel', serif" },
  { name: 'Pacifico', family: "'Pacifico', cursive" }
];

export default function FeedPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const mobileTextareaRef = useRef(null);
  const [showMobileFontMenu, setShowMobileFontMenu] = useState(false);
  const [selectedMobileFont, setSelectedMobileFont] = useState(FONTS[0]);

  // Edit/Delete Post State
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [postDropdownOpen, setPostDropdownOpen] = useState(null);
  // Comments state
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const commentsEndRef = useRef(null);
  
  const [commentAudioBlob, setCommentAudioBlob] = useState(null);
  const [isRecordingComment, setIsRecordingComment] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const commentMediaRecorderRef = useRef(null);
  const commentAudioChunksRef = useRef([]);

  // Share state
  const [sharePost, setSharePost] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [embedPost, setEmbedPost] = useState(null);
  const [isEmbedCopied, setIsEmbedCopied] = useState(false);

  // User Profile Panel state
  const [profilePanel, setProfilePanel] = useState(null);
  const [profilePanelPosts, setProfilePanelPosts] = useState([]);
  const [originalTextPopup, setOriginalTextPopup] = useState(null);
  const [profilePanelLoading, setProfilePanelLoading] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [showMobileComposer, setShowMobileComposer] = useState(false);

  // Lightbox Gallery state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    fetchPosts();

    const subscription = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
        if (payload.eventType === 'INSERT') {
          fetchSinglePost(payload.new.id);
        } else if (payload.eventType === 'UPDATE') {
          setPosts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
        } else if (payload.eventType === 'DELETE') {
          setPosts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Handle keyboard shortcuts for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevImage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextImage();
      }
    };

    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxOpen, lightboxIndex]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (id, first_name, last_name, username, avatar_url, is_verified, is_ambassador),
          groups (id, name),
          comments(count),
          likes(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
      toast.error('Erreur: ' + (err.message || 'Impossible de charger les posts'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSinglePost = async (id) => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles (id, first_name, last_name, username, avatar_url, is_verified, is_ambassador), groups (id, name), comments(count), likes(count)')
      .eq('id', id)
      .single();
    
    if (data) {
      setPosts(prev => [data, ...prev]);
    }
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedImages(prev => [...prev, ...filesArray]);
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleMobileTextareaChange = (e) => {
    const value = e.target.value;
    setNewPostContent(value);
    
    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, selectionStart);
    
    if (textBeforeCursor.endsWith('/p')) {
      setShowMobileFontMenu(true);
    } else {
      setShowMobileFontMenu(false);
    }
  };

  const handleSelectMobileFont = (font) => {
    setSelectedMobileFont(font);
    setShowMobileFontMenu(false);
    
    const selectionStart = mobileTextareaRef.current ? mobileTextareaRef.current.selectionStart : newPostContent.length;
    const textBefore = newPostContent.slice(0, selectionStart);
    const textAfter = newPostContent.slice(selectionStart);
    
    if (textBefore.endsWith('/p')) {
      const newTextBefore = textBefore.slice(0, -2);
      const newContent = newTextBefore + textAfter;
      setNewPostContent(newContent);
      
      setTimeout(() => {
        if (mobileTextareaRef.current) {
          mobileTextareaRef.current.focus();
          const newCursorPos = newTextBefore.length;
          mobileTextareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  const handlePublish = async () => {
    if ((!newPostContent.trim() && selectedImages.length === 0) || !user) return;
    
    setIsPublishing(true);
    try {
      const uploadedImageUrls = [];
      for (const file of selectedImages) {
        const url = await uploadToCloudinary(file);
        uploadedImageUrls.push(url);
      }

      const { error } = await supabase.from('posts').insert({
        content: newPostContent.trim(),
        user_id: user.id,
        image_urls: uploadedImageUrls,
        image_url: uploadedImageUrls[0] || ''
      });

      if (error) throw error;
      
      setNewPostContent('');
      setSelectedImages([]);
    } catch (err) {
      console.error('Error publishing post:', err);
      alert("Une erreur est survenue lors de la publication.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLike = async (postId, currentLikes) => {
    if (!user) {
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    
    // Optimistic UI update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { 
          ...p, 
          likes: [{ count: currentLikes + 1 }],
          likes_count: currentLikes + 1 
        };
      }
      return p;
    }));

    try {
      const { data: existingLike } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();
        
      if (!existingLike) {
        await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
        
        // Add notification for the post author
        const postAuthor = posts.find(p => p.id === postId)?.user_id;
        if (postAuthor && postAuthor !== user.id) {
          await supabase.from('notifications').insert({
            user_id: postAuthor,
            sender_id: user.id,
            type: 'like',
            post_id: postId,
            content: "a aimé votre post"
          });
        }
      }
    } catch (e) { console.error(e) }
  };

  const handleEditPost = async () => {
    if (!editingPost || !editContent.trim()) return;
    try {
      const { error } = await supabase.from('posts').update({ content: editContent.trim() }).eq('id', editingPost.id);
      if (error) throw error;
      setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, content: editContent.trim() } : p));
      setEditingPost(null);
      setEditContent('');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la modification');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce post ?')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
      setPostDropdownOpen(null);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleReportPost = async (postId) => {
    if (!window.confirm('Voulez-vous vraiment signaler cette publication ?')) return;
    try {
      const { error } = await supabase.from('reports_posts').insert({
        post_id: postId,
        reporter_id: user.id
      });
      if (error) throw error;
      toast.success('Publication signalée avec succès.');
      setPostDropdownOpen(null);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du signalement');
    }
  };

  // --- Comments Logic ---
  const handleOpenComments = (post) => {
    setActiveCommentPost(post);
    setReplyingTo(null);
    fetchComments(post.id);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseComments = () => {
    setActiveCommentPost(null);
    setComments([]);
    setCommentAudioBlob(null);
    if (isRecordingComment && commentMediaRecorderRef.current) {
      commentMediaRecorderRef.current.stop();
      setIsRecordingComment(false);
    }
    setShowVoiceModal(false);
    document.body.style.overflow = '';
  };

  const startRecordingComment = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      commentMediaRecorderRef.current = mediaRecorder;
      commentAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          commentAudioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(commentAudioChunksRef.current, { type: 'audio/webm' });
        setCommentAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingComment(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error("Impossible d'accéder au microphone");
    }
  };

  const stopRecordingComment = () => {
    if (commentMediaRecorderRef.current && isRecordingComment) {
      commentMediaRecorderRef.current.stop();
      setIsRecordingComment(false);
    }
  };

  const discardCommentAudio = () => {
    setCommentAudioBlob(null);
    commentAudioChunksRef.current = [];
  };

  const fetchComments = async (postId) => {
    setCommentsLoading(true);
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(id, first_name, last_name, avatar_url, username)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    setComments(data || []);
    setCommentsLoading(false);
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!user) {
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    if ((!newComment.trim() && !commentAudioBlob) || !activeCommentPost) return;
    setIsSubmittingComment(true);
    try {
      let audioUrl = null;
      if (commentAudioBlob) {
        audioUrl = await uploadToCloudinary(commentAudioBlob);
      }

      const commentMap = buildCommentMap(comments);
      const commentData = {
        post_id: activeCommentPost.id,
        user_id: user.id,
        content: newComment.trim(),
        parent_id: getEffectiveParentId(replyingTo, commentMap)
      };

      if (audioUrl) {
        commentData.audio_url = audioUrl;
      }

      let { data, error } = await supabase.from('comments').insert(commentData).select('*, profiles(id, first_name, last_name, avatar_url, username)').single();
      
      // Fallback if audio_url column doesn't exist yet
      if (error && error.code === 'PGRST204' && audioUrl) {
        toast.error("La colonne audio pour les commentaires n'existe pas encore. Publication sans audio...");
        delete commentData.audio_url;
        const retry = await supabase.from('comments').insert(commentData).select('*, profiles(id, first_name, last_name, avatar_url, username)').single();
        error = retry.error;
        data = retry.data;
      }

      if (error) throw error;
      
      setComments(prev => [...prev, data]);
      setNewComment('');
      setReplyingTo(null);
      setCommentAudioBlob(null);
      setShowVoiceModal(false);
      
      setPosts(prev => prev.map(p => 
        p.id === activeCommentPost.id ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
      ));
      
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId, createdAt) => {
    const commentTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    if (now - commentTime > 120000) {
      toast.error("Vous ne pouvez plus supprimer ce commentaire après 2 minutes.");
      return;
    }
    
    if (!window.confirm('Voulez-vous vraiment supprimer ce commentaire ?')) return;

    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
      
      setComments(prev => prev.filter(c => c.id !== commentId));
      
      setPosts(prev => prev.map(p => 
        p.id === activeCommentPost.id 
          ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } 
          : p
      ));
      toast.success('Commentaire supprimé.');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la suppression du commentaire');
    }
  };

  // --- Share Logic ---
  const handleOpenShare = (post) => {
    setSharePost(post);
    setIsCopied(false);
    setEmbedPost(null);
    setIsEmbedCopied(false);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/post/${sharePost.id}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShowEmbed = () => {
    setEmbedPost(sharePost);
  };

  const getEmbedCode = (post) => {
    const link = `${window.location.origin}/post/${post.id}`;
    return `<iframe src="${link}" width="100%" height="400" style="border:none;border-radius:12px;" allowfullscreen></iframe>`;
  };

  const handleCopyEmbed = () => {
    if (!embedPost) return;
    navigator.clipboard.writeText(getEmbedCode(embedPost));
    setIsEmbedCopied(true);
    setTimeout(() => setIsEmbedCopied(false), 2000);
  };

  // --- Profile Panel & Invitations ---
  const fetchInvitationStatus = async (otherUserId) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setInvitation(data || null);
    } catch (err) {
      console.error('Error fetching invitation status:', err);
      setInvitation(null);
    }
  };

  const handleSendInvitation = async () => {
    if (!user) {
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    if (!profilePanel) return;
    try {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          sender_id: user.id,
          receiver_id: profilePanel.id,
          status: 'pending'
        })
        .select()
        .single();
        
      if (error) throw error;
      setInvitation(data);
      
      // Also send notification
      await supabase.from('notifications').insert({
        user_id: profilePanel.id,
        sender_id: user.id,
        type: 'invitation',
        content: "vous a envoyé une invitation"
      });
      
      toast.success('Invitation envoyée !');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi de l'invitation");
    }
  };

  const handleCancelInvitation = async () => {
    if (!user) {
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    if (!invitation) return;
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitation.id);

      if (error) throw error;
      setInvitation(null);
      toast.success('Invitation annulée.');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'annulation de l'invitation");
    }
  };

  const handleOpenGallery = (images, startIndex = 0) => {
    setLightboxImages(images);
    setLightboxIndex(startIndex);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  };

  const handlePrevImage = () => {
    setLightboxIndex(prev => prev === 0 ? lightboxImages.length - 1 : prev - 1);
  };

  const handleNextImage = () => {
    setLightboxIndex(prev => prev === lightboxImages.length - 1 ? 0 : prev + 1);
  };

  const handleOpenProfile = async (profileData) => {
    if (!profileData?.id) return;
    setProfilePanelLoading(true);
    setProfilePanel(null);
    setProfilePanelPosts([]);
    setInvitation(null);
    document.body.style.overflow = 'hidden';

    const { data: fullProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileData.id)
      .single();

    const { data: userPosts } = await supabase
      .from('posts')
      .select('*, profiles(id, first_name, last_name, username, avatar_url, is_verified)')
      .eq('user_id', profileData.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setProfilePanel(fullProfile);
    setProfilePanelPosts(userPosts || []);
    
    await fetchInvitationStatus(profileData.id);
    
    setProfilePanelLoading(false);
  };

  const handleCloseProfile = () => {
    setProfilePanel(null);
    setProfilePanelPosts([]);
    if (!activeCommentPost) {
      document.body.style.overflow = '';
    }
  };

  return (
    <div className="feed-page">
      <div className="feed-header">
        <h1 className="font-black">Accueil</h1>
      </div>
      
      <div className="feed-content">
        <div className="composer glass cursor-pointer transition-transform hover:scale-[1.01]" onClick={() => {
          if (!user) {
            window.dispatchEvent(new Event('open-auth-modal'));
            return;
          }
          if (window.innerWidth <= 768) {
            setShowMobileComposer(true);
          } else {
            window.dispatchEvent(new Event('openCreatePostModal'));
          }
        }} style={{ padding: '1.25rem' }}>
          <div className="composer-input-area pointer-events-none mb-0">
            <img 
              src={profile?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
              alt="Avatar" 
              className="avatar"
            />
            <div className="composer-textarea flex items-center text-secondary bg-transparent border-none outline-none" style={{ height: '48px', fontSize: '1.1rem' }}>
             Postez en Orbit !
            </div>
          </div>
          <div className="composer-actions pointer-events-none mt-2 pt-3 border-t border-white/10">
            <div className="composer-tools">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-primary"><ImageIcon size={18} /></div>
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-primary"><Mic size={18} /></div>
              </div>
            </div>
            <button className="btn btn-primary px-5 py-1.5 rounded-full font-semibold shadow-lg">Créer</button>
          </div>
        </div>

        <div className="posts-container">
          {loading ? (
            [1, 2, 3].map((item) => (
              <div key={item} className="post-card glass">
                <div className="post-header">
                  <div className="avatar skeleton"></div>
                  <div className="post-meta">
                    <div className="skeleton line short"></div>
                    <div className="skeleton line very-short"></div>
                  </div>
                </div>
                <div className="post-body">
                  <div className="skeleton line"></div>
                  <div className="skeleton line medium"></div>
                </div>
              </div>
            ))
          ) : posts.length === 0 ? (
            <div className="glass p-8 text-center rounded-2xl text-secondary">
              Aucun post pour le moment. Soyez le premier à publier !
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="post-card glass">
                <div className="post-header">
                  <img 
                    src={post.profiles?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
                    alt="Avatar" 
                    className="avatar clickable-avatar"
                    onError={(e) => e.target.src = 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'}
                    onClick={() => handleOpenProfile(post.profiles)}
                  />
                  <div className="post-meta">
                    <div className="post-author-name font-bold flex items-center gap-1">
                      <span 
                        className="username-link"
                        onClick={() => handleOpenProfile(post.profiles)}
                      >
                        {post.profiles?.first_name} {post.profiles?.last_name}
                      </span>
                      <UserBadge username={post.profiles?.username} />
                    </div>
                    <div className="post-time text-secondary text-sm">
                      <span className="username-handle" onClick={() => handleOpenProfile(post.profiles)}>
                        @{post.profiles?.username}
                      </span>
                      {' '}• {formatTimeAgo(post.created_at)}
                    </div>
                    {post.group_id && post.groups && (
                      <div className="post-group-origin" style={{ marginTop: '2px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Posté depuis{' '}
                        <span 
                          onClick={() => navigate(`/group/${post.groups.id}`)}
                          style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: '600', textDecoration: 'none' }}
                          onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                        >
                          {post.groups.name}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <button className="post-options-btn" onClick={() => setPostDropdownOpen(postDropdownOpen === post.id ? null : post.id)}>
                      <MoreHorizontal size={20} />
                    </button>
                    {postDropdownOpen === post.id && (
                      <div className="absolute right-0 mt-2 w-48 glass rounded-xl shadow-lg overflow-hidden z-20" style={{ border: '1px solid var(--border-color)' }}>
                        {post.user_id === user?.id ? (
                          <>
                            <button 
                              className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm transition-colors"
                              onClick={() => {
                                setEditingPost(post);
                                setEditContent(post.content);
                                setPostDropdownOpen(null);
                              }}
                            >
                              ✏️ Modifier
                            </button>
                            <button 
                              className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm text-red-500 transition-colors border-t border-white/10"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              🗑️ Supprimer
                            </button>
                          </>
                        ) : (
                          <button 
                            className="w-full text-left px-4 py-3 hover:bg-white/10 text-sm text-yellow-500 transition-colors"
                            onClick={() => handleReportPost(post.id)}
                          >
                            ⚠️ Signaler
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="post-body">
                  <div 
                    className="post-text"
                    style={{ fontFamily: post.card_style && post.card_style !== 'standard' ? post.card_style : undefined }}
                    dangerouslySetInnerHTML={{ __html: formatTextWithLinks(post.content) }}
                  />

                  {post.original_content && (
                    <button
                      className="view-original-lang-btn"
                      onClick={() => setOriginalTextPopup({ content: post.original_content, lang: post.translation_lang })}
                    >
                      Voir langue d'origine
                    </button>
                  )}
                  
                  {post.image_urls && post.image_urls.length > 0 ? (
                    <ImageCarousel images={post.image_urls} onImageClick={handleOpenGallery} />
                  ) : post.image_url ? (
                    <div className="post-images">
                       <img 
                         src={post.image_url} 
                         alt="Post" 
                         className="post-image cursor-pointer hover:opacity-80 transition-opacity" 
                         loading="lazy" 
                         onClick={() => handleOpenGallery([post.image_url], 0)}
                       />
                    </div>
                  ) : null}
                  
                  {post.audio_url && (
                    <div className="post-audio" style={{ marginTop: '0.75rem' }}>
                      <CustomAudioPlayer src={post.audio_url} />
                    </div>
                  )}
                </div>

                <div className="post-actions">
                  <button className="post-action-btn" onClick={() => handleLike(post.id, post.likes?.[0]?.count || post.likes_count || 0)}>
                    <Heart size={20} />
                    <span>{formatCount(post.likes?.[0]?.count || post.likes_count || 0)}</span>
                  </button>
                  <button className="post-action-btn" onClick={() => handleOpenComments(post)}>
                    <MessageSquare size={20} />
                    <span>{formatCount(post.comments?.[0]?.count || post.comments_count || 0)}</span>
                  </button>
                  <button className="post-action-btn" onClick={() => handleOpenShare(post)}>
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="modal-overlay" onClick={() => setEditingPost(null)}>
          <div className="edit-modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3 className="font-bold text-lg">✏️ Modifier la publication</h3>
              <button className="icon-btn" onClick={() => setEditingPost(null)}><X size={20} /></button>
            </div>
            <div className="edit-modal-body">
              <div className="edit-modal-author">
                <img 
                  src={editingPost.profiles?.avatar_url || profile?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'}
                  alt="Avatar"
                  className="avatar"
                />
                <div>
                  <div className="font-bold text-sm">{editingPost.profiles?.first_name || profile?.first_name} {editingPost.profiles?.last_name || profile?.last_name}</div>
                  <div className="text-xs text-secondary">Modification en cours...</div>
                </div>
              </div>
              <textarea 
                className="edit-modal-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Que souhaitez-vous dire ?"
                autoFocus
              />
              {editingPost.image_urls?.length > 0 && (
                <div className="edit-modal-images">
                  {editingPost.image_urls.map((img, idx) => (
                    <img key={idx} src={img} alt="Post" className="edit-modal-img" />
                  ))}
                </div>
              )}
            </div>
            <div className="edit-modal-footer">
              <button className="btn btn-outline" onClick={() => setEditingPost(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleEditPost} disabled={!editContent.trim()}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {sharePost && (
        <div className="modal-overlay" onClick={() => { setSharePost(null); setEmbedPost(null); }}>
          <div className="share-modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="share-header">
              <h3 className="font-bold text-lg">🔗 Partager</h3>
              <button className="icon-btn" onClick={() => { setSharePost(null); setEmbedPost(null); }}><X size={20} /></button>
            </div>
            
            <div className="share-body">
              <button className="share-action-btn" onClick={handleCopyLink}>
                <div className="share-icon-circle"><Copy size={20} color="white" /></div>
                <div className="share-action-text">
                  <span className="font-bold">{isCopied ? '✅ Lien copié !' : 'Copier le lien'}</span>
                  <span className="text-xs text-secondary">Partagez ce post avec un lien direct</span>
                </div>
              </button>

              <button className="share-action-btn" onClick={handleShowEmbed}>
                <div className="share-icon-circle embed-icon"><Code size={20} color="white" /></div>
                <div className="share-action-text">
                  <span className="font-bold">Intégrer</span>
                  <span className="text-xs text-secondary">Obtenez le code embed pour votre site</span>
                </div>
              </button>

              {embedPost && (
                <div className="embed-code-section">
                  <div className="embed-label">Code d'intégration HTML :</div>
                  <pre className="embed-code-block">
                    <code>{getEmbedCode(embedPost)}</code>
                  </pre>
                  <button className="btn btn-primary btn-sm" onClick={handleCopyEmbed}>
                    {isEmbedCopied ? '✅ Code copié !' : '📋 Copier le code'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comments Side Panel */}
      <div className={`comments-panel ${activeCommentPost ? 'open' : ''}`}>
        <div className="comments-header glass">
          <h3 className="font-bold text-lg">Commentaires</h3>
          <button className="icon-btn" onClick={handleCloseComments}><X size={20} /></button>
        </div>
        
        <div className="comments-body">
          {commentsLoading ? (
            <div className="text-center p-4 text-secondary">Chargement...</div>
          ) : comments.length === 0 ? (
            <div className="text-center p-8 text-secondary">
              Soyez le premier à commenter !
            </div>
          ) : (
            (() => {
              const commentMap = buildCommentMap(comments);
              return comments.map((comment) => {
                const depth = getCommentDepth(comment, commentMap);
                const quotedAuthor = getQuotedAuthor(comment, commentMap);

                return (
                  <div
                    key={comment.id}
                    className="comment-item"
                    style={{ paddingLeft: `${depth * 16}px` }}
                  >
                    <img src={comment.profiles?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} alt="Avatar" className="avatar" />
                    <div className="comment-content">
                      {quotedAuthor && (
                        <div className="comment-reply-to">
                          En réponse à <span className="comment-reply-name">{quotedAuthor}</span>
                        </div>
                      )}
                      <div className="comment-meta">
                        <span className="font-bold text-sm username-link" onClick={() => handleOpenProfile(comment.profiles)}>
                          {comment.profiles?.first_name} {comment.profiles?.last_name}
                        </span>
                        <span className="text-xs text-secondary ml-2">{formatTimeAgo(comment.created_at)}</span>
                      </div>
                      <div className="comment-text text-sm">
                        {comment.content}
                      </div>
                      {comment.audio_url && (
                        <div className="mt-2 mb-1">
                          <CustomAudioPlayer src={comment.audio_url} />
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-1">
                        {canReplyTo(comment, commentMap) && (
                          <button 
                            className="reply-btn text-xs text-secondary font-bold"
                            onClick={() => {
                              if (!user) {
                                window.dispatchEvent(new Event('open-auth-modal'));
                                return;
                              }
                              setReplyingTo(comment);
                            }}
                          >
                            Répondre
                          </button>
                        )}
                        {comment.user_id === user?.id && (
                          <button 
                            className="text-xs text-red-400 hover:text-red-500 transition-colors flex items-center gap-1"
                            onClick={() => handleDeleteComment(comment.id, comment.created_at)}
                          >
                            <X size={12} /> Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()
          )}
          <div ref={commentsEndRef} />
        </div>

        <div className="comments-footer glass">
          {replyingTo && (
            <div className="replying-to-banner">
              <span className="text-xs">En réponse à <span className="font-bold">{replyingTo.profiles?.first_name}</span></span>
              <button onClick={() => setReplyingTo(null)}><X size={14} /></button>
            </div>
          )}
          <form className="comment-input-area flex-col items-stretch gap-2" onSubmit={handlePostComment}>
            <div className="flex items-center gap-2 w-full">
              <input 
                type="text" 
                placeholder="Écrivez un commentaire..."
                className="comment-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button 
                type="button" 
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 bg-white/5 border border-white/10 text-primary hover:bg-primary/20 hover:border-primary/50 hover:scale-105 shadow-sm"
                onClick={() => {
                  if (!user) {
                    window.dispatchEvent(new Event('open-auth-modal'));
                    return;
                  }
                  setShowVoiceModal(true);
                  startRecordingComment();
                }}
                title="Message vocal"
              >
                <Mic size={20} />
              </button>
              <button type="submit" className="send-comment-btn" disabled={(!newComment.trim() && !commentAudioBlob) || isSubmittingComment}>
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {activeCommentPost && (
        <div className="comments-overlay" onClick={handleCloseComments}></div>
      )}

      {/* Voice Comment Modal */}
      {showVoiceModal && (
        <div className="modal-overlay" onClick={() => { setShowVoiceModal(false); discardCommentAudio(); stopRecordingComment(); }} style={{ zIndex: 10000 }}>
          <div className="glass rounded-2xl p-6 w-[90%] max-w-sm flex flex-col items-center justify-center gap-4 relative" onClick={e => e.stopPropagation()} style={{ border: '1px solid var(--border-color)', animation: 'slideUp 0.3s ease-out' }}>
            <button 
              className="absolute top-4 right-4 text-secondary hover:text-white" 
              onClick={() => { setShowVoiceModal(false); discardCommentAudio(); stopRecordingComment(); }}
            >
              <X size={20} />
            </button>
            <h3 className="font-bold text-lg mb-2">Message vocal</h3>
            
            {!commentAudioBlob ? (
              <div className="flex flex-col items-center gap-4 w-full">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isRecordingComment ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-primary/20 text-primary'} transition-colors`}>
                  <Mic size={40} className={isRecordingComment ? 'animate-bounce' : ''} />
                </div>
                {isRecordingComment ? (
                  <>
                    <span className="text-red-400 font-medium">Enregistrement en cours...</span>
                    <button 
                      className="btn w-full border border-red-500/50 text-red-400 hover:bg-red-500/10 mt-2 font-bold py-3 rounded-xl transition-colors"
                      onClick={stopRecordingComment}
                    >
                      Terminer l'enregistrement
                    </button>
                  </>
                ) : (
                  <button 
                    className="btn w-full bg-primary hover:bg-primary-hover text-white mt-2 font-bold py-3 rounded-xl transition-colors"
                    onClick={startRecordingComment}
                  >
                    Démarrer l'enregistrement
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full">
                <CustomAudioPlayer src={URL.createObjectURL(commentAudioBlob)} />
                <div className="flex gap-3 w-full mt-2">
                  <button 
                    className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                    onClick={() => { discardCommentAudio(); startRecordingComment(); }}
                  >
                    <X size={16} /> Reprendre
                  </button>
                  <button 
                    className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors font-bold text-sm flex items-center justify-center gap-2"
                    onClick={handlePostComment}
                    disabled={isSubmittingComment}
                  >
                    {isSubmittingComment ? 'Envoi...' : <><Send size={16} /> Envoyer</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Profile Side Panel */}
      <div className={`user-profile-panel ${(profilePanel || profilePanelLoading) ? 'open' : ''}`}>
        {profilePanelLoading ? (
          <div className="profile-panel-loading">
            <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%' }}></div>
            <div className="skeleton line medium mt-4"></div>
            <div className="skeleton line short mt-2"></div>
          </div>
        ) : profilePanel && (
          <>
            <div className="profile-panel-cover">
              {profilePanel.cover_url ? (
                <img src={profilePanel.cover_url} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="profile-panel-cover-gradient"></div>
              )}
              <button className="icon-btn absolute top-4 right-4 z-10" onClick={handleCloseProfile}><X size={20} /></button>
            </div>
            <div className="profile-panel-body">
              <img 
                src={profilePanel.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
                alt="Avatar" 
                className="profile-panel-avatar"
                onError={(e) => e.target.src = 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'}
              />
              <h3 className="font-black text-xl mt-3 flex items-center justify-center gap-1">
                {profilePanel.first_name} {profilePanel.last_name}
                {profilePanel.is_verified && <span className="text-primary">✓</span>}
              </h3>
              <div className="text-secondary text-sm">@{profilePanel.username}</div>
              
              {profilePanel.bio && (
                <p className="profile-panel-bio mt-3">{profilePanel.bio}</p>
              )}

              <div className="profile-panel-meta mt-3">
                {profilePanel.country && (
                  <div className="meta-item text-secondary text-sm">
                    <MapPin size={14} /> {profilePanel.country}
                  </div>
                )}
                <div className="meta-item text-secondary text-sm">
                  <Calendar size={14} /> Rejoint en {new Date(profilePanel.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </div>
              </div>

              <div className="profile-panel-stats mt-4">
                <div className="stat"><span className="font-bold">{formatCount(profilePanel.followers_count || 0)}</span> abonnés</div>
                <div className="stat"><span className="font-bold">{formatCount(profilePanel.following_count || 0)}</span> abonnements</div>
              </div>

              {profilePanel.id !== user?.id && (
                <div className="mt-4 flex flex-col gap-2">
                  {!invitation ? (
                    <button className="btn btn-primary text-xs py-2 px-3 w-full" onClick={handleSendInvitation}>
                      + Inviter
                    </button>
                  ) : invitation.status === 'pending' ? (
                    invitation.sender_id === user.id ? (
                      <button className="btn btn-secondary text-xs py-2 px-3 w-full" onClick={handleCancelInvitation}>
                        Annuler invitation
                      </button>
                    ) : (
                      <div className="text-xs text-secondary bg-white/5 py-2 px-3 rounded-full font-bold text-center">
                        Invitation reçue
                      </div>
                    )
                  ) : invitation.status === 'accepted' ? (
                    <button className="btn btn-primary text-xs py-2 px-3 w-full" onClick={() => navigate(`/messenger?userId=${profilePanel.id}`)}>
                      Message privé
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <div className="profile-panel-divider"></div>
            <h4 className="font-bold text-sm px-4 mb-2 text-secondary">Publications</h4>

            <div className="profile-panel-posts">
              {profilePanelPosts.length === 0 ? (
                <div className="text-center p-4 text-secondary text-sm">Aucun post</div>
              ) : (
                profilePanelPosts.map(post => (
                  <div key={post.id} className="profile-panel-post-item">
                    <div 
                      className="text-sm"
                      style={{ fontFamily: post.card_style && post.card_style !== 'standard' ? post.card_style : undefined }}
                      dangerouslySetInnerHTML={{ __html: formatTextWithLinks(post.content?.substring(0, 150) + (post.content?.length > 150 ? '...' : '')) }}
                    />
                    {(post.image_url || (post.image_urls && post.image_urls.length > 0)) && (
                      <img 
                        src={post.image_urls?.[0] || post.image_url} 
                        alt="Post" 
                        className="profile-panel-post-img mt-2" 
                        loading="lazy"
                      />
                    )}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-secondary">
                      <button className="flex items-center gap-1 hover:text-primary transition-colors" onClick={() => handleLike(post.id, post.likes?.[0]?.count || post.likes_count || 0)}>
                        <Heart size={16} /> <span className="text-xs">{formatCount(post.likes?.[0]?.count || post.likes_count || 0)}</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-primary transition-colors" onClick={() => handleOpenComments(post)}>
                        <MessageSquare size={16} /> <span className="text-xs">{formatCount(post.comments?.[0]?.count || post.comments_count || 0)}</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-primary transition-colors" onClick={() => handleOpenShare(post)}>
                        <Share2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {(profilePanel || profilePanelLoading) && (
        <div className="profile-panel-overlay" onClick={handleCloseProfile}></div>
      )}

      {lightboxOpen && lightboxImages.length > 0 && (
        <>
          <div className="lightbox-overlay" onClick={handleCloseLightbox}></div>
          <div className="lightbox-modal">
            <button className="lightbox-close-btn" onClick={handleCloseLightbox}>
              <X size={28} />
            </button>

            <div className="lightbox-content">
              <img 
                src={lightboxImages[lightboxIndex]} 
                alt={`Image ${lightboxIndex + 1}`}
                className="lightbox-image"
              />
            </div>

            {lightboxImages.length > 1 && (
              <>
                <button 
                  className="lightbox-nav-btn lightbox-prev"
                  onClick={handlePrevImage}
                  title="Image précédente"
                >
                  ❮
                </button>
                <button 
                  className="lightbox-nav-btn lightbox-next"
                  onClick={handleNextImage}
                  title="Image suivante"
                >
                  ❯
                </button>

                <div className="lightbox-counter">
                  {lightboxIndex + 1} / {lightboxImages.length}
                </div>

                <div className="lightbox-thumbnails">
                  {lightboxImages.map((img, idx) => (
                    <img 
                      key={idx}
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className={`lightbox-thumbnail ${idx === lightboxIndex ? 'active' : ''}`}
                      onClick={() => setLightboxIndex(idx)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
      {showMobileComposer && (
        <div className="mobile-composer-overlay" onClick={() => setShowMobileComposer(false)}>
          <div className="mobile-composer-modal" onClick={e => e.stopPropagation()}>
            <div className="mobile-composer-header">
              <button 
                className="text-secondary hover:text-white"
                onClick={() => {
                  setShowMobileComposer(false);
                  setNewPostContent('');
                  setSelectedImages([]);
                }}
              >
                Annuler
              </button>
              <span className="font-bold">Créer une publication</span>
              <button 
                className="btn btn-primary btn-sm px-4 rounded-full font-semibold shadow-lg"
                onClick={async () => {
                  if (!newPostContent.trim() && selectedImages.length === 0) return;
                  setIsPublishing(true);
                  try {
                    const uploadedImageUrls = [];
                    for (const file of selectedImages) {
                      const url = await uploadToCloudinary(file);
                      uploadedImageUrls.push(url);
                    }

                    const { error } = await supabase.from('posts').insert({
                      content: newPostContent.trim(),
                      user_id: user.id,
                      image_urls: uploadedImageUrls,
                      image_url: uploadedImageUrls[0] || '',
                      card_style: selectedMobileFont.family
                    });

                    if (error) throw error;
                    toast.success('Publication réussie ! 🎉');
                    setNewPostContent('');
                    setSelectedImages([]);
                    setSelectedMobileFont(FONTS[0]);
                    setShowMobileComposer(false);
                  } catch (e) {
                    console.error('Mobile composer error:', e);
                    toast.error("Erreur lors de la publication.");
                  } finally {
                    setIsPublishing(false);
                  }
                }}
                disabled={isPublishing || (!newPostContent.trim() && selectedImages.length === 0)}
              >
                {isPublishing ? 'Publier...' : 'Publier'}
              </button>
            </div>

            <div className="flex items-center gap-3 p-4 border-b border-white/5">
              <img 
                src={profile?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
                alt="Avatar" 
                className="avatar w-10 h-10 rounded-full object-cover" 
              />
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white">{profile?.first_name} {profile?.last_name}</span>
                <span className="text-xs text-secondary">@{profile?.username}</span>
              </div>
            </div>

            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <textarea 
                ref={mobileTextareaRef}
                className="mobile-composer-textarea flex-1 p-4 bg-transparent border-none outline-none text-white resize-none"
                placeholder="Quoi de neuf ?"
                value={newPostContent}
                onChange={handleMobileTextareaChange}
                autoFocus
                style={{ fontFamily: selectedMobileFont.family }}
              />

              {showMobileFontMenu && (
                <div className="font-selector-dropdown" style={{ bottom: '100%', top: 'auto', left: '16px', right: '16px', width: 'auto', maxWidth: 'none' }}>
                  <div className="font-selector-header">
                    <span>Choisir une police d'écriture</span>
                    <button className="font-selector-close" onClick={() => setShowMobileFontMenu(false)}>
                      <X size={14} />
                    </button>
                  </div>
                  <div className="font-selector-list">
                    {FONTS.map((font, idx) => (
                      <button
                        key={idx}
                        className={`font-selector-item ${selectedMobileFont.family === font.family ? 'active' : ''}`}
                        style={{ fontFamily: font.family }}
                        onClick={() => handleSelectMobileFont(font)}
                      >
                        <span className="font-name">{font.name}</span>
                        <span className="font-preview">Exemple de texte en {font.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedMobileFont.family !== FONTS[0].family && (
              <div className="font-indicator-badge" style={{ marginLeft: '16px', marginRight: '16px' }}>
                <span>Police active : <strong>{selectedMobileFont.name}</strong></span>
                <button 
                  onClick={() => setSelectedMobileFont(FONTS[0])}
                  className="font-indicator-clear"
                  title="Réinitialiser la police"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {selectedImages.length > 0 && (
              <div className="mobile-composer-preview-images">
                {selectedImages.map((file, idx) => (
                  <div key={idx} className="mobile-preview-image-wrapper">
                    <img src={URL.createObjectURL(file)} alt="Preview" className="mobile-preview-img" />
                    <button 
                      className="remove-img-btn"
                      onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mobile-composer-footer">
              <label className="mobile-composer-tool-btn">
                <ImageIcon size={20} />
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  style={{ display: 'none' }}
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      const filesArray = Array.from(e.target.files);
                      setSelectedImages(prev => [...prev, ...filesArray]);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Original Text Popup */}
      {originalTextPopup && (
        <div className="modal-overlay" onClick={() => setOriginalTextPopup(null)}>
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
