/**
 * Core Instagram media extraction and proxy logic.
 * Used by Cloudflare Workers, Cloudflare Pages functions, and Vite dev server.
 */

export function sanitizeCdnUrl(url) {
  if (!url) return null;
  let cleaned = url
    .split('<')[0]
    .split('>')[0]
    .split('\\u003C')[0]
    .split('\\u003c')[0]
    .split('\\u003E')[0]
    .split('\\u003e')[0]
    .split('%3C')[0]
    .split('%3c')[0]
    .split('"')[0]
    .split("'")[0]
    .trim();
  cleaned = cleaned.replace(/\/c\d+\.\d+\.\d+\.\d+a\//gi, '/');
  return cleaned || null;
}

export function decodeUnicodeEscapes(str) {
  if (!str) return '';
  try {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
  } catch (e) {
    return str;
  }
}

export function extractFullResImageFromJson(html) {
  if (!html) return null;
  const text = html
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
    .replace(/\\\//g, '/');

  const imgVersionsMatch = text.match(/"image_versions2"\s*:\s*\{[^}]*"candidates"\s*:\s*\[([^\]]+)\]/i);
  if (imgVersionsMatch) {
    const candidatesStr = imgVersionsMatch[1];
    const candidates = [];
    const candidateRe = /\{[^}]*"width"\s*:\s*(\d+)[^}]*"url"\s*:\s*"([^"]+)"/gi;
    let m;
    while ((m = candidateRe.exec(candidatesStr)) !== null) {
      candidates.push({ width: parseInt(m[1]), url: m[2] });
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.width - a.width);
      const best = sanitizeCdnUrl(candidates[0].url);
      if (best) return best;
    }
  }

  const displayUrlMatch = text.match(/"display_url"\s*:\s*"([^"]+cdninstagram[^"]+)"/i)
    || text.match(/"display_url"\s*:\s*"([^"]+fbcdn[^"]+)"/i);
  if (displayUrlMatch && displayUrlMatch[1]) {
    return sanitizeCdnUrl(displayUrlMatch[1]);
  }

  return null;
}

export function extractPostImage(html) {
  if (!html) return null;

  const ogContentFirst = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogContentFirst && ogContentFirst[1]) return sanitizeCdnUrl(ogContentFirst[1]);

  const ogPropertyFirst = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogPropertyFirst && ogPropertyFirst[1]) return sanitizeCdnUrl(ogPropertyFirst[1]);

  const twContentFirst = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (twContentFirst && twContentFirst[1]) return sanitizeCdnUrl(twContentFirst[1]);

  const twNameFirst = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (twNameFirst && twNameFirst[1]) return sanitizeCdnUrl(twNameFirst[1]);

  const displayUrlMatch = html.match(/"display_url"\s*:\s*"([^"]+)"/i) || html.match(/"display_src"\s*:\s*"([^"]+)"/i);
  if (displayUrlMatch && displayUrlMatch[1]) return sanitizeCdnUrl(displayUrlMatch[1]);

  const imgMatches = html.match(/(https?:[^\s"'<]+?(?:cdninstagram|fbcdn)[^\s"'<]+?\.jpg[^\s"'<]*)/gi) || [];
  const postImgCandidate = imgMatches.find(url => {
    const lower = url.toLowerCase();
    return !lower.includes('150x150') &&
           !lower.includes('320x320') &&
           !lower.includes('_a.jpg') &&
           !lower.includes('profile_pic') &&
           !lower.includes('s150x150') &&
           !lower.includes('s320x320');
  });

  if (postImgCandidate) return sanitizeCdnUrl(postImgCandidate);
  return imgMatches.length > 0 ? sanitizeCdnUrl(imgMatches[0]) : null;
}

export function extractAuthorAvatar(html) {
  if (!html) return null;
  const match = html.match(/"profile_pic_url"\s*:\s*"([^"]+)"/i) ||
                html.match(/"profile_pic_url_hd"\s*:\s*"([^"]+)"/i) ||
                html.match(/(https?:[^\s"'<]+?cdninstagram[^\s"'<]+?s150x150[^\s"'<]*)/gi);
  if (match) {
    const url = Array.isArray(match) ? match[0] : match[1];
    return sanitizeCdnUrl(url);
  }
  return null;
}

export function extractCarouselFromEmbed(html) {
  if (!html) return [];
  const sidecarIdx = html.indexOf('edge_sidecar_to_children');
  if (sidecarIdx === -1) return [];

  const chunk = html.substring(sidecarIdx, sidecarIdx + 500000);
  const urls = [];
  let searchFrom = 0;

  while (true) {
    const duStart = chunk.indexOf('display_url', searchFrom);
    if (duStart === -1) break;

    const httpsStart = chunk.indexOf('https', duStart);
    if (httpsStart === -1 || httpsStart - duStart > 30) { searchFrom = duStart + 1; continue; }

    let urlEnd = httpsStart;
    while (urlEnd < httpsStart + 3000) {
      const ch = chunk[urlEnd];
      const next = chunk[urlEnd + 1];
      if (ch === '"' || ch === '<' || ch === ' ' || ch === '\n' || ch === '\r') break;
      if (ch === '\\' && next === '"') break;
      if (ch === '\\' && next === '\\' && chunk[urlEnd + 2] === '"') break;
      urlEnd++;
    }

    let rawUrl = chunk.substring(httpsStart, urlEnd);
    rawUrl = rawUrl.replace(/\\+\//g, '/');

    if (rawUrl.length < 30) { searchFrom = duStart + 1; continue; }
    if (!rawUrl.includes('fbcdn') && !rawUrl.includes('cdninstagram')) { searchFrom = duStart + 1; continue; }
    if (rawUrl.includes('static.cdninstagram')) { searchFrom = duStart + 1; continue; }
    if (rawUrl.includes('s150x150') || rawUrl.includes('s320x320') || rawUrl.includes('s100x100')) { searchFrom = duStart + 1; continue; }

    const fileKey = rawUrl.split('?')[0].split('/').pop();
    if (fileKey && !urls.some(u => u.split('?')[0].split('/').pop() === fileKey)) {
      const clean = sanitizeCdnUrl(rawUrl);
      if (clean) urls.push(clean);
    }

    searchFrom = urlEnd + 1;
    if (urls.length >= 20) break;
  }

  return urls;
}

// Internal helpers

function unescapeInstagramHtml(html) {
  return html
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
    .replace(/\\\//g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/&amp;/g, '&');
}

function extractAllVideoUrls(html) {
  const found = [];
  const text = unescapeInstagramHtml(html);

  const patterns = [
    /"video_url"\s*:\s*"(https?:[^"]+)"/gi,
    /"videoUrl"\s*:\s*"(https?:[^"]+)"/gi,
    /"playback_url"\s*:\s*"(https?:[^"]+)"/gi,
    /"stream_url"\s*:\s*"(https?:[^"]+)"/gi,
    /"browser_native_hd_url"\s*:\s*"(https?:[^"]+)"/gi,
    /"browser_native_sd_url"\s*:\s*"(https?:[^"]+)"/gi,
    /"video_versions"\s*:\s*\[\s*\{[^}]*"url"\s*:\s*"(https?:[^"]+)"/gi,
    /"src"\s*:\s*"(https?:[^"]+\.mp4[^"]*?)"/gi,
    /videoSrc\s*[=:]\s*["'`](https?:[^"'`]+\.mp4[^"'`]*?)["'`]/gi,
    /video_url\s*=\s*["'](https?:[^"']+)["']/gi,
    /<video[^>]+src=["'](https?:[^"']+)["']/gi,
    /<source[^>]+src=["'](https?:[^"']+\.mp4[^"']*?)["']/gi,
    /(https?:\/\/[^\s"'<]+?(?:fbcdn\.net|cdninstagram\.com)[^\s"'<]+?\.mp4[^\s"'<]*)/gi,
  ];

  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(text)) !== null) {
      const candidate = sanitizeCdnUrl(m[1]);
      if (candidate && candidate.length > 30 && !found.includes(candidate)) {
        found.push(candidate);
      }
    }
  }
  return found;
}

function pickBestVideoUrl(candidates) {
  const cdnMp4 = candidates.find(u =>
    (u.includes('fbcdn') || u.includes('cdninstagram')) &&
    u.toLowerCase().includes('.mp4') &&
    !u.includes('manifest') &&
    !u.includes('dash')
  );
  return cdnMp4 || candidates[0] || null;
}

/**
 * Main extraction function - works in Cloudflare Workers, Pages Functions, and Vite dev.
 */
export async function extractInstagramMedia(url) {
  if (!url) throw new Error('URL is required');

  const match = url.match(/(?:p|reel|reels|tv|stories)\/([A-Za-z0-9_-]+)/i);
  const shortcode = match ? match[1] : null;
  if (!shortcode) throw new Error('Invalid Instagram shortcode');

  let videoUrl = null;
  let imageUrl = null;
  let avatarUrl = null;
  let authorName = 'instagram_creator';
  let title = `Instagram Post (${shortcode})`;
  let carouselItems = [];
  const debugLog = [];

  const isPost = url.includes('/p/');
  const targetPageUrl = isPost
    ? `https://www.instagram.com/p/${shortcode}/`
    : `https://www.instagram.com/reel/${shortcode}/`;

  // STEP 1: Embed page (PRIMARY - works without login)
  const embedUrls = isPost
    ? [
        `https://www.instagram.com/p/${shortcode}/embed/captioned/`,
        `https://www.instagram.com/p/${shortcode}/embed/`,
      ]
    : [
        `https://www.instagram.com/reel/${shortcode}/embed/captioned/`,
        `https://www.instagram.com/reel/${shortcode}/embed/`,
        `https://www.instagram.com/reel/${shortcode}/embed/v2/`,
      ];

  for (const embedUrl of embedUrls) {
    if (videoUrl && imageUrl) break;
    try {
      const embedRes = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.instagram.com/',
          'Sec-Fetch-Dest': 'iframe',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
        }
      });
      debugLog.push(`embed:${embedRes.status}:${embedUrl.split('/').slice(-3).join('/')}`);

      if (embedRes.ok) {
        const html = await embedRes.text();
        const unescaped = unescapeInstagramHtml(html);

        if (!videoUrl) {
          const vids = extractAllVideoUrls(unescaped);
          if (vids.length > 0) {
            videoUrl = pickBestVideoUrl(vids);
            debugLog.push(`embed-video:${videoUrl ? 'found' : 'none'}`);
          }
        }

        if (!imageUrl) {
          imageUrl = extractFullResImageFromJson(unescaped) || extractPostImage(unescaped);
          if (!imageUrl) {
            const imgTag = unescaped.match(/<img[^>]+src=["'](https?:[^"']+(?:cdninstagram|fbcdn)[^"']+)["']/i);
            if (imgTag) imageUrl = sanitizeCdnUrl(imgTag[1]);
          }
        }

        if (authorName === 'instagram_creator') {
          const am = unescaped.match(/"username"\s*:\s*"([^"]{2,30})"/i)
            || unescaped.match(/@([A-Za-z0-9._]{2,30})/);
          if (am && am[1]) authorName = am[1].trim();
        }

        if (title.startsWith('Instagram Post (')) {
          const tm = unescaped.match(/"caption"\s*:\s*\{"text"\s*:\s*"([^"]{3,})"/i)
            || unescaped.match(/<title>([^<]{5,})<\/title>/i);
          if (tm && tm[1]) title = decodeUnicodeEscapes(tm[1].replace(/\n/g, ' ').substring(0, 220));
        }

        if (!avatarUrl) avatarUrl = extractAuthorAvatar(unescaped);

        if (!carouselItems.length) {
          const extracted = extractCarouselFromEmbed(unescaped);
          if (extracted.length > 1) {
            carouselItems = extracted.map((u, i) => ({
              id: i + 1, type: 'photo',
              url: `/api/proxy-media?url=${encodeURIComponent(u)}`
            }));
          }
        }
      }
    } catch (e) {
      debugLog.push(`embed-err:${e.message.substring(0, 60)}`);
    }
  }

  // STEP 2: oEmbed (author/title fallback)
  if (authorName === 'instagram_creator' || title.startsWith('Instagram Post (')) {
    try {
      const oembedRes = await fetch(
        `https://www.instagram.com/oembed/?url=${encodeURIComponent(targetPageUrl)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } }
      );
      debugLog.push(`oembed:${oembedRes.status}`);
      if (oembedRes.ok) {
        const od = await oembedRes.json();
        if (od && od.author_name && authorName === 'instagram_creator') authorName = od.author_name;
        if (od && od.title && title.startsWith('Instagram Post (')) title = decodeUnicodeEscapes(od.title);
      }
    } catch (e) {
      debugLog.push(`oembed-err:${e.message.substring(0, 40)}`);
    }
  }

  // STEP 3: /media/?size=l (photo redirect - posts only)
  if (isPost && !imageUrl) {
    try {
      const mediaRes = await fetch(`https://www.instagram.com/p/${shortcode}/media/?size=l`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Referer': 'https://www.instagram.com/',
        },
        redirect: 'follow'
      });
      debugLog.push(`media-size-l:${mediaRes.status}`);
      if (mediaRes.ok && mediaRes.headers.get('content-type') && mediaRes.headers.get('content-type').startsWith('image/')) {
        imageUrl = mediaRes.url;
      }
    } catch (e) {
      debugLog.push(`media-size-l-err:${e.message.substring(0, 40)}`);
    }
  }

  // STEP 4: Internal JSON API (?__a=1)
  if (!videoUrl && !carouselItems.length) {
    try {
      const jsonApiRes = await fetch(`${targetPageUrl}?__a=1&__d=dis`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://www.instagram.com/',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      debugLog.push(`__a=1:${jsonApiRes.status}`);
      if (jsonApiRes.ok && (jsonApiRes.headers.get('content-type') || '').includes('application/json')) {
        const jsonData = await jsonApiRes.json();
        const media = (jsonData && jsonData.items && jsonData.items[0]) || (jsonData && jsonData.graphql && jsonData.graphql.shortcode_media);
        if (media) {
          if (media.user && media.user.username && authorName === 'instagram_creator') authorName = media.user.username;
          const cap = (media.caption && media.caption.text) || (media.edge_media_to_caption && media.edge_media_to_caption.edges && media.edge_media_to_caption.edges[0] && media.edge_media_to_caption.edges[0].node && media.edge_media_to_caption.edges[0].node.text) || '';
          if (cap && title.startsWith('Instagram Post (')) title = cap.substring(0, 220);
          if (media.user && media.user.profile_pic_url && !avatarUrl) avatarUrl = media.user.profile_pic_url;

          const isSidecar = media.media_type === 8 || media.__typename === 'GraphSidecar' || media.carousel_media || media.edge_sidecar_to_children;
          if (isSidecar) {
            const slides = media.carousel_media || (media.edge_sidecar_to_children && media.edge_sidecar_to_children.edges && media.edge_sidecar_to_children.edges.map(function(e) { return e.node; })) || [];
            for (const slide of slides) {
              let itemUrl = null, itemType = 'photo';
              if (slide.video_versions && slide.video_versions.length > 0) { itemUrl = slide.video_versions[0].url; itemType = 'video'; }
              else if (slide.video_url) { itemUrl = slide.video_url; itemType = 'video'; }
              if (!itemUrl) {
                const cands = (slide.image_versions2 && slide.image_versions2.candidates) || [];
                if (cands.length > 0) { cands.sort(function(a, b) { return (b.width || 0) - (a.width || 0); }); itemUrl = cands[0].url; }
              }
              if (!itemUrl && slide.display_url) itemUrl = slide.display_url;
              if (itemUrl) {
                const clean = sanitizeCdnUrl(itemUrl);
                if (clean) carouselItems.push({ id: carouselItems.length + 1, type: itemType, url: `/api/proxy-media?url=${encodeURIComponent(clean)}` });
              }
            }
            debugLog.push(`__a=1-carousel:${carouselItems.length}`);
          } else {
            if (!imageUrl) {
              const cands = (media.image_versions2 && media.image_versions2.candidates) || [];
              if (cands.length > 0) { cands.sort(function(a, b) { return (b.width || 0) - (a.width || 0); }); imageUrl = sanitizeCdnUrl(cands[0].url); }
              else if (media.display_url) imageUrl = sanitizeCdnUrl(media.display_url);
            }
            if (!videoUrl && media.video_versions && media.video_versions.length > 0) videoUrl = sanitizeCdnUrl(media.video_versions[0].url);
            else if (!videoUrl && media.video_url) videoUrl = sanitizeCdnUrl(media.video_url);
            debugLog.push(`__a=1-media:v=${!!videoUrl},i=${!!imageUrl}`);
          }
        }
      }
    } catch (e) {
      debugLog.push(`__a=1-err:${e.message.substring(0, 40)}`);
    }
  }

  // STEP 5: Direct page scrape with multiple UAs as fallback
  if (!videoUrl || !imageUrl) {
    const scrapeUAs = [
      { ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', label: 'googlebot' },
      { ua: 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36', label: 'android' },
    ];
    for (const attempt of scrapeUAs) {
      if (videoUrl && imageUrl) break;
      try {
        const pageRes = await fetch(targetPageUrl, {
          headers: {
            'User-Agent': attempt.ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        });
        debugLog.push(`scrape-${attempt.label}:${pageRes.status}`);
        if (pageRes.ok) {
          const html = await pageRes.text();
          const unescaped = unescapeInstagramHtml(html);
          if (!videoUrl) {
            const vids = extractAllVideoUrls(unescaped);
            if (vids.length > 0) { videoUrl = pickBestVideoUrl(vids); debugLog.push(`scrape-${attempt.label}-video:found`); }
          }
          if (!imageUrl) imageUrl = extractFullResImageFromJson(unescaped) || extractPostImage(unescaped);
          if (!avatarUrl) avatarUrl = extractAuthorAvatar(unescaped);
          if (authorName === 'instagram_creator') {
            const am = unescaped.match(/"username"\s*:\s*"([^"]{2,30})"/i);
            if (am && am[1]) authorName = am[1].trim();
          }
          if (title.startsWith('Instagram Post (')) {
            const tm = unescaped.match(/"caption"\s*:\s*\{"text"\s*:\s*"([^"]{3,})"/i) || unescaped.match(/<title>([^<]{5,})<\/title>/i);
            if (tm && tm[1]) title = decodeUnicodeEscapes(tm[1].replace(/\n/g, ' ').substring(0, 220));
          }
          if (!carouselItems.length) {
            const extracted = extractCarouselFromEmbed(unescaped);
            if (extracted.length > 1) {
              carouselItems = extracted.map(function(u, i) { return { id: i + 1, type: 'photo', url: `/api/proxy-media?url=${encodeURIComponent(u)}` }; });
            }
          }
        }
      } catch (e) {
        debugLog.push(`scrape-${attempt.label}-err:${e.message.substring(0, 40)}`);
      }
    }
  }

  // STEP 6: Post embed - carousel extraction (posts only)
  if (isPost && carouselItems.length <= 1) {
    try {
      const postEmbedRes = await fetch(`https://www.instagram.com/p/${shortcode}/embed/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': 'https://www.instagram.com/'
        }
      });
      debugLog.push(`post-embed:${postEmbedRes.status}`);
      if (postEmbedRes.ok) {
        const postEmbedHtml = await postEmbedRes.text();
        const extracted = extractCarouselFromEmbed(postEmbedHtml);
        if (extracted.length > 1) {
          carouselItems = extracted.map(function(u, i) { return { id: i + 1, type: 'photo', url: `/api/proxy-media?url=${encodeURIComponent(u)}` }; });
          if (!imageUrl) imageUrl = extracted[0];
        } else if (extracted.length === 1 && !imageUrl) {
          imageUrl = extracted[0];
        }
        debugLog.push(`post-embed-carousel:${extracted.length}`);
      }
    } catch (e) {
      debugLog.push(`post-embed-err:${e.message.substring(0, 40)}`);
    }
  }

  console.log('[extractor] shortcode=' + shortcode + ' | debug: ' + debugLog.join(' | '));

  return {
    success: Boolean(videoUrl || imageUrl || (carouselItems && carouselItems.length > 0)),
    shortcode,
    videoUrl,
    imageUrl,
    avatarUrl,
    authorName,
    title: decodeUnicodeEscapes(title),
    carouselItems,
    debug: debugLog
  };
}
