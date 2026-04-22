import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma';
import { authMiddleware, rolesGuard, JwtUser, generateApiToken } from '../middleware/auth';

const apiTokens = new Hono();

// All routes require JWT login (ADMIN / PM only). API tokens cannot manage other API tokens.
apiTokens.use('*', authMiddleware);
apiTokens.use('*', rolesGuard('ADMIN', 'PM'));

// List tokens — never returns hash or full token, only prefix for identification
apiTokens.get('/', async (c) => {
  const list = await prisma.apiToken.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      projectId: true,
      scope: true,
      createdAt: true,
      expiresAt: true,
      lastUsedAt: true,
      createdBy: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });
  return c.json(list);
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  projectId: z.string().uuid().nullable().optional(), // null / undefined = all projects
  scope: z.enum(['read', 'write']).optional().default('read'),
  expiresInDays: z.number().int().positive().max(3650).optional(), // null = never expire
});

apiTokens.post('/', zValidator('json', createSchema), async (c) => {
  const user = c.get('user') as JwtUser;
  const { name, projectId, scope, expiresInDays } = c.req.valid('json');

  const { token, prefix, hash } = generateApiToken();
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const saved = await prisma.apiToken.create({
    data: {
      name,
      tokenHash: hash,
      tokenPrefix: prefix,
      projectId: projectId ?? null,
      scope: scope ?? 'read',
      createdById: user.id,
      expiresAt,
    },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      projectId: true,
      scope: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  // Return the full token ONCE. User must copy it now.
  return c.json({ ...saved, token }, 201);
});

apiTokens.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await prisma.apiToken.findUnique({ where: { id } });
  if (!existing) return c.json({ message: 'Token not found' }, 404);
  await prisma.apiToken.delete({ where: { id } });
  return c.json({ success: true });
});

export { apiTokens };
