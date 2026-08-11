import './UserBadge.css';

export default function UserBadge({ username }) {
  if (!username) return null;

  // orbitpost gets the Flaticon medal badge
  if (username.toLowerCase() === 'orbitpost') {
    return (
      <img 
        src="https://cdn-icons-png.flaticon.com/512/1910/1910345.png" 
        alt="Medal" 
        className="badge-orbit-medal" 
        title="Medal icons created by vectorsmarket15 - Flaticon"
      />
    );
  }

  // Any other user gets the customized Verified Identity badge
  return (
    <div className="badge-verified-wrap" title="Identité confirmée">
      <span className="badge-verified-circle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </span>
      <span className="badge-verified-text">
        <span className="badge-label">Compte vérifié</span>
        <span className="badge-sub">Identité confirmée</span>
      </span>
    </div>
  );
}
