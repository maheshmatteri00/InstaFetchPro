import { extractInstagramMedia } from './services/extractorCore.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API: Extract Instagram Media Metadata
    if (url.pathname === '/api/extract') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }

      try {
        const { url: igUrl } = await request.json();
        if (!igUrl) {
          return new Response(JSON.stringify({ error: 'URL is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const data = await extractInstagramMedia(igUrl);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // API: Media Proxy Stream with Range Support
    if (url.pathname === '/api/proxy-media') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response('Missing url query parameter', { status: 400 });
      }

      try {
        const headers = new Headers();
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');
        headers.set('Referer', 'https://www.instagram.com/');
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

    // Serve static assets from Cloudflare assets binding
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
