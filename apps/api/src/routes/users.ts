import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import * as bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authMiddleware, rolesGuard } from '../middleware/auth';

const users = new Hono();
const DEFAULT_PASSWORD = '123456';

const userSelect = { id: true, email: true, ssoEmail: true, name: true, role: true, position: true, createdAt: true };

const createUserSchema = z.object({
  email: z.string().optional(),
  ssoEmail: z.string().optional().nullable(),
  name: z.string().min(1),
  role: z.enum(['MEMBER', 'PM', 'ADMIN']).optional(),
  position: z.enum(['DESIGNER', 'DEV', 'ARTIST', 'BD']).optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  ssoEmail: z.string().optional().nullable(),
  name: z.string().min(1).optional(),
  role: z.enum(['MEMBER', 'PM', 'ADMIN']).optional(),
  position: z.enum(['DESIGNER', 'DEV', 'ARTIST', 'BD']).optional(),
});

users.use('*', authMiddleware);

users.get('/', async (c) => {
  const list = await prisma.user.findMany({ select: userSelect });
  return c.json(list);
});

users.post('/', rolesGuard('ADMIN', 'PM'), zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json');
  const email = data.email || `${data.name.toLowerCase().replace(/\s+/g, '.')}@ctp1.vn`;
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return c.json({ message: 'Email already exists' }, 409);

  const user = await prisma.user.create({
    data: {
      email,
      ssoEmail: data.ssoEmail ? data.ssoEmail.toLowerCase().trim() : null,
      name: data.name,
      password: hashed,
      role: data.role || 'MEMBER',
      position: data.position || 'DEV',
    },
    select: userSelect,
  });
  return c.json(user, 201);
});

users.patch('/:id', rolesGuard('ADMIN', 'PM'), zValidator('json', updateUserSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return c.json({ message: 'User not found' }, 404);

  const patch: any = { ...data };
  if (data.ssoEmail !== undefined) {
    patch.ssoEmail = data.ssoEmail ? data.ssoEmail.toLowerCase().trim() : null;
  }
  const updated = await prisma.user.update({ where: { id }, data: patch, select: userSelect });
  return c.json(updated);
});

users.delete('/:id', rolesGuard('ADMIN'), async (c) => {
  const id = c.req.param('id');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return c.json({ message: 'User not found' }, 404);

  await prisma.user.delete({ where: { id } });
  return c.json({ success: true });
});

users.patch('/:id/reset-password', rolesGuard('ADMIN', 'PM'), async (c) => {
  const id = c.req.param('id');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return c.json({ message: 'User not found' }, 404);

  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const updated = await prisma.user.update({
    where: { id },
    data: { password: hashed },
    select: userSelect,
  });
  return c.json(updated);
});

users.patch('/:id/role', rolesGuard('ADMIN'), zValidator('json', z.object({ role: z.enum(['ADMIN', 'PM', 'MEMBER']) })), async (c) => {
  const id = c.req.param('id');
  const { role } = c.req.valid('json');

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return c.json({ message: 'User not found' }, 404);

  const updated = await prisma.user.update({ where: { id }, data: { role }, select: userSelect });
  return c.json(updated);
});

export { users };
