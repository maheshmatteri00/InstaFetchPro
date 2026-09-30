export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url query parameter', { status: 400 });
  }

  try {
    const isVideoUrl = /\.mp4/i.test(targetUrl) || targetUrl.includes('video');
    const headers = new Headers();
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');
    headers.set('Accept', isVideoUrl ? 'video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8' : 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8');
    headers.set('Referer', 'https://www.instagram.com/');
    headers.set('Sec-Fetch-Dest', isVideoUrl ? 'video' : 'image');
    headers.set('Sec-Fetch-Mode', 'cors');
    headers.set('Sec-Fetch-Site', 'cross-site');
    const range = request.headers.get('Range');
    if (range) headers.set('Range', range);

    const res = await fetch(targetUrl, { headers });
    const responseHeaders = new Headers(res.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Accept-Ranges', 'bytes');

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
