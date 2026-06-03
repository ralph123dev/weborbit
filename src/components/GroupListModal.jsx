import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import './GroupListModal.css';

export default function GroupListModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchGroups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('groups(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      const gs = (data || []).map((d) => d.groups).filter(Boolean);
      setGroups(gs);
    } catch (e) {
      console.error('Erreur fetch groups:', e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="group-list-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="group-list-modal glass" onClick={(e) => e.stopPropagation()}>
        <div className="group-list-header">
          <h3>Mes groupes</h3>
          <button className="group-list-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="group-list-body">
          {loading && <div className="group-loading">Chargement...</div>}

          {!loading && groups.length === 0 && (
            <div className="group-empty">Vous n'êtes membre d'aucun groupe.</div>
          )}

          {!loading && groups.length > 0 && (
            <ul className="groups-list">
              {groups.map((g) => (
                <li 
                  key={g.id} 
                  className="group-item" 
                  onClick={() => {
                    onClose();
                    navigate(`/group/${g.id}`);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={g.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} alt={g.name} className="group-thumb" />
                  <div className="group-meta">
                    <div className="group-name">{g.name}</div>
                    <div className="group-link">o.me/@{g.link?.replace('o.me/@', '')}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="group-list-footer">
          <button className="group-primary-btn" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
