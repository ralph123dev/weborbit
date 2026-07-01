import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { uploadToCloudinary } from '../utils/helpers';
import { Camera, ArrowRight, User, Calendar, Image as ImageIcon } from 'lucide-react';
import './ProfileSetupModal.css';

export default function ProfileSetupModal({ onClose }) {
  const { user, profile, setProfile } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    age: profile?.age || ''
  });

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.first_name.trim()) {
      setError('Le prénom est requis');
      return;
    }

    if (!formData.age || isNaN(formData.age) || Number(formData.age) < 13) {
      setError('Vous devez avoir au moins 13 ans');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let url = profile?.avatar_url || null;
      
      if (file) {
        url = await uploadToCloudinary(file);
      }

      const updates = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        age: Number(formData.age),
        avatar_url: url
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        // If the age column doesn't exist yet, catch the specific PGRST204/column does not exist error
        // Or if it's just a general error.
        if (updateError.message.includes('age')) {
           console.warn("La colonne 'age' n'existe pas dans la base de données. Sauvegarde sans l'âge.");
           const fallbackUpdates = { ...updates };
           delete fallbackUpdates.age;
           await supabase.from('profiles').update(fallbackUpdates).eq('id', user.id);
        } else {
           throw updateError;
        }
      }

      // Update local profile state if setProfile is available
      if (setProfile) {
        setProfile(prev => ({ ...prev, ...updates }));
      }
      
      onClose();
    } catch (error) {
      console.error(error);
      setError("Erreur lors de la sauvegarde de votre profil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-setup-overlay">
      <div className="profile-setup-modal glass">
        
        <div className="profile-setup-header">
          <h2 className="profile-setup-title">Bienvenue sur Orbit !</h2>
          <p className="profile-setup-subtitle">
            Dernière étape : configurez votre profil pour que vos amis vous reconnaissent.
          </p>
        </div>

        {error && <div className="profile-setup-error">{error}</div>}

        <form onSubmit={handleSubmit} className="profile-setup-form">
          <div className="profile-setup-avatar-wrap">
            <label className="profile-setup-avatar-picker">
              <div className="profile-setup-avatar-frame">
                {preview ? (
                  <img src={preview} alt="Aperçu de votre photo de profil" />
                ) : (
                  <Camera size={40} style={{ color: 'var(--text-secondary)' }} />
                )}
              </div>
              <div className="profile-setup-avatar-overlay">
                <Camera size={24} />
              </div>
              <input type="file" accept="image/*" hidden onChange={handleImageSelect} />
            </label>
            <span className="profile-setup-avatar-hint">Photo de profil (Optionnel)</span>
          </div>

          <div className="profile-input-group">
            <label>Prénom <span className="text-primary">*</span></label>
            <div className="profile-input-wrapper">
              <User size={18} className="profile-input-icon" />
              <input 
                type="text" 
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                placeholder="Votre prénom"
                required
              />
            </div>
          </div>

          <div className="profile-input-group">
            <label>Nom</label>
            <div className="profile-input-wrapper">
              <User size={18} className="profile-input-icon" />
              <input 
                type="text" 
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                placeholder="Votre nom de famille"
              />
            </div>
          </div>

          <div className="profile-input-group">
            <label>Âge <span className="text-primary">*</span></label>
            <div className="profile-input-wrapper">
              <Calendar size={18} className="profile-input-icon" />
              <input 
                type="number" 
                name="age"
                value={formData.age}
                onChange={handleInputChange}
                placeholder="Ex: 25"
                min="13"
                max="120"
                required
              />
            </div>
            <span className="text-xs text-secondary mt-1 ml-1">Vous devez avoir au moins 13 ans.</span>
          </div>

          <button
            type="submit"
            className="profile-setup-submit-btn"
            disabled={loading || !formData.first_name || !formData.age}
          >
            {loading ? <div className="spinner" /> : (
              <>Enregistrer et Continuer <ArrowRight size={18} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
