import { serve } from '@hono/node-server';
import app from './app';

const port = parseInt(process.env.PORT || '3000');

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 API running at http://localhost:${info.port}`);
});
