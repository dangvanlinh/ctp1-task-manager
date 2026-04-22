import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma';
import { authMiddleware, rolesGuard, ApiTokenAuth } from '../middleware/auth';

const projects = new Hono();

projects.use('*', authMiddleware);

projects.get('/', async (c) => {
  const apiToken = c.get('apiToken') as ApiTokenAuth | undefined;
  // API token scoped to a project: return only that project
  if (apiToken?.projectId) {
    const one = await prisma.project.findUnique({ where: { id: apiToken.projectId } });
    return c.json(one ? [one] : []);
  }
  const list = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
  return c.json(list);
});

projects.post('/', rolesGuard('ADMIN', 'PM'), zValidator('json', z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})), async (c) => {
  const data = c.req.valid('json');
  const project = await prisma.project.create({ data });
  return c.json(project, 201);
});

projects.patch('/:id', rolesGuard('ADMIN', 'PM'), zValidator('json', z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
})), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return c.json({ message: 'Project not found' }, 404);

  const updated = await prisma.project.update({ where: { id }, data });
  return c.json(updated);
});

export { projects };
