import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function sanitizeCdnUrl(url) {
  if (!url) return null;
  // IMPORTANT: Instagram CDN URLs are HMAC-signed (oh= param covers all query params).
  // Never remove or modify any query parameters — it breaks the signature.
  // Only strip path-segment crops and HTML-unsafe characters.
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
  // Strip path-segment crops (e.g. /c0.0.1080.1080a/)
  cleaned = cleaned.replace(/\/c\d+\.\d+\.\d+\.\d+a\//gi, '/');
  return cleaned;
}

/**
 * Extract the best full-resolution image URL from Instagram's embedded JSON.
 * Instagram embeds page data as JSON blobs. display_url and image_versions2
 * candidates are full-res URLs with no crop params in the stp field.
 */
function extractFullResImageFromJson(html) {
  if (!html) return null;

  // Unescape unicode and slashes
  const text = html
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
    .replace(/\\\//g, '/');

  // 1. Try image_versions2.candidates — pick the largest (first) candidate
  const imgVersionsMatch = text.match(/"image_versions2"\s*:\s*\{[^}]*"candidates"\s*:\s*\[([^\]]+)\]/i);
  if (imgVersionsMatch) {
    const candidatesStr = imgVersionsMatch[1];
    // Extract all candidate URLs with their widths
    const candidates = [];
    const candidateRe = /\{[^}]*"width"\s*:\s*(\d+)[^}]*"url"\s*:\s*"([^"]+)"/gi;
    let m;
    while ((m = candidateRe.exec(candidatesStr)) !== null) {
      candidates.push({ width: parseInt(m[1]), url: m[2] });
    }
    if (candidates.length > 0) {
      // Sort descending by width and take the largest
      candidates.sort((a, b) => b.width - a.width);
      const best = sanitizeCdnUrl(candidates[0].url);
      if (best) return best;
    }
  }

  // 2. Try display_url (full-res single image URL in page JSON)
  const displayUrlMatch = text.match(/"display_url"\s*:\s*"([^"]+cdninstagram[^"]+)"/i)
    || text.match(/"display_url"\s*:\s*"([^"]+fbcdn[^"]+)"/i);
  if (displayUrlMatch && displayUrlMatch[1]) {
    return sanitizeCdnUrl(displayUrlMatch[1]);
  }

  return null;
}

function decodeUnicodeEscapes(str) {
  if (!str) return '';
  try {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
  } catch (e) {
    return str;
  }
}

function extractPostImage(html) {
  if (!html) return null;

  // 1. og:image with content before or after property attribute
  const ogContentFirst = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogContentFirst && ogContentFirst[1]) return sanitizeCdnUrl(ogContentFirst[1]);

  const ogPropertyFirst = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogPropertyFirst && ogPropertyFirst[1]) return sanitizeCdnUrl(ogPropertyFirst[1]);

  // 2. twitter:image
  const twContentFirst = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (twContentFirst && twContentFirst[1]) return sanitizeCdnUrl(twContentFirst[1]);

  const twNameFirst = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (twNameFirst && twNameFirst[1]) return sanitizeCdnUrl(twNameFirst[1]);

  // 3. JSON display_url / display_src
  const displayUrlMatch = html.match(/"display_url"\s*:\s*"([^"]+)"/i) || html.match(/"display_src"\s*:\s*"([^"]+)"/i);
  if (displayUrlMatch && displayUrlMatch[1]) return sanitizeCdnUrl(displayUrlMatch[1]);

  // 4. Fallback: find CDN jpg matches but EXCLUDE avatar / profile pic thumbnails
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

function extractAuthorAvatar(html) {
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



/**
 * Extract carousel slide URLs from Instagram's embed page HTML.
 * The embed page stores JSON in a JS string literal with triple-escaped backslashes.
 * Uses indexOf to avoid regex escape complexity.
 */
function extractCarouselFromEmbed(html) {
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

    // Dedupe by filename (path before ?) — same image may appear many times in the HTML
    const fileKey = rawUrl.split('?')[0].split('/').pop();
    if (fileKey && !urls.some(u => u.split('?')[0].split('/').pop() === fileKey)) {
      const clean = sanitizeCdnUrl(rawUrl);
      if (clean) urls.push(clean);
    }

    searchFrom = urlEnd + 1; // advance past the full extracted URL
    if (urls.length >= 20) break;
  }

  return urls;
}

function instagramApiPlugin() {
  return {
    name: 'instagram-api-plugin',
    configureServer(server) {
      // 1. Direct Instagram Reel / Post Metadata & Full-Res URL Extractor
      server.middlewares.use('/api/extract', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { url } = JSON.parse(body || '{}');
            if (!url) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'URL is required' }));
              return;
            }

            const match = url.match(/(?:p|reel|reels|tv|stories)\/([A-Za-z0-9_-]+)/i);
            const shortcode = match ? match[1] : null;

            if (!shortcode) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid Instagram shortcode' }));
              return;
            }

            let videoUrl = null;
            let imageUrl = null;
            let avatarUrl = null;
            let authorName = 'instagram_creator';
            let title = `Instagram Post (${shortcode})`;
            let carouselItems = []; // Array of {id, type, url} for carousels

            const isPost = url.includes('/p/');
            const targetPageUrl = isPost
              ? `https://www.instagram.com/p/${shortcode}/`
              : `https://www.instagram.com/reel/${shortcode}/`;

            // Step A: Try official Instagram oEmbed API for author name & title ONLY.
            // NOTE: oEmbed thumbnail_url is always a square-cropped thumbnail — intentionally
            // NOT used for imageUrl. Full-res og:image is extracted in Step B instead.
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

            // Step B: Try Instagram's /media/?size=l redirect for full-resolution photo.
            // This legacy endpoint still works for public posts and returns the full uncropped image.
            // Only attempt for photo posts (not reels which use video).
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
                  // The redirect resolved to the actual CDN image URL — use the final URL directly.
                  imageUrl = mediaRes.url || mediaRedirectUrl;
                }
              } catch (e) {
                console.warn('media/?size=l fetch error:', e.message);
              }
            }

            // Step B.5: Instagram internal JSON API (?__a=1) — best source for carousel data
            // Returns structured JSON with full post data including all sidecar children
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
                      console.log('?__a=1 API success. media_type:', media.media_type, '__typename:', media.__typename);

                      // Author
                      if (media.user?.username) authorName = media.user.username;
                      // Title/caption
                      const cap = media.caption?.text || media.edge_media_to_caption?.edges?.[0]?.node?.text || '';
                      if (cap) title = cap.substring(0, 150);
                      // Avatar
                      if (media.user?.profile_pic_url) avatarUrl = media.user.profile_pic_url;

                      // Carousel: media_type 8 OR __typename GraphSidecar OR edge_sidecar_to_children
                      const isSidecar = media.media_type === 8
                        || media.__typename === 'GraphSidecar'
                        || media.carousel_media
                        || media.edge_sidecar_to_children;

                      if (isSidecar) {
                        // New API format: carousel_media array
                        const slides = media.carousel_media || media.edge_sidecar_to_children?.edges?.map(e => e.node) || [];
                        for (const slide of slides) {
                          let itemUrl = null;
                          let itemType = 'photo';
                          // Video slide
                          if (slide.video_versions?.length > 0) {
                            itemUrl = slide.video_versions[0].url;
                            itemType = 'video';
                          } else if (slide.video_url) {
                            itemUrl = slide.video_url;
                            itemType = 'video';
                          }
                          // Photo slide
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
                        console.log(`?__a=1: extracted ${carouselItems.length} carousel slides`);
                      } else {
                        // Single post — extract image/video
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


            // Step C: Direct HTML Page Scrape for video stream & fallbacks
            try {
              const pageRes = await fetch(targetPageUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Cache-Control': 'max-age=0',
                  'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                  'Sec-Ch-Ua-Mobile': '?0',
                  'Sec-Ch-Ua-Platform': '"Windows"',
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

                // --- Video URL Extraction (multiple strategies for Reels) ---

                // Strategy 1: JSON key video_url (most common for reels in embedded JSON)
                const videoUrlJsonMatch = unescaped.match(/"video_url"\s*:\s*"(https?:[^"]+)"/i);
                if (videoUrlJsonMatch && videoUrlJsonMatch[1]) {
                  videoUrl = sanitizeCdnUrl(videoUrlJsonMatch[1]);
                }

                // Strategy 2: video_versions array — pick first (highest quality) entry
                if (!videoUrl) {
                  const vvMatch = unescaped.match(/"video_versions"\s*:\s*\[\s*\{[^}]*"url"\s*:\s*"(https?:[^"]+)"/i);
                  if (vvMatch && vvMatch[1]) videoUrl = sanitizeCdnUrl(vvMatch[1]);
                }

                // Strategy 3: playback_url (used in some reel JSON blobs)
                if (!videoUrl) {
                  const pbMatch = unescaped.match(/"playback_url"\s*:\s*"(https?:[^"]+)"/i);
                  if (pbMatch && pbMatch[1]) videoUrl = sanitizeCdnUrl(pbMatch[1]);
                }

                // Strategy 4: Bare .mp4 URL scan (legacy posts / some reels)
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

                // Try full-res JSON extraction first (display_url / image_versions2) —
                // these are properly signed full-resolution URLs with no crop params.
                // Fall back to og:image only if JSON extraction fails.
                const jsonFullRes = extractFullResImageFromJson(unescaped);
                if (jsonFullRes) {
                  imageUrl = jsonFullRes;
                } else if (!imageUrl) {
                  imageUrl = extractPostImage(unescaped);
                }

                avatarUrl = extractAuthorAvatar(unescaped);

                // Carousel: HTML scrape fallback — collect all distinct CDN image URLs
                // Strategy: find sidecar section then scan all display_url / image_versions2 within it
                if (!carouselItems.length) {
                  // Find the sidecar section start position
                  const sidecarStart = unescaped.indexOf('"edge_sidecar_to_children"');
                  const searchIn = sidecarStart !== -1
                    ? unescaped.substring(sidecarStart, sidecarStart + 200000)
                    : unescaped;

                  // Collect all display_url values within that section
                  const allDisplayUrls = [];
                  const duRe = /"display_url"\s*:\s*"(https?:[^"]+(?:cdninstagram|fbcdn)[^"]+)"/gi;
                  let dm;
                  while ((dm = duRe.exec(searchIn)) !== null) {
                    const clean = sanitizeCdnUrl(dm[1]);
                    // Skip tiny avatars (profile pics)
                    if (clean && !allDisplayUrls.includes(clean)
                        && !clean.includes('150x150') && !clean.includes('profile_pic')) {
                      allDisplayUrls.push(clean);
                    }
                  }

                  // Also collect image_versions2 candidate URLs
                  const iv2Re = /"width"\s*:\s*(\d+)[^}]*"url"\s*:\s*"(https?:[^"]+(?:cdninstagram|fbcdn)[^"]+)"/gi;
                  const iv2Map = new Map(); // dedupe by URL
                  let iv2m;
                  while ((iv2m = iv2Re.exec(searchIn)) !== null) {
                    const w = parseInt(iv2m[1]);
                    const u = sanitizeCdnUrl(iv2m[2]);
                    if (u && w >= 640 && !u.includes('profile_pic')) {
                      iv2Map.set(u, w);
                    }
                  }
                  const iv2Urls = [...iv2Map.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);

                  const combined = [...new Set([...allDisplayUrls, ...iv2Urls])];

                  if (combined.length > 1) {
                    carouselItems = combined.map((u, i) => ({
                      id: i + 1, type: 'photo',
                      url: `/api/proxy-media?url=${encodeURIComponent(u)}`
                    }));
                    console.log(`Carousel HTML fallback: ${carouselItems.length} items`);
                  }
                }

                // Author username fallback
                if (authorName === 'instagram_creator') {
                  const authorMatch = unescaped.match(/"username"\s*:\s*"([^"]+)"/i) || unescaped.match(/@([A-Za-z0-9._]+)/);
                  if (authorMatch && authorMatch[1]) {
                    authorName = authorMatch[1].trim();
                  }
                }

                // Caption title fallback
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


            // Step D: Mobile embed fallback for reels — Instagram's /embed/v2/ endpoint
            // returns simpler HTML with video_url accessible without login.
            if (!isPost && !videoUrl) {
              try {
                const embedUrl = `https://www.instagram.com/reel/${shortcode}/embed/v2/`;
                const embedRes = await fetch(embedUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
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

                  // Also try to get poster from embed if not already found
                  if (!imageUrl) {
                    imageUrl = extractPostImage(unescapedEmbed) || extractFullResImageFromJson(unescapedEmbed);
                  }
                }
              } catch (e) {
                console.warn('Embed fallback error:', e);
              }
            }

            // Step E: Slide-by-slide media endpoint for carousels (most reliable public method)
            // /p/{shortcode}/media/?size=l returns slide 1 (or slide N with ?slide=N on some versions)
            // We probe slide indices 1..20 until we get a non-image or a 404 redirect
            if (isPost && carouselItems.length <= 1) {
              try {
                const slideUrls = [];
                // First probe: check if slide 2 exists (proves it's a carousel)
                for (let n = 1; n <= 20; n++) {
                  const slideEndpoint = n === 1
                    ? `https://www.instagram.com/p/${shortcode}/media/?size=l`
                    : `https://www.instagram.com/p/${shortcode}/media/?size=l&slide=${n}`;
                  const slideRes = await fetch(slideEndpoint, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                      'Referer': 'https://www.instagram.com/'
                    },
                    redirect: 'follow'
                  });
                  if (!slideRes.ok) break;
                  const ct = slideRes.headers.get('content-type') || '';
                  if (!ct.startsWith('image/')) break;
                  const finalUrl = slideRes.url;
                  // Dedupe by path before ? — CDN re-signs URLs so full URL always differs
                  const finalPath = finalUrl.split('?')[0];
                  if (finalPath && !slideUrls.some(u => u.split('?')[0] === finalPath)) {
                    slideUrls.push(finalUrl);
                  } else if (slideUrls.length > 0) {
                    // Same file path = no more unique slides
                    break;
                  }
                }
                if (slideUrls.length > 1) {
                  carouselItems = slideUrls.map((u, i) => ({
                    id: i + 1,
                    type: 'photo',
                    url: `/api/proxy-media?url=${encodeURIComponent(u)}`
                  }));
                  console.log(`Step E slide probe: ${carouselItems.length} carousel slides found`);
                } else if (slideUrls.length === 1 && !imageUrl) {
                  imageUrl = slideUrls[0];
                }
              } catch (e) {
                console.warn('Step E slide probe error:', e.message);
              }
            }

            // Step D2: Embed page carousel extraction for /p/ posts
            // Uses the public embed page which contains double-escaped JSON with
            // edge_sidecar_to_children data — most reliable public carousel method.
            if (isPost && carouselItems.length <= 1) {
              try {
                const postEmbedUrl = `https://www.instagram.com/p/${shortcode}/embed/`;
                const postEmbedRes = await fetch(postEmbedUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.instagram.com/'
                  }
                });
                if (postEmbedRes.ok) {
                  const postEmbedHtml = await postEmbedRes.text();
                  const extracted = extractCarouselFromEmbed(postEmbedHtml);
                  console.log(`Step D2 embed carousel: ${extracted.length} URLs found`);
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

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              shortcode,
              videoUrl,
              imageUrl,
              avatarUrl,
              authorName,
              title: decodeUnicodeEscapes(title),
              carouselItems
            }));

          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      });

      // 2. High-Speed Binary Stream Pipe with Range & HTML5 Seekbar support
      server.middlewares.use('/api/proxy-media', async (req, res) => {
        try {
          const urlParams = new URL(req.url, 'http://localhost');
          const targetUrl = urlParams.searchParams.get('url');

          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url query parameter');
            return;
          }

          const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Referer': 'https://www.instagram.com/',
            'Sec-Fetch-Dest': 'video',
            'Sec-Fetch-Mode': 'cors'
          };

          if (req.headers.range) {
            headers['Range'] = req.headers.range;
          }

          const response = await fetch(targetUrl, { headers });

          if (!response.ok && response.status !== 206) {
            res.statusCode = response.status;
            res.end(`Media CDN returned status ${response.status}`);
            return;
          }

          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const contentLength = response.headers.get('content-length');
          const contentRange = response.headers.get('content-range');

          res.statusCode = response.status;
          res.setHeader('Content-Type', contentType);
          if (contentLength) res.setHeader('Content-Length', contentLength);
          if (contentRange) res.setHeader('Content-Range', contentRange);
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Access-Control-Allow-Origin', '*');

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          res.end(buffer);
        } catch (error) {
          res.statusCode = 500;
          res.end(error.message);
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), instagramApiPlugin()],
  server: {
    port: 3000,
    open: false
  }
})
