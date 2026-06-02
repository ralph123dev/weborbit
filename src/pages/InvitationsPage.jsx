import { ArrowLeft, Check, UserX, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import './InvitationsPage.css';

export default function InvitationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchInvitations();
    }
  }, [user]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      // Fetch received pending invitations
      const { data: received, error: receivedError } = await supabase
        .from('invitations')
        .select('*, sender:profiles!invitations_sender_id_fkey(*)')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;

      // Fetch sent pending invitations
      const { data: sent, error: sentError } = await supabase
        .from('invitations')
        .select('*, receiver:profiles!invitations_receiver_id_fkey(*)')
        .eq('sender_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      setReceivedInvitations(received || []);
      setSentInvitations(sent || []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
      toast.error('Erreur lors du chargement des invitations.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId, senderId) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (error) throw error;

      // Notify sender
      await supabase.from('notifications').insert({
        user_id: senderId,
        sender_id: user.id,
        type: 'invitation_accepted',
        content: "a accepté votre invitation"
      });

      toast.success('Invitation acceptée !');
      // Update local state
      setReceivedInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err) {
      console.error('Error accepting invitation:', err);
      toast.error("Impossible d'accepter l'invitation");
    }
  };

  const handleReject = async (invitationId) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation refusée.');
      setReceivedInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err) {
      console.error('Error rejecting invitation:', err);
      toast.error("Impossible de refuser l'invitation");
    }
  };

  const handleCancel = async (invitationId) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation annulée.');
      setSentInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err) {
      console.error('Error cancelling invitation:', err);
      toast.error("Impossible d'annuler l'invitation");
    }
  };

  if (loading) {
    return (
      <div className="invitations-page flex items-center justify-center h-full">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="invitations-page">
      <div className="invitations-header">
        <button className="back-btn icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-black text-2xl">Invitations</h1>
      </div>

      <div className="invitations-content">
        {/* Received section */}
        <section className="invitations-section">
          <h2 className="section-title text-primary font-bold text-lg mb-4 flex items-center gap-2">
            <span>🔔 Invitations Reçues</span>
            {receivedInvitations.length > 0 && (
              <span className="badge">{receivedInvitations.length}</span>
            )}
          </h2>

          {receivedInvitations.length === 0 ? (
            <div className="empty-state glass">
              <UserX size={36} className="text-secondary mb-2" />
              <p className="text-secondary text-sm">Aucune invitation reçue pour le moment.</p>
            </div>
          ) : (
            <div className="invitations-list">
              {receivedInvitations.map((inv) => (
                <div key={inv.id} className="invitation-card glass">
                  <img 
                    src={inv.sender?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
                    alt="Avatar" 
                    className="invitation-avatar"
                    onClick={() => navigate(`/profile/${inv.sender?.id}`)}
                    onError={(e) => e.target.src = 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'}
                  />
                  <div className="invitation-info">
                    <span 
                      className="invitation-name font-bold cursor-pointer"
                      onClick={() => navigate(`/profile/${inv.sender?.id}`)}
                    >
                      {inv.sender?.first_name} {inv.sender?.last_name}
                      {inv.sender?.is_verified && <span className="text-primary ml-1">✓</span>}
                    </span>
                    <span className="invitation-username text-secondary text-xs">@{inv.sender?.username}</span>
                  </div>
                  <div className="invitation-actions">
                    <button 
                      className="action-btn accept-btn flex items-center justify-center" 
                      onClick={() => handleAccept(inv.id, inv.sender?.id)}
                      title="Accepter"
                    >
                      <Check size={18} />
                    </button>
                    <button 
                      className="action-btn reject-btn flex items-center justify-center" 
                      onClick={() => handleReject(inv.id)}
                      title="Refuser"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sent section */}
        <section className="invitations-section mt-8">
          <h2 className="section-title text-secondary font-bold text-lg mb-4">📤 Invitations Envoyées</h2>

          {sentInvitations.length === 0 ? (
            <div className="empty-state glass">
              <p className="text-secondary text-sm">Aucune invitation en attente d'approbation.</p>
            </div>
          ) : (
            <div className="invitations-list">
              {sentInvitations.map((inv) => (
                <div key={inv.id} className="invitation-card glass">
                  <img 
                    src={inv.receiver?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
                    alt="Avatar" 
                    className="invitation-avatar"
                    onClick={() => navigate(`/profile/${inv.receiver?.id}`)}
                    onError={(e) => e.target.src = 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'}
                  />
                  <div className="invitation-info">
                    <span 
                      className="invitation-name font-bold cursor-pointer"
                      onClick={() => navigate(`/profile/${inv.receiver?.id}`)}
                    >
                      {inv.receiver?.first_name} {inv.receiver?.last_name}
                      {inv.receiver?.is_verified && <span className="text-primary ml-1">✓</span>}
                    </span>
                    <span className="invitation-username text-secondary text-xs">@{inv.receiver?.username}</span>
                  </div>
                  <div className="invitation-actions">
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handleCancel(inv.id)}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
