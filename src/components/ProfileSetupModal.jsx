import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { uploadToCloudinary } from '../utils/helpers';
import { Camera, ArrowRight, X } from 'lucide-react';
import './ProfileSetupModal.css';

export default function ProfileSetupModal({ onClose }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async () => {
    if (!file || !user) return;
    setLoading(true);
    try {
      const url = await uploadToCloudinary(file);
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'upload");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="profile-setup-modal">
        <button type="button" className="profile-setup-close" onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </button>

        <h2 className="profile-setup-title">Dernière étape !</h2>
        <p className="profile-setup-subtitle">
          Ajoutez une photo de profil pour que vos amis vous reconnaissent.
        </p>

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
        </div>

        <div className="profile-setup-actions">
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={!file || loading}
            onClick={handleSubmit}
          >
            {loading ? <div className="spinner" /> : 'Enregistrer la photo'}
          </button>

          <button type="button" className="btn-outline w-full" onClick={onClose} disabled={loading}>
            Passer pour le moment <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
