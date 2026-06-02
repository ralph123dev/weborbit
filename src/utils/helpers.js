export function formatCount(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return num.toString();
}

export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'À l\'instant';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}j`;
  
  return date.toLocaleDateString();
}

export function isOnline(lastSeen) {
  if (!lastSeen) return false;
  const now = new Date();
  const seen = new Date(lastSeen);
  return (now - seen) < 120000; // 2 minutes
}

export async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );
  
  if (!res.ok) throw new Error('Erreur lors du téléchargement de l\'image');
  const data = await res.json();
  return data.secure_url;
}

export function formatTextWithLinks(text) {
  if (!text) return text;
  
  // Linkify URLs and Hashtags
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const hashtagRegex = /(#[a-zA-Z0-9_]+)/g;
  
  let formatted = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');
  formatted = formatted.replace(hashtagRegex, '<span class="text-primary cursor-pointer hover:underline">$1</span>');
  
  return formatted;
}
