import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MonthWeekSelector from '../components/MonthWeekSelector';
import BuildOverview from '../components/BuildOverview';
import TreeTable from '../components/TreeTable';
import GanttChart from '../components/GanttChart';
import TaskForm from '../components/TaskForm';
import { useBuilds } from '../hooks/useBuilds';
import { useTasks, useCreateTask, useUpdateTask } from '../hooks/useTasks';
import { fetchUsers } from '../api/users';
import type { TaskDto, UserDto } from '@ctp1/shared';

function groupTasksByWeekAndMember(tasks: TaskDto[]): Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>> {
  const weekMap = new Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>>();
  for (const task of tasks) {
    if (!weekMap.has(task.week)) weekMap.set(task.week, new Map());
    const memberMap = weekMap.get(task.week)!;
    if (!memberMap.has(task.assigneeId)) {
      memberMap.set(task.assigneeId, { user: task.assignee!, tasks: [] });
    }
    memberMap.get(task.assigneeId)!.tasks.push(task);
  }
  return weekMap;
}

export default function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showTaskForm, setShowTaskForm] = useState(false);

  const { data: builds = [] } = useBuilds(projectId!, month, year);
  const { data: tasks = [] } = useTasks(projectId!, month, year);
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const grouped = useMemo(() => groupTasksByWeekAndMember(tasks), [tasks]);

  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  useMemo(() => {
    const memberKeys = new Set<string>();
    grouped.forEach((members, week) => {
      members.forEach((_, userId) => memberKeys.add(`${week}-${userId}`));
    });
    setExpandedMembers(memberKeys);
  }, [tasks]);

  const toggleWeek = (week: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  };

  const toggleMember = (key: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDateChange = (taskId: string, startDate: Date, endDate: Date) => {
    updateTask.mutate({ id: taskId, startDate: startDate.toISOString(), endDate: endDate.toISOString() });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <MonthWeekSelector month={month} year={year} onChangeMonth={(m, y) => { setMonth(m); setYear(y); }} />
        <button onClick={() => setShowTaskForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">+ Them Task</button>
      </div>
      <div className="mt-4">
        <BuildOverview builds={builds} onAddBuild={() => {}} />
      </div>
      <div className="mt-4 bg-white border rounded-lg flex overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
        <div className="w-1/2 min-w-[500px] overflow-auto border-r">
          <TreeTable grouped={grouped} expandedWeeks={expandedWeeks} expandedMembers={expandedMembers} onToggleWeek={toggleWeek} onToggleMember={toggleMember} />
        </div>
        <div className="flex-1 overflow-auto">
          <GanttChart grouped={grouped} month={month} year={year} expandedWeeks={expandedWeeks} expandedMembers={expandedMembers} onDateChange={handleDateChange} />
        </div>
      </div>
      {showTaskForm && (
        <TaskForm users={users} builds={builds} projectId={projectId!} onSubmit={(data) => { createTask.mutate(data, { onSuccess: () => setShowTaskForm(false) }); }} onCancel={() => setShowTaskForm(false)} />
      )}
    </div>
  );
}
