import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import * as bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { generateTokens, authMiddleware } from '../middleware/auth';

const auth = new Hono();

const loginSchema = z.object({
  name: z.string(),
  password: z.string(),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { name, password } = c.req.valid('json');

  const user = await prisma.user.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return c.json({ message: 'Invalid credentials' }, 401);
  }

  const tokens = generateTokens(user.id, user.email, user.role, user.name);
  return c.json(tokens);
});

auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, name } = c.req.valid('json');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return c.json({ message: 'Email already exists' }, 409);
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed, name },
  });

  const tokens = generateTokens(user.id, user.email, user.role, user.name);
  return c.json(tokens);
});

auth.post('/refresh', authMiddleware, async (c) => {
  const jwtUser = c.get('user');
  const user = await prisma.user.findUnique({ where: { id: jwtUser.id } });
  if (!user) return c.json({ message: 'User not found' }, 404);

  const tokens = generateTokens(user.id, user.email, user.role, user.name);
  return c.json(tokens);
});

export { auth };
