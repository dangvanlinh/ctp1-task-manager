import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma';
import { authMiddleware, rolesGuard, JwtUser, allowApiToken } from '../middleware/auth';

const builds = new Hono();

builds.use('*', authMiddleware);

const milestoneSchema = z.object({
  name: z.string().min(1),
  date: z.string(),
  type: z.enum(['BUILD', 'REVIEW', 'SENDOUT', 'LIVE']).optional().default('BUILD'),
});

const createBuildSchema = z.object({
  name: z.string().min(1),
  projectId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  startDate: z.string().optional().nullable(),
  liveDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).optional().default([]),
  milestones: z.array(milestoneSchema).optional().default([]),
});

builds.get('/', allowApiToken({ projectIdFrom: 'query', key: 'projectId' }), async (c) => {
  const { projectId, month, year } = c.req.query();

  const list = await prisma.build.findMany({
    where: { projectId, month: parseInt(month), year: parseInt(year) },
    include: {
      milestones: { orderBy: { date: 'asc' } },
      assignees: { include: { user: { select: { id: true, name: true, email: true, position: true } } } },
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return c.json(list);
});

// Reorder builds (must be before /:id routes)
const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

builds.patch('/reorder', rolesGuard('ADMIN', 'PM'), zValidator('json', reorderSchema), async (c) => {
  const { orderedIds } = c.req.valid('json');

  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.build.update({ where: { id }, data: { order: index } })
    )
  );

  return c.json({ success: true });
});

builds.post('/', rolesGuard('ADMIN', 'PM'), zValidator('json', createBuildSchema), async (c) => {
  const user = c.get('user') as JwtUser;
  const data = c.req.valid('json');
  const { assigneeIds, milestones, ...buildData } = data;

  // Auto-assign order: next after max
  const maxOrderBuild = await prisma.build.findFirst({
    where: { projectId: data.projectId, month: data.month, year: data.year },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  const nextOrder = (maxOrderBuild?.order ?? -1) + 1;

  const build = await prisma.build.create({
    data: {
      ...buildData,
      order: nextOrder,
      startDate: buildData.startDate ? new Date(buildData.startDate) : null,
      liveDate: buildData.liveDate ? new Date(buildData.liveDate) : null,
      endDate: buildData.endDate ? new Date(buildData.endDate) : null,
      assignees: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
      milestones: {
        create: milestones.map((m) => ({ name: m.name, date: new Date(m.date), type: m.type })),
      },
    },
    include: {
      milestones: { orderBy: { date: 'asc' } },
      assignees: { include: { user: { select: { id: true, name: true, email: true, position: true } } } },
    },
  });

  // Auto-generate tasks: one per assignee per milestone
  if (assigneeIds.length > 0 && build.milestones.length > 0) {
    const taskData = [];
    for (const assigneeId of assigneeIds) {
      for (let i = 0; i < build.milestones.length; i++) {
        const ms = build.milestones[i];
        const nextMs = build.milestones[i + 1];
        const endDate = nextMs ? new Date(new Date(nextMs.date).getTime() - 86400000) : ms.date;
        const day = new Date(ms.date).getDate();
        const week = Math.min(Math.ceil(day / 7) || 1, 52);

        taskData.push({
          title: `${build.name} - ${ms.name}`,
          startDate: ms.date,
          endDate,
          week,
          priority: 'MEDIUM',
          assigneeId,
          createdById: user.id,
          projectId: build.projectId,
          buildId: build.id,
        });
      }
    }
    if (taskData.length > 0) {
      await prisma.task.createMany({ data: taskData });
    }
  }

  return c.json(build, 201);
});

const updateBuildSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().optional().nullable(),
  liveDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  milestones: z.array(z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1),
    date: z.string(),
    type: z.enum(['BUILD', 'REVIEW', 'SENDOUT', 'LIVE']).optional(),
  })).optional(),
});

builds.patch('/:id', rolesGuard('ADMIN', 'PM'), zValidator('json', updateBuildSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const build = await prisma.build.findUnique({ where: { id } });
  if (!build) return c.json({ message: 'Build not found' }, 404);

  const { assigneeIds, milestones, ...updateData } = data;
  const prismaData: any = { ...updateData };
  if (updateData.startDate !== undefined) prismaData.startDate = updateData.startDate ? new Date(updateData.startDate) : null;
  if (updateData.liveDate !== undefined) prismaData.liveDate = updateData.liveDate ? new Date(updateData.liveDate) : null;
  if (updateData.endDate !== undefined) prismaData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;

  // Delete old and recreate milestones/assignees
  if (milestones !== undefined) {
    await prisma.buildMilestone.deleteMany({ where: { buildId: id } });
    if (milestones.length > 0) {
      await prisma.buildMilestone.createMany({
        data: milestones.map((m) => ({
          buildId: id,
          name: m.name,
          date: new Date(m.date),
          type: m.type || 'BUILD',
        })),
      });
    }
  }

  if (assigneeIds !== undefined) {
    await prisma.buildAssignee.deleteMany({ where: { buildId: id } });
    if (assigneeIds.length > 0) {
      await prisma.buildAssignee.createMany({
        data: assigneeIds.map((userId) => ({ buildId: id, userId })),
      });
    }
  }

  const updated = await prisma.build.update({
    where: { id },
    data: prismaData,
    include: {
      milestones: { orderBy: { date: 'asc' } },
      assignees: { include: { user: { select: { id: true, name: true, email: true, position: true } } } },
    },
  });
  return c.json(updated);
});

builds.delete('/:id', rolesGuard('ADMIN', 'PM'), async (c) => {
  const id = c.req.param('id');
  const build = await prisma.build.findUnique({ where: { id } });
  if (!build) return c.json({ message: 'Build not found' }, 404);

  await prisma.build.delete({ where: { id } });
  return c.json({ success: true });
});

// Add milestone to build
builds.post('/:id/milestones', rolesGuard('ADMIN', 'PM'), zValidator('json', milestoneSchema), async (c) => {
  const buildId = c.req.param('id');
  const data = c.req.valid('json');

  const build = await prisma.build.findUnique({ where: { id: buildId } });
  if (!build) return c.json({ message: 'Build not found' }, 404);

  await prisma.buildMilestone.create({
    data: { buildId, name: data.name, date: new Date(data.date), type: data.type },
  });

  // Auto-update build dates
  const allMilestones = await prisma.buildMilestone.findMany({
    where: { buildId },
    orderBy: { date: 'asc' },
  });

  const startDate = allMilestones.length > 0 ? allMilestones[0].date : null;
  const liveMilestone = allMilestones.find((m) => m.type === 'LIVE');

  const updated = await prisma.build.update({
    where: { id: buildId },
    data: { startDate, liveDate: liveMilestone?.date || null },
    include: {
      milestones: { orderBy: { date: 'asc' } },
      assignees: { include: { user: { select: { id: true, name: true, email: true, position: true } } } },
    },
  });
  return c.json(updated);
});

// Remove milestone
builds.delete('/milestones/:milestoneId', rolesGuard('ADMIN', 'PM'), async (c) => {
  const milestoneId = c.req.param('milestoneId');

  const milestone = await prisma.buildMilestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) return c.json({ message: 'Milestone not found' }, 404);

  await prisma.buildMilestone.delete({ where: { id: milestoneId } });

  // Recalculate build dates
  const allMilestones = await prisma.buildMilestone.findMany({
    where: { buildId: milestone.buildId },
    orderBy: { date: 'asc' },
  });

  const startDate = allMilestones.length > 0 ? allMilestones[0].date : null;
  const liveMilestone = allMilestones.find((m) => m.type === 'LIVE');

  const updated = await prisma.build.update({
    where: { id: milestone.buildId },
    data: { startDate, liveDate: liveMilestone?.date || null },
    include: {
      milestones: { orderBy: { date: 'asc' } },
      assignees: { include: { user: { select: { id: true, name: true, email: true, position: true } } } },
    },
  });
  return c.json(updated);
});

export { builds };
