import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { formatTimeAgo, formatCount, formatTextWithLinks } from '../utils/helpers';
import { Heart, MessageSquare, Share2, MoreHorizontal, ArrowLeft, Settings, MapPin, Calendar, Link as LinkIcon } from 'lucide-react';
import './ProfilePage.css';
import './FeedPage.css'; // Reuse post styles

export default function ProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      // 2. Fetch Posts
      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (id, first_name, last_name, username, avatar_url, is_verified),
          comments(count),
          likes(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      setPosts(postsData || []);

      // 3. Fake stats or real stats if table exists
      // For now, we'll just use the profile fields if they exist or default to 0
      setStats({
        followers: profileData.followers_count || 0,
        following: profileData.following_count || 0,
      });

    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = () => {
    // Dummy toggle since we don't have a fully defined follow system here yet
    setIsFollowing(!isFollowing);
    setStats(prev => ({ ...prev, followers: prev.followers + (isFollowing ? -1 : 1) }));
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-header skeleton" style={{ height: '200px' }}></div>
        <div className="profile-info-container" style={{ padding: '2rem' }}>
          <div className="skeleton avatar" style={{ width: '120px', height: '120px', marginTop: '-60px' }}></div>
          <div className="skeleton line medium mt-4"></div>
          <div className="skeleton line short mt-2"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-full text-secondary">
        Profil introuvable.
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-top-bar glass">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="font-bold flex-1 ml-4">
          {profile.first_name} {profile.last_name}
          <div className="text-xs text-secondary">{posts.length} posts</div>
        </div>
      </div>

      {/* Cover Image */}
      <div className="profile-cover">
        {profile.cover_url ? (
          <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="profile-cover-gradient"></div>
        )}
      </div>

      <div className="profile-details-section">
        <div className="profile-actions-row">
          <img 
            src={profile.avatar_url || 'https://via.placeholder.com/150'} 
            alt="Avatar" 
            className="profile-large-avatar"
            onError={(e) => e.target.src = 'https://via.placeholder.com/150'}
          />
          <div className="flex-1"></div>
          {isOwnProfile ? (
            <button className="btn btn-outline" onClick={() => navigate('/settings')}>
              Éditer le profil
            </button>
          ) : (
            <button className={`btn ${isFollowing ? 'btn-outline' : 'btn-primary'}`} onClick={handleFollow}>
              {isFollowing ? 'Abonné' : 'S\'abonner'}
            </button>
          )}
        </div>

        <div className="profile-info-text">
          <div className="font-black text-2xl flex items-center gap-1">
            {profile.first_name} {profile.last_name}
            {profile.is_verified && <span className="text-primary text-xl">✓</span>}
          </div>
          <div className="text-secondary text-lg">@{profile.username}</div>

          {profile.bio && (
            <div className="profile-bio mt-4">
              {profile.bio}
            </div>
          )}

          <div className="profile-meta-grid mt-4">
            {profile.country && (
              <div className="meta-item text-secondary">
                <MapPin size={16} /> {profile.country}
              </div>
            )}
            <div className="meta-item text-secondary">
              <Calendar size={16} /> Rejoint en {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div className="profile-stats mt-4">
            <div className="stat-item">
              <span className="font-bold">{formatCount(stats.following)}</span> <span className="text-secondary">Abonnements</span>
            </div>
            <div className="stat-item">
              <span className="font-bold">{formatCount(stats.followers)}</span> <span className="text-secondary">Abonnés</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="profile-tabs">
        <div className="profile-tab active">Posts</div>
        <div className="profile-tab">Réponses</div>
        <div className="profile-tab">Médias</div>
        <div className="profile-tab">J'aime</div>
      </div>

      {/* User Posts (Reusing FeedPage classes) */}
      <div className="profile-posts posts-container">
        {posts.length === 0 ? (
          <div className="text-center p-8 text-secondary glass rounded-2xl mx-4">
            Aucun post à afficher.
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="post-card glass mx-4">
              <div className="post-header">
                <img 
                  src={post.profiles?.avatar_url || 'https://via.placeholder.com/40'} 
                  alt="Avatar" 
                  className="avatar"
                />
                <div className="post-meta">
                  <div className="post-author-name font-bold flex items-center gap-1">
                    {post.profiles?.first_name} {post.profiles?.last_name}
                    {post.profiles?.is_verified && <span className="text-primary" title="Vérifié">✓</span>}
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
                      <img key={idx} src={img} alt="Post" className="post-image" loading="lazy" onClick={() => window.open(img, '_blank')} />
                    ))}
                  </div>
                ) : post.image_url ? (
                  <div className="post-images">
                      <img src={post.image_url} alt="Post" className="post-image" loading="lazy" onClick={() => window.open(post.image_url, '_blank')} />
                  </div>
                ) : null}
              </div>

              <div className="post-actions">
                <button className="post-action-btn">
                  <Heart size={20} />
                  <span>{formatCount(post.likes?.[0]?.count || post.likes_count || 0)}</span>
                </button>
                <button className="post-action-btn">
                  <MessageSquare size={20} />
                  <span>{formatCount(post.comments?.[0]?.count || post.comments_count || 0)}</span>
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
  );
}
