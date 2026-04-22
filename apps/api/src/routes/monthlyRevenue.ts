import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma';
import { authMiddleware, rolesGuard, allowApiToken } from '../middleware/auth';

const monthlyRevenue = new Hono();

monthlyRevenue.use('*', authMiddleware);

// GET /monthly-revenue?projectId=X&year=Y → list all months in the year
// GET /monthly-revenue?projectId=X&year=Y&month=M → single entry
monthlyRevenue.get('/', allowApiToken({ projectIdFrom: 'query', key: 'projectId' }), async (c) => {
  const { projectId, year, month } = c.req.query();
  if (!projectId || !year) {
    return c.json({ message: 'projectId and year required' }, 400);
  }
  const y = parseInt(year);
  const where: any = { projectId, year: y };
  if (month) where.month = parseInt(month);

  const rows = await prisma.monthlyRevenue.findMany({
    where,
    orderBy: { month: 'asc' },
  });
  // Serialize BigInt → string (JSON safe). Frontend parses back to number.
  const serialized = rows.map((r) => ({
    ...r,
    amount: r.amount.toString(),
  }));
  return c.json(serialized);
});

const putSchema = z.object({
  projectId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  amount: z.union([z.number(), z.string()]).transform((v) => BigInt(v)),
  note: z.string().optional().nullable(),
});

monthlyRevenue.put('/', rolesGuard('ADMIN', 'PM'), zValidator('json', putSchema), async (c) => {
  const { projectId, month, year, amount, note } = c.req.valid('json');
  const saved = await prisma.monthlyRevenue.upsert({
    where: { projectId_month_year: { projectId, month, year } },
    create: { projectId, month, year, amount, note: note ?? null },
    update: { amount, note: note ?? null },
  });
  return c.json({ ...saved, amount: saved.amount.toString() });
});

// Yearly KPI — target revenue for the year (single value per project/year)
monthlyRevenue.get('/kpi', allowApiToken({ projectIdFrom: 'query', key: 'projectId' }), async (c) => {
  const { projectId, year } = c.req.query();
  if (!projectId || !year) return c.json({ message: 'projectId and year required' }, 400);
  const row = await prisma.projectYearlyKpi.findUnique({
    where: { projectId_year: { projectId, year: parseInt(year) } },
  });
  if (!row) return c.json({ projectId, year: parseInt(year), amount: '0' });
  return c.json({ ...row, amount: row.amount.toString() });
});

const kpiPutSchema = z.object({
  projectId: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
  amount: z.union([z.number(), z.string()]).transform((v) => BigInt(v)),
});

monthlyRevenue.put('/kpi', rolesGuard('ADMIN', 'PM'), zValidator('json', kpiPutSchema), async (c) => {
  const { projectId, year, amount } = c.req.valid('json');
  const saved = await prisma.projectYearlyKpi.upsert({
    where: { projectId_year: { projectId, year } },
    create: { projectId, year, amount },
    update: { amount },
  });
  return c.json({ ...saved, amount: saved.amount.toString() });
});

export { monthlyRevenue };
