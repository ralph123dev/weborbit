import { X } from 'lucide-react';

export default function AnnouncementPopup({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="announcement-popup-overlay" onClick={onClose}>
      <div className="announcement-popup glass" onClick={(e) => e.stopPropagation()}>
        <button className="announcement-popup-close" onClick={onClose} aria-label="Fermer la popup">
          <X size={18} />
        </button>

        <span className="announcement-popup-tag">Partenaire</span>

        <div className="announcement-popup-header">
          <div className="announcement-popup-logo">Hok<span>.</span></div>
          <div>
            <div className="announcement-popup-title">Hokay</div>
            <div className="announcement-popup-subtitle">La communauté IT qui prouve tes compétences</div>
          </div>
        </div>

        <div className="announcement-popup-body">
          Ici sur Orbite, vous partagez vos projets et échangez. Mais un portfolio
          ou un repo ne prouve pas vraiment votre niveau — n'importe qui peut en
          poster un.<br /><br />
          <strong>Hokay</strong> change ça : une communauté IT (dev, data,
          cybersécurité, réseaux...) où tes compétences sont vérifiées par la
          pratique, pas juste déclarées. Résultat infalsifiable et plus sécurisé,
          correction automatique et instantanée. Gratuit, et une bonne façon de
          te démarquer auprès des recruteurs.
        </div>

        <a href="https://hokay.site/?ref=OXGE1U" target="_blank" rel="noopener noreferrer" className="announcement-popup-button">
          Jeter un œil →
        </a>
      </div>
    </div>
  );
}
