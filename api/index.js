// Vercel Serverless entry point - delegates to built NestJS app
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { AppModule } = require('../apps/api/dist/app.module');

let app;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
    app.enableCors({ origin: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    // No global prefix - Vercel rewrites /api/* to this function
    // NestJS controllers already have their own route paths
    await app.init();
  }
  return app;
}

module.exports = async function handler(req, res) {
  const nestApp = await bootstrap();
  const instance = nestApp.getHttpAdapter().getInstance();

  // Strip /api prefix so NestJS routes match correctly
  // e.g. /api/auth/login -> /auth/login
  if (req.url && req.url.startsWith('/api')) {
    req.url = req.url.replace(/^\/api/, '') || '/';
  }

  return new Promise((resolve) => {
    instance(req, res, () => {
      // If NestJS didn't handle it, return 404
      if (!res.headersSent) {
        res.statusCode = 404;
        res.end(JSON.stringify({ statusCode: 404, message: 'Not Found' }));
      }
      resolve();
    });
  });
};
