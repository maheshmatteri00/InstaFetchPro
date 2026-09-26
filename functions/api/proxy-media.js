export async function onRequestGet({ request }) {
  const url = new URL(request.url);
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
