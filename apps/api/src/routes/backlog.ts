import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma';
import { authMiddleware, rolesGuard, allowApiToken } from '../middleware/auth';

const backlog = new Hono();

backlog.use('*', authMiddleware);

backlog.get('/', allowApiToken({ projectIdFrom: 'query', key: 'projectId' }), async (c) => {
  const { projectId } = c.req.query();
  if (!projectId) return c.json({ message: 'projectId required' }, 400);
  const list = await prisma.backlogItem.findMany({
    where: { projectId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return c.json(list);
});

const createSchema = z.object({
  projectId: z.string().uuid(),
  text: z.string().min(1),
  done: z.boolean().optional(),
  order: z.number().int().optional(),
});

backlog.post('/', rolesGuard('ADMIN', 'PM', 'MEMBER'), zValidator('json', createSchema), async (c) => {
  const data = c.req.valid('json');
  const item = await prisma.backlogItem.create({ data });
  return c.json(item, 201);
});

const updateSchema = z.object({
  text: z.string().min(1).optional(),
  done: z.boolean().optional(),
  order: z.number().int().optional(),
});

backlog.patch('/:id', rolesGuard('ADMIN', 'PM', 'MEMBER'), zValidator('json', updateSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const updated = await prisma.backlogItem.update({ where: { id }, data });
  return c.json(updated);
});

backlog.delete('/:id', rolesGuard('ADMIN', 'PM', 'MEMBER'), async (c) => {
  const id = c.req.param('id');
  await prisma.backlogItem.delete({ where: { id } });
  return c.json({ success: true });
});

// Bulk import (for one-time localStorage migration)
const bulkSchema = z.object({
  projectId: z.string().uuid(),
  items: z.array(z.object({
    text: z.string().min(1),
    done: z.boolean().optional(),
    order: z.number().int().optional(),
  })),
});

backlog.post('/bulk', rolesGuard('ADMIN', 'PM', 'MEMBER'), zValidator('json', bulkSchema), async (c) => {
  const { projectId, items } = c.req.valid('json');
  const created = await prisma.$transaction(
    items.map((item, idx) =>
      prisma.backlogItem.create({
        data: { projectId, text: item.text, done: item.done ?? false, order: item.order ?? idx },
      }),
    ),
  );
  return c.json({ count: created.length });
});

export { backlog };
