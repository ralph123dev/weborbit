import { AlertTriangle, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import './MaintenanceModal.css';

const MAINTENANCE_END = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

function getCountdown(endDate) {
  const total = Math.max(0, endDate.getTime() - Date.now());
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds };
}

export default function MaintenanceModal({ endDate = MAINTENANCE_END }) {
  const [countdown, setCountdown] = useState(() => getCountdown(endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdown(endDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleCloseApp = () => {
    window.open('', '_self')?.close();
    window.close();
    window.location.href = 'about:blank';
  };

  if (countdown.total <= 0) {
    return null;
  }

  return (
    <div className="maintenance-overlay" role="alert" aria-live="polite">
      <div className="maintenance-modal glass">
        <div className="maintenance-header">
          <div className="maintenance-icon">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h2>Maintenance en cours</h2>
            <p>L'application est temporairement indisponible pendant 5 jours.</p>
          </div>
        </div>

        <div className="maintenance-body">
          <div className="maintenance-note">
            <Sparkles size={20} />
            <span>Nous préparons une meilleure expérience pour vous.</span>
          </div>

          <div className="maintenance-countdown">
            <div className="countdown-item">
              <span>{String(countdown.days).padStart(2, '0')}</span>
              <small>jours</small>
            </div>
            <div className="countdown-item">
              <span>{String(countdown.hours).padStart(2, '0')}</span>
              <small>heures</small>
            </div>
            <div className="countdown-item">
              <span>{String(countdown.minutes).padStart(2, '0')}</span>
              <small>minutes</small>
            </div>
            <div className="countdown-item">
              <span>{String(countdown.seconds).padStart(2, '0')}</span>
              <small>secondes</small>
            </div>
          </div>

          <div className="maintenance-footer">
            <p>Merci de votre patience — nous serons de retour très bientôt.</p>
          </div>

          <button className="maintenance-close-btn" onClick={handleCloseApp}>
            Annuler et fermer l'application
          </button>
        </div>
      </div>
    </div>
  );
}
