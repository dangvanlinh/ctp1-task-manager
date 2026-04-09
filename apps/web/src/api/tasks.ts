import { apiFetch } from './client';
import type { TaskDto } from '@ctp1/shared';

export function fetchTasks(projectId: string, month: number, year: number, week?: number) {
  let url = `/tasks?projectId=${projectId}&month=${month}&year=${year}`;
  if (week) url += `&week=${week}`;
  return apiFetch<TaskDto[]>(url);
}

export function createTask(data: {
  title: string;
  description?: string;
  priority?: string;
  startDate: string;
  endDate: string;
  week: number;
  buildId?: string;
  assigneeId: string;
  projectId: string;
}) {
  return apiFetch<TaskDto>('/tasks', { method: 'POST', body: JSON.stringify(data) });
}

export function updateTask(id: string, data: Record<string, any>) {
  return apiFetch<TaskDto>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function reorderTasks(items: { id: string; order: number }[]) {
  return apiFetch('/tasks/reorder', { method: 'PATCH', body: JSON.stringify({ items }) });
}

export function deleteTask(id: string) {
  return apiFetch<TaskDto>(`/tasks/${id}`, { method: 'DELETE' });
}
