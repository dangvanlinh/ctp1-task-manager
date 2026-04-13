import { useState, useRef, useEffect } from 'react';
import type { TaskDto, UserDto } from '@ctp1/shared';
import { getWeekRange } from '../utils/weekUtils';

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

const ROW_H = 32;

interface WeekRowProps {
  week: number;
  month: number;
  year: number;
  members: Map<string, { user: UserDto; tasks: TaskDto[] }>;
  expanded: boolean;
  expandedMembers: Set<string>;
  onToggleWeek: () => void;
  onToggleMember: (key: string) => void;
  onCreateInlineTask?: (title: string, userId: string, week: number) => void;
  onDeleteTask?: (taskId: string) => void;
  onUpdateTask?: (taskId: string, data: Record<string, any>) => void;
  onReorderTasks?: (items: { id: string; order: number }[]) => void;
  canRemove: boolean;
  onRemoveWeek?: () => void;
}

export function WeekRow({ week, month, year, members, expanded, expandedMembers, onToggleWeek, onToggleMember, onCreateInlineTask, onDeleteTask, onUpdateTask, onReorderTasks, canRemove, onRemoveWeek }: WeekRowProps) {
  const weekRange = getWeekRange(week, month, year);
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData('text/taskId');
    const sourceWeek = Number(e.dataTransfer.getData('text/sourceWeek'));
    if (taskId && sourceWeek !== week) {
      onUpdateTask?.(taskId, { week });
    }
  };

  return (
    <>
      <tr
        className={`bg-gray-100 cursor-pointer hover:bg-gray-200 group ${dragOver ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''}`}
        style={{ height: ROW_H }}
        onClick={onToggleWeek}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <td className="px-3 py-0 font-semibold" colSpan={5}>
          <div className="flex items-center justify-between">
            <span>
              <span className="mr-1.5">{expanded ? '\u25BC' : '\u25B6'}</span>
              Tuần {week} <span className="text-gray-400 font-normal text-[10px]">({weekRange.startDay}-{weekRange.endDay})</span>
            </span>
            {canRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveWeek?.(); }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs px-1"
                title="Xoá tuần"
              >
                ✕
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded &&
        Array.from(members.entries()).map(([userId, { user, tasks }]) => {
          const memberKey = `${week}-${userId}`;
          const memberExpanded = expandedMembers.has(memberKey);
          return (
            <MemberRow
              key={userId}
              user={user}
              tasks={tasks}
              expanded={memberExpanded}
              onToggle={() => onToggleMember(memberKey)}
              onCreateInlineTask={onCreateInlineTask ? (title) => onCreateInlineTask(title, userId, week) : undefined}
              onDeleteTask={onDeleteTask}
              onUpdateTask={onUpdateTask}
              onReorderTasks={onReorderTasks}
            />
          );
        })}
    </>
  );
}

function MemberRow({ user, tasks, expanded, onToggle, onCreateInlineTask, onDeleteTask, onUpdateTask, onReorderTasks }: { user: UserDto; tasks: TaskDto[]; expanded: boolean; onToggle: () => void; onCreateInlineTask?: (title: string) => void; onDeleteTask?: (taskId: string) => void; onUpdateTask?: (taskId: string, data: Record<string, any>) => void; onReorderTasks?: (items: { id: string; order: number }[]) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) inputRef.current?.focus();
  }, [isAdding]);

  const handleSubmit = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) { setIsAdding(false); return; }
    onCreateInlineTask?.(trimmed);
    setNewTitle('');
  };

  return (
    <>
      <tr className="cursor-pointer hover:bg-gray-50 group" style={{ height: ROW_H }} onClick={onToggle}>
        <td className="px-3 py-0 pl-8 font-medium" colSpan={5}>
          <div className="flex items-center gap-1.5">
            <span className="mr-0.5">{expanded ? '\u25BC' : '\u25B6'}</span>
            {user.name}
            {onCreateInlineTask && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
                className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 text-sm leading-none ml-0.5"
                title="Thêm task"
              >
                +
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <>
          {tasks.map((task, idx) => (
            <tr
              key={task.id}
              className={`hover:bg-blue-50 group/task cursor-grab active:cursor-grabbing ${dragOverTaskId === task.id ? 'border-t-2 border-blue-400' : ''}`}
              style={{ height: ROW_H, maxHeight: ROW_H, overflow: 'hidden' }}
              draggable={!!onReorderTasks}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/taskId', task.id);
                e.dataTransfer.setData('text/sourceWeek', String(task.week));
                e.dataTransfer.setData('text/sourceAssignee', task.assigneeId);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const draggedAssignee = e.dataTransfer.types.includes('text/sourceassignee') ? '' : '';
                setDragOverTaskId(task.id);
              }}
              onDragLeave={() => setDragOverTaskId(null)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOverTaskId(null);
                const draggedId = e.dataTransfer.getData('text/taskId');
                const sourceAssignee = e.dataTransfer.getData('text/sourceAssignee');
                const sourceWeek = Number(e.dataTransfer.getData('text/sourceWeek'));
                if (!draggedId || draggedId === task.id) return;
                // Same member + same week → reorder
                if (sourceAssignee === task.assigneeId && sourceWeek === task.week) {
                  const ids = tasks.map((t) => t.id);
                  const fromIdx = ids.indexOf(draggedId);
                  if (fromIdx === -1) return;
                  ids.splice(fromIdx, 1);
                  const toIdx = ids.indexOf(task.id);
                  ids.splice(toIdx, 0, draggedId);
                  onReorderTasks?.(ids.map((id, i) => ({ id, order: i })));
                } else {
                  // Different week → move task
                  onUpdateTask?.(draggedId, { week: task.week });
                }
              }}
            >
              <td className="px-3 py-0 pl-12 truncate max-w-[180px]" title={task.title}>{task.title}</td>
              <td className="px-3 py-0 text-gray-500 whitespace-nowrap">{formatDate(task.startDate)}</td>
              <td className="px-3 py-0 text-gray-500 whitespace-nowrap">{formatDate(task.endDate)}</td>
              <td className="px-3 py-0 text-gray-500 whitespace-nowrap">{user.name}</td>
              <td className="px-3 py-0 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <select
                    value={task.status}
                    onChange={(e) => { e.stopPropagation(); onUpdateTask?.(task.id, { status: e.target.value }); }}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full border-0 outline-none cursor-pointer appearance-none ${STATUS_COLORS[task.status]}`}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                  {onDeleteTask && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                      className="opacity-0 group-hover/task:opacity-100 text-red-400 hover:text-red-600 text-xs"
                      title="Xóa task"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {onCreateInlineTask && (isAdding ? (
            <tr className="bg-blue-50/50" style={{ height: ROW_H }}>
              <td className="px-3 py-0 pl-12" colSpan={5}>
                <input
                  ref={inputRef}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
                    if (e.key === 'Escape') { setIsAdding(false); setNewTitle(''); }
                  }}
                  onBlur={handleSubmit}
                  placeholder="Nhập tên task rồi Enter..."
                  className="w-full text-xs border-b border-blue-300 bg-transparent outline-none py-1 placeholder:text-gray-400"
                />
              </td>
            </tr>
          ) : (
            <tr className="hover:bg-blue-50 cursor-pointer" style={{ height: ROW_H }} onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}>
              <td className="px-3 py-0 pl-12 text-blue-500 hover:text-blue-700" colSpan={5}>
                + Thêm task
              </td>
            </tr>
          ))}
        </>
      )}
    </>
  );
}
