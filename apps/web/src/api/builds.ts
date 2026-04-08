import { apiFetch } from './client';
import type { BuildDto } from '@ctp1/shared';

export function fetchBuilds(projectId: string, month: number, year: number) {
  return apiFetch<BuildDto[]>(`/builds?projectId=${projectId}&month=${month}&year=${year}`);
}

export function createBuild(data: { name: string; projectId: string; month: number; year: number }) {
  return apiFetch<BuildDto>('/builds', { method: 'POST', body: JSON.stringify(data) });
}

export function updateBuild(id: string, data: { name?: string }) {
  return apiFetch<BuildDto>(`/builds/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteBuild(id: string) {
  return apiFetch<BuildDto>(`/builds/${id}`, { method: 'DELETE' });
}
