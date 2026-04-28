import { apiFetch } from './client';

export interface DocLinkDto {
  id: string;
  projectId: string;
  title: string;
  url: string;
  addedBy: string;
  order: number;
  createdAt: string;
}

export function fetchDocLinks(projectId: string) {
  return apiFetch<DocLinkDto[]>(`/doc-links?projectId=${projectId}`);
}

export function createDocLink(data: { projectId: string; title: string; url: string; addedBy?: string; order?: number }) {
  return apiFetch<DocLinkDto>('/doc-links', { method: 'POST', body: JSON.stringify(data) });
}

export function updateDocLink(id: string, data: { title?: string; url?: string; addedBy?: string; order?: number }) {
  return apiFetch<DocLinkDto>(`/doc-links/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteDocLink(id: string) {
  return apiFetch<{ success: true }>(`/doc-links/${id}`, { method: 'DELETE' });
}

export function bulkDocLinks(projectId: string, items: { title: string; url: string; addedBy?: string; order?: number }[]) {
  return apiFetch<{ count: number }>('/doc-links/bulk', {
    method: 'POST',
    body: JSON.stringify({ projectId, items }),
  });
}
