import { useRef, useCallback } from 'react';
import type { TaskDto, UserDto } from '@ctp1/shared';
import GanttBar from './GanttBar';

interface Props {
  grouped: Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>>;
  activeWeeks: number[];
  month: number;
  year: number;
  expandedWeeks: Set<number>;
  expandedMembers: Set<string>;
  onDateChange: (taskId: string, startDate: Date, endDate: Date) => void;
}

const DAY_WIDTH = 40;
const ROW_HEIGHT = 32;

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function isWeekend(year: number, month: number, day: number) {
  const d = new Date(year, month - 1, day).getDay();
  return d === 0 || d === 6;
}

export default function GanttChart({ grouped, activeWeeks, month, year, expandedWeeks, expandedMembers, onDateChange }: Props) {
  const daysInMonth = getDaysInMonth(month, year);
  const timelineStart = new Date(year, month - 1, 1);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const containerRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const todayDay = now.getDate();
  const todayOffset = isCurrentMonth ? (todayDay - 1) * DAY_WIDTH + DAY_WIDTH / 2 : -1;

  const scrollToToday = useCallback(() => {
    if (!containerRef.current || !isCurrentMonth) return;
    containerRef.current.scrollLeft = todayOffset - containerRef.current.clientWidth / 2;
  }, [todayOffset, isCurrentMonth]);

  const rows: { type: 'week' | 'member' | 'task' | 'add-week'; task?: TaskDto }[] = [];
  for (const week of activeWeeks) {
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
      // Add task row per member
      rows.push({ type: 'add-week' });
    }
  }
  // Add week row at bottom
  rows.push({ type: 'add-week' });

  return (
    <div className="relative overflow-x-auto border-l" ref={containerRef}>
      {/* Scroll to today button */}
      {isCurrentMonth && (
        <button
          onClick={scrollToToday}
          className="absolute top-1 right-2 z-20 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow hover:bg-blue-700"
          title="Về hôm nay"
        >
          Hôm nay
        </button>
      )}
      {/* Header: day numbers */}
      <div className="flex border-b bg-gray-50 sticky top-0 z-10" style={{ minWidth: daysInMonth * DAY_WIDTH, height: 32 }}>
        {days.map((d) => {
          const weekend = isWeekend(year, month, d);
          const isToday = isCurrentMonth && d === todayDay;
          return (
            <div
              key={d}
              className={`text-center text-xs border-r flex items-center justify-center ${isToday ? 'bg-blue-600 text-white font-bold' : weekend ? 'bg-gray-200 text-gray-400' : 'text-gray-500'}`}
              style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH, height: 32 }}
            >
              {d}
            </div>
          );
        })}
      </div>
      {/* Rows */}
      <div className="relative" style={{ minWidth: daysInMonth * DAY_WIDTH }}>
        {/* Today vertical line */}
        {isCurrentMonth && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none"
            style={{ left: todayOffset }}
          />
        )}
        {rows.map((row, i) => (
          <div key={i} className="relative border-b" style={{ height: ROW_HEIGHT }}>
            {/* Grid columns with weekend highlighting */}
            <div className="absolute inset-0 flex">
              {days.map((d) => {
                const weekend = isWeekend(year, month, d);
                return (
                  <div
                    key={d}
                    className={`border-r h-full ${weekend ? 'bg-gray-100' : ''}`}
                    style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                  />
                );
              })}
            </div>
            {row.type === 'task' && row.task && (
              <GanttBar taskId={row.task.id} title={row.task.title} status={row.task.status} startDate={new Date(row.task.startDate)} endDate={new Date(row.task.endDate)} dayWidth={DAY_WIDTH} timelineStart={timelineStart} isPast={new Date(row.task.endDate) < new Date(new Date().setHours(0,0,0,0))} onDateChange={onDateChange} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
