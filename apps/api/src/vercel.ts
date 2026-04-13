import app from './app';

// Vercel serverless handler using raw Node req/res
export default async function handler(req: any, res: any) {
  try {
    // Recover original URL path (Vercel rewrite strips it)
    const originalUrl = req.headers['x-invoke-path'] || req.url || '/';

    // Strip /api prefix for Hono routing
    const path = originalUrl.startsWith('/api')
      ? originalUrl.replace(/^\/api/, '') || '/'
      : originalUrl;

    // Build Request object for Hono
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'localhost';
    const url = `${protocol}://${host}${path}`;

    // Read body for non-GET requests
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', (chunk: any) => { data += chunk; });
        req.on('end', () => resolve(data));
      });
    }

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value);
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body: body || undefined,
    });

    const response = await app.fetch(request);

    // Write response
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = await response.text();
    res.end(responseBody);
  } catch (err: any) {
    console.error('Handler error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ statusCode: 500, message: 'Internal Server Error' }));
  }
}
