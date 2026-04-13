import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import app from './app';

const wrapper = new Hono();
wrapper.route('/api', app);

export default handle(wrapper);
