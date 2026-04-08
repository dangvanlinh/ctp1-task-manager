import type { TaskDto, UserDto } from '@ctp1/shared';
import { WeekRow } from './TreeRow';

interface Props {
  grouped: Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>>;
  expandedWeeks: Set<number>;
  expandedMembers: Set<string>;
  onToggleWeek: (week: number) => void;
  onToggleMember: (key: string) => void;
}

export default function TreeTable({ grouped, expandedWeeks, expandedMembers, onToggleWeek, onToggleMember }: Props) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b text-sm text-gray-500 bg-gray-50 sticky top-0">
            <th className="px-4 py-2 font-medium">Summary</th>
            <th className="px-4 py-2 font-medium w-28">Start Date</th>
            <th className="px-4 py-2 font-medium w-28">End Date</th>
            <th className="px-4 py-2 font-medium w-32">Assignee</th>
            <th className="px-4 py-2 font-medium w-28">Status</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4].map((week) => {
            const members = grouped.get(week);
            if (!members || members.size === 0) return null;
            return (
              <WeekRow key={week} week={week} members={members} expanded={expandedWeeks.has(week)} expandedMembers={expandedMembers} onToggleWeek={() => onToggleWeek(week)} onToggleMember={onToggleMember} />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
