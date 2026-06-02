import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { uploadToCloudinary } from '../utils/helpers';
import { Send, Image as ImageIcon, Smile, MoreVertical, ArrowLeft, X } from 'lucide-react';
import { formatTimeAgo } from '../utils/helpers';
import './MessengerPage.css';

const EMOJI_STICKERS = [
  '😀','😂','🥰','😎','🤩','😍','🥺','😭','😡','🤯',
  '👋','👍','👎','🙏','💪','🤝','❤️','🔥','⭐','🎉',
  '💀','👀','🤡','💩','👻','🎃','🦋','🌈','🍕','🏆',
  '💐','🎂','🎁','🎵','🚀','⚡','💎','🌟','✨','🫶',
  '😏','🤫','🫣','🤭','😴','🥱','😋','🤪','😜','🫡',
  '🤓','🧐','🤗','😇','🤠','👑','💍','🪄','🎯','🎮'
];

export default function MessengerPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.user_id);
      
      const channel = supabase
        .channel(`messages-${activeChat.user_id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
        }, payload => {
          const msg = payload.new;
          if (
            (msg.sender_id === user.id && msg.receiver_id === activeChat.user_id) ||
            (msg.sender_id === activeChat.user_id && msg.receiver_id === user.id)
          ) {
            setMessages(prev => [...prev, msg]);
            scrollToBottom();
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      const { data: sentData } = await supabase
        .from('messages')
        .select('receiver_id, content, created_at, image_url, profiles!messages_receiver_id_fkey(avatar_url, first_name, last_name, is_verified)')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      const { data: recvData } = await supabase
        .from('messages')
        .select('sender_id, content, created_at, image_url, profiles!messages_sender_id_fkey(avatar_url, first_name, last_name, is_verified)')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      const allMessages = [...(sentData || []), ...(recvData || [])];
      
      const uniqueUsers = {};
      
      allMessages.forEach(msg => {
        const isSent = !!msg.receiver_id;
        const otherUserId = isSent ? msg.receiver_id : msg.sender_id;
        const otherUserProfile = msg.profiles;

        if (!uniqueUsers[otherUserId]) {
          uniqueUsers[otherUserId] = {
            user_id: otherUserId,
            profile: otherUserProfile,
            last_message: msg.image_url ? '📷 Image' : msg.content,
            created_at: msg.created_at,
          };
        } else if (new Date(msg.created_at) > new Date(uniqueUsers[otherUserId].created_at)) {
          uniqueUsers[otherUserId].last_message = msg.image_url ? '📷 Image' : msg.content;
          uniqueUsers[otherUserId].created_at = msg.created_at;
        }
      });

      const sortedConversations = Object.values(uniqueUsers).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );

      setConversations(sortedConversations);

    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId) => {
    try {
      setMessagesLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const content = newMessage.trim();
    setNewMessage('');
    setShowStickers(false);

    try {
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: activeChat.user_id,
        content: content,
        is_read: false
      });
      
      setConversations(prev => prev.map(conv => 
        conv.user_id === activeChat.user_id 
          ? { ...conv, last_message: content, created_at: new Date().toISOString() }
          : conv
      ));
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleSendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    try {
      const imageUrl = await uploadToCloudinary(file);
      
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: activeChat.user_id,
        content: '',
        image_url: imageUrl,
        is_read: false
      });

      setConversations(prev => prev.map(conv => 
        conv.user_id === activeChat.user_id 
          ? { ...conv, last_message: '📷 Image', created_at: new Date().toISOString() }
          : conv
      ));
    } catch (err) {
      console.error('Error sending image:', err);
      alert('Erreur lors de l\'envoi de l\'image.');
    }
  };

  const handleSendSticker = async (emoji) => {
    if (!activeChat) return;
    setShowStickers(false);

    try {
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: activeChat.user_id,
        content: emoji,
        is_read: false
      });
      
      setConversations(prev => prev.map(conv => 
        conv.user_id === activeChat.user_id 
          ? { ...conv, last_message: emoji, created_at: new Date().toISOString() }
          : conv
      ));
    } catch (err) {
      console.error('Error sending sticker:', err);
    }
  };

  const getProfileName = (profile) => {
    if (!profile) return 'Utilisateur inconnu';
    if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name}`;
    if (profile.first_name) return profile.first_name;
    return 'Utilisateur';
  };

  const openChat = (conv) => {
    setActiveChat(conv);
    setShowMobileChat(true);
    setShowStickers(false);
  };

  const isSingleEmoji = (text) => {
    if (!text) return false;
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u;
    return emojiRegex.test(text.trim());
  };

  // Skeleton for async loading
  const ConversationSkeleton = () => (
    <div className="conversation-skeleton">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="conv-skel-item">
          <div className="skeleton avatar-skel"></div>
          <div className="conv-skel-lines">
            <div className="skeleton line-skel w-60"></div>
            <div className="skeleton line-skel w-40"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const MessagesSkeleton = () => (
    <div className="messages-skeleton">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={`msg-skel ${i % 2 === 0 ? 'right' : 'left'}`}>
          <div className="skeleton msg-bubble-skel"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="messenger-page">
      {/* Sidebar: Conversations List */}
      <div className={`messenger-sidebar ${showMobileChat ? 'hidden-mobile' : ''}`}>
        <div className="messenger-header">
          <h2 className="font-black text-xl">Messages</h2>
        </div>
        
        <div className="conversations-list">
          {loading ? (
            <ConversationSkeleton />
          ) : conversations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p>Aucune conversation</p>
              <span>Envoyez un message pour commencer</span>
            </div>
          ) : (
            conversations.map((conv) => (
              <div 
                key={conv.user_id} 
                className={`conversation-item ${activeChat?.user_id === conv.user_id ? 'active' : ''}`}
                onClick={() => openChat(conv)}
              >
                <img 
                  src={conv.profile?.avatar_url || 'https://via.placeholder.com/40'} 
                  alt="Avatar" 
                  className="avatar" 
                  onError={(e) => e.target.src = 'https://via.placeholder.com/40'}
                />
                <div className="conversation-info">
                  <div className="conversation-name font-bold flex items-center gap-1">
                    {getProfileName(conv.profile)}
                    {conv.profile?.is_verified && <span className="text-primary text-xs">✓</span>}
                  </div>
                  <div className="conversation-last-msg text-secondary text-sm truncate">
                    {conv.last_message}
                  </div>
                </div>
                <div className="conversation-time text-xs text-secondary">
                  {formatTimeAgo(conv.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`chat-area ${showMobileChat ? 'show-mobile' : ''}`}>
        {activeChat ? (
          <>
            <div className="chat-header glass">
              <div className="flex items-center gap-3">
                <button className="back-btn" onClick={() => setShowMobileChat(false)}>
                  <ArrowLeft size={20} />
                </button>
                <img 
                  src={activeChat.profile?.avatar_url || 'https://via.placeholder.com/40'} 
                  alt="Avatar" 
                  className="avatar"
                  onError={(e) => e.target.src = 'https://via.placeholder.com/40'}
                />
                <div>
                  <div className="font-bold">{getProfileName(activeChat.profile)}</div>
                  <div className="text-xs text-secondary">Actif récemment</div>
                </div>
              </div>
              <button className="icon-btn">
                <MoreVertical size={20} />
              </button>
            </div>

            <div className="chat-messages">
              {messagesLoading ? (
                <MessagesSkeleton />
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.sender_id === user?.id;
                  const isEmoji = isSingleEmoji(msg.content);
                  return (
                    <div key={msg.id || idx} className={`message-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                      {msg.image_url ? (
                        <div className={`message-image-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                          <img src={msg.image_url} alt="Image" className="message-image" loading="lazy" />
                        </div>
                      ) : isEmoji ? (
                        <div className="message-emoji">{msg.content}</div>
                      ) : (
                        <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                          {msg.content}
                        </div>
                      )}
                      <div className="message-time text-xs text-secondary mt-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Sticker Picker */}
            {showStickers && (
              <div className="sticker-picker glass">
                <div className="sticker-header">
                  <span className="font-bold">Stickers & Emojis</span>
                  <button className="icon-btn" onClick={() => setShowStickers(false)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="sticker-grid">
                  {EMOJI_STICKERS.map((emoji, idx) => (
                    <button key={idx} className="sticker-item" onClick={() => handleSendSticker(emoji)}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form className="chat-input-area glass" onSubmit={handleSendMessage}>
              <button type="button" className="icon-btn text-secondary" onClick={() => setShowStickers(!showStickers)}>
                <Smile size={24} />
              </button>
              <label className="icon-btn text-secondary cursor-pointer">
                <ImageIcon size={24} />
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleSendImage}
                />
              </label>
              <input 
                type="text" 
                className="chat-input" 
                placeholder="Écrivez un message..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button 
                type="submit" 
                className="send-btn"
                disabled={!newMessage.trim()}
              >
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="empty-chat-state">
            <div className="empty-chat-icon">💬</div>
            <h3 className="font-bold">Vos messages</h3>
            <p className="text-secondary">Sélectionnez une conversation pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );
}
