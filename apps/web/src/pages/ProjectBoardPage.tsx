import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MonthWeekSelector from '../components/MonthWeekSelector';
import WeeklyEventTimeline from '../components/WeeklyEventTimeline';
import TreeTable from '../components/TreeTable';
import GanttChart from '../components/GanttChart';
import TaskForm from '../components/TaskForm';
import BacklogBox from '../components/BacklogBox';
import DocLinksBox from '../components/DocLinksBox';
import { useBuilds, useCreateBuild, useDeleteBuild, useUpdateBuild, useAddMilestone, useDeleteMilestone } from '../hooks/useBuilds';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useReorderTasks } from '../hooks/useTasks';
import { fetchUsers } from '../api/users';
import type { TaskDto, UserDto } from '@ctp1/shared';

const DAY_WIDTH = 40;

function sortUsersByPosition(users: UserDto[]): UserDto[] {
  const order: Record<string, number> = { DESIGNER: 0, DEV: 1, ARTIST: 2 };
  return [...users].sort((a, b) => (order[a.position] ?? 99) - (order[b.position] ?? 99));
}

function groupTasksByWeekAndMember(
  tasks: TaskDto[],
  allUsers: UserDto[],
  activeWeeks: number[],
  hasFilter = false,
): Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>> {
  const weekMap = new Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>>();
  const sortedUsers = sortUsersByPosition(allUsers);

  for (const week of activeWeeks) {
    const memberMap = new Map<string, { user: UserDto; tasks: TaskDto[] }>();
    if (!hasFilter) {
      for (const user of sortedUsers) {
        memberMap.set(user.id, { user, tasks: [] });
      }
    }
    weekMap.set(week, memberMap);
  }

  for (const task of tasks) {
    const memberMap = weekMap.get(task.week);
    if (!memberMap) continue;
    if (!memberMap.has(task.assigneeId) && task.assignee) {
      memberMap.set(task.assigneeId, { user: task.assignee, tasks: [] });
    }
    memberMap.get(task.assigneeId)?.tasks.push(task);
  }

  // When filtering, remove empty weeks
  if (hasFilter) {
    for (const [week, memberMap] of weekMap) {
      if (memberMap.size === 0) weekMap.delete(week);
    }
  }

  return weekMap;
}

export default function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormDefaults, setTaskFormDefaults] = useState<{ assigneeId?: string; week?: number }>({});
  const [activeWeeks, setActiveWeeks] = useState<number[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  const { data: builds = [] } = useBuilds(projectId!, month, year);
  const { data: tasks = [] } = useTasks(projectId!, month, year);
  const { data: allUsers = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const users = useMemo(() => allUsers.filter((u) => u.role !== 'ADMIN'), [allUsers]);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const reorderTasks = useReorderTasks();
  const createBuild = useCreateBuild();
  const deleteBuild = useDeleteBuild();
  const updateBuild = useUpdateBuild();
  const addMilestone = useAddMilestone();
  const deleteMilestone = useDeleteMilestone();

  // Merge task weeks into activeWeeks without useEffect loop
  const activeWeeksWithTasks = useMemo(() => {
    const taskWeeks = new Set(tasks.map((t) => t.week));
    const merged = new Set([...activeWeeks, ...Array.from(taskWeeks)]);
    return Array.from(merged).sort((a, b) => a - b);
  }, [tasks, activeWeeks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }
    if (filterStatus) {
      result = result.filter((t) => t.status === filterStatus);
    }
    if (filterAssignee) {
      result = result.filter((t) => t.assigneeId === filterAssignee);
    }
    return result;
  }, [tasks, searchText, filterStatus, filterAssignee]);

  const hasFilter = !!(searchText.trim() || filterStatus || filterAssignee);
  const grouped = useMemo(() => groupTasksByWeekAndMember(filteredTasks, users, activeWeeksWithTasks, hasFilter), [filteredTasks, users, activeWeeksWithTasks, hasFilter]);

  // Track manually collapsed items (default = all expanded)
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(new Set());
  const [collapsedMembers, setCollapsedMembers] = useState<Set<string>>(new Set());

  // Derived: expanded = exists in grouped AND not manually collapsed
  const expandedWeeks = useMemo(() => {
    const set = new Set<number>();
    activeWeeksWithTasks.forEach((w) => { if (!collapsedWeeks.has(w)) set.add(w); });
    return set;
  }, [activeWeeksWithTasks, collapsedWeeks]);

  const expandedMembers = useMemo(() => {
    const set = new Set<string>();
    grouped.forEach((members, week) => {
      members.forEach((_, userId) => {
        const key = `${week}-${userId}`;
        if (!collapsedMembers.has(key)) set.add(key);
      });
    });
    return set;
  }, [grouped, collapsedMembers]);

  const addWeek = () => {
    const next = activeWeeksWithTasks.length === 0 ? 1 : Math.max(...activeWeeksWithTasks) + 1;
    if (next > 52) return;
    setActiveWeeks((prev) => [...prev, next].sort((a, b) => a - b));
  };

  const removeWeek = (week: number) => {
    const hasTasks = tasks.some((t) => t.week === week);
    if (hasTasks) return;
    setActiveWeeks((prev) => prev.filter((w) => w !== week));
  };

  const toggleWeek = (week: number) => {
    setCollapsedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  };

  const toggleMember = (key: string) => {
    setCollapsedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDateChange = (taskId: string, startDate: Date, endDate: Date) => {
    updateTask.mutate({ id: taskId, startDate: startDate.toISOString(), endDate: endDate.toISOString() });
  };

  const handleCreateInlineTask = (title: string, userId: string, week: number) => {
    const startDay = (week - 1) * 7 + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const clampedStart = Math.min(startDay, daysInMonth);
    const startDate = new Date(year, month - 1, clampedStart);
    const endDate = new Date(year, month - 1, clampedStart);
    createTask.mutate({
      title,
      assigneeId: userId,
      week,
      projectId: projectId!,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      priority: 'MEDIUM',
    });
  };

  const handleAddTaskGeneral = () => {
    setTaskFormDefaults({});
    setShowTaskForm(true);
  };

  const weeksWithTasks = useMemo(() => new Set(tasks.map((t) => t.week)), [tasks]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <MonthWeekSelector month={month} year={year} onChangeMonth={(m, y) => { setMonth(m); setYear(y); }} />
        <button onClick={handleAddTaskGeneral} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">+ Thêm Task</button>
      </div>
      <div className="mt-4">
        <WeeklyEventTimeline
          month={month}
          year={year}
          dayWidth={DAY_WIDTH}
          builds={builds}
          users={users}
          onCreateBuild={(name) => {
            const today = new Date();
            const startDate = new Date(year, month - 1, Math.max(today.getDate(), 1));
            const liveDate = new Date(startDate.getTime() + 7 * 86400000);
            const endDate = new Date(liveDate.getTime() + 7 * 86400000);
            createBuild.mutate({ name, projectId: projectId!, month, year, startDate: startDate.toISOString(), liveDate: liveDate.toISOString(), endDate: endDate.toISOString() });
          }}
          onDeleteBuild={(id) => deleteBuild.mutate(id)}
          onAddMilestone={(buildId, data) => addMilestone.mutate({ buildId, data })}
          onDeleteMilestone={(milestoneId) => deleteMilestone.mutate(milestoneId)}
          onUpdateBuild={(id, data) => updateBuild.mutate({ id, ...data })}
          onAssignBuild={(buildId, userId, buildName, startDay, endDay) => {
            // 1. Assign user to build
            const build = builds.find((b) => b.id === buildId);
            const currentIds = build?.assignees?.map((a) => a.userId) ?? [];
            if (!currentIds.includes(userId)) {
              updateBuild.mutate({ id: buildId, assigneeIds: [...currentIds, userId] });
            }
            // 2. Auto-create task for this user in the corresponding week
            const week = Math.ceil(startDay / 7) || 1;
            const startDate = new Date(year, month - 1, startDay);
            const endDate = new Date(year, month - 1, endDay);
            createTask.mutate({
              title: buildName,
              assigneeId: userId,
              week,
              projectId: projectId!,
              buildId: buildId,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              priority: 'MEDIUM',
            });
          }}
          onUnassignBuild={(buildId, userId) => {
            const build = builds.find((b) => b.id === buildId);
            const currentIds = build?.assignees?.map((a) => a.userId) ?? [];
            updateBuild.mutate({ id: buildId, assigneeIds: currentIds.filter((id) => id !== userId) });
          }}
          onAssignWeek={(userId, week, buildLabel, buildStart, buildEnd) => {
            const actualWeek = Math.ceil(buildStart / 7) || 1;
            const startDate = new Date(year, month - 1, buildStart);
            const endDate = new Date(year, month - 1, buildEnd);
            createTask.mutate({
              title: buildLabel,
              assigneeId: userId,
              week: actualWeek,
              projectId: projectId!,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              priority: 'MEDIUM',
            });
          }}
          onUnassignWeek={(userId, week, buildLabel) => {
            const matchingTask = tasks.find((t) => t.assigneeId === userId && t.title === buildLabel);
            if (matchingTask) {
              deleteTask.mutate(matchingTask.id);
            }
          }}
          leftPanel={<BacklogBox projectId={projectId!} />}
          rightPanel={<DocLinksBox projectId={projectId!} />}
        />
      </div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mt-4 mb-2 text-xs">
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Tìm task..."
          className="border rounded px-2 py-1.5 outline-none focus:border-blue-400 bg-white w-48"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="border rounded px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
        >
          <option value="">Tất cả thành viên</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        {(searchText || filterStatus || filterAssignee) && (
          <button
            onClick={() => { setSearchText(''); setFilterStatus(''); setFilterAssignee(''); }}
            className="text-red-500 hover:text-red-700 px-2 py-1.5"
          >
            Xoá bộ lọc
          </button>
        )}
      </div>
      <div className="bg-white border rounded-lg flex overflow-hidden">
        <div className="w-1/2 min-w-[500px] overflow-auto border-r">
          <TreeTable
            grouped={grouped}
            activeWeeks={activeWeeksWithTasks}
            expandedWeeks={expandedWeeks}
            expandedMembers={expandedMembers}
            weeksWithTasks={weeksWithTasks}
            onToggleWeek={toggleWeek}
            onToggleMember={toggleMember}
            onCreateInlineTask={handleCreateInlineTask}
            onAddWeek={addWeek}
            onRemoveWeek={removeWeek}
            onUpdateTask={(taskId, data) => updateTask.mutate({ id: taskId, ...data })}
            onReorderTasks={(items) => reorderTasks.mutate(items)}
            onDeleteTask={(taskId) => {
              const task = tasks.find((t) => t.id === taskId);
              if (task?.buildId) {
                // Unassign user from build
                const build = builds.find((b) => b.id === task.buildId);
                if (build) {
                  const currentIds = build.assignees?.map((a) => a.userId) ?? [];
                  updateBuild.mutate({ id: build.id, assigneeIds: currentIds.filter((id) => id !== task.assigneeId) });
                }
              }
              deleteTask.mutate(taskId);
            }}
          />
        </div>
        <div className="flex-1 overflow-auto">
          <GanttChart grouped={grouped} activeWeeks={activeWeeksWithTasks} month={month} year={year} expandedWeeks={expandedWeeks} expandedMembers={expandedMembers} onDateChange={handleDateChange} />
        </div>
      </div>
      {showTaskForm && (
        <TaskForm
          users={users}
          builds={builds}
          projectId={projectId!}
          defaultAssigneeId={taskFormDefaults.assigneeId}
          defaultWeek={taskFormDefaults.week}
          onSubmit={(data) => { createTask.mutate(data, { onSuccess: () => setShowTaskForm(false) }); }}
          onCancel={() => setShowTaskForm(false)}
        />
      )}
    </div>
  );
}
