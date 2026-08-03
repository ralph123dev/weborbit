import {
  Bell,
  ChevronRight,
  DollarSign,
  Globe,
  ImageMinus,
  Lock,
  LogOut,
  MapPin,
  Moon,
  Palette,
  Sun,
  UserCircle,
  UserMinus,
  Video,
  UserPlus,
  Check,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../services/supabase';
import { uploadToCloudinary } from '../utils/helpers';
import './SettingsPage.css';

export default function SettingsPage() {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, profile, setProfile } = useAuth();
  const navigate = useNavigate();
  
  const [isCountryFilterEnabled, setIsCountryFilterEnabled] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [editFirstName, setEditFirstName] = useState(profile?.first_name || '');
  const [editLastName, setEditLastName] = useState(profile?.last_name || '');
  const [editBio, setEditBio] = useState(profile?.bio || '');
  const [editAge, setEditAge] = useState(profile?.age || '');
  const [editRelationship, setEditRelationship] = useState(profile?.relationship_status || '');
  
  // Images
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '');
  
  const [saving, setSaving] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotif, setLoadingNotif] = useState(false);

  const [showInvitations, setShowInvitations] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [loadingInv, setLoadingInv] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('Voulez-vous vraiment vous déconnecter ?')) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer votre photo de profil ?')) return;
    setDeleting(true);
    try {
      await supabase.from('profiles').update({ avatar_url: '' }).eq('id', user.id);
      setProfile(prev => ({ ...prev, avatar_url: '' }));
      alert('Photo de profil supprimée.');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!window.confirm('⚠️ Voulez-vous vraiment supprimer votre profil ? Cette action est irréversible.')) return;
    if (!window.confirm('Êtes-vous absolument sûr ? Toutes vos données seront perdues.')) return;
    setDeleting(true);
    try {
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression du profil.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      let finalAvatarUrl = profile?.avatar_url || '';

      if (avatarFile) {
        finalAvatarUrl = await uploadToCloudinary(avatarFile);
      }

      const updates = {
        first_name: editFirstName,
        last_name: editLastName,
        bio: editBio,
        age: editAge ? parseInt(editAge) : null,
        relationship_status: editRelationship || null,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      
      if (error) {
        throw error;
      }
      
      setProfile(prev => ({ ...prev, ...updates }));
      setShowProfileEditor(false);
      setAvatarFile(null);
      alert('Profil mis à jour avec succès !');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotif(true);
    try {
      // Fetch recent interactions on user's posts (likes, comments, follows)
      const { data } = await supabase
        .from('posts')
        .select('id, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotif(false);
    }
  };

  const fetchSettingsInvitations = async () => {
    setLoadingInv(true);
    try {
      const { data: received, error } = await supabase
        .from('invitations')
        .select('*, sender:profiles!invitations_sender_id_fkey(*)')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(received || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInv(false);
    }
  };

  const handleAcceptInv = async (inv) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', inv.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: inv.sender.id,
        sender_id: user.id,
        type: 'invitation_accepted',
        content: "a accepté votre invitation"
      });

      setInvitations(prev => prev.filter(i => i.id !== inv.id));
      
      // Redirect to messenger
      navigate(`/messenger?userId=${inv.sender.id}`);
    } catch (err) {
      console.error(err);
      alert("Impossible d'accepter l'invitation");
    }
  };

  const handleRejectInv = async (invId) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invId);

      if (error) throw error;
      setInvitations(prev => prev.filter(i => i.id !== invId));
    } catch (err) {
      console.error(err);
    }
  };

  const SettingsItem = ({ icon: Icon, iconColor, label, subLabel, action, rightElement, customBg, danger }) => (
    <div 
      className="settings-item cursor-pointer" 
      onClick={action}
      style={customBg ? { backgroundColor: customBg } : {}}
    >
      <div className="settings-icon-box" style={{ backgroundColor: iconColor }}>
        <Icon size={22} color="white" />
      </div>
      <div className="settings-content">
        <div className="settings-label" style={{ color: danger ? '#FF6B6B' : (customBg ? iconColor : 'var(--text-primary)'), fontWeight: customBg ? 900 : 700 }}>{label}</div>
        <div className="settings-sublabel">{subLabel}</div>
      </div>
      <div className="settings-right-element">
        {rightElement}
      </div>
    </div>
  );

  const ToggleSwitch = ({ enabled }) => (
    <div className={`toggle-switch ${enabled ? 'active' : ''}`}>
      <div className="toggle-knob"></div>
    </div>
  );

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="font-black text-2xl">Paramètres</h1>
      </div>
      
      <div className="settings-container">
        <div className="settings-card glass">
          
          {/* Orbit Studio */}
          <SettingsItem 
            icon={Video} iconColor="#6A5AFF"
            label="Orbit Studio"
            subLabel="Gérer vos shorts & analytics"
            action={() => alert('Orbit Studio sera disponible prochainement sur le web.')}
            rightElement={<ChevronRight size={20} className="text-secondary" />}
            customBg={isDarkMode ? 'rgba(106, 90, 255, 0.15)' : 'rgba(106, 90, 255, 0.05)'}
          />
          <div className="settings-divider" />

          {/* Mode Sombre */}
          <SettingsItem 
            icon={isDarkMode ? Moon : Sun} iconColor="#6A5AFF"
            label="Mode Sombre"
            subLabel={isDarkMode ? 'Activé' : 'Désactivé'}
            action={toggleTheme}
            rightElement={<ToggleSwitch enabled={isDarkMode} />}
          />
          <div className="settings-divider" />

          {/* Filtre par pays */}
          <SettingsItem 
            icon={Globe} iconColor="#6A5AFF"
            label="Filtre par pays"
            subLabel={isCountryFilterEnabled ? `Activé (${profile?.country || 'Aucun'})` : 'Désactivé'}
            action={() => setIsCountryFilterEnabled(!isCountryFilterEnabled)}
            rightElement={<ToggleSwitch enabled={isCountryFilterEnabled} />}
          />
          <div className="settings-divider" />

          {/* Compléter son profil */}
          <SettingsItem 
            icon={UserCircle} iconColor="#6A5AFF"
            label="Compléter son profil"
            subLabel="Âge, bio, statut et plus"
            action={() => setShowProfileEditor(!showProfileEditor)}
            rightElement={<ChevronRight size={20} className="text-secondary" />}
          />
          
          {showProfileEditor && (
            <div className="profile-editor">
              <div className="editor-row images-editor-row flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="text-sm font-bold block mb-2">Photo de profil</label>
                  <label className="cursor-pointer block">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-hover flex items-center justify-center border-2 border-primary">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-secondary">Ajouter</span>
                      )}
                    </div>
                    <input 
                      type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        if (e.target.files[0]) {
                          setAvatarFile(e.target.files[0]);
                          setAvatarPreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                    />
                  </label>
                </div>
                
              </div>

              <div className="editor-row">
                <label>Prénom</label>
                <input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} placeholder="Votre prénom" />
              </div>
              <div className="editor-row">
                <label>Nom</label>
                <input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} placeholder="Votre nom" />
              </div>
              <div className="editor-row">
                <label>Bio</label>
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Décrivez-vous..." rows={3} />
              </div>
              <div className="editor-row">
                <label>Âge</label>
                <input type="number" value={editAge} onChange={(e) => setEditAge(e.target.value)} placeholder="Votre âge" />
              </div>
              <div className="editor-row">
                <label>Statut relationnel</label>
                <select value={editRelationship} onChange={(e) => setEditRelationship(e.target.value)}>
                  <option value="">Non défini</option>
                  <option value="Célibataire">Célibataire</option>
                  <option value="En couple">En couple</option>
                  <option value="Marié(e)">Marié(e)</option>
                  <option value="C'est compliqué">C'est compliqué</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving} style={{ marginTop: '1rem', width: '100%' }}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}
          <div className="settings-divider" />

          {/* Notifications */}
          <SettingsItem 
            icon={Bell} iconColor="#6A5AFF"
            label="Notifications"
            subLabel="Likes, Commentaires et plus"
            action={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) fetchNotifications();
            }}
            rightElement={<ChevronRight size={20} className="text-secondary" />}
          />

          {showNotifications && (
            <div className="notifications-panel">
              {loadingNotif ? (
                <div className="notif-loading">Chargement...</div>
              ) : notifications.length === 0 ? (
                <div className="notif-empty">Aucune notification récente</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="notif-item">
                     <span className="notif-text">📝 Post: "{(n.content || '').slice(0, 50)}..."</span>
                    <span className="notif-time">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          )}
          <div className="settings-divider" />

          {/* Invitations */}
          <SettingsItem 
            icon={UserPlus} iconColor="#6A5AFF"
            label="Invitations"
            subLabel="Gérer vos invitations reçues"
            action={() => {
              setShowInvitations(!showInvitations);
              if (!showInvitations) fetchSettingsInvitations();
            }}
            rightElement={
              <div className="flex items-center gap-2">
                {invitations.length > 0 && (
                  <span className="badge" style={{ background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '12px' }}>
                    {invitations.length}
                  </span>
                )}
                <ChevronRight size={20} className="text-secondary" />
              </div>
            }
          />

          {showInvitations && (
            <div className="notifications-panel" style={{ padding: '1rem', background: 'var(--surface-hover)' }}>
              {loadingInv ? (
                <div className="notif-loading">Chargement...</div>
              ) : invitations.length === 0 ? (
                <div className="notif-empty" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>Aucune invitation reçue</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {invitations.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between glass p-3 rounded-xl">
                      <div className="flex items-center gap-3">
                        <img 
                          src={inv.sender?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
                          alt="Avatar" 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-bold">{inv.sender?.first_name} {inv.sender?.last_name}</div>
                          <div className="text-xs text-secondary">@{inv.sender?.username}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          className="btn btn-primary" style={{ padding: '6px', borderRadius: '50%' }}
                          onClick={() => handleAcceptInv(inv)}
                          title="Accepter et discuter"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}
                          onClick={() => handleRejectInv(inv.id)}
                          title="Refuser"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="settings-divider" />

          {/* Thème des discussions */}
          <SettingsItem 
            icon={Palette} iconColor="#6A5AFF"
            label="Thème des discussions"
            subLabel="Cosmic Night"
            action={() => alert('Les thèmes de discussion seront disponibles prochainement.')}
            rightElement={<ChevronRight size={20} className="text-secondary" />}
          />
          <div className="settings-divider" />

          {/* Chiffrement E2EE */}
          <SettingsItem 
            icon={Lock} iconColor="#6A5AFF"
            label="Chiffrement de bout en bout"
            subLabel="Sécurité et confidentialité"
            action={() => alert("Maintenance: Cette option est en cours de maintenance.")}
            rightElement={<ChevronRight size={20} className="text-secondary" />}
          />
          <div className="settings-divider" />

          {/* Pays */}
          <SettingsItem 
            icon={MapPin} iconColor="#6A5AFF"
            label="Pays"
            subLabel={profile?.country || 'Non défini'}
            action={() => {}}
            rightElement={<Globe size={20} className="text-secondary" />}
          />
          <div className="settings-divider" />

          {/* Supprimer photo */}
          <SettingsItem 
            icon={ImageMinus} iconColor="#6A5AFF"
            label="Supprimer ma photo de profil"
            subLabel="Retirer l'avatar actuel"
            action={handleDeletePhoto}
            rightElement={deleting ? <div className="spinner-small"></div> : <ChevronRight size={20} className="text-secondary" />}
          />
          
          {/* Supprimer profil */}
          {profile?.username !== '@orbitpost237' && (
            <>
              <div className="settings-divider" />
              <SettingsItem 
                icon={UserMinus} iconColor="#FF6B6B"
                label="Supprimer mon profil"
                subLabel="Action irréversible"
                action={handleDeleteProfile}
                rightElement={deleting ? <div className="spinner-small"></div> : <ChevronRight size={20} className="text-secondary" />}
                danger
              />
            </>
          )}
          <div className="settings-divider" />

          {/* Déconnexion */}
          <SettingsItem 
            icon={LogOut} iconColor="#FF6B6B"
            label="Se déconnecter"
            subLabel="Quitter votre session"
            action={handleLogout}
            rightElement={<ChevronRight size={20} className="text-secondary" />}
          />
          <div className="settings-divider" />

          {/* Gagner de l'argent */}
          <SettingsItem 
            icon={DollarSign} iconColor="#FFD700"
            label="Gagner de l'argent"
            subLabel="Regardez une pub et gagnez"
            action={() => alert('La fonctionnalité de monétisation sera disponible prochainement sur le web.')}
            rightElement={
              <div style={{ backgroundColor: '#FFD700', padding: '4px 10px', borderRadius: '12px', color: '#000', fontSize: '11px', fontWeight: '800' }}>
                💰 GO
              </div>
            }
            customBg={isDarkMode ? 'rgba(255, 215, 0, 0.08)' : 'rgba(255, 215, 0, 0.06)'}
          />
        </div>
      </div>
    </div>
  );
}
