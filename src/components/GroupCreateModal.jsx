import { Image as ImageIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { uploadToCloudinary } from '../utils/helpers';
import './GroupCreateModal.css';

function normalizeGroupHandle(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildLink(handle) {
  return `o.me/@${handle}`;
}

export default function GroupCreateModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [postingPermission, setPostingPermission] = useState('everyone');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setGroupName('');
    setGroupDescription('');
    setPrivacy('public');
    setPostingPermission('everyone');
    setCoverFile(null);
    setCoverPreview(null);
  }, [isOpen]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }

    const preview = URL.createObjectURL(coverFile);
    setCoverPreview(preview);

    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [coverFile]);

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setCoverFile(file);
    }
  };

  const handleCreateGroup = async () => {
    if (!user) {
      alert('Veuillez vous connecter pour créer un groupe.');
      return;
    }

    if (!groupName.trim()) {
      alert('Le nom du groupe est requis.');
      return;
    }

    setIsSubmitting(true);

    try {
      const baseHandle = normalizeGroupHandle(groupName) || `groupe_${Date.now()}`;
      const link = buildLink(baseHandle);
      let avatar_url = '';

      if (coverFile) {
        avatar_url = await uploadToCloudinary(coverFile);
      }

      const finalDescription = `${groupDescription.trim()}${groupDescription.trim() ? '\n\n' : ''}Confidentialité : ${privacy === 'private' ? 'Privé' : 'Public'}\nPublication : ${postingPermission === 'creator' ? 'Seul le créateur' : 'Tout le monde'}.`;

      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          name: groupName.trim(),
          description: finalDescription,
          avatar_url,
          link,
          created_by: user.id,
          type: 'group'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          alert('Ce lien de groupe est déjà pris. Essayez un nom légèrement différent.');
          return;
        }
        throw error;
      }

      await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'admin' });

      alert(`Groupe "${group.name}" créé avec succès !`);
      onClose();
    } catch (err) {
      console.error('Erreur création groupe:', err);
      alert('Impossible de créer le groupe. Réessayez plus tard.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="group-create-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="group-create-modal glass" onClick={(event) => event.stopPropagation()}>
        <div className="group-create-header">
          <div>
            <p className="group-create-tag">Groupes</p>
            <h2>Créer un groupe</h2>
            <p className="group-create-subtitle">Remplissez les informations ci-dessous pour lancer votre nouvelle communauté.</p>
          </div>
          <button className="group-close-btn" onClick={onClose} type="button" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <div className="group-create-body">
          <label className="group-field-label" htmlFor="group-name">Nom du groupe</label>
          <input
            id="group-name"
            className="group-field-input"
            type="text"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Ex : Fans de voyage"
          />

          <label className="group-field-label">Photo de couverture</label>
          <div className="group-cover-picker">
            <label className="cover-upload-btn">
              <ImageIcon size={18} />
              <span>{coverFile ? 'Changer la photo' : 'Choisir une photo'}</span>
              <input type="file" accept="image/*" onChange={handleCoverChange} />
            </label>
            {coverPreview && (
              <div className="group-cover-preview-wrap">
                <img src={coverPreview} alt="Aperçu couverture" className="group-cover-preview" />
              </div>
            )}
          </div>

          <div className="group-options-grid">
            <div className="group-radio-card">
              <input
                id="privacy-public"
                name="group-privacy"
                type="radio"
                value="public"
                checked={privacy === 'public'}
                onChange={() => setPrivacy('public')}
              />
              <label htmlFor="privacy-public">
                <strong>Public</strong>
                <span>Ouvert à tous et visible dans la recherche.</span>
              </label>
            </div>

            <div className="group-radio-card">
              <input
                id="privacy-private"
                name="group-privacy"
                type="radio"
                value="private"
                checked={privacy === 'private'}
                onChange={() => setPrivacy('private')}
              />
              <label htmlFor="privacy-private">
                <strong>Privé</strong>
                <span>Accès par invitation uniquement.</span>
              </label>
            </div>
          </div>

          <label className="group-field-label" htmlFor="group-description">Description</label>
          <textarea
            id="group-description"
            className="group-field-textarea"
            value={groupDescription}
            onChange={(event) => setGroupDescription(event.target.value)}
            placeholder="Parlez de l'objectif du groupe, de ses règles, de son ambiance..."
          />

          <div className="group-options-grid">
            <div className="group-radio-card">
              <input
                id="posting-everyone"
                name="posting-permission"
                type="radio"
                value="everyone"
                checked={postingPermission === 'everyone'}
                onChange={() => setPostingPermission('everyone')}
              />
              <label htmlFor="posting-everyone">
                <strong>Tout le monde peut publier</strong>
              </label>
            </div>

            <div className="group-radio-card">
              <input
                id="posting-creator"
                name="posting-permission"
                type="radio"
                value="creator"
                checked={postingPermission === 'creator'}
                onChange={() => setPostingPermission('creator')}
              />
              <label htmlFor="posting-creator">
                <strong>Seul le créateur peut publier</strong>
              </label>
            </div>
          </div>
        </div>

        <div className="group-create-footer">
          <button className="group-secondary-btn" type="button" onClick={onClose}>Annuler</button>
          <button className="group-primary-btn" type="button" onClick={handleCreateGroup} disabled={isSubmitting}>
            {isSubmitting ? 'Création...' : 'Créer le groupe'}
          </button>
        </div>
      </div>
    </div>
  );
}
