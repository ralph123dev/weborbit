import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { formatTimeAgo, formatCount, uploadToCloudinary, formatTextWithLinks } from '../utils/helpers';
import { Heart, MessageSquare, Share2, MoreHorizontal, Image as ImageIcon, X } from 'lucide-react';
import './FeedPage.css';

export default function FeedPage() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    fetchPosts();

    // Subscribe to realtime updates
    const subscription = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
        if (payload.eventType === 'INSERT') {
          // Fetch the full post with profile info
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
          profiles (id, first_name, last_name, username, avatar_url, is_verified, is_ambassador)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

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
      .select('*, profiles (id, first_name, last_name, username, avatar_url, is_verified, is_ambassador)')
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
      // 1. Upload images if any
      const uploadedImageUrls = [];
      for (const file of selectedImages) {
        const url = await uploadToCloudinary(file);
        uploadedImageUrls.push(url);
      }

      // 2. Insert post
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
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p
    ));

    // Note: A full implementation would check a 'likes' table to see if the user already liked it,
    // and toggle it. This is a simplified version incrementing the counter directly.
    await supabase.from('posts').update({ likes_count: currentLikes + 1 }).eq('id', postId);
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
            // Skeleton Loading
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
                    alt={post.profiles?.nom} 
                    className="avatar"
                    onError={(e) => e.target.src = 'https://via.placeholder.com/40'}
                  />
                  <div className="post-meta">
                    <div className="post-author-name font-bold flex items-center gap-1">
                      {post.profiles?.first_name} {post.profiles?.last_name}
                      {post.profiles?.is_verified && (
                        <span className="text-primary" title="Vérifié">✓</span>
                      )}
                    </div>
                    <div className="post-time text-secondary text-sm">
                      @{post.profiles?.username} • {formatTimeAgo(post.created_at)}
                    </div>
                  </div>
                  <button className="post-options-btn">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                
                <div className="post-body">
                  <div 
                    className="post-text"
                    dangerouslySetInnerHTML={{ __html: formatTextWithLinks(post.content) }}
                  />
                  
                  {post.image_urls && post.image_urls.length > 0 ? (
                    <div className="post-images">
                      {post.image_urls.map((img, idx) => (
                        <img key={idx} src={img} alt="Post" className="post-image" loading="lazy" />
                      ))}
                    </div>
                  ) : post.image_url ? (
                    <div className="post-images">
                       <img src={post.image_url} alt="Post" className="post-image" loading="lazy" />
                    </div>
                  ) : null}
                  
                  {/* Note: Audio posts from mobile might have audio_url */}
                  {post.audio_url && (
                    <div className="post-audio">
                      <audio controls src={post.audio_url} className="w-full mt-2" />
                    </div>
                  )}
                </div>

                <div className="post-actions">
                  <button className="post-action-btn" onClick={() => handleLike(post.id, post.likes_count || 0)}>
                    <Heart size={20} />
                    <span>{formatCount(post.likes_count)}</span>
                  </button>
                  <button className="post-action-btn">
                    <MessageSquare size={20} />
                    <span>{formatCount(post.comments_count)}</span>
                  </button>
                  <button className="post-action-btn">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
