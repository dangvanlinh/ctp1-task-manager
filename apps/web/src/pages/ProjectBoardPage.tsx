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
import { useBuilds, useCreateBuild, useDeleteBuild, useUpdateBuild, useAddMilestone, useDeleteMilestone, useReorderBuilds } from '../hooks/useBuilds';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useReorderTasks } from '../hooks/useTasks';
import { fetchUsers } from '../api/users';
import type { TaskDto, UserDto } from '@ctp1/shared';
import { useAuthStore } from '../stores/authStore';
import { getWeekOfMonth, getWeekRange, getWeekCount } from '../utils/weekUtils';

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
  const { user: currentUser } = useAuthStore();
  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'PM';
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormDefaults, setTaskFormDefaults] = useState<{ assigneeId?: string; week?: number }>({});
  const [activeWeeks, setActiveWeeks] = useState<number[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [timelineSyncKey, setTimelineSyncKey] = useState(0);

  const { data: builds = [] } = useBuilds(projectId!, month, year);
  const { data: tasks = [] } = useTasks(projectId!, month, year);
  const { data: allUsers = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  // Members dismissed from this project (persisted per-project in localStorage)
  const dismissedKey = `dismissedMembers-${projectId}`;
  const [dismissedMembers, setDismissedMembers] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(dismissedKey);
      if (raw) return new Set<string>(JSON.parse(raw));
    } catch { /* ignore */ }
    return new Set();
  });
  const users = useMemo(
    () => allUsers.filter((u) => u.role !== 'ADMIN' && !dismissedMembers.has(u.id)),
    [allUsers, dismissedMembers],
  );

  const handleRemoveMember = (userId: string) => {
    const u = allUsers.find((x) => x.id === userId);
    if (!confirm(`Xoá ${u?.name ?? 'thành viên'} khỏi project? Tất cả task của họ trong tháng này sẽ bị xoá.`)) return;
    // Delete all tasks of this user in currently loaded month
    tasks.filter((t) => t.assigneeId === userId).forEach((t) => deleteTask.mutate(t.id));
    // Persist dismissal
    setDismissedMembers((prev) => {
      const next = new Set(prev);
      next.add(userId);
      localStorage.setItem(dismissedKey, JSON.stringify(Array.from(next)));
      return next;
    });
  };
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const reorderTasks = useReorderTasks();
  const createBuild = useCreateBuild();
  const deleteBuild = useDeleteBuild();
  const updateBuild = useUpdateBuild();
  const addMilestone = useAddMilestone();
  const deleteMilestone = useDeleteMilestone();
  const reorderBuilds = useReorderBuilds();

  // Merge task weeks into activeWeeks without useEffect loop
  const activeWeeksWithTasks = useMemo(() => {
    const taskWeeks = new Set(tasks.map((t) => t.week));
    const merged = new Set([...activeWeeks, ...Array.from(taskWeeks)]);
    return Array.from(merged).sort((a, b) => b - a);
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
    const task = tasks.find((t) => t.id === taskId);
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    let synced = false;
    // Sync task → Dev Timeline (build phases in localStorage)
    if (task?.buildId) {
      const phasesKey = `devPhases-${task.buildId}`;
      try {
        const raw = localStorage.getItem(phasesKey);
        if (raw) {
          const phases = JSON.parse(raw);
          if (phases.length > 0) {
            phases[0].startDay = startDay;
            phases[phases.length - 1].endDay = endDay;
            localStorage.setItem(phasesKey, JSON.stringify(phases));
            synced = true;
          }
        }
      } catch { /* ignore */ }
    }
    // Sync task → Config Event (week build bars in localStorage)
    if (task?.title?.match(/^T\d+ Build$/)) {
      const ewKey = `eventWeeks-${projectId}-${year}-${month}`;
      try {
        const raw = localStorage.getItem(ewKey);
        if (raw) {
          const eventWeeks = JSON.parse(raw);
          const weekNum = parseInt(task.title.match(/^T(\d+) Build$/)?.[1] ?? '0');
          if (weekNum > 0) {
            const updated = eventWeeks.map((ew: any) =>
              ew.week === weekNum ? { ...ew, buildStart: startDay, buildEnd: endDay } : ew
            );
            localStorage.setItem(ewKey, JSON.stringify(updated));
            synced = true;
          }
        }
      } catch { /* ignore */ }
    }
    if (synced) setTimelineSyncKey((k) => k + 1);
  };

  const handleCreateInlineTask = (title: string, userId: string, week: number) => {
    const range = getWeekRange(week, month, year);
    const startDate = new Date(year, month - 1, range.startDay);
    const endDate = new Date(year, month - 1, range.startDay);
    // Set order to end of this user's task list in this week
    const userTasksInWeek = tasks.filter((t) => t.assigneeId === userId && t.week === week);
    const maxOrder = userTasksInWeek.length > 0 ? Math.max(...userTasksInWeek.map((t) => t.order)) : -1;
    createTask.mutate({
      title,
      assigneeId: userId,
      week,
      projectId: projectId!,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      priority: 'MEDIUM',
      order: maxOrder + 1,
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
        {canEdit && <button onClick={handleAddTaskGeneral} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">+ Thêm Task</button>}
      </div>
      <div className="mt-4">
        <WeeklyEventTimeline
          projectId={projectId!}
          month={month}
          year={year}
          dayWidth={DAY_WIDTH}
          builds={builds}
          syncKey={timelineSyncKey}
          users={users}
          onCreateBuild={(name) => {
            const today = new Date();
            const startDate = new Date(year, month - 1, Math.max(today.getDate(), 1));
            const liveDate = new Date(startDate.getTime() + 7 * 86400000);
            const endDate = new Date(liveDate.getTime() + 7 * 86400000);
            createBuild.mutate({ name, projectId: projectId!, month, year, startDate: startDate.toISOString(), liveDate: liveDate.toISOString(), endDate: endDate.toISOString() });
          }}
          onDeleteBuild={(id) => deleteBuild.mutate(id)}
          onReorderBuild={(buildId, direction) => {
            const idx = builds.findIndex((b) => b.id === buildId);
            if (idx < 0) return;
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= builds.length) return;
            const newOrder = builds.map((b) => b.id);
            [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
            reorderBuilds.mutate(newOrder);
          }}
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
            const week = getWeekOfMonth(startDay, month, year);
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
          onPhaseResize={(buildId, startDay, endDay) => {
            // Sync build phase time changes to tasks with matching buildId
            const matchingTasks = tasks.filter((t) => t.buildId === buildId);
            for (const task of matchingTasks) {
              const newStart = new Date(year, month - 1, startDay);
              const newEnd = new Date(year, month - 1, endDay);
              updateTask.mutate({ id: task.id, startDate: newStart.toISOString(), endDate: newEnd.toISOString() });
            }
          }}
          onWeekBuildResize={(week, buildLabel, startDay, endDay) => {
            // Sync week build bar time changes to tasks with matching title
            const matchingTasks = tasks.filter((t) => t.title === buildLabel);
            for (const task of matchingTasks) {
              const newStart = new Date(year, month - 1, startDay);
              const newEnd = new Date(year, month - 1, endDay);
              updateTask.mutate({ id: task.id, startDate: newStart.toISOString(), endDate: newEnd.toISOString() });
            }
          }}
          onUnassignBuild={(buildId, userId) => {
            const build = builds.find((b) => b.id === buildId);
            const currentIds = build?.assignees?.map((a) => a.userId) ?? [];
            updateBuild.mutate({ id: buildId, assigneeIds: currentIds.filter((id) => id !== userId) });
          }}
          onAssignWeek={(userId, week, buildLabel, buildStart, buildEnd) => {
            const actualWeek = getWeekOfMonth(buildStart, month, year);
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
            month={month}
            year={year}
            expandedWeeks={expandedWeeks}
            expandedMembers={expandedMembers}
            weeksWithTasks={weeksWithTasks}
            onToggleWeek={toggleWeek}
            onToggleMember={toggleMember}
            onCreateInlineTask={canEdit ? handleCreateInlineTask : undefined}
            onAddWeek={canEdit ? addWeek : undefined}
            onRemoveWeek={canEdit ? removeWeek : undefined}
            onUpdateTask={(taskId, data) => {
              // MEMBER can only update status of own tasks
              if (!canEdit) {
                const task = tasks.find((t) => t.id === taskId);
                if (!task || task.assigneeId !== currentUser?.id) return;
                if (Object.keys(data).some((k) => k !== 'status')) return;
              }
              updateTask.mutate({ id: taskId, ...data });
            }}
            onReorderTasks={canEdit ? (items) => reorderTasks.mutate(items) : undefined}
            onRemoveMember={canEdit ? handleRemoveMember : undefined}
            onDeleteTask={canEdit ? (taskId) => {
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
            } : undefined}
          />
        </div>
        <div className="flex-1 overflow-auto">
          <GanttChart grouped={grouped} activeWeeks={activeWeeksWithTasks} month={month} year={year} expandedWeeks={expandedWeeks} expandedMembers={expandedMembers} onDateChange={canEdit ? handleDateChange : () => {}} />
        </div>
      </div>
      {showTaskForm && (
        <TaskForm
          users={users}
          builds={builds}
          projectId={projectId!}
          month={month}
          year={year}
          defaultAssigneeId={taskFormDefaults.assigneeId}
          defaultWeek={taskFormDefaults.week}
          onSubmit={(data) => { createTask.mutate(data, { onSuccess: () => setShowTaskForm(false) }); }}
          onCancel={() => setShowTaskForm(false)}
        />
      )}
    </div>
  );
}
