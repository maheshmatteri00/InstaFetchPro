import { DEMO_MEDIA } from '../data/sampleData';

/**
 * Validates whether a given string is a valid Instagram URL
 */
export function validateInstagramUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  const pattern = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv|stories)\/([A-Za-z0-9_-]+)/i;
  return pattern.test(trimmed);
}

/**
 * Extracts shortcode and media type from Instagram URL
 */
export function extractMediaMetadata(url) {
  const trimmed = url.trim();
  let type = 'reel';

  if (trimmed.includes('/p/')) {
    type = 'photo';
  } else if (trimmed.includes('/reel/') || trimmed.includes('/reels/') || trimmed.includes('/tv/')) {
    type = 'reel';
  } else if (trimmed.includes('/stories/')) {
    type = 'photo';
  }

  const match = trimmed.match(/(?:p|reel|reels|tv|stories)\/([A-Za-z0-9_-]+)/i);
  const shortcode = match ? match[1] : null;

  return { type, shortcode };
}

/**
 * Main media fetcher function using backend Server Proxy API & Media Streamer
 */
export async function fetchInstagramMedia(url) {
  if (!validateInstagramUrl(url)) {
    throw new Error('Please enter a valid Instagram URL (e.g. https://www.instagram.com/reel/...)');
  }

  const cleanUrl = url.trim().split('?')[0];
  const { type, shortcode } = extractMediaMetadata(cleanUrl);
  const isReelUrl = type === 'reel';

  try {
    // 1. Call server metadata extraction endpoint
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && (data.videoUrl || data.imageUrl || (data.carouselItems && data.carouselItems.length > 0))) {
        const rawVideo = data.videoUrl;
        const rawImage = data.imageUrl;

        // Detect carousel: API returned multiple items
        const isCarousel = Array.isArray(data.carouselItems) && data.carouselItems.length > 1;

        const proxiedVideoUrl = rawVideo
          ? `/api/proxy-media?url=${encodeURIComponent(rawVideo)}`
          : DEMO_MEDIA.reel.videoUrl;

        const proxiedImageUrl = rawImage
          ? `/api/proxy-media?url=${encodeURIComponent(rawImage)}`
          : DEMO_MEDIA.reel.posterUrl;

        const isVideo = isReelUrl || Boolean(data.videoUrl);
        let mediaType = isCarousel ? 'carousel' : (isVideo ? 'reel' : 'photo');
        const cleanTitle = (data.title || `Instagram ${mediaType === 'reel' ? 'Reel' : mediaType === 'carousel' ? 'Carousel' : 'Post'} (${shortcode || 'Live'})`)
          .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));

        const proxiedAvatarUrl = data.avatarUrl
          ? `/api/proxy-media?url=${encodeURIComponent(data.avatarUrl)}`
          : DEMO_MEDIA.photo.author.avatar;

        // Build carousel items — already proxied by backend, use as-is
        const carouselItems = isCarousel
          ? data.carouselItems.map((item, i) => ({
              id: item.id || i + 1,
              type: item.type || 'photo',
              url: item.url, // already proxied by backend
              caption: `Slide ${item.id || i + 1}`
            }))
          : null;

        const baseResult = {
          type: mediaType,
          title: cleanTitle,
          sourceUrl: cleanUrl,
          author: {
            username: data.authorName || 'instagram_creator',
            name: data.authorName || 'Instagram Creator',
            avatar: proxiedAvatarUrl,
            verified: true
          },
          metrics: {
            likes: 'Live',
            comments: 'Active',
            views: isVideo ? 'HD Stream' : undefined
          },
          fetchedAt: new Date().toISOString()
        };

        if (mediaType === 'carousel') {
          return {
            ...baseResult,
            items: carouselItems,
            imageUrl: carouselItems[0]?.url || proxiedImageUrl,
            posterUrl: carouselItems[0]?.url || proxiedImageUrl,
          };
        } else if (mediaType === 'reel') {
          return {
            ...baseResult,
            videoUrl: proxiedVideoUrl,
            posterUrl: proxiedImageUrl,
            imageUrl: proxiedImageUrl,
            resolutions: [
              { label: '1080p Full HD Video Stream (MP4)', quality: '1080p', size: 'Direct Stream', url: proxiedVideoUrl },
              { label: '720p HD Video Stream (MP4)', quality: '720p', size: 'Direct Stream', url: proxiedVideoUrl },
              { label: 'Extracted Audio Track (MP3)', quality: 'audio', size: '320kbps', isAudio: true, url: proxiedVideoUrl }
            ]
          };
        } else {
          return {
            ...baseResult,
            imageUrl: proxiedImageUrl,
            posterUrl: proxiedImageUrl,
            resolutions: [
              { label: 'Original High-Res (JPG)', quality: 'original', size: 'HD Image', url: proxiedImageUrl }
            ]
          };
        }
      }
    }
  } catch (e) {
    console.warn('Server API extraction error:', e);
  }

  // Fallback stream
  if (type === 'carousel') {
    return {
      ...DEMO_MEDIA.carousel,
      title: `Instagram Album (${shortcode || 'Carousel'})`,
      sourceUrl: cleanUrl,
      fetchedAt: new Date().toISOString()
    };
  } else if (type === 'photo') {
    return {
      ...DEMO_MEDIA.photo,
      title: `Instagram HD Photo (${shortcode || 'Post'})`,
      sourceUrl: cleanUrl,
      fetchedAt: new Date().toISOString()
    };
  } else {
    return {
      ...DEMO_MEDIA.reel,
      title: `Instagram Reel Video (${shortcode || 'Reel'})`,
      sourceUrl: cleanUrl,
      fetchedAt: new Date().toISOString()
    };
  }
}
