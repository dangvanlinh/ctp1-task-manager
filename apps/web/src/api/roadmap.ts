import { apiFetch } from './client';

export interface RoadmapUpdateDto {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  color: string;
  startDate: string;
  endDate: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export function fetchRoadmap(projectId: string) {
  return apiFetch<RoadmapUpdateDto[]>(`/roadmap?projectId=${projectId}`);
}

export function createRoadmap(data: {
  projectId: string;
  name: string;
  description?: string | null;
  color?: string;
  startDate: string;
  endDate: string;
  order?: number;
}) {
  return apiFetch<RoadmapUpdateDto>('/roadmap', { method: 'POST', body: JSON.stringify(data) });
}

export function updateRoadmap(id: string, data: Partial<{
  name: string;
  description: string | null;
  color: string;
  startDate: string;
  endDate: string;
  order: number;
}>) {
  return apiFetch<RoadmapUpdateDto>(`/roadmap/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteRoadmap(id: string) {
  return apiFetch<{ success: true }>(`/roadmap/${id}`, { method: 'DELETE' });
}
