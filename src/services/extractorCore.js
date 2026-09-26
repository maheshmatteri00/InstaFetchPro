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
  return cleaned;
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

/**
 * Main extraction function that works in Workers, Node, and Pages Functions
 */
export async function extractInstagramMedia(url) {
  if (!url) throw new Error('URL is required');

  const match = url.match(/(?:p|reel|reels|tv|stories)\/([A-Za-z0-9_-]+)/i);
  const shortcode = match ? match[1] : null;

  if (!shortcode) {
    throw new Error('Invalid Instagram shortcode');
  }

  let videoUrl = null;
  let imageUrl = null;
  let avatarUrl = null;
  let authorName = 'instagram_creator';
  let title = `Instagram Post (${shortcode})`;
  let carouselItems = [];

  const isPost = url.includes('/p/');
  const targetPageUrl = isPost
    ? `https://www.instagram.com/p/${shortcode}/`
    : `https://www.instagram.com/reel/${shortcode}/`;

  // Step A: oEmbed API
  try {
    const oembedUrl = `https://www.instagram.com/oembed/?url=${encodeURIComponent(targetPageUrl)}`;
    const oembedRes = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      if (oembedData && oembedData.author_name) {
        authorName = oembedData.author_name;
      }
      if (oembedData && oembedData.title) {
        title = decodeUnicodeEscapes(oembedData.title);
      }
    }
  } catch (e) {
    console.warn('oEmbed fetch fallback:', e);
  }

  // Step B: /media/?size=l redirect for photos
  if (isPost) {
    try {
      const mediaRedirectUrl = `https://www.instagram.com/p/${shortcode}/media/?size=l`;
      const mediaRes = await fetch(mediaRedirectUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Referer': 'https://www.instagram.com/',
        },
        redirect: 'follow'
      });
      if (mediaRes.ok && mediaRes.headers.get('content-type')?.startsWith('image/')) {
        imageUrl = mediaRes.url || mediaRedirectUrl;
      }
    } catch (e) {
      console.warn('media/?size=l fetch error:', e.message);
    }
  }

  // Step B.5: Instagram internal JSON API (?__a=1)
  if (isPost && !carouselItems.length) {
    try {
      const jsonApiUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`;
      const jsonApiRes = await fetch(jsonApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://www.instagram.com/',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      if (jsonApiRes.ok) {
        const ct = jsonApiRes.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const jsonData = await jsonApiRes.json();
          const media = jsonData?.items?.[0] || jsonData?.graphql?.shortcode_media;
          if (media) {
            if (media.user?.username) authorName = media.user.username;
            const cap = media.caption?.text || media.edge_media_to_caption?.edges?.[0]?.node?.text || '';
            if (cap) title = cap.substring(0, 150);
            if (media.user?.profile_pic_url) avatarUrl = media.user.profile_pic_url;

            const isSidecar = media.media_type === 8
              || media.__typename === 'GraphSidecar'
              || media.carousel_media
              || media.edge_sidecar_to_children;

            if (isSidecar) {
              const slides = media.carousel_media || media.edge_sidecar_to_children?.edges?.map(e => e.node) || [];
              for (const slide of slides) {
                let itemUrl = null;
                let itemType = 'photo';
                if (slide.video_versions?.length > 0) {
                  itemUrl = slide.video_versions[0].url;
                  itemType = 'video';
                } else if (slide.video_url) {
                  itemUrl = slide.video_url;
                  itemType = 'video';
                }
                if (!itemUrl) {
                  const candidates = slide.image_versions2?.candidates || [];
                  if (candidates.length > 0) {
                    candidates.sort((a, b) => (b.width || 0) - (a.width || 0));
                    itemUrl = candidates[0].url;
                  }
                }
                if (!itemUrl && slide.display_url) itemUrl = slide.display_url;
                if (itemUrl) {
                  const clean = sanitizeCdnUrl(itemUrl);
                  if (clean) {
                    carouselItems.push({
                      id: carouselItems.length + 1,
                      type: itemType,
                      url: `/api/proxy-media?url=${encodeURIComponent(clean)}`
                    });
                  }
                }
              }
            } else {
              if (!imageUrl) {
                const candidates = media.image_versions2?.candidates || [];
                if (candidates.length > 0) {
                  candidates.sort((a, b) => (b.width || 0) - (a.width || 0));
                  imageUrl = sanitizeCdnUrl(candidates[0].url);
                } else if (media.display_url) {
                  imageUrl = sanitizeCdnUrl(media.display_url);
                }
              }
              if (!videoUrl && media.video_versions?.length > 0) {
                videoUrl = sanitizeCdnUrl(media.video_versions[0].url);
              } else if (!videoUrl && media.video_url) {
                videoUrl = sanitizeCdnUrl(media.video_url);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('?__a=1 API error:', e.message);
    }
  }

  // Step C: Direct HTML scrape
  try {
    const pageRes = await fetch(targetPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const unescaped = html
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
        .replace(/\\\//g, '/')
        .replace(/\\u0026/g, '&')
        .replace(/&amp;/g, '&');

      // Video URL extraction
      const videoUrlJsonMatch = unescaped.match(/"video_url"\s*:\s*"(https?:[^"]+)"/i);
      if (videoUrlJsonMatch && videoUrlJsonMatch[1]) {
        videoUrl = sanitizeCdnUrl(videoUrlJsonMatch[1]);
      }

      if (!videoUrl) {
        const vvMatch = unescaped.match(/"video_versions"\s*:\s*\[\s*\{[^}]*"url"\s*:\s*"(https?:[^"]+)"/i);
        if (vvMatch && vvMatch[1]) videoUrl = sanitizeCdnUrl(vvMatch[1]);
      }

      if (!videoUrl) {
        const pbMatch = unescaped.match(/"playback_url"\s*:\s*"(https?:[^"]+)"/i);
        if (pbMatch && pbMatch[1]) videoUrl = sanitizeCdnUrl(pbMatch[1]);
      }

      if (!videoUrl) {
        const mp4Matches = unescaped.match(/(https?:[^\s"'<]+?\.mp4[^\s"'<]*)/gi) || [];
        if (mp4Matches.length > 0) {
          let candidate = mp4Matches[0];
          for (const m of mp4Matches) {
            if (m.includes('fbcdn') || m.includes('cdninstagram')) {
              candidate = m;
              break;
            }
          }
          videoUrl = sanitizeCdnUrl(candidate);
        }
      }

      const jsonFullRes = extractFullResImageFromJson(unescaped);
      if (jsonFullRes) {
        imageUrl = jsonFullRes;
      } else if (!imageUrl) {
        imageUrl = extractPostImage(unescaped);
      }

      avatarUrl = extractAuthorAvatar(unescaped);

      // Carousel HTML fallback
      if (!carouselItems.length) {
        const sidecarStart = unescaped.indexOf('"edge_sidecar_to_children"');
        const searchIn = sidecarStart !== -1
          ? unescaped.substring(sidecarStart, sidecarStart + 200000)
          : unescaped;

        const allDisplayUrls = [];
        const duRe = /"display_url"\s*:\s*"(https?:[^"]+(?:cdninstagram|fbcdn)[^"]+)"/gi;
        let dm;
        while ((dm = duRe.exec(searchIn)) !== null) {
          const clean = sanitizeCdnUrl(dm[1]);
          if (clean && !allDisplayUrls.includes(clean) && !clean.includes('150x150') && !clean.includes('profile_pic')) {
            allDisplayUrls.push(clean);
          }
        }

        if (allDisplayUrls.length > 1) {
          carouselItems = allDisplayUrls.map((u, i) => ({
            id: i + 1, type: 'photo',
            url: `/api/proxy-media?url=${encodeURIComponent(u)}`
          }));
        }
      }

      if (authorName === 'instagram_creator') {
        const authorMatch = unescaped.match(/"username"\s*:\s*"([^"]+)"/i) || unescaped.match(/@([A-Za-z0-9._]+)/);
        if (authorMatch && authorMatch[1]) authorName = authorMatch[1].trim();
      }

      if (title.startsWith('Instagram Post (')) {
        const captionMatch = unescaped.match(/"caption"\s*:\s*\{"text"\s*:\s*"([^"]+)"/i) || unescaped.match(/<title>([^<]+)<\/title>/i);
        if (captionMatch && captionMatch[1]) {
          title = decodeUnicodeEscapes(captionMatch[1].replace(/\\n/g, ' ').substring(0, 150));
        }
      }
    }
  } catch (e) {
    console.warn('Page scrape error:', e);
  }

  // Step D: Mobile embed fallback for reels
  if (!isPost && !videoUrl) {
    try {
      const embedUrl = `https://www.instagram.com/reel/${shortcode}/embed/v2/`;
      const embedRes = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': 'https://www.instagram.com/'
        }
      });
      if (embedRes.ok) {
        const embedHtml = await embedRes.text();
        const unescapedEmbed = embedHtml
          .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
          .replace(/\\\//g, '/')
          .replace(/\\u0026/g, '&')
          .replace(/&amp;/g, '&');

        const ev1 = unescapedEmbed.match(/"video_url"\s*:\s*"(https?:[^"]+)"/i);
        if (ev1 && ev1[1]) videoUrl = sanitizeCdnUrl(ev1[1]);

        if (!videoUrl) {
          const ev2 = unescapedEmbed.match(/"video_versions"\s*:\s*\[\s*\{[^}]*"url"\s*:\s*"(https?:[^"]+)"/i);
          if (ev2 && ev2[1]) videoUrl = sanitizeCdnUrl(ev2[1]);
        }

        if (!videoUrl) {
          const ev3 = unescapedEmbed.match(/(https?:[^\s"'<]+?\.mp4[^\s"'<]*)/gi) || [];
          if (ev3.length > 0) videoUrl = sanitizeCdnUrl(ev3[0]);
        }

        if (!imageUrl) {
          imageUrl = extractPostImage(unescapedEmbed) || extractFullResImageFromJson(unescapedEmbed);
        }
      }
    } catch (e) {
      console.warn('Embed fallback error:', e);
    }
  }

  // Step D2: Embed page carousel extraction
  if (isPost && carouselItems.length <= 1) {
    try {
      const postEmbedUrl = `https://www.instagram.com/p/${shortcode}/embed/`;
      const postEmbedRes = await fetch(postEmbedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': 'https://www.instagram.com/'
        }
      });
      if (postEmbedRes.ok) {
        const postEmbedHtml = await postEmbedRes.text();
        const extracted = extractCarouselFromEmbed(postEmbedHtml);
        if (extracted.length > 1) {
          carouselItems = extracted.map((u, i) => ({
            id: i + 1,
            type: 'photo',
            url: `/api/proxy-media?url=${encodeURIComponent(u)}`
          }));
          if (!imageUrl) imageUrl = extracted[0];
        } else if (extracted.length === 1 && !imageUrl) {
          imageUrl = extracted[0];
        }
      }
    } catch (e) {
      console.warn('Step D2 embed carousel error:', e.message);
    }
  }

  return {
    success: Boolean(videoUrl || imageUrl || (carouselItems && carouselItems.length > 0)),
    shortcode,
    videoUrl,
    imageUrl,
    avatarUrl,
    authorName,
    title: decodeUnicodeEscapes(title),
    carouselItems
  };
}
