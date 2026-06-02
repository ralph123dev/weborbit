import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { formatTimeAgo, formatCount, uploadToCloudinary, formatTextWithLinks } from '../utils/helpers';
import { Heart, MessageSquare, Share2, MoreHorizontal, Image as ImageIcon, X, Send, Copy, ArrowRight, ArrowLeft, MapPin, Calendar, Code } from 'lucide-react';
import './FeedPage.css';

export default function FeedPage() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);

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

  // Share state
  const [sharePost, setSharePost] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [embedPost, setEmbedPost] = useState(null);
  const [isEmbedCopied, setIsEmbedCopied] = useState(false);

  // User Profile Panel state
  const [profilePanel, setProfilePanel] = useState(null);
  const [profilePanelPosts, setProfilePanelPosts] = useState([]);
  const [profilePanelLoading, setProfilePanelLoading] = useState(false);

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
    if (!user) return;
    
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
    document.body.style.overflow = '';
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
    if (!newComment.trim() || !activeCommentPost) return;
    setIsSubmittingComment(true);
    try {
      const { data, error } = await supabase.from('comments').insert({
        post_id: activeCommentPost.id,
        user_id: user.id,
        content: newComment.trim(),
        parent_id: replyingTo?.id || null
      }).select('*, profiles(id, first_name, last_name, avatar_url, username)').single();
      
      if (error) throw error;
      
      setComments(prev => [...prev, data]);
      setNewComment('');
      setReplyingTo(null);
      
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
  const handleSendInvitation = async () => {
    if (!user || !profilePanel) return;
    try {
      const { error } = await supabase.from('invitations').insert({
        sender_id: user.id,
        receiver_id: profilePanel.id,
        status: 'pending'
      });
      if (error) throw error;
      
      // Also send notification
      await supabase.from('notifications').insert({
        user_id: profilePanel.id,
        sender_id: user.id,
        type: 'invitation',
        content: "vous a envoyé une invitation"
      });
      
      alert('Invitation envoyée !');
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi de l'invitation");
    }
  };

  const handleOpenProfile = async (profileData) => {
    if (!profileData?.id) return;
    setProfilePanelLoading(true);
    setProfilePanel(null);
    setProfilePanelPosts([]);
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
        <div className="composer glass">
          <div className="composer-input-area">
            <img 
              src={profile?.avatar_url || 'https://via.placeholder.com/40'} 
              alt="Avatar" 
              className="avatar" 
              onError={(e) => e.target.src = 'https://via.placeholder.com/40'}
            />
            <textarea 
              placeholder="Quoi de neuf ?" 
              className="composer-textarea"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            />
          </div>
          
          {selectedImages.length > 0 && (
            <div className="composer-preview-images">
              {selectedImages.map((file, idx) => (
                <div key={idx} className="preview-image-wrapper">
                  <img src={URL.createObjectURL(file)} alt="Preview" className="preview-img" />
                  <button className="remove-img-btn" onClick={() => removeImage(idx)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="composer-actions">
            <div className="composer-tools">
              <label className="composer-tool-btn cursor-pointer">
                <ImageIcon size={20} className="text-primary" />
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handlePublish}
              disabled={isPublishing || (!newPostContent.trim() && selectedImages.length === 0)}
            >
              {isPublishing ? 'Publication...' : 'Publier'}
            </button>
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
                    src={post.profiles?.avatar_url || 'https://via.placeholder.com/40'} 
                    alt="Avatar" 
                    className="avatar clickable-avatar"
                    onError={(e) => e.target.src = 'https://via.placeholder.com/40'}
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
                      {post.profiles?.is_verified && (
                        <span className="text-primary" title="Vérifié">✓</span>
                      )}
                    </div>
                    <div className="post-time text-secondary text-sm">
                      <span className="username-handle" onClick={() => handleOpenProfile(post.profiles)}>
                        @{post.profiles?.username}
                      </span>
                      {' '}• {formatTimeAgo(post.created_at)}
                    </div>
                  </div>
                  
                  {post.user_id === user?.id && (
                    <div className="relative">
                      <button className="post-options-btn" onClick={() => setPostDropdownOpen(postDropdownOpen === post.id ? null : post.id)}>
                        <MoreHorizontal size={20} />
                      </button>
                      {postDropdownOpen === post.id && (
                        <div className="absolute right-0 mt-2 w-48 glass rounded-xl shadow-lg overflow-hidden z-20" style={{ border: '1px solid var(--border-color)' }}>
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
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="post-body">
                  <div 
                    className="post-text"
                    dangerouslySetInnerHTML={{ __html: formatTextWithLinks(post.content) }}
                  />
                  
                  {post.image_urls && post.image_urls.length > 0 ? (
                    <div className="post-images">
                      {post.image_urls.map((img, idx) => (
                        <img key={idx} src={img} alt="Post" className="post-image" loading="lazy" onClick={() => window.open(img, '_blank')} />
                      ))}
                    </div>
                  ) : post.image_url ? (
                    <div className="post-images">
                       <img src={post.image_url} alt="Post" className="post-image" loading="lazy" onClick={() => window.open(post.image_url, '_blank')} />
                    </div>
                  ) : null}
                  
                  {post.audio_url && (
                    <div className="post-audio">
                      <audio controls src={post.audio_url} className="w-full mt-2" />
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
                  src={editingPost.profiles?.avatar_url || profile?.avatar_url || 'https://via.placeholder.com/40'}
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
            comments.map(comment => (
              <div key={comment.id} className="comment-item">
                <img src={comment.profiles?.avatar_url || 'https://via.placeholder.com/40'} alt="Avatar" className="avatar" />
                <div className="comment-content">
                  <div className="comment-meta">
                    <span className="font-bold text-sm username-link" onClick={() => handleOpenProfile(comment.profiles)}>
                      {comment.profiles?.first_name} {comment.profiles?.last_name}
                    </span>
                    <span className="text-xs text-secondary ml-2">{formatTimeAgo(comment.created_at)}</span>
                  </div>
                  {comment.parent_id && (
                    <div className="reply-indicator text-xs text-primary mb-1">En réponse</div>
                  )}
                  <div className="comment-text text-sm">
                    {comment.content}
                  </div>
                  <button 
                    className="reply-btn text-xs text-secondary font-bold mt-1"
                    onClick={() => setReplyingTo(comment)}
                  >
                    Répondre
                  </button>
                </div>
              </div>
            ))
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
          <form className="comment-input-area" onSubmit={handlePostComment}>
            <input 
              type="text" 
              placeholder="Écrivez un commentaire..."
              className="comment-input"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button type="submit" className="send-comment-btn" disabled={!newComment.trim() || isSubmittingComment}>
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
      
      {activeCommentPost && (
        <div className="comments-overlay" onClick={handleCloseComments}></div>
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
            <div className="profile-panel-header">
              {profilePanel.id !== user?.id && (
                <button className="btn btn-primary text-xs py-1 px-3 mr-auto flex items-center gap-2" onClick={handleSendInvitation}>
                  + Inviter
                </button>
              )}
              <button className="icon-btn" onClick={handleCloseProfile}><X size={20} /></button>
            </div>
            <div className="profile-panel-cover">
              {profilePanel.cover_url ? (
                <img src={profilePanel.cover_url} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="profile-panel-cover-gradient"></div>
              )}
            </div>
            <div className="profile-panel-body">
              <img 
                src={profilePanel.avatar_url || 'https://via.placeholder.com/80'} 
                alt="Avatar" 
                className="profile-panel-avatar"
                onError={(e) => e.target.src = 'https://via.placeholder.com/80'}
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
    </div>
  );
}
