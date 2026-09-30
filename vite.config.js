import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { extractInstagramMedia } from './src/services/extractorCore.js';

function instagramApiPlugin() {
  return {
    name: 'instagram-api-plugin',
    configureServer(server) {
      // 1. Direct Instagram Metadata Extraction Endpoint
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

            const data = await extractInstagramMedia(url);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(data));
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

          // Determine if this is a video or image request so we send correct Sec-Fetch-Dest.
          // Instagram CDN rejects profile pic / thumbnail requests that claim to be video fetches.
          const isVideoUrl = /\.mp4/i.test(targetUrl) || targetUrl.includes('video');
          const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept': isVideoUrl ? 'video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8' : 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            'Referer': 'https://www.instagram.com/',
            'Sec-Fetch-Dest': isVideoUrl ? 'video' : 'image',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site'
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

export default defineConfig({
  plugins: [react(), instagramApiPlugin()],
  server: {
    port: 3000,
    open: false
  }
});
