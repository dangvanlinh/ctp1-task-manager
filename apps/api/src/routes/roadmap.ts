import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma';
import { authMiddleware, rolesGuard, allowApiToken } from '../middleware/auth';

const roadmap = new Hono();

roadmap.use('*', authMiddleware);

roadmap.get('/', allowApiToken({ projectIdFrom: 'query', key: 'projectId' }), async (c) => {
  const { projectId } = c.req.query();
  if (!projectId) return c.json({ message: 'projectId required' }, 400);
  const list = await prisma.roadmapUpdate.findMany({
    where: { projectId },
    orderBy: [{ order: 'asc' }, { startDate: 'asc' }],
  });
  return c.json(list);
});

const createSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  color: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  order: z.number().int().optional(),
});

roadmap.post('/', rolesGuard('ADMIN', 'PM'), zValidator('json', createSchema), async (c) => {
  const data = c.req.valid('json');
  const item = await prisma.roadmapUpdate.create({
    data: {
      projectId: data.projectId,
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? 'bg-blue-500',
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      order: data.order ?? 0,
    },
  });
  return c.json(item, 201);
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  order: z.number().int().optional(),
});

roadmap.patch('/:id', rolesGuard('ADMIN', 'PM'), zValidator('json', updateSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const patch: any = { ...data };
  if (data.startDate) patch.startDate = new Date(data.startDate);
  if (data.endDate) patch.endDate = new Date(data.endDate);
  const updated = await prisma.roadmapUpdate.update({ where: { id }, data: patch });
  return c.json(updated);
});

roadmap.delete('/:id', rolesGuard('ADMIN', 'PM'), async (c) => {
  const id = c.req.param('id');
  await prisma.roadmapUpdate.delete({ where: { id } });
  return c.json({ success: true });
});

export { roadmap };
