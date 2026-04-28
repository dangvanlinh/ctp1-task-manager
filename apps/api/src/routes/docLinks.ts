import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma';
import { authMiddleware, rolesGuard, allowApiToken } from '../middleware/auth';

const docLinks = new Hono();

docLinks.use('*', authMiddleware);

docLinks.get('/', allowApiToken({ projectIdFrom: 'query', key: 'projectId' }), async (c) => {
  const { projectId } = c.req.query();
  if (!projectId) return c.json({ message: 'projectId required' }, 400);
  const list = await prisma.docLink.findMany({
    where: { projectId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return c.json(list);
});

const createSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  url: z.string().min(1),
  addedBy: z.string().optional(),
  order: z.number().int().optional(),
});

docLinks.post('/', rolesGuard('ADMIN', 'PM', 'MEMBER'), zValidator('json', createSchema), async (c) => {
  const data = c.req.valid('json');
  const item = await prisma.docLink.create({
    data: { ...data, addedBy: data.addedBy ?? 'Ẩn danh' },
  });
  return c.json(item, 201);
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
  addedBy: z.string().optional(),
  order: z.number().int().optional(),
});

docLinks.patch('/:id', rolesGuard('ADMIN', 'PM', 'MEMBER'), zValidator('json', updateSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const updated = await prisma.docLink.update({ where: { id }, data });
  return c.json(updated);
});

docLinks.delete('/:id', rolesGuard('ADMIN', 'PM', 'MEMBER'), async (c) => {
  const id = c.req.param('id');
  await prisma.docLink.delete({ where: { id } });
  return c.json({ success: true });
});

// Bulk import (for one-time localStorage migration)
const bulkSchema = z.object({
  projectId: z.string().uuid(),
  items: z.array(z.object({
    title: z.string().min(1),
    url: z.string().min(1),
    addedBy: z.string().optional(),
    order: z.number().int().optional(),
  })),
});

docLinks.post('/bulk', rolesGuard('ADMIN', 'PM', 'MEMBER'), zValidator('json', bulkSchema), async (c) => {
  const { projectId, items } = c.req.valid('json');
  const created = await prisma.$transaction(
    items.map((item, idx) =>
      prisma.docLink.create({
        data: {
          projectId,
          title: item.title,
          url: item.url,
          addedBy: item.addedBy ?? 'Ẩn danh',
          order: item.order ?? idx,
        },
      }),
    ),
  );
  return c.json({ count: created.length });
});

export { docLinks };
