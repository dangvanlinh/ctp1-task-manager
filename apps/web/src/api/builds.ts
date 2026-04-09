import { apiFetch } from './client';
import type { BuildDto } from '@ctp1/shared';

export function fetchBuilds(projectId: string, month: number, year: number) {
  return apiFetch<BuildDto[]>(`/builds?projectId=${projectId}&month=${month}&year=${year}`);
}

export interface CreateBuildPayload {
  name: string;
  projectId: string;
  month: number;
  year: number;
  startDate?: string;
  liveDate?: string;
  endDate?: string;
  assigneeIds?: string[];
  milestones?: { name: string; date: string; type?: string }[];
}

export function createBuild(data: CreateBuildPayload) {
  return apiFetch<BuildDto>('/builds', { method: 'POST', body: JSON.stringify(data) });
}

export function updateBuild(id: string, data: Partial<CreateBuildPayload>) {
  return apiFetch<BuildDto>(`/builds/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteBuild(id: string) {
  return apiFetch<BuildDto>(`/builds/${id}`, { method: 'DELETE' });
}

export function addMilestone(buildId: string, data: { name: string; date: string; type: string }) {
  return apiFetch<BuildDto>(`/builds/${buildId}/milestones`, { method: 'POST', body: JSON.stringify(data) });
}

export function deleteMilestone(milestoneId: string) {
  return apiFetch<BuildDto>(`/builds/milestones/${milestoneId}`, { method: 'DELETE' });
}
