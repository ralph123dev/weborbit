import { Check, Code, Copy, ExternalLink, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import './EmbedShortModal.css';

export function getShortShareUrl(shortId) {
  return `${window.location.origin}/shorts?id=${shortId}`;
}

export function getShortEmbedUrl(shortId) {
  return `${window.location.origin}/short/${shortId}`;
}

export function getShortEmbedCode(short) {
  const url = getShortEmbedUrl(short.id);
  return `<iframe src="${url}" width="360" height="640" frameborder="0" allow="autoplay; fullscreen" allowfullscreen style="border:none;border-radius:16px;max-width:100%;background:#000;"></iframe>`;
}

export default function EmbedShortModal({ short, onClose }) {
  const [copied, setCopied] = useState(false);
  const embedCode = getShortEmbedCode(short);
  const shareUrl = getShortShareUrl(short.id);
  const embedUrl = getShortEmbedUrl(short.id);

  useEffect(() => {
    window.dispatchEvent(new Event('pause-shorts-playback'));
    return () => window.dispatchEvent(new Event('resume-shorts-playback'));
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast.success('Code d\'intégration copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le code');
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="embed-short-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Intégrer le short">
      <div className="embed-short-modal">
        <div className="embed-short-header">
          <div className="embed-short-header-icon">
            <Code size={22} />
          </div>
          <div className="embed-short-header-text">
            <span className="embed-short-label">Intégration</span>
            <h3>Embed du Short</h3>
          </div>
          <button type="button" className="embed-short-close" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <div className="embed-short-body">
          <div className="embed-short-preview-col">
            <div className="embed-short-phone">
              <div className="embed-short-phone-notch" />
              {short.media_url ? (
                <video
                  src={short.media_url}
                  className="embed-short-phone-video"
                  muted
                  loop
                  playsInline
                  autoPlay
                />
              ) : (
                <div className="embed-short-phone-placeholder" />
              )}
              <div className="embed-short-phone-caption">
                {short.title || short.description || 'Aperçu du short'}
              </div>
            </div>
            <p className="embed-short-preview-hint">Aperçu de l'intégration sur votre site</p>
          </div>

          <div className="embed-short-code-col">
            <p className="embed-short-desc">
              Collez ce code HTML sur votre site web pour afficher ce short dans une iframe responsive.
            </p>

            <div className="embed-short-url-box">
              <span className="embed-short-url-label">URL d'intégration</span>
              <div className="embed-short-url-row">
                <code>{embedUrl}</code>
                <button
                  type="button"
                  className="embed-short-url-copy"
                  onClick={() => {
                    navigator.clipboard.writeText(embedUrl);
                    toast.success('URL copiée !');
                  }}
                  aria-label="Copier l'URL"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div className="embed-short-code-box">
              <div className="embed-short-code-head">
                <span>Code HTML</span>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="embed-short-open-link">
                  <ExternalLink size={14} /> Ouvrir le short
                </a>
              </div>
              <pre className="embed-short-code"><code>{embedCode}</code></pre>
            </div>

            <div className="embed-short-actions">
              <button type="button" className="embed-short-btn-copy" onClick={handleCopy}>
                {copied ? <><Check size={16} /> Copié !</> : <><Copy size={16} /> Copier le code</>}
              </button>
              <button type="button" className="embed-short-btn-close" onClick={onClose}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
