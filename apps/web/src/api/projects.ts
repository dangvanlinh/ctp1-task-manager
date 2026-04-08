import { apiFetch } from './client';
import type { ProjectDto } from '@ctp1/shared';

export function fetchProjects() {
  return apiFetch<ProjectDto[]>('/projects');
}

export function createProject(data: { name: string; description?: string }) {
  return apiFetch<ProjectDto>('/projects', { method: 'POST', body: JSON.stringify(data) });
}
