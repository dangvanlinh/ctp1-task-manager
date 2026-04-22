import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../lib/prisma';
import { authMiddleware, rolesGuard, allowApiToken } from '../middleware/auth';

const weeklyEvents = new Hono();

weeklyEvents.use('*', authMiddleware);

interface EventWeekRow {
  eventId: string;
  week: number;
  buildStart: number;
  buildEnd: number;
  liveStart: number;
  liveEnd: number;
  label: string;
}

interface EventConfigRow {
  id: string;
  name: string;
  color: string;
  variants: { id: string; name: string; color: string }[];
}

// Tailwind class → hex (best-effort for common CTP1 event colors)
const TAILWIND_HEX: Record<string, string> = {
  'bg-green-500': '#22c55e',
  'bg-emerald-400': '#34d399',
  'bg-yellow-400': '#facc15',
  'bg-amber-400': '#fbbf24',
  'bg-orange-400': '#fb923c',
  'bg-red-400': '#f87171',
  'bg-blue-500': '#3b82f6',
  'bg-purple-500': '#a855f7',
  'bg-pink-500': '#ec4899',
  'bg-gray-400': '#9ca3af',
};

function toDateString(year: number, month: number, day: number) {
  // ISO date (YYYY-MM-DD) in UTC — day is 1-based day of month
  const y = year;
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

weeklyEvents.get('/', allowApiToken({ projectIdFrom: 'query', key: 'projectId' }), async (c) => {
  const { projectId, month, year, format } = c.req.query();
  if (!projectId || !month || !year) {
    return c.json({ message: 'projectId, month, year required' }, 400);
  }
  const m = parseInt(month);
  const y = parseInt(year);

  const record = await prisma.weeklyEventData.findUnique({
    where: { projectId_month_year: { projectId, month: m, year: y } },
  });

  const data = (record?.data as EventWeekRow[] | null) ?? [];
  const configs = (record?.configs as EventConfigRow[] | null) ?? [];

  // Simple format: flatten live event bars only, with ISO dates + hex color
  if (format === 'simple') {
    const configMap = new Map<string, EventConfigRow>(configs.map((cfg) => [cfg.id, cfg]));
    const result = data.map((w) => {
      const cfg = configMap.get(w.eventId);
      const variantIdx = w.week % 2 === 1 ? 0 : 1;
      const variant = cfg?.variants?.[variantIdx];
      const tailwindClass = variant?.color || cfg?.color || 'bg-gray-400';
      return {
        id: `${w.week}-${w.eventId}`,
        week: w.week,
        name: w.label,
        category: w.eventId,
        startDate: toDateString(y, m, w.liveStart),
        endDate: toDateString(y, m, w.liveEnd),
        color: TAILWIND_HEX[tailwindClass] || '#6b7280',
      };
    });
    return c.json(result);
  }

  // Raw format (for internal UI)
  return c.json({
    projectId,
    month: m,
    year: y,
    data,
    configs,
    updatedAt: record?.updatedAt ?? null,
  });
});

const putSchema = z.object({
  projectId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  data: z.array(z.any()),
  configs: z.array(z.any()).optional(),
});

weeklyEvents.put('/', rolesGuard('ADMIN', 'PM'), zValidator('json', putSchema), async (c) => {
  const { projectId, month, year, data, configs } = c.req.valid('json');
  const saved = await prisma.weeklyEventData.upsert({
    where: { projectId_month_year: { projectId, month, year } },
    create: { projectId, month, year, data, configs: configs ?? [] },
    update: { data, configs: configs ?? [] },
  });
  return c.json(saved);
});

export { weeklyEvents };
