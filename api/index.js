const { Hono } = require('hono');
const { handle } = require('hono/vercel');
const app = require('../apps/api/dist/app').default;

// Wrap with base path /api for Vercel routing
const wrapper = new Hono();
wrapper.route('/api', app);

module.exports = handle(wrapper);
