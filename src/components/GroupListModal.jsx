import { X, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import './GroupListModal.css';

export default function GroupListModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchGroups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch member relationships
      const { data: memberRelations, error: relError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (relError) throw relError;

      if (!memberRelations || memberRelations.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const groupIds = memberRelations.map(r => r.group_id);

      // Fetch group details
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      if (groupsError) throw groupsError;

      // Fetch all member rows for these groups to count them manually
      const { data: allMembers, error: membersError } = await supabase
        .from('group_members')
        .select('group_id')
        .in('group_id', groupIds);

      if (membersError) console.error('Error fetching member counts:', membersError);

      // Build a count map: { groupId: memberCount }
      const countMap = {};
      (allMembers || []).forEach(m => {
        countMap[m.group_id] = (countMap[m.group_id] || 0) + 1;
      });

      const gs = (groupsData || []).map(g => ({
        ...g,
        memberCount: countMap[g.id] || 1 // At least 1 (the creator)
      }));

      setGroups(gs);
    } catch (e) {
      console.error('Erreur fetch groups:', e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="group-search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher un groupe..."
              className="group-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading && <div className="group-loading">Chargement...</div>}

          {!loading && groups.length === 0 && (
            <div className="group-empty">Vous n'êtes membre d'aucun groupe.</div>
          )}

          {!loading && groups.length > 0 && filteredGroups.length === 0 && (
            <div className="group-empty">Aucun groupe trouvé avec ce nom.</div>
          )}

          {!loading && filteredGroups.length > 0 && (
            <ul className="groups-list">
              {filteredGroups.map((g) => (
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
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                      {g.memberCount || 0} membre{g.memberCount > 1 ? 's' : ''}
                    </div>
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
