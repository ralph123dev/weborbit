import { ArrowRight, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import './ProfileSetupModal.css';

export default function InterestsModal({ onClose }) {
  const { user, profile, setProfile } = useAuth();
  const [age, setAge] = useState(profile?.age || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!user) return;
    if (!age.trim()) {
      setError('Veuillez renseigner votre âge.');
      return;
    }
    if (!phone.trim()) {
      setError('Veuillez renseigner votre numéro de téléphone.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          age: age.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, age: age.trim(), phone: phone.trim() } : prev);
      onClose();
    } catch (e) {
      console.error('Profile update error:', e);
      setError('Impossible de sauvegarder vos informations.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-setup-overlay" style={{ zIndex: 10000 }}>
      <div className="profile-setup-modal glass" style={{ maxWidth: '430px', borderRadius: '24px', padding: '1.25rem' }}>
        <div className="profile-setup-header" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="profile-setup-title flex items-center gap-2" style={{ margin: 0 }}>
              <Sparkles className="text-primary" /> Complétez votre profil
            </h2>
            <button onClick={onClose} className="bg-black bg-opacity-50 text-white rounded-full p-1" style={{ border: 'none' }}>
              <X size={18} />
            </button>
          </div>
          <p className="profile-setup-subtitle text-center mt-2" style={{ marginTop: '0.5rem' }}>
            Nous avons déjà récupéré votre nom et prénom via Google. Il ne reste plus qu’à compléter votre âge et votre numéro de téléphone.
          </p>
        </div>

        {error && <div className="profile-setup-error">{error}</div>}

        <div className="flex flex-col gap-4 mt-4">
          <div className="profile-input-group">
            <label>Âge</label>
            <div className="profile-input-wrapper">
              <input
                type="number"
                min="13"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Ex: 24"
                className="w-full"
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
              />
            </div>
          </div>

          <div className="profile-input-group">
            <label>Numéro de téléphone</label>
            <div className="profile-input-wrapper">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: +225 07 12 34 56 78"
                className="w-full"
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
              />
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} className="profile-setup-submit-btn w-full mt-8">
          {loading ? 'Enregistrement...' : <>Suivant <ArrowRight size={18} /></>}
        </button>
      </div>
    </div>
  );
}
