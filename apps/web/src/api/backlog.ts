import { apiFetch } from './client';

export interface BacklogItemDto {
  id: string;
  projectId: string;
  text: string;
  done: boolean;
  order: number;
  createdAt: string;
}

export function fetchBacklog(projectId: string) {
  return apiFetch<BacklogItemDto[]>(`/backlog?projectId=${projectId}`);
}

export function createBacklog(data: { projectId: string; text: string; done?: boolean; order?: number }) {
  return apiFetch<BacklogItemDto>('/backlog', { method: 'POST', body: JSON.stringify(data) });
}

export function updateBacklog(id: string, data: { text?: string; done?: boolean; order?: number }) {
  return apiFetch<BacklogItemDto>(`/backlog/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteBacklog(id: string) {
  return apiFetch<{ success: true }>(`/backlog/${id}`, { method: 'DELETE' });
}

export function bulkBacklog(projectId: string, items: { text: string; done?: boolean; order?: number }[]) {
  return apiFetch<{ count: number }>('/backlog/bulk', {
    method: 'POST',
    body: JSON.stringify({ projectId, items }),
  });
}
