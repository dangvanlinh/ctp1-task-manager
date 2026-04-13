import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './routes/auth';
import { users } from './routes/users';
import { projects } from './routes/projects';
import { tasks } from './routes/tasks';
import { builds } from './routes/builds';
import { notifications } from './routes/notifications';

const app = new Hono();

// CORS
app.use('*', cors({ origin: '*' }));

// Routes
app.route('/auth', auth);
app.route('/users', users);
app.route('/projects', projects);
app.route('/tasks', tasks);
app.route('/builds', builds);
app.route('/notifications', notifications);

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// 404 fallback
app.notFound((c) => c.json({ statusCode: 404, message: 'Not Found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  const status = 'status' in err ? (err as any).status : 500;
  return c.json({ statusCode: status, message: err.message || 'Internal Server Error' }, status);
});

export default app;
