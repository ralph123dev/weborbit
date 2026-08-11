import { Image as ImageIcon, Mic, Sparkles, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { uploadToCloudinary } from '../utils/helpers';
import './CreatePostModal.css';
import CustomAudioPlayer from './CustomAudioPlayer';

const FONTS = [
  { name: 'Standard (Inter)', family: 'Inter, sans-serif' },
  { name: 'Playfair Display', family: "'Playfair Display', serif" },
  { name: 'Fira Code', family: "'Fira Code', monospace" },
  { name: 'Caveat', family: "'Caveat', cursive" },
  { name: 'Lora', family: "'Lora', serif" },
  { name: 'Montserrat', family: "'Montserrat', sans-serif" },
  { name: 'Cinzel', family: "'Cinzel', serif" },
  { name: 'Pacifico', family: "'Pacifico', cursive" }
];

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
  const textareaRef = useRef(null);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

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

  const handleTextareaChange = (e) => {
    const value = e.target.value;
    setContent(value);
    
    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, selectionStart);
    
    if (textBeforeCursor.endsWith('/p')) {
      setShowFontMenu(true);
    } else {
      setShowFontMenu(false);
    }
  };

  const handleSelectFont = (font) => {
    setSelectedFont(font);
    setShowFontMenu(false);
    
    const selectionStart = textareaRef.current ? textareaRef.current.selectionStart : content.length;
    const textBefore = content.slice(0, selectionStart);
    const textAfter = content.slice(selectionStart);
    
    if (textBefore.endsWith('/p')) {
      const newTextBefore = textBefore.slice(0, -2);
      const newContent = newTextBefore + textAfter;
      setContent(newContent);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = newTextBefore.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  const LANGUAGES = [
    { code: 'en', name: 'Anglais' },
    { code: 'es', name: 'Espagnol' },
    { code: 'de', name: 'Allemand' },
    { code: 'it', name: 'Italien' },
    { code: 'pt', name: 'Portugais' },
    { code: 'zh', name: 'Chinois' },
    { code: 'ar', name: 'Arabe' },
    { code: 'ru', name: 'Russe' },
    { code: 'ja', name: 'Japonais' }
  ];

  const handleLanguageChange = async (langCode) => {
    if (!langCode) {
      if (originalContent) {
        setContent(originalContent);
        setOriginalContent('');
      }
      setTargetLanguage('');
      return;
    }

    if (!content.trim()) {
      setTargetLanguage(langCode);
      return;
    }

    setIsTranslating(true);
    const textToTranslate = originalContent || content;
    if (!originalContent) {
      setOriginalContent(content);
    }
    
    try {
      const params = new URLSearchParams({ q: textToTranslate, langpair: `fr|${langCode}` });
      const response = await fetch(`https://api.mymemory.translated.net/get?${params}`);
      if (!response.ok) {
        throw new Error("Erreur réseau (" + response.status + ")");
      }
      const data = await response.json();
      if (data.responseStatus && data.responseStatus !== 200) {
        throw new Error(data.responseDetails || "Échec de la traduction");
      }
      setContent(data.responseData.translatedText);
      setTargetLanguage(langCode);
      toast.success('Traduction réussie !');
    } catch (err) {
      console.error(err);
      toast.error('Erreur de traduction : ' + err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePublish = async () => {
    if ((!content.trim() && selectedImages.length === 0 && !audioBlob) || !user) return;

    setIsPublishing(true);
    try {
      const uploadedImageUrls = [];
      for (const file of selectedImages) {
        const url = await uploadToCloudinary(file);
        uploadedImageUrls.push(url);
      }

      let audioUrl = null;
      if (audioBlob) {
        audioUrl = await uploadToCloudinary(audioBlob);
      }

      const postData = {
        content: content.trim(),
        user_id: user.id,
        group_id: groupId,
        image_urls: uploadedImageUrls,
        image_url: uploadedImageUrls[0] || '',
        card_style: selectedFont.family
      };

      if (originalContent && targetLanguage) {
        postData.original_content = originalContent.trim();
        postData.translation_lang = targetLanguage;
      }

      if (audioUrl) {
        postData.audio_url = audioUrl;
      }

      let { error } = await supabase.from('posts').insert(postData);
      
      if (error && error.message && (error.message.includes('original_content') || error.message.includes('translation_lang') || error.message.includes('column'))) {
        delete postData.original_content;
        delete postData.translation_lang;
        const retry = await supabase.from('posts').insert(postData);
        error = retry.error;
        if (!error) {
          toast.error("Attention : Ajoutez les colonnes 'original_content' (text) et 'translation_lang' (text) à votre table 'posts' dans Supabase pour sauvegarder la langue d'origine.", { duration: 8000 });
        }
      }

      if (error && (error.code === 'PGRST204' || (error.message && error.message.includes('audio_url'))) && audioUrl) {
        delete postData.audio_url;
        const retry = await supabase.from('posts').insert(postData);
        error = retry.error;
      }

      if (error) throw error;

      setContent('');
      setOriginalContent('');
      setTargetLanguage('');
      setSelectedImages([]);
      setAudioBlob(null);
      setSelectedFont(FONTS[0]);
      toast.success('Publication réussie !');
      onClose();
    } catch (err) {
      console.error('Error publishing post:', err);
      toast.error("Erreur de publication : " + (err.message || "inconnue"));
    } finally {
      setIsPublishing(false);
    }
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

          <div style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              className="create-post-textarea"
              placeholder="Quoi de neuf ? Partagez vos pensées..."
              value={content}
              onChange={handleTextareaChange}
              autoFocus
              disabled={isPublishing}
              style={{ fontFamily: selectedFont.family }}
            />

            {showFontMenu && (
              <div className="font-selector-dropdown">
                <div className="font-selector-header">
                  <span>Choisir une police d'écriture</span>
                  <button className="font-selector-close" onClick={() => setShowFontMenu(false)}>
                    <X size={14} />
                  </button>
                </div>
                <div className="font-selector-list">
                  {FONTS.map((font, idx) => (
                    <button
                      key={idx}
                      className={`font-selector-item ${selectedFont.family === font.family ? 'active' : ''}`}
                      style={{ fontFamily: font.family }}
                      onClick={() => handleSelectFont(font)}
                    >
                      <span className="font-name">{font.name}</span>
                      <span className="font-preview">Exemple de texte en {font.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedFont.family !== FONTS[0].family && (
            <div className="font-indicator-badge">
              <span>Police active : <strong>{selectedFont.name}</strong></span>
              <button 
                onClick={() => setSelectedFont(FONTS[0])}
                className="font-indicator-clear"
                title="Réinitialiser la police"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Translation selector */}
          <div className="translation-selector-container" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Traduire le post en :</span>
            <select
              value={targetLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={isTranslating || isPublishing}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                outline: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <option value="" style={{ background: '#191923', color: 'white' }}>-- Pas de traduction --</option>
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} style={{ background: '#191923', color: 'white' }}>
                  {lang.name}
                </option>
              ))}
            </select>
            {isTranslating && <span className="create-post-spinner" style={{ width: '14px', height: '14px' }}></span>}
          </div>

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
              disabled={isPublishing}
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
