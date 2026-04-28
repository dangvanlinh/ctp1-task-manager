import type { TaskDto, UserDto } from '@ctp1/shared';
import { WeekRow } from './TreeRow';

interface Props {
  grouped: Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>>;
  activeWeeks: number[];
  month: number;
  year: number;
  expandedWeeks: Set<number>;
  expandedMembers: Set<string>;
  weeksWithTasks: Set<number>;
  onToggleWeek: (week: number) => void;
  onToggleMember: (key: string) => void;
  onCreateInlineTask?: (title: string, userId: string, week: number) => void;
  onAddWeek?: () => void;
  onRemoveWeek?: (week: number) => void;
  onDeleteTask?: (taskId: string) => void;
  onUpdateTask?: (taskId: string, data: Record<string, any>) => void;
  onReorderTasks?: (items: { id: string; order: number }[]) => void;
  onRemoveMember?: (userId: string) => void;
}

export default function TreeTable({ grouped, activeWeeks, month, year, expandedWeeks, expandedMembers, weeksWithTasks, onToggleWeek, onToggleMember, onCreateInlineTask, onAddWeek, onRemoveWeek, onDeleteTask, onUpdateTask, onReorderTasks, onRemoveMember }: Props) {
  return (
    <div className="overflow-auto text-xs">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-[#FFE4D6] text-xs text-[#8B6E60] sticky top-0 whitespace-nowrap" style={{ height: 32, background: '#FFF8F5' }}>
            <th className="px-3 py-0 font-medium">Summary</th>
            <th className="px-3 py-0 font-medium">Start</th>
            <th className="px-3 py-0 font-medium">End</th>
            <th className="px-3 py-0 font-medium">Assignee</th>
            <th className="px-3 py-0 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {activeWeeks.map((week) => {
            const members = grouped.get(week);
            if (!members) return null;
            return (
              <WeekRow
                key={week}
                week={week}
                month={month}
                year={year}
                members={members}
                expanded={expandedWeeks.has(week)}
                expandedMembers={expandedMembers}
                onToggleWeek={() => onToggleWeek(week)}
                onToggleMember={onToggleMember}
                onCreateInlineTask={onCreateInlineTask}
                onDeleteTask={onDeleteTask}
                onUpdateTask={onUpdateTask}
                onReorderTasks={onReorderTasks}
                onRemoveMember={onRemoveMember}
                canRemove={!weeksWithTasks.has(week) && !!onRemoveWeek}
                onRemoveWeek={onRemoveWeek ? () => onRemoveWeek(week) : undefined}
              />
            );
          })}
          {/* Add week row */}
          {onAddWeek && (
            <tr style={{ height: 32 }}>
              <td colSpan={5} className="px-4 py-0">
                <button
                  onClick={onAddWeek}
                  className="text-sm text-[#E8341A] hover:text-[#C42E15] font-medium"
                >
                  + Thêm tuần
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
