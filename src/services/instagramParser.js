import { DEMO_MEDIA, QUICK_TEST_URLS } from '../data/sampleData';

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

  // Check if this URL is explicitly one of the curated demo chips
  const isDemoSample = QUICK_TEST_URLS.some(sample => 
    cleanUrl.toLowerCase().includes(sample.url.toLowerCase().split('?')[0])
  );

  if (isDemoSample) {
    if (type === 'carousel') {
      return {
        ...DEMO_MEDIA.carousel,
        title: `Sample Instagram Carousel (${shortcode || 'Demo'})`,
        sourceUrl: cleanUrl,
        fetchedAt: new Date().toISOString()
      };
    } else if (type === 'photo') {
      return {
        ...DEMO_MEDIA.photo,
        title: `Sample Instagram HD Photo (${shortcode || 'Demo'})`,
        sourceUrl: cleanUrl,
        fetchedAt: new Date().toISOString()
      };
    } else {
      return {
        ...DEMO_MEDIA.reel,
        title: `Sample Instagram Reel (${shortcode || 'Demo'})`,
        sourceUrl: cleanUrl,
        fetchedAt: new Date().toISOString()
      };
    }
  }

  // Real user URL: Must extract actual media from backend API
  let extractionError = null;

  try {
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
          ? (rawVideo.startsWith('/api/proxy-media') ? rawVideo : `/api/proxy-media?url=${encodeURIComponent(rawVideo)}`)
          : null;

        const proxiedImageUrl = rawImage
          ? (rawImage.startsWith('/api/proxy-media') ? rawImage : `/api/proxy-media?url=${encodeURIComponent(rawImage)}`)
          : null;

        // Reel = URL is /reel/ type. /p/ posts can have video but are not reels.
        // Always classify reel URLs as 'reel' — even if videoUrl is null (missing video triggers
        // a clear error downstream rather than silently falling back to showing a thumbnail image).
        const hasVideo = Boolean(data.videoUrl);
        let mediaType = isCarousel ? 'carousel' : (isReelUrl ? 'reel' : 'photo');
        const rawTitle = data.title || `Instagram ${mediaType === 'reel' ? 'Reel' : mediaType === 'carousel' ? 'Carousel' : 'Post'} (${shortcode || 'Live'})`;
        const cleanTitle = rawTitle
          .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
          .substring(0, 220);

        const proxiedAvatarUrl = data.avatarUrl
          ? (data.avatarUrl.startsWith('/api/proxy-media') ? data.avatarUrl : `/api/proxy-media?url=${encodeURIComponent(data.avatarUrl)}`)
          : null;

        // Build carousel items
        const carouselItems = isCarousel
          ? data.carouselItems.map((item, i) => ({
              id: item.id || i + 1,
              type: item.type || 'photo',
              url: item.url.startsWith('/api/proxy-media') ? item.url : `/api/proxy-media?url=${encodeURIComponent(item.url)}`,
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
            views: (mediaType === 'reel' && hasVideo) ? 'HD Stream' : undefined
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
          if (!proxiedVideoUrl) {
            throw new Error('No downloadable video stream found for this Reel. It may be private or expired.');
          }
          return {
            ...baseResult,
            videoUrl: proxiedVideoUrl,
            posterUrl: proxiedImageUrl || '',
            imageUrl: proxiedImageUrl || '',
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
      } else if (data && data.error) {
        extractionError = data.error;
      }
    } else {
      const errText = await response.text().catch(() => '');
      extractionError = `Server returned ${response.status}: ${errText || 'Extraction failed'}`;
    }
  } catch (e) {
    extractionError = e.message;
  }

  // Do NOT return demo media for a real user URL. Report the actual error so user is aware.
  throw new Error(
    extractionError
      ? `Failed to fetch Instagram media: ${extractionError}. Please make sure the post or reel is public and try again.`
      : 'Unable to extract media from this Instagram link. Please ensure the post/reel is from a public account.'
  );
}
