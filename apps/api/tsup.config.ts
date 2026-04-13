import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    app: 'src/app.ts',
    index: 'src/index.ts',
  },
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: false,
  // Externalize Prisma (has native binaries)
  external: ['@prisma/client'],
  noExternal: ['hono', 'zod', '@hono/zod-validator', 'bcryptjs', 'jsonwebtoken'],
});
