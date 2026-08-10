import { Calendar, Code, Copy, Heart, Image as ImageIcon, MapPin, MessageSquare, Mic, MoreHorizontal, Send, Share2, X, UserPlus, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { formatCount, formatTextWithLinks, formatTimeAgo, uploadToCloudinary } from '../utils/helpers';
import { buildCommentMap, getCommentDepth, getQuotedAuthor, getEffectiveParentId, canReplyTo } from '../utils/commentHelpers';
import CustomAudioPlayer from '../components/CustomAudioPlayer';
import CreatePostModal from '../components/CreatePostModal';
import './GroupFeedPage.css';

export default function GroupFeedPage() {
  const { groupId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [group, setGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [adminActionUser, setAdminActionUser] = useState(null);

  // Edit Group State
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupAvatar, setEditGroupAvatar] = useState('');
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

  // Group Post Modal State
  const [isGroupPostModalOpen, setIsGroupPostModalOpen] = useState(false);
  const [isShareGroupModalOpen, setIsShareGroupModalOpen] = useState(false);

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
  const [profilePanelLoading, setProfilePanelLoading] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [showMobileComposer, setShowMobileComposer] = useState(false);

  // Lightbox Gallery state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!groupId) return;
    fetchGroupDetails();
    fetchPosts();

    const subscription = supabase
      .channel(`public:posts:group_${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `group_id=eq.${groupId}` }, payload => {
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
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      const { data: gData, error: gError } = await supabase.from('groups').select('*').eq('id', groupId).single();
      if (gError) throw gError;
      setGroup(gData);

      const { data: mData, error: mError } = await supabase
        .from('group_members')
        .select('user_id, role')
        .eq('group_id', groupId);
      
      if (mError) throw mError;

      if (mData && mData.length > 0) {
        const userIds = mData.map(m => m.user_id);
        const { data: pData, error: pError } = await supabase
          .from('profiles')
          .select('id, avatar_url, first_name, last_name, username')
          .in('id', userIds);

        if (pError) console.error('Error fetching member profiles:', pError);

        const profileMap = {};
        if (pData) {
          pData.forEach(p => {
            profileMap[p.id] = p;
          });
        }

        const enrichedMembers = mData.map(m => ({
          ...m,
          profiles: profileMap[m.user_id] || null
        }));

        setGroupMembers(enrichedMembers);
      } else {
        setGroupMembers([]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Groupe introuvable');
      navigate('/');
    }
  };

  const handleUpdateGroup = async () => {
    if (!editGroupName.trim()) return toast.error('Le nom du groupe est requis.');
    setIsUpdatingGroup(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .update({
          name: editGroupName.trim(),
          description: editGroupDescription.trim(),
          avatar_url: editGroupAvatar.trim()
        })
        .eq('id', groupId)
        .select()
        .single();
      
      if (error) throw error;
      setGroup(data);
      setIsEditGroupModalOpen(false);
      toast.success('Groupe mis à jour avec succès.');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour du groupe.');
    } finally {
      setIsUpdatingGroup(false);
    }
  };

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
          comments(count),
          likes(count)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSinglePost = async (id) => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles (id, first_name, last_name, username, avatar_url, is_verified, is_ambassador), comments(count), likes(count)')
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
        group_id: groupId,
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
    if (!user || !profilePanel) return;
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
    if (!user || !invitation) return;
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

  const handleAdminActionClick = (profileData) => {
    if (user?.id === group?.created_by && profileData.id !== user.id) {
      setAdminActionUser(profileData);
    } else {
      handleOpenProfile(profileData);
    }
  };

  const handleRemoveFromGroup = async (userId) => {
    if (!window.confirm("Voulez-vous vraiment retirer cet utilisateur du groupe ?")) return;
    try {
      const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
      if (error) throw error;
      toast.success("Utilisateur retiré du groupe.");
      setGroupMembers(prev => prev.filter(m => m.user_id !== userId));
      setAdminActionUser(null);
    } catch (e) {
      toast.error("Erreur lors de la suppression du membre.");
    }
  };

  const isMember = user && group && (group.created_by === user.id || groupMembers.some(m => m.user_id === user.id));

  const handleJoinGroup = async () => {
    if (!user) {
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: user.id,
        role: 'member',
        added_by: user.id
      });
      if (error) throw error;
      setGroupMembers(prev => [...prev, { user_id: user.id, role: 'member' }]);
      toast.success('Vous avez rejoint le groupe !');
    } catch (e) {
      console.error(e);
      toast.error('Impossible de rejoindre le groupe.');
    }
  };

  const handleInviteToGroup = () => {
    const inviteLink = `${window.location.origin}/group/${groupId}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Lien d'invitation copié dans le presse-papier !");
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
      <div className="feed-container">
        
        {/* Group Header */}
        {group && (
          <div className="group-header glass" style={{ marginBottom: '1.5rem', borderRadius: '16px', overflow: 'hidden' }}>
            <div className="group-cover" style={{ height: '150px', background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                {user?.id === group.created_by && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
                    onClick={() => {
                      setEditGroupName(group.name || '');
                      setEditGroupDescription(group.description || '');
                      setEditGroupAvatar(group.avatar_url || '');
                      setIsEditGroupModalOpen(true);
                    }}
                  >
                    ✏️ Modifier
                  </button>
                )}
                {isMember ? (
                  <button 
                    className="btn btn-primary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
                    onClick={handleInviteToGroup}
                  >
                    <UserPlus size={18} /> Inviter
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                    onClick={handleJoinGroup}
                  >
                    <UserPlus size={18} /> Rejoindre le groupe
                  </button>
                )}
              </div>
            </div>
            <div className="group-info" style={{ padding: '2rem', display: 'flex', alignItems: 'flex-start', gap: '2rem', position: 'relative' }}>
              {group.avatar_url && (
                <img 
                  src={group.avatar_url} 
                  alt="Group Profile" 
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '20px', 
                    objectFit: 'cover', 
                    marginTop: '-5rem', 
                    border: '4px solid var(--bg-color-alt)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    position: 'relative',
                    zIndex: 2
                  }} 
                />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '800', color: 'white', letterSpacing: '-0.5px' }}>{group.name}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '1rem' }}>
                  {group.type === 'private' ? <Lock size={16} /> : <Unlock size={16} />} 
                  <span>Groupe ({group.type === 'private' ? 'Privé' : 'Public'}) · {groupMembers.length} membre{groupMembers.length > 1 ? 's' : ''}</span>
                </div>
                
                {groupMembers.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
                    {groupMembers.slice(0, 20).map((m, idx) => (
                      <img 
                        key={m.user_id} 
                        src={m.profiles?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
                        alt="Membre" 
                        style={{ 
                          width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #1a1a2e', 
                          marginLeft: idx === 0 ? '0' : '-12px', zIndex: 20 - idx, objectFit: 'cover' 
                        }} 
                        title={m.profiles?.first_name ? `${m.profiles.first_name} ${m.profiles.last_name}` : 'Membre'}
                      />
                    ))}
                  </div>
                )}
                
                {group.description && (
                  <p style={{ margin: '1rem 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem', whiteSpace: 'pre-wrap', maxWidth: '700px', lineHeight: '1.5' }}>
                    {group.description}
                  </p>
                )}
                
                {!isMember && <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '0.9rem', marginTop: '0.5rem' }}>• Vous n'êtes pas membre</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                {isMember ? (
                  <button 
                    className="btn" 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', padding: '0.6rem 1.25rem', borderRadius: '8px', background: '#5b21b6', color: 'white', border: 'none' }}
                    onClick={handleInviteToGroup}
                  >
                    + Inviter
                  </button>
                ) : (
                  <button 
                    className="btn" 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none' }}
                    onClick={handleJoinGroup}
                  >
                    + Rejoindre
                  </button>
                )}
                <button 
                  className="btn" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', transition: 'background 0.2s' }}
                  onClick={() => setIsShareGroupModalOpen(true)}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  <Share2 size={18} style={{ transform: 'scaleX(-1)' }} /> Partager
                </button>
              </div>
            </div>
          </div>
        )}
      
      <div className="feed-content">
        {isMember ? (
          <div className="composer glass cursor-pointer transition-transform hover:scale-[1.01]" onClick={() => setIsGroupPostModalOpen(true)} style={{ padding: '1.25rem' }}>
            <div className="composer-input-area pointer-events-none mb-0">
              <img 
                src={profile?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
                alt="Avatar" 
                className="avatar"
              />
              <div className="composer-textarea flex items-center text-secondary bg-transparent border-none outline-none" style={{ height: '48px', fontSize: '1.1rem' }}>
                Quoi de neuf ?
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
        ) : (
          <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', textAlign: 'center', marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Rejoignez ce groupe pour publier et interagir avec les membres.
            </p>
            <button 
              className="btn btn-primary" 
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontWeight: 'bold', padding: '0.6rem 1.5rem' }}
              onClick={handleJoinGroup}
            >
              <UserPlus size={18} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} /> Rejoindre le groupe
            </button>
          </div>
        )}

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
                    onClick={() => handleAdminActionClick(post.profiles)}
                  />
                  <div className="post-meta">
                    <div className="post-author flex items-center gap-2">
                      <span 
                        className="username-link"
                        onClick={() => handleAdminActionClick(post.profiles)}
                      >
                        {post.profiles?.first_name} {post.profiles?.last_name}
                      </span>
                      {post.user_id === group?.created_by && (
                        <span className="text-xs font-bold" style={{ background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Admin</span>
                      )}
                      {post.profiles?.is_verified && (
                        <span className="text-primary" title="Vérifié">✓</span>
                      )}
                    </div>
                    <div className="post-time text-secondary text-sm">
                      <span className="username-handle" onClick={() => handleAdminActionClick(post.profiles)}>
                        @{post.profiles?.username}
                      </span>
                      {' '}• {formatTimeAgo(post.created_at)}
                    </div>
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
                  
                  {post.image_urls && post.image_urls.length > 0 ? (
                    <div className="post-images">
                      {post.image_urls.map((img, idx) => (
                        <img 
                          key={idx} 
                          src={img} 
                          alt="Post" 
                          className="post-image cursor-pointer hover:opacity-80 transition-opacity" 
                          loading="lazy" 
                          onClick={() => handleOpenGallery(post.image_urls, idx)}
                        />
                      ))}
                    </div>
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
                            onClick={() => setReplyingTo(comment)}
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
      {adminActionUser && (
        <div className="modal-overlay" onClick={() => setAdminActionUser(null)} style={{ zIndex: 11000 }}>
          <div className="glass rounded-xl p-4 w-[90%] max-w-sm flex flex-col items-stretch gap-2" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-center mb-2">{adminActionUser.first_name} {adminActionUser.last_name}</h3>
            <button className="btn btn-primary w-full" onClick={() => { setAdminActionUser(null); handleOpenProfile(adminActionUser); }}>
              Voir le profil
            </button>
            <button className="btn w-full" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }} onClick={() => handleRemoveFromGroup(adminActionUser.id)}>
              Supprimer du groupe
            </button>
            <button className="btn btn-outline w-full mt-2" onClick={() => setAdminActionUser(null)}>Annuler</button>
          </div>
        </div>
      )}

      {isEditGroupModalOpen && (
        <div className="create-post-overlay" onClick={() => !isUpdatingGroup && setIsEditGroupModalOpen(false)} style={{ zIndex: 12000 }}>
          <div className="create-post-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="create-post-header">
              <div className="create-post-title">
                <h3 style={{ fontSize: '1.2rem' }}>Modifier le groupe</h3>
              </div>
              <button className="create-post-close-btn" onClick={() => setIsEditGroupModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="create-post-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>Nom du groupe</label>
                  <input 
                    type="text" 
                    style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '0.75rem 1rem', color: 'white', outline: 'none' }}
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    placeholder="Nom du groupe"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>Description</label>
                  <textarea 
                    style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '0.75rem 1rem', color: 'white', outline: 'none', resize: 'none' }}
                    rows="3"
                    value={editGroupDescription}
                    onChange={(e) => setEditGroupDescription(e.target.value)}
                    placeholder="Description du groupe"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '0.5rem', display: 'block' }}>Lien de l'image de profil (URL)</label>
                  <input 
                    type="text" 
                    style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '0.75rem 1rem', color: 'white', outline: 'none' }}
                    value={editGroupAvatar}
                    onChange={(e) => setEditGroupAvatar(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <div className="create-post-footer" style={{ justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setIsEditGroupModalOpen(false)} disabled={isUpdatingGroup} style={{ padding: '0.6rem 1.5rem', borderRadius: '100px' }}>
                Annuler
              </button>
              <button className="create-post-publish-btn" onClick={handleUpdateGroup} disabled={isUpdatingGroup || !editGroupName.trim()} style={{ padding: '0.6rem 1.5rem' }}>
                {isUpdatingGroup ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreatePostModal 
        isOpen={isGroupPostModalOpen} 
        onClose={() => setIsGroupPostModalOpen(false)} 
        groupId={groupId} 
      />

      {isShareGroupModalOpen && (
        <div className="modal-overlay" onClick={() => setIsShareGroupModalOpen(false)} style={{ zIndex: 13000 }}>
          <div className="share-modal glass" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px' }}>
            <div className="share-header">
              <h3 className="font-bold text-lg">🔗 Partager le groupe</h3>
              <button className="icon-btn" onClick={() => setIsShareGroupModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="share-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem 0' }}>
              <button className="share-action-btn" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/group/${groupId}`);
                toast.success('Lien copié !');
                setIsShareGroupModalOpen(false);
              }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Copy size={20} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Copier le lien</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Partager le lien direct du groupe</div>
                </div>
              </button>

              <button className="share-action-btn" onClick={() => {
                const code = `<iframe src="${window.location.origin}/group/${groupId}?embed=true" width="100%" height="600" frameborder="0"></iframe>`;
                navigator.clipboard.writeText(code);
                toast.success('Code d\'intégration copié !');
                setIsShareGroupModalOpen(false);
              }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Code size={20} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Intégrer (Embed)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Obtenir le code HTML</div>
                </div>
              </button>

              {user?.id !== group?.created_by && (
                <button className="share-action-btn" onClick={() => {
                  toast.success('Signalement envoyé aux administrateurs.');
                  setIsShareGroupModalOpen(false);
                }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', marginTop: '0.5rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={20} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#ef4444' }}>Signaler le groupe</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contenu inapproprié ou spam</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
