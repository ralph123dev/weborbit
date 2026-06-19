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

export async function uploadToCloudinary(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        if (onProgress) onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        reject(new Error('Erreur lors du téléchargement de la vidéo'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Erreur réseau lors du téléchargement'));
    });

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`);
    xhr.send(formData);
  });
}

// Helper function to escape HTML special characters
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export function formatTextWithLinks(text) {
  if (!text) return text;
  
  // First escape all HTML to prevent XSS
  let escaped = escapeHtml(text);
  
  // Then linkify URLs (match escaped text properly)
  const urlRegex = /(https?:\/\/[^\s<&]+)/g;
  let formatted = escaped.replace(urlRegex, (url) => {
    const escapedUrl = escapeHtml(url);
    return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${escapedUrl}</a>`;
  });
  
  // Then linkify Hashtags
  const hashtagRegex = /(#[a-zA-Z0-9_]+)/g;
  formatted = formatted.replace(hashtagRegex, '<span class="text-primary cursor-pointer hover:underline">$1</span>');
  
  return formatted;
}
