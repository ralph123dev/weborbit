import { ArrowLeft, Image as ImageIcon, MoreVertical, Send, Smile, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { formatTimeAgo, uploadToCloudinary } from '../utils/helpers';
import './MessengerPage.css';

const EMOJI_STICKERS = `
😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🫢 🫡 🤭 🤫 🤥 😶 😐 😑 😬 🫠 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 💀 ☠️ 👻 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾

👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦

🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🐣 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪲 🦋 🐌 🐞 🐜 🪰 🪱 🦗 🕷️ 🦂 🐢 🐍 🦎 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🐈 🐓 🦃 🦚 🦜 🦢 🕊️ 🐇

🌵 🎄 🌲 🌳 🌴 🪵 🌱 🌿 ☘️ 🍀 🎍 🪴 🎋 🍃 🍂 🍁 🍄 🌾 💐 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌛 🌜 🌚 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 ⭐ 🌟 ✨ ⚡ ☄️ 💥 🔥 🌈 ☀️ ⛅ ☁️ 🌧️ ⛈️ 🌩️ ❄️ ☃️ ⛄ 🌊 💧 💦

🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🍞 🥖 🥨 🧀 🍗 🍖 🌭 🍔 🍟 🍕 🫓 🌮 🌯 🥙 🧆 🍝 🍜 🍲 🍛 🍣 🍱 🍤 🍙 🍚 🍘 🍥 🥟 🥠 🥡 🍢 🍡 🍧 🍨 🍦 🎂 🍰 🧁 🍩 🍪 🍫 🍬 🍭 🍮 🍯

⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥅 🥊 🥋 🎯 ⛳ 🎣 🤿 🎿 🛷 🛹 🛼 🚴 🚵 🏇 🏊 🤽 🚣 🧗 🤸 ⛹️ 🤾 🏋️ 🧘

🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚚 🚛 🚜 🏍️ 🚲 🛴 ✈️ 🛫 🛬 🚁 🚀 🛸 🚢 ⛵ 🚤 🛥️ 🚂 🚆 🚄 🚅 🚇 🚊 🚉 🚞 🚝 🚟

❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 💯 🎉 🎊 🎈 🎁 🏆 🥇 🥈 🥉 ✔️ ✅ ⭐ 🌟 🔥 🚀 💎 👑 🎯 🥳 🎶 🎵 🎤 📱 💻 ⌚ 📷 🎬 📚 ✏️ 📝 📌 📎 🔒 🔑 💡 🛒 💰 💵 💶 💷 💴 💳 📈 📉 🌍 🌎 🌏 🏠 🏢 🏫 🏥 🏦 ⛪ 🕌 🕍 🏰 🗽 🎡 🎢 🎠 🎪 🎭 🎨 🎸 🎹 🥁 🎺 🎻 🎷 🎮 🕹️ 🖥️ 🖨️ 📡 📺 📻 🎧 🎙️ 🔋 🔌 💾 📀 💿 📁 📂 🗂️ 📅 📆 ⏰ ⌛ 🕰️ 📍 🧭 🗺️ 🛠️ ⚙️ 🔧 🔨 🧰 🧲 🧪 🧫 🔬 🔭 🚿 🛁 🚽 🛏️ 🪑 🚪 🪟 🎀 🎗️ 🏵️ 🎖️ 🏅 🪙 💌 ✉️ 📩 📨 📤 📥 📦 🛍️ 🗑️ ♻️ 🌐 📶 📳 📴 🔔 🔕 📢 📣 💬 🗨️ 💭 💤 🎵 🎶 🚩 🏳️ 🏴 🏁 🎌 🏳️‍🌈 🏳️‍⚧️ 🚨 ❗ ❓ 💢 💫 ✨ 🎇 🎆 🎑 🌠 🌌 🌃 🌆 🌇 🌉 🌁 🏞️ 🌅 🌄 🌤️ 🌥️ 🌦️ 🌨️ 🌪️ 🌫️ 🌬️ 🌀 🌡️ ☔ 💨 🌊

🫨 🫤 🫥 🫶 🫱 🫲 🫳 🫴 🫷 🫸 🫵 🫂 🫃 🫄 🫅 🫎 🫏 🪽 🪿 🪹 🪺 🪸 🪷 🪻 🪼 🪭 🪮 🪯 🪬 🪩 🪫 🪤 🪣 🪥 🪦 🪧 🪪 🪞 🪟 🪜 🪝 🪛 🪚 🪓 🪖 🪗 🪘 🪙 🪃 🪄 🪅 🪆 🪇 🪈 🪉 🪊 🪏

🧳 🌂 ☂️ 🧵 🪡 🧶 👓 🕶️ 🥽 🦺 👔 👕 👖 🧣 🧤 🧥 🧦 👗 👘 🥻 🩱 🩲 🩳 👙 👚 👛 👜 👝 🛍️ 🎒 🩴 👞 👟 🥾 🥿 👠 👡 🩰 👢 👑 👒 🎩 🎓 🧢 🪖 📿 💄 💍 💎

🪸 🦭 🪿 🦤 🦩 🦚 🦥 🦦 🦨 🦡 🦫 🦔 🦣 🦕 🦖 🐉 🐲 🦑 🪼 🐚 🦪 🐾 🪰 🪲 🪳 🦟 🦠

🏔️ ⛰️ 🌋 🗻 🏕️ 🏖️ 🏜️ 🏝️ 🏞️ 🛖 🏘️ 🏚️ 🏗️ 🏭 🏬 🏣 🏤 🏛️ ⛲ 🗼 🗿 🛕 🕋 ⛩️ 🛤️ 🛣️ 🗺️ 🧭

🚠 🚡 🚟 🚃 🚋 🚍 🚘 🚖 🚔 🚍 🚐 🛻 🚗 🦽 🦼 🛺 🚨 🚥 🚦 🛑 ⛽ 🛞 🚧 ⚓ 🛟 ⛴️ 🛳️ 🛶 🛩️ 🛬 🛫 🛰️

⌚ ⏱️ ⏲️ 🕛 🕧 🕐 🕜 🕑 🕝 🕒 🕞 🕓 🕟 🕔 🕠 🕕 🕡 🕖 🕢 🕗 🕣 🕘 🕤 🕙 🕥 🕚 🕦

📱 ☎️ 📞 📟 📠 🔋 🪫 🔦 🕯️ 🪔 💡 🛢️ 💸 💹 💱 🧾 💷 💶 💴 🪪

📔 📕 📖 📗 📘 📙 📚 📓 📒 📃 📜 📄 📰 🗞️ 🔖 🏷️ 💹 📊 📋 📇 📑 🗃️ 🗄️ 🗑️

✂️ 🖇️ 📏 📐 🧮 🧾 🖊️ 🖋️ ✒️ 🖌️ 🧷 📌 🔍 🔎 🔏 🔐 🔓 🗝️

💺 🛋️ 🪑 🚪 🪞 🪟 🛏️ 🧸 🪅 🎎 🏮 🎐 🧧 🪔

♠️ ♥️ ♦️ ♣️ 🂡 🃏 🎴 🎰 🎳 🧩 🧠 🎮 🕹️ 👾

🥁 🪘 🎷 🪗 🎸 🪕 🎻 🎺 🎹 🥁 🪘 🪗 🎸 🪕 🎻 🎺 🎹 🎼 🎵 🎶 🎤 🎧 📻

🪄 🔮 📿 🧿 🪬 ⚗️ 🧪 🧫 🧬 🔬 🔭 🩺 🩹 🩻 💉

🛠️ ⛏️ ⚒️ 🪚 🔨 🪓 🧰 🪛 🔧 🔩 ⚙️ 🧱 ⛓️ 🪝

🧴 🧼 🪥 🪒 🧽 🧹 🧺 🧻 🚿 🛁 🪠 🚰

🩵 🩷 🩶 ❤️‍🔥 ❤️‍🩹 💋 💒 💐 🪷 💍 👰 🤵

🧑‍💻 👨‍💻 👩‍💻 🧑‍🔬 👨‍🔬 👩‍🔬 🧑‍🏫 👨‍🏫 👩‍🏫 🧑‍⚕️ 👨‍⚕️ 👩‍⚕️ 🧑‍🚀 👨‍🚀 👩‍🚀 🧑‍🚒 👨‍🚒 👩‍🚒 🧑‍✈️ 👨‍✈️ 👩‍✈️

🧑‍🌾 👨‍🌾 👩‍🌾 🧑‍🍳 👨‍🍳 👩‍🍳 🧑‍🎤 👨‍🎤 👩‍🎤 🧑‍🎨 👨‍🎨 👩‍🎨 🧑‍⚖️ 👨‍⚖️ 👩‍⚖️ 🧑‍🔧 👨‍🔧 👩‍🔧

🧑‍🦯 👨‍🦯 👩‍🦯 🧑‍🦼 👨‍🦼 👩‍🦼 🧑‍🦽 👨‍🦽 👩‍🦽
`.trim().split(/\s+/);

export default function MessengerPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [swiping, setSwiping] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const swipeStartRef = useRef({});

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (user && !loading && targetUserId) {
      const existing = conversations.find(c => c.user_id === targetUserId);
      if (existing) {
        openChat(existing);
      } else {
        const setupTempChat = async () => {
          try {
            const { data: targetProfile, error } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, avatar_url, username, is_verified')
              .eq('id', targetUserId)
              .single();

            if (error) throw error;
            if (targetProfile) {
              const tempChat = {
                user_id: targetUserId,
                profile: targetProfile,
                last_message: '',
                created_at: new Date().toISOString()
              };
              setConversations(prev => [tempChat, ...prev]);
              openChat(tempChat);
            }
          } catch (e) {
            console.error('Error setting up temporary chat:', e);
          }
        };
        setupTempChat();
      }
    }
  }, [user, loading, targetUserId]);

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
        .select('receiver_id, content, created_at, image_url, is_read, sender_id, profiles!messages_receiver_id_fkey(avatar_url, first_name, last_name, is_verified)')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      const { data: recvData } = await supabase
        .from('messages')
        .select('sender_id, content, created_at, image_url, is_read, receiver_id, profiles!messages_sender_id_fkey(avatar_url, first_name, last_name, is_verified)')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      const allMessages = [...(sentData || []), ...(recvData || [])];
      
      const uniqueUsers = {};
      
      allMessages.forEach(msg => {
        const isSent = msg.sender_id === user.id;
        const otherUserId = isSent ? msg.receiver_id : msg.sender_id;
        const otherUserProfile = msg.profiles;

        if (!uniqueUsers[otherUserId]) {
          uniqueUsers[otherUserId] = {
            user_id: otherUserId,
            profile: otherUserProfile,
            last_message: msg.image_url ? '📷 Image' : msg.content,
            created_at: msg.created_at,
            unreadCount: (!isSent && !msg.is_read) ? 1 : 0
          };
        } else {
          // Increment unread count if received and unread
          if (!isSent && !msg.is_read) {
            uniqueUsers[otherUserId].unreadCount += 1;
          }
          if (new Date(msg.created_at) > new Date(uniqueUsers[otherUserId].created_at)) {
            uniqueUsers[otherUserId].last_message = msg.image_url ? '📷 Image' : msg.content;
            uniqueUsers[otherUserId].created_at = msg.created_at;
          }
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
      
      // Marquer tous les messages reçus comme lus
      const unreadMessages = data?.filter(msg => msg.receiver_id === user.id && !msg.is_read) || [];
      if (unreadMessages.length > 0) {
        const unreadIds = unreadMessages.map(msg => msg.id);
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
      
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
    const messageBeingRepliedTo = replyTo;
    
    setNewMessage('');
    setShowStickers(false);

    try {
      // Marquer le message auquel on répond comme lu
      if (messageBeingRepliedTo) {
        await supabase.from('messages')
          .update({ is_read: true })
          .eq('id', messageBeingRepliedTo.id);
      }

      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: activeChat.user_id,
        content: content,
        is_read: false,
        reply_to_id: messageBeingRepliedTo?.id || null
      });
      
      setReplyTo(null);
      
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

    const messageBeingRepliedTo = replyTo;

    try {
      // Marquer le message auquel on répond comme lu
      if (messageBeingRepliedTo) {
        await supabase.from('messages')
          .update({ is_read: true })
          .eq('id', messageBeingRepliedTo.id);
      }

      const imageUrl = await uploadToCloudinary(file);
      
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: activeChat.user_id,
        content: '',
        image_url: imageUrl,
        is_read: false,
        reply_to_id: messageBeingRepliedTo?.id || null
      });

      setReplyTo(null);

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

    const messageBeingRepliedTo = replyTo;

    try {
      // Marquer le message auquel on répond comme lu
      if (messageBeingRepliedTo) {
        await supabase.from('messages')
          .update({ is_read: true })
          .eq('id', messageBeingRepliedTo.id);
      }

      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: activeChat.user_id,
        content: emoji,
        is_read: false,
        reply_to_id: messageBeingRepliedTo?.id || null
      });
      
      setReplyTo(null);
      
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

  function openChat(conv) {
    setActiveChat(conv);
    setShowMobileChat(true);
    setShowStickers(false);
  }

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
                  src={conv.profile?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
                  alt="Avatar" 
                  className="avatar" 
                  onError={(e) => e.target.src = 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'}
                />
                <div className="conversation-info">
                  <div className="conversation-name font-bold flex items-center gap-1">
                    {getProfileName(conv.profile)}
                    {conv.profile?.is_verified && <span className="text-primary text-xs">✓</span>}
                  </div>
                  <div className="conversation-last-msg text-secondary text-sm truncate" style={{ fontWeight: conv.unreadCount > 0 ? '700' : 'normal', color: conv.unreadCount > 0 ? 'white' : 'var(--text-secondary)' }}>
                    {conv.last_message}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1" style={{ flexShrink: 0 }}>
                  <div className="conversation-time text-xs text-secondary">
                    {formatTimeAgo(conv.created_at)}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span style={{
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      minWidth: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                    }}>
                      {conv.unreadCount}
                    </span>
                  )}
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
                  src={activeChat.profile?.avatar_url || 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'} 
                  alt="Avatar" 
                  className="avatar"
                  onError={(e) => e.target.src = 'https://static.vecteezy.com/system/resources/thumbnails/004/607/791/small_2x/man-face-emotive-icon-smiling-male-character-in-blue-shirt-flat-illustration-isolated-on-white-happy-human-psychological-portrait-positive-emotions-user-avatar-for-app-web-design-vector.jpg'}
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
                  const repliedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;
                  const currentSwipeOffset = swipeOffset[msg.id] || 0;
                  const isBeingSwiped = swiping === msg.id;

                  const handleSwipeStart = (e) => {
                    if (e.touches) {
                      swipeStartRef.current[msg.id] = e.touches[0].clientX;
                    } else {
                      swipeStartRef.current[msg.id] = e.clientX;
                    }
                    setSwiping(msg.id);
                  };

                  const handleSwipeMove = (e) => {
                    if (!isBeingSwiped) return;
                    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
                    const startX = swipeStartRef.current[msg.id];
                    const diff = currentX - startX;

                    if (!isMine && diff > 0 && diff < 100) {
                      setSwipeOffset(prev => ({ ...prev, [msg.id]: diff }));
                    } else if (isMine && diff < 0 && diff > -100) {
                      setSwipeOffset(prev => ({ ...prev, [msg.id]: diff }));
                    }
                  };

                  const handleSwipeEnd = () => {
                    const offset = currentSwipeOffset;
                    const threshold = 40;

                    if (Math.abs(offset) > threshold) {
                      setReplyTo(msg);
                      setTimeout(() => {
                        setSwipeOffset(prev => ({ ...prev, [msg.id]: 0 }));
                        setSwiping(null);
                      }, 200);
                    } else {
                      setSwipeOffset(prev => ({ ...prev, [msg.id]: 0 }));
                      setSwiping(null);
                    }
                  };

                  return (
                    <div 
                      key={msg.id || idx} 
                      className={`message-wrapper ${isMine ? 'mine' : 'theirs'} group`}
                      onTouchStart={handleSwipeStart}
                      onTouchMove={handleSwipeMove}
                      onTouchEnd={handleSwipeEnd}
                      onMouseDown={handleSwipeStart}
                      onMouseMove={handleSwipeMove}
                      onMouseUp={handleSwipeEnd}
                      onMouseLeave={handleSwipeEnd}
                    >
                      <div 
                        className="message-content"
                        style={{
                          transform: `translateX(${currentSwipeOffset}px)`,
                          transition: isBeingSwiped ? 'none' : 'transform 0.2s ease',
                          opacity: 1 - Math.abs(currentSwipeOffset) / 150
                        }}
                      >
                        <button 
                          className={`reply-icon-btn ${isMine ? 'left-side' : 'right-side'} opacity-0 group-hover:opacity-100 transition-opacity`}
                          onClick={() => setReplyTo(msg)}
                          title="Répondre"
                        >
                          ↩️
                        </button>

                        {repliedMsg && (
                          <div className={`message-quote ${isMine ? 'mine' : 'theirs'}`}>
                            <div className="quote-author">{repliedMsg.sender_id === user.id ? 'Vous' : getProfileName(activeChat.profile)}</div>
                            <div className="quote-content truncate">{repliedMsg.image_url ? '📷 Image' : repliedMsg.content}</div>
                          </div>
                        )}

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

                      {Math.abs(currentSwipeOffset) > 15 && (
                        <div className={`swipe-reply-indicator ${isMine ? 'left' : 'right'}`}>
                          <span>↩️ Répondre</span>
                        </div>
                      )}
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

            {replyTo && (
              <div className="chat-replying-banner glass">
                <div className="flex-1 overflow-hidden">
                  <div className="text-xs text-primary font-bold">En réponse à {replyTo.sender_id === user.id ? 'vous' : getProfileName(activeChat.profile)}</div>
                  <div className="text-sm truncate text-secondary">{replyTo.image_url ? '📷 Image' : replyTo.content}</div>
                </div>
                <button className="icon-btn text-secondary" onClick={() => setReplyTo(null)}><X size={16} /></button>
              </div>
            )}

            <form className="chat-input-area glass" onSubmit={handleSendMessage}>
                <div className="input-left-icons">
                  <button type="button" className="icon-btn text-secondary emoji-toggle" onClick={() => setShowStickers(!showStickers)}>
                    <Smile size={20} />
                  </button>
                  <label className="icon-btn text-secondary attach-btn cursor-pointer">
                    <ImageIcon size={18} />
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleSendImage}
                    />
                  </label>
                </div>

                <div className="chat-input-wrap">
                  <input 
                    type="text" 
                    className="chat-input" 
                    placeholder="Écrivez un message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                </div>

                {newMessage.trim() && (
                  <button 
                    type="submit" 
                    className="send-btn"
                  >
                    <Send size={18} />
                  </button>
                )}
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
