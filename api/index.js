// Vercel Serverless entry point - delegates to built NestJS app
let app;
let bootstrapError;

async function bootstrap() {
  if (bootstrapError) throw bootstrapError;
  if (app) return app;

  try {
    const { NestFactory } = require('@nestjs/core');
    const { ValidationPipe } = require('@nestjs/common');
    const { AppModule } = require('../apps/api/dist/app.module');

    app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
    app.enableCors({ origin: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    return app;
  } catch (err) {
    bootstrapError = err;
    throw err;
  }
}

module.exports = async function handler(req, res) {
  try {
    const nestApp = await bootstrap();
    const instance = nestApp.getHttpAdapter().getInstance();

    // Recover original path from x-invoke-path header (set by Vercel rewrite)
    const originalPath = req.headers['x-invoke-path'] || req.url;

    // Strip /api prefix so NestJS routes match
    if (originalPath.startsWith('/api')) {
      req.url = originalPath.replace(/^\/api/, '') || '/';
    }

    return new Promise((resolve) => {
      instance(req, res, () => {
        if (!res.headersSent) {
          res.statusCode = 404;
          res.end(JSON.stringify({ statusCode: 404, message: 'Not Found' }));
        }
        resolve();
      });
    });
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({
      error: 'Bootstrap failed',
      message: err.message,
      stack: err.stack
    }));
  }
};
