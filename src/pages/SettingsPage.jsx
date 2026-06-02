import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { uploadToCloudinary } from '../utils/helpers';
import { 
  Moon, Sun, Globe, 
  UserCircle, Bell, Palette, Lock, MapPin, ImageMinus, 
  UserMinus, LogOut, DollarSign, ChevronRight, Video
} from 'lucide-react';
import './SettingsPage.css';

export default function SettingsPage() {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, profile, setProfile } = useAuth();
  
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
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(profile?.cover_url || '');
  
  const [saving, setSaving] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotif, setLoadingNotif] = useState(false);

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
      let finalCoverUrl = profile?.cover_url || '';

      if (avatarFile) {
        finalAvatarUrl = await uploadToCloudinary(avatarFile);
      }
      
      if (coverFile) {
        finalCoverUrl = await uploadToCloudinary(coverFile);
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

      // Only add cover_url to updates if we actually have one or if the user specifically added it
      // This prevents errors if the cover_url column is not yet created in Supabase
      if (finalCoverUrl !== '' || profile?.cover_url !== undefined) {
        updates.cover_url = finalCoverUrl;
      }
      
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      
      if (error) {
        if (error.message.includes('cover_url')) {
          alert("⚠️ Erreur : La colonne 'cover_url' n'existe pas encore dans votre base de données Supabase. Veuillez l'ajouter dans la table 'profiles'.");
          return;
        }
        throw error;
      }
      
      setProfile(prev => ({ ...prev, ...updates }));
      setShowProfileEditor(false);
      setAvatarFile(null);
      setCoverFile(null);
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
                
                <div className="flex-1">
                  <label className="text-sm font-bold block mb-2">Photo de couverture</label>
                  <label className="cursor-pointer block">
                    <div className="w-full h-20 rounded-xl overflow-hidden bg-surface-hover flex items-center justify-center border-2 border-primary border-dashed">
                      {coverPreview ? (
                        <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-secondary">Ajouter</span>
                      )}
                    </div>
                    <input 
                      type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        if (e.target.files[0]) {
                          setCoverFile(e.target.files[0]);
                          setCoverPreview(URL.createObjectURL(e.target.files[0]));
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
