const HISTORY_STORAGE_KEY = 'instafetch_download_history';

/**
 * Triggers direct browser download for media file (video/image/audio)
 */
export async function downloadMediaFile(fileUrl, fileName) {
  try {
    const response = await fetch(fileUrl, { mode: 'cors' });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName || 'InstaFetch_media';
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    a.remove();
    return true;
  } catch (error) {
    console.warn('Direct blob fetch blocked by CORS, falling back to direct window open:', error);
    // Fallback: Open in new tab or trigger direct download link
    const a = document.createElement('a');
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.href = fileUrl;
    a.download = fileName || 'InstaFetch_media';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }
}

/**
 * Download History Management
 */
export function getDownloadHistory() {
  try {
    const history = localStorage.getItem(HISTORY_STORAGE_KEY);
    return history ? JSON.parse(history) : [];
  } catch (e) {
    return [];
  }
}

export function addToDownloadHistory(item) {
  try {
    const current = getDownloadHistory();
    // Filter out duplicates based on title or sourceUrl
    const filtered = current.filter((h) => h.title !== item.title);
    const updated = [
      {
        id: Date.now().toString(),
        title: item.title,
        type: item.type,
        author: item.author?.username || 'instagram_user',
        preview: item.posterUrl || item.imageUrl || item.items?.[0]?.url,
        sourceUrl: item.sourceUrl || '#',
        downloadedAt: new Date().toLocaleDateString()
      },
      ...filtered
    ].slice(0, 10); // Keep last 10 items

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save to history:', e);
    return [];
  }
}

export function clearDownloadHistory() {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    return [];
  } catch (e) {
    return [];
  }
}
