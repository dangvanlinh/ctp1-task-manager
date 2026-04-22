import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma';
import { authMiddleware, rolesGuard, JwtUser, allowApiToken } from '../middleware/auth';

const tasks = new Hono();

tasks.use('*', authMiddleware);

tasks.get('/', allowApiToken({ projectIdFrom: 'query', key: 'projectId' }), async (c) => {
  const { projectId, month, year, week } = c.req.query();
  const m = parseInt(month);
  const y = parseInt(year);
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 1);

  const where: any = {
    projectId,
    startDate: { gte: startDate },
    endDate: { lt: endDate },
  };
  if (week) where.week = parseInt(week);

  const list = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true, position: true } },
      build: { select: { id: true, name: true } },
    },
    orderBy: [{ week: 'asc' }, { assigneeId: 'asc' }, { order: 'asc' }, { startDate: 'asc' }],
  });
  return c.json(list);
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
  startDate: z.string(),
  endDate: z.string(),
  order: z.number().int().optional(),
  week: z.number().int().min(1).max(52),
  buildId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid(),
  projectId: z.string().uuid(),
});

tasks.post('/', rolesGuard('ADMIN', 'PM'), zValidator('json', createTaskSchema), async (c) => {
  const user = c.get('user') as JwtUser;
  const data = c.req.valid('json');

  const task = await prisma.task.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      createdById: user.id,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, position: true } },
      build: { select: { id: true, name: true } },
    },
  });
  return c.json(task, 201);
});

const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string(), order: z.number().int() })),
});

tasks.patch('/reorder', rolesGuard('ADMIN', 'PM'), zValidator('json', reorderSchema), async (c) => {
  const { items } = c.req.valid('json');
  await prisma.$transaction(
    items.map((item) => prisma.task.update({ where: { id: item.id }, data: { order: item.order } }))
  );
  return c.json({ success: true });
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  order: z.number().int().optional(),
  week: z.number().int().min(1).max(52).optional(),
  buildId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional(),
});

tasks.patch('/:id', zValidator('json', updateTaskSchema), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as JwtUser;
  const data = c.req.valid('json');

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return c.json({ message: 'Task not found' }, 404);

  // MEMBER can only update own tasks and only status
  if (user.role === 'MEMBER') {
    if (task.assigneeId !== user.id) {
      return c.json({ message: 'Forbidden' }, 403);
    }
    const updateData: any = {};
    if (data.status) {
      updateData.status = data.status;
      updateData.completedAt = data.status === 'DONE' ? new Date() : null;
    }
    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true, position: true } },
        build: { select: { id: true, name: true } },
      },
    });
    return c.json(updated);
  }

  // ADMIN/PM can update all fields
  const updateData: any = { ...data };
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);
  if (data.status === 'DONE') updateData.completedAt = new Date();
  else if (data.status && data.status !== 'DONE') updateData.completedAt = null;

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, email: true, position: true } },
      build: { select: { id: true, name: true } },
    },
  });
  return c.json(updated);
});

tasks.delete('/:id', rolesGuard('ADMIN', 'PM'), async (c) => {
  const id = c.req.param('id');
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return c.json({ message: 'Task not found' }, 404);

  await prisma.task.delete({ where: { id } });
  return c.json({ success: true });
});

export { tasks };
