import { Image as ImageIcon, Mic, Sparkles, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import './CreatePostModal.css';
import CustomAudioPlayer from './CustomAudioPlayer';

export default function CreatePostModal({ isOpen, onClose, groupId }) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  if (!isOpen) return null;

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedImages(prev => [...prev, ...filesArray]);
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('Impossible d\'accéder au microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const discardAudio = () => {
    setAudioBlob(null);
    audioChunksRef.current = [];
  };

  const handlePublish = async () => {
    if ((!content.trim() && selectedImages.length === 0 && !audioBlob) || !user) return;

    toast.error('Le service de publication est actuellement en maintenance.');
    return;
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isPublishing) {
      if (isRecording) stopRecording();
      onClose();
    }
  };

  const handleDeveloperClick = () => {
    if (typeof window !== 'undefined') {
      window.open('https://hokay.site/', '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="create-post-overlay" onClick={handleOverlayClick}>
      <div className="create-post-modal glass">
        {/* Header */}
        <div className="create-post-header">
          <div className="create-post-title">
            <Sparkles size={20} className="text-primary" />
            <h3 className="font-bold text-lg">Nouvelle publication</h3>
          </div>
          <button className="create-post-close-btn" onClick={onClose} disabled={isPublishing}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="create-post-body">
          <div className="create-post-author">
            <img
              src={profile?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'}
              alt="Avatar"
              className="create-post-avatar"
              onError={(e) => e.target.src = 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'}
            />
            <div>
              <div className="font-bold text-sm">{profile?.first_name} {profile?.last_name}</div>
              <div className="text-xs text-secondary">@{profile?.username || 'user'}</div>
            </div>
          </div>

          <textarea
            className="create-post-textarea"
            placeholder="Quoi de neuf ? Partagez vos pensées..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
            disabled={isPublishing}
          />

          {/* Image Previews */}
          {selectedImages.length > 0 && (
            <div className="create-post-previews">
              {selectedImages.map((file, idx) => (
                <div key={idx} className="create-post-preview-item">
                  <img src={URL.createObjectURL(file)} alt="Preview" className="create-post-preview-img" />
                  <button className="create-post-remove-img" onClick={() => removeImage(idx)} disabled={isPublishing}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Audio Preview */}
          {audioBlob && (
            <div className="create-post-audio-preview">
              <CustomAudioPlayer src={URL.createObjectURL(audioBlob)} />
              <button className="create-post-remove-audio" onClick={discardAudio} disabled={isPublishing}>
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="create-post-footer">
          <div className="create-post-tools">
            <label className="create-post-tool-btn">
              <ImageIcon size={20} />
              <span className="create-post-tool-label">Photo</span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageSelect}
                disabled={isPublishing}
              />
            </label>

            <button
              className={`create-post-tool-btn bg-transparent border-none outline-none ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isPublishing || audioBlob !== null}
            >
              <Mic size={20} />
              <span className="create-post-tool-label">{isRecording ? 'Arrêter' : 'Vocal'}</span>
            </button>
          </div>

          <div className="create-post-actions">
            <button
              className="create-post-dev-btn"
              onClick={handleDeveloperClick}
              disabled={isPublishing}
              aria-label="Hokay"
            >
              <span className="create-post-dev-btn-full">Je suis développeur logiciel</span>
              <span className="create-post-dev-btn-mobile">Hokay</span>
            </button>

            <button
              className="create-post-publish-btn"
              onClick={handlePublish}
              disabled={isPublishing || (!content.trim() && selectedImages.length === 0 && !audioBlob)}
            >
              {isPublishing ? (
                <>
                  <span className="create-post-spinner"></span>
                  Publication...
                </>
              ) : (
                'Publier'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
