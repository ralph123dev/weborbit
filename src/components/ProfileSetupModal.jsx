import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { uploadToCloudinary } from '../utils/helpers';
import { Camera, ArrowRight, X } from 'lucide-react';

export default function ProfileSetupModal({ onClose }) {
  const { user, profile } = useAuth();
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
      onClose(); // Close the modal, Profile will be updated by realtime/context
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'upload");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="glass p-8 rounded-2xl max-w-sm w-full relative text-center" style={{ animation: 'pageEnter 0.4s ease' }}>
        <button className="absolute top-4 right-4 text-secondary hover:text-primary" onClick={onClose}>
          <X size={20} />
        </button>
        
        <h2 className="font-black text-2xl mb-2">Dernière étape !</h2>
        <p className="text-secondary mb-6 text-sm">Ajoutez une photo de profil pour que vos amis vous reconnaissent.</p>

        <div className="flex justify-center mb-6">
          <label className="cursor-pointer relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-surface-hover border-4 border-primary flex items-center justify-center">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera size={40} className="text-secondary group-hover:text-primary transition-colors" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageSelect}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            className="btn btn-primary w-full flex justify-center items-center gap-2"
            disabled={!file || loading}
            onClick={handleSubmit}
          >
            {loading ? <div className="spinner"></div> : 'Enregistrer la photo'}
          </button>
          
          <button 
            className="btn btn-outline w-full text-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Passer pour le moment <ArrowRight size={16} className="inline ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
