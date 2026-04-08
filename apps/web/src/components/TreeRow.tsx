import type { TaskDto, UserDto } from '@ctp1/shared';

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-gray-200 text-gray-700',
  IN_PROGRESS: 'bg-blue-200 text-blue-700',
  DONE: 'bg-green-200 text-green-700',
};

const STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

interface WeekRowProps {
  week: number;
  members: Map<string, { user: UserDto; tasks: TaskDto[] }>;
  expanded: boolean;
  expandedMembers: Set<string>;
  onToggleWeek: () => void;
  onToggleMember: (key: string) => void;
}

export function WeekRow({ week, members, expanded, expandedMembers, onToggleWeek, onToggleMember }: WeekRowProps) {
  return (
    <>
      <tr className="bg-gray-100 cursor-pointer hover:bg-gray-200" onClick={onToggleWeek}>
        <td className="px-4 py-2 font-semibold" colSpan={5}>
          <span className="mr-2">{expanded ? '\u25BC' : '\u25B6'}</span>
          Tuan {week}
        </td>
      </tr>
      {expanded &&
        Array.from(members.entries()).map(([userId, { user, tasks }]) => {
          const memberKey = `${week}-${userId}`;
          const memberExpanded = expandedMembers.has(memberKey);
          return (
            <MemberRow key={userId} user={user} tasks={tasks} expanded={memberExpanded} onToggle={() => onToggleMember(memberKey)} />
          );
        })}
    </>
  );
}

function MemberRow({ user, tasks, expanded, onToggle }: { user: UserDto; tasks: TaskDto[]; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-gray-50" onClick={onToggle}>
        <td className="px-4 py-2 pl-10 font-medium" colSpan={5}>
          <span className="mr-2">{expanded ? '\u25BC' : '\u25B6'}</span>
          {user.name}
        </td>
      </tr>
      {expanded &&
        tasks.map((task) => (
          <tr key={task.id} className="hover:bg-blue-50">
            <td className="px-4 py-1.5 pl-16 text-sm">{task.title}</td>
            <td className="px-4 py-1.5 text-sm text-gray-500">{formatDate(task.startDate)}</td>
            <td className="px-4 py-1.5 text-sm text-gray-500">{formatDate(task.endDate)}</td>
            <td className="px-4 py-1.5 text-sm text-gray-500">{user.name}</td>
            <td className="px-4 py-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
            </td>
          </tr>
        ))}
    </>
  );
}
