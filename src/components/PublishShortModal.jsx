import { AlertCircle, Upload, X, Copy, Code } from 'lucide-react';
import { useRef, useState, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { uploadToCloudinary } from '../utils/helpers';
import './PublishShortModal.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function PublishShortModal({ isOpen, onClose }) {
  const { user, profile } = useAuth();
  const [videoFile, setVideoFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publishedShort, setPublishedShort] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`La vidéo ne doit pas dépasser 10 MB (Taille actuelle: ${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Veuillez sélectionner un fichier vidéo');
      return;
    }

    setVideoFile(file);
  }, []);

  const removeVideo = useCallback(() => {
    setVideoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handlePublish = useCallback(async () => {
    if (!videoFile || !title.trim() || !user) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    setIsPublishing(true);
    setUploadProgress(0);
    try {
      // Upload video to Cloudinary with progress tracking
      const videoUrl = await uploadToCloudinary(videoFile, (progress) => {
        setUploadProgress(progress);
      });

      // Insert short into database
      const { data, error } = await supabase.from('shorts').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        media_url: videoUrl,
        media_type: 'video',
        created_at: new Date().toISOString(),
      }).select();

      if (error) throw error;

      // Store published short info for success screen
      setPublishedShort({
        id: data[0].id,
        title: title.trim(),
        description: description.trim(),
        media_url: videoUrl,
      });

      setEditTitle(title.trim());
      setEditDescription(description.trim());

      toast.success('Vidéo publiée avec succès! 🎉');
      
      // Dispatch custom event to refresh shorts list
      window.dispatchEvent(new Event('shorts-updated'));
    } catch (err) {
      console.error('Error publishing short:', err);
      toast.error('Erreur lors de la publication de la vidéo');
      // Reset if failed
      setPublishedShort(null);
    } finally {
      setIsPublishing(false);
      setUploadProgress(0);
    }
  }, [videoFile, title, description, user]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget && !isPublishing && !publishedShort) {
      onClose();
    }
  }, [isPublishing, publishedShort, onClose]);

  const videoPreviewUrl = useMemo(() => {
    if (videoFile) {
      return URL.createObjectURL(videoFile);
    }
    return null;
  }, [videoFile]);

  const getShortUrl = useCallback(() => {
    if (!publishedShort) return '';
    return `${window.location.origin}/short/${publishedShort.id}`;
  }, [publishedShort]);

  const getEmbedCode = useCallback(() => {
    if (!publishedShort) return '';
    return `<iframe src="${getShortUrl()}" width="420" height="600" frameborder="0" allowfullscreen></iframe>`;
  }, [publishedShort, getShortUrl]);

  const copyToClipboard = useCallback((text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié!`);
  }, []);

  const handleUpdateShort = useCallback(async () => {
    if (!editTitle.trim()) {
      toast.error('Le titre est requis');
      return;
    }

    try {
      const { error } = await supabase
        .from('shorts')
        .update({
          title: editTitle.trim(),
          description: editDescription.trim(),
        })
        .eq('id', publishedShort.id);

      if (error) throw error;

      setPublishedShort({
        ...publishedShort,
        title: editTitle.trim(),
        description: editDescription.trim(),
      });

      setIsEditing(false);
      toast.success('Court-métrage mis à jour! ✅');
    } catch (err) {
      console.error('Error updating short:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  }, [editTitle, editDescription, publishedShort]);

  const handleClose = useCallback(() => {
    // Reset all state
    setVideoFile(null);
    setTitle('');
    setDescription('');
    setPublishedShort(null);
    setIsEditing(false);
    setEditTitle('');
    setEditDescription('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="publish-short-overlay" onClick={handleOverlayClick}>
      <div className="publish-short-container">
        {/* Mobile: Bottom Sheet */}
        <div className="publish-short-modal-mobile">
          {/* FORM VIEW */}
          {!publishedShort && !isPublishing && (
            <>
              <div className="publish-short-header">
                <h2 className="publish-short-title">Publier un short</h2>
                <button
                  className="publish-short-close-btn"
                  onClick={handleClose}
                  disabled={isPublishing}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="publish-short-content">
                <div className="publish-short-upload-section">
                  {videoFile ? (
                    <div className="publish-short-preview">
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="publish-short-preview-video"
                      />
                      <button
                        className="publish-short-remove-btn"
                        onClick={removeVideo}
                        disabled={isPublishing}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <label className="publish-short-upload-box">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleFileSelect}
                        disabled={isPublishing}
                        style={{ display: 'none' }}
                      />
                      <Upload size={32} className="publish-short-upload-icon" />
                      <p className="publish-short-upload-text">Cliquez pour sélectionner une vidéo</p>
                      <p className="publish-short-upload-hint">Max 10 MB</p>
                    </label>
                  )}
                </div>

                <div className="publish-short-form">
                  <div className="publish-short-form-group">
                    <label className="publish-short-label">Titre *</label>
                    <input
                      type="text"
                      className="publish-short-input"
                      placeholder="Donner un titre à votre vidéo..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isPublishing}
                      maxLength={100}
                    />
                    <p className="publish-short-char-count">{title.length}/100</p>
                  </div>

                  <div className="publish-short-form-group">
                    <label className="publish-short-label">Description</label>
                    <textarea
                      className="publish-short-textarea"
                      placeholder="Décrivez votre vidéo (optionnel)..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isPublishing}
                      maxLength={500}
                      rows={3}
                    />
                    <p className="publish-short-char-count">{description.length}/500</p>
                  </div>

                  {videoFile && (
                    <div className="publish-short-file-info">
                      <AlertCircle size={16} />
                      <span>Taille: {(videoFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="publish-short-footer">
                <button
                  className="publish-short-cancel-btn"
                  onClick={handleClose}
                  disabled={isPublishing}
                >
                  Annuler
                </button>
                <button
                  className="publish-short-publish-btn"
                  onClick={handlePublish}
                  disabled={isPublishing || !videoFile || !title.trim()}
                >
                  {isPublishing ? (
                    <>
                      <span className="publish-short-spinner"></span>
                      Publication...
                    </>
                  ) : (
                    'Publier'
                  )}
                </button>
              </div>
            </>
          )}

          {/* PROGRESS VIEW */}
          {isPublishing && (
            <div className="publish-short-progress-container">
              <div className="publish-short-progress-wrapper">
                <svg className="publish-short-progress-circle" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="publish-short-progress-bg" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className="publish-short-progress-fill"
                    style={{
                      strokeDasharray: `${uploadProgress * 2.827} 282.7`,
                    }}
                  />
                </svg>
                <div className="publish-short-progress-text">
                  <span className="publish-short-progress-number">{uploadProgress}%</span>
                  <span className="publish-short-progress-label">Publication en cours...</span>
                </div>
              </div>
            </div>
          )}

          {/* SUCCESS VIEW */}
          {publishedShort && !isPublishing && (
            <>
              <div className="publish-short-header">
                <h2 className="publish-short-title">Succès! ✅</h2>
                <button
                  className="publish-short-close-btn"
                  onClick={handleClose}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="publish-short-success-content">
                {!isEditing ? (
                  <>
                    <div className="publish-short-success-title-section">
                      <h3 className="publish-short-success-title">{publishedShort.title}</h3>
                      {publishedShort.description && (
                        <p className="publish-short-success-description">{publishedShort.description}</p>
                      )}
                    </div>

                    <div className="publish-short-success-buttons">
                      <button
                        className="publish-short-action-btn"
                        onClick={() => copyToClipboard(getShortUrl(), 'Lien')}
                      >
                        <Copy size={18} />
                        Copier le lien
                      </button>
                      <button
                        className="publish-short-action-btn"
                        onClick={() => copyToClipboard(getEmbedCode(), 'Code embed')}
                      >
                        <Code size={18} />
                        Copier l'embed
                      </button>
                      <button
                        className="publish-short-action-btn publish-short-action-btn-primary"
                        onClick={() => setIsEditing(true)}
                      >
                        Modifier
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="publish-short-edit-form">
                      <div className="publish-short-form-group">
                        <label className="publish-short-label">Titre</label>
                        <input
                          type="text"
                          className="publish-short-input"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          maxLength={100}
                        />
                        <p className="publish-short-char-count">{editTitle.length}/100</p>
                      </div>

                      <div className="publish-short-form-group">
                        <label className="publish-short-label">Description</label>
                        <textarea
                          className="publish-short-textarea"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          maxLength={500}
                          rows={3}
                        />
                        <p className="publish-short-char-count">{editDescription.length}/500</p>
                      </div>
                    </div>

                    <div className="publish-short-edit-buttons">
                      <button
                        className="publish-short-cancel-btn"
                        onClick={() => setIsEditing(false)}
                      >
                        Annuler
                      </button>
                      <button
                        className="publish-short-publish-btn"
                        onClick={handleUpdateShort}
                      >
                        Enregistrer
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="publish-short-footer">
                <button
                  className="publish-short-cancel-btn"
                  onClick={handleClose}
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>

        {/* Desktop: Sidebar */}
        <div className="publish-short-modal-desktop">
          {/* FORM VIEW */}
          {!publishedShort && !isPublishing && (
            <>
              <div className="publish-short-header-desktop">
                <h2 className="publish-short-title-desktop">Publier un short</h2>
                <button
                  className="publish-short-close-btn-desktop"
                  onClick={handleClose}
                  disabled={isPublishing}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="publish-short-content-desktop">
                <div className="publish-short-upload-section-desktop">
                  {videoFile ? (
                    <div className="publish-short-preview-desktop">
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="publish-short-preview-video-desktop"
                      />
                      <button
                        className="publish-short-remove-btn-desktop"
                        onClick={removeVideo}
                        disabled={isPublishing}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <label className="publish-short-upload-box-desktop">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleFileSelect}
                        disabled={isPublishing}
                        style={{ display: 'none' }}
                      />
                      <Upload size={40} className="publish-short-upload-icon-desktop" />
                      <p className="publish-short-upload-text-desktop">Sélectionner une vidéo</p>
                      <p className="publish-short-upload-hint-desktop">Max 10 MB</p>
                    </label>
                  )}
                </div>

                <div className="publish-short-form-desktop">
                  <div className="publish-short-form-group-desktop">
                    <label className="publish-short-label-desktop">Titre *</label>
                    <input
                      type="text"
                      className="publish-short-input-desktop"
                      placeholder="Donner un titre à votre vidéo..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isPublishing}
                      maxLength={100}
                    />
                    <p className="publish-short-char-count-desktop">{title.length}/100</p>
                  </div>

                  <div className="publish-short-form-group-desktop">
                    <label className="publish-short-label-desktop">Description</label>
                    <textarea
                      className="publish-short-textarea-desktop"
                      placeholder="Décrivez votre vidéo (optionnel)..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isPublishing}
                      maxLength={500}
                      rows={4}
                    />
                    <p className="publish-short-char-count-desktop">{description.length}/500</p>
                  </div>

                  {videoFile && (
                    <div className="publish-short-file-info-desktop">
                      <AlertCircle size={16} />
                      <span>Taille: {(videoFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="publish-short-footer-desktop">
                <button
                  className="publish-short-publish-btn-desktop"
                  onClick={handlePublish}
                  disabled={isPublishing || !videoFile || !title.trim()}
                >
                  {isPublishing ? (
                    <>
                      <span className="publish-short-spinner-desktop"></span>
                      Publication...
                    </>
                  ) : (
                    'Publier'
                  )}
                </button>
              </div>
            </>
          )}

          {/* PROGRESS VIEW */}
          {isPublishing && (
            <div className="publish-short-progress-container-desktop">
              <div className="publish-short-progress-wrapper-desktop">
                <svg className="publish-short-progress-circle-desktop" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="publish-short-progress-bg-desktop" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className="publish-short-progress-fill-desktop"
                    style={{
                      strokeDasharray: `${uploadProgress * 2.827} 282.7`,
                    }}
                  />
                </svg>
                <div className="publish-short-progress-text-desktop">
                  <span className="publish-short-progress-number-desktop">{uploadProgress}%</span>
                  <span className="publish-short-progress-label-desktop">Publication en cours...</span>
                </div>
              </div>
            </div>
          )}

          {/* SUCCESS VIEW */}
          {publishedShort && !isPublishing && (
            <>
              <div className="publish-short-header-desktop">
                <h2 className="publish-short-title-desktop">Succès! ✅</h2>
                <button
                  className="publish-short-close-btn-desktop"
                  onClick={handleClose}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="publish-short-success-content-desktop">
                {!isEditing ? (
                  <>
                    <div className="publish-short-success-title-section-desktop">
                      <h3 className="publish-short-success-title-desktop">{publishedShort.title}</h3>
                      {publishedShort.description && (
                        <p className="publish-short-success-description-desktop">{publishedShort.description}</p>
                      )}
                    </div>

                    <div className="publish-short-success-buttons-desktop">
                      <button
                        className="publish-short-action-btn-desktop"
                        onClick={() => copyToClipboard(getShortUrl(), 'Lien')}
                      >
                        <Copy size={18} />
                        Copier le lien
                      </button>
                      <button
                        className="publish-short-action-btn-desktop"
                        onClick={() => copyToClipboard(getEmbedCode(), 'Code embed')}
                      >
                        <Code size={18} />
                        Copier l'embed
                      </button>
                      <button
                        className="publish-short-action-btn-desktop publish-short-action-btn-primary-desktop"
                        onClick={() => setIsEditing(true)}
                      >
                        Modifier
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="publish-short-edit-form-desktop">
                      <div className="publish-short-form-group-desktop">
                        <label className="publish-short-label-desktop">Titre</label>
                        <input
                          type="text"
                          className="publish-short-input-desktop"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          maxLength={100}
                        />
                        <p className="publish-short-char-count-desktop">{editTitle.length}/100</p>
                      </div>

                      <div className="publish-short-form-group-desktop">
                        <label className="publish-short-label-desktop">Description</label>
                        <textarea
                          className="publish-short-textarea-desktop"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          maxLength={500}
                          rows={4}
                        />
                        <p className="publish-short-char-count-desktop">{editDescription.length}/500</p>
                      </div>
                    </div>

                    <div className="publish-short-edit-buttons-desktop">
                      <button
                        className="publish-short-publish-btn-desktop"
                        onClick={handleUpdateShort}
                      >
                        Enregistrer
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="publish-short-footer-desktop">
                <button
                  className="publish-short-publish-btn-desktop"
                  onClick={handleClose}
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
