import { AlertCircle, Sparkles, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { uploadToCloudinary } from '../utils/helpers';
import './PublishShortModal.css';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const CIRCLE_CIRCUMFERENCE = 113;

export default function PublishShortModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [videoFile, setVideoFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | form | uploading | done
  const [uploadProgress, setUploadProgress] = useState(0);

  const resetState = useCallback(() => {
    setVideoFile(null);
    setTitle('');
    setDescription('');
    setPhase('idle');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  useEffect(() => {
    if (isOpen && phase === 'idle') {
      setPhase('form');
      window.dispatchEvent(new Event('pause-shorts-playback'));
    }
    if (!isOpen && phase === 'form') {
      resetState();
      window.dispatchEvent(new Event('resume-shorts-playback'));
    }
  }, [isOpen, phase, resetState]);

  const handleClose = useCallback(() => {
    if (phase === 'uploading') return;
    resetState();
    window.dispatchEvent(new Event('resume-shorts-playback'));
    onClose();
  }, [phase, resetState, onClose]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`La vidéo ne doit pas dépasser 100 Mo (actuel : ${(file.size / 1024 / 1024).toFixed(1)} Mo)`);
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast.error('Veuillez sélectionner un fichier vidéo');
      return;
    }

    setVideoFile(file);
  }, []);

  const removeVideo = useCallback(() => {
    setVideoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handlePublish = useCallback(async () => {
    if (!videoFile || !title.trim() || !description.trim() || !user) {
      toast.error('Veuillez remplir tous les champs (vidéo, titre et description)');
      return;
    }

    setPhase('uploading');
    setUploadProgress(5);
    window.dispatchEvent(new Event('pause-shorts-playback'));

    try {
      const videoUrl = await uploadToCloudinary(videoFile, (progress) => {
        setUploadProgress(Math.min(95, progress));
      });

      setUploadProgress(96);

      const { data, error } = await supabase.from('shorts').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        media_url: videoUrl,
        media_type: 'video',
        status: 'published',
      }).select().single();

      if (error) throw error;

      setUploadProgress(100);
      setPhase('done');

      window.dispatchEvent(new CustomEvent('short-published', { detail: data }));
      window.dispatchEvent(new Event('shorts-updated'));

      toast.success('Short publié ! 🚀');

      setTimeout(() => {
        resetState();
        window.dispatchEvent(new Event('resume-shorts-playback'));
        onClose();
      }, 2500);
    } catch (err) {
      console.error('Error publishing short:', err);
      toast.error('Erreur lors de la publication du short');
      setPhase('form');
      setUploadProgress(0);
    }
  }, [videoFile, title, description, user, resetState, onClose]);

  const videoPreviewUrl = useMemo(() => {
    return videoFile ? URL.createObjectURL(videoFile) : null;
  }, [videoFile]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget && phase === 'form') {
      handleClose();
    }
  }, [phase, handleClose]);

  const progressLabel = useMemo(() => {
    if (phase === 'done') return 'Short publié !';
    if (uploadProgress < 30) return 'Préparation...';
    if (uploadProgress < 60) return 'Encodage...';
    if (uploadProgress < 90) return 'Envoi en cours...';
    return 'Finalisation...';
  }, [phase, uploadProgress]);

  if (!isOpen && phase === 'idle') return null;

  return (
    <>
      {phase === 'form' && isOpen && (
        <div className="publish-short-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Publier un short">
          <div className="publish-short-modal">
            <div className="publish-short-header">
              <div className="publish-short-header-icon">
                <Upload size={22} />
              </div>
              <div className="publish-short-header-text">
                <h2>Publier un Short</h2>
                <p>Partagez un moment avec la communauté</p>
              </div>
              <button type="button" className="publish-short-close-btn" onClick={handleClose} aria-label="Fermer">
                <X size={20} />
              </button>
            </div>

            <div className="publish-short-body">
              <div className="publish-short-field">
                <label>Vidéo du Short</label>
                {videoFile ? (
                  <div className="publish-short-preview">
                    <video src={videoPreviewUrl} controls className="publish-short-preview-video" />
                    <button type="button" className="publish-short-remove-btn" onClick={removeVideo} aria-label="Retirer la vidéo">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="publish-short-upload-box">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/*"
                      onChange={handleFileSelect}
                      hidden
                    />
                    <Upload size={28} />
                    <span>Cliquez pour sélectionner une vidéo</span>
                    <small>MP4, WebM · Max 100 Mo</small>
                  </label>
                )}
              </div>

              <div className="publish-short-field">
                <label>Titre *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Donnez un titre accrocheur..."
                  maxLength={100}
                />
                <span className="publish-short-char-count">{title.length}/100</span>
              </div>

              <div className="publish-short-field">
                <label>Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez votre short, ajoutez des #hashtags..."
                  maxLength={500}
                  rows={3}
                />
                <span className="publish-short-char-count">{description.length}/500</span>
              </div>

              {videoFile && (
                <div className="publish-short-file-info">
                  <AlertCircle size={16} />
                  <span>{videoFile.name} · {(videoFile.size / (1024 * 1024)).toFixed(1)} Mo</span>
                </div>
              )}
            </div>

            <div className="publish-short-footer">
              <button type="button" className="publish-short-cancel-btn" onClick={handleClose}>
                Annuler
              </button>
              <button
                type="button"
                className="publish-short-submit-btn"
                onClick={handlePublish}
                disabled={!videoFile || !title.trim() || !description.trim()}
              >
                <Sparkles size={18} />
                Publier le Short
              </button>
            </div>
          </div>
        </div>
      )}

      {(phase === 'uploading' || phase === 'done') && (
        <div className="publish-progress-widget" aria-live="polite" aria-label="Publication du short">
          <div className="publish-progress-circle-wrap">
            <svg viewBox="0 0 40 40" width="48" height="48" aria-hidden="true">
              <circle className="publish-progress-track" cx="20" cy="20" r="18" />
              <circle
                className={`publish-progress-bar${phase === 'done' ? ' complete' : ''}`}
                cx="20"
                cy="20"
                r="18"
                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                strokeDashoffset={CIRCLE_CIRCUMFERENCE - (uploadProgress / 100) * CIRCLE_CIRCUMFERENCE}
              />
            </svg>
            <div className="publish-progress-pct">
              {phase === 'done' ? <CheckIcon /> : `${uploadProgress}%`}
            </div>
          </div>
          <span className={`publish-progress-text${phase === 'done' ? ' done' : ''}`}>
            {progressLabel}
          </span>
        </div>
      )}
    </>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
