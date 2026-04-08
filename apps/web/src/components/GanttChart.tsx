import type { TaskDto, UserDto } from '@ctp1/shared';
import GanttBar from './GanttBar';

interface Props {
  grouped: Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>>;
  month: number;
  year: number;
  expandedWeeks: Set<number>;
  expandedMembers: Set<string>;
  onDateChange: (taskId: string, startDate: Date, endDate: Date) => void;
}

const DAY_WIDTH = 40;
const ROW_HEIGHT = 36;

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

export default function GanttChart({ grouped, month, year, expandedWeeks, expandedMembers, onDateChange }: Props) {
  const daysInMonth = getDaysInMonth(month, year);
  const timelineStart = new Date(year, month - 1, 1);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const rows: { type: 'week' | 'member' | 'task'; task?: TaskDto }[] = [];
  for (const week of [1, 2, 3, 4]) {
    const members = grouped.get(week);
    if (!members || members.size === 0) continue;
    rows.push({ type: 'week' });
    if (!expandedWeeks.has(week)) continue;
    for (const [userId, { tasks }] of members.entries()) {
      rows.push({ type: 'member' });
      if (!expandedMembers.has(`${week}-${userId}`)) continue;
      for (const task of tasks) {
        rows.push({ type: 'task', task });
      }
    }
  }

  return (
    <div className="overflow-x-auto border-l">
      <div className="flex border-b bg-gray-50 sticky top-0" style={{ minWidth: daysInMonth * DAY_WIDTH }}>
        {days.map((d) => (
          <div key={d} className="text-center text-xs text-gray-500 border-r" style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}>{d}</div>
        ))}
      </div>
      <div style={{ minWidth: daysInMonth * DAY_WIDTH }}>
        {rows.map((row, i) => (
          <div key={i} className="relative border-b" style={{ height: ROW_HEIGHT }}>
            <div className="absolute inset-0 flex">
              {days.map((d) => (
                <div key={d} className="border-r h-full" style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }} />
              ))}
            </div>
            {row.type === 'task' && row.task && (
              <GanttBar taskId={row.task.id} title={row.task.title} status={row.task.status} startDate={new Date(row.task.startDate)} endDate={new Date(row.task.endDate)} dayWidth={DAY_WIDTH} timelineStart={timelineStart} onDateChange={onDateChange} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
