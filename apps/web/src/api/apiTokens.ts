import { apiFetch } from './client';

export interface ApiTokenDto {
  id: string;
  name: string;
  tokenPrefix: string;
  projectId: string | null;
  scope: 'read' | 'write';
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdBy: { id: string; name: string };
  project: { id: string; name: string } | null;
}

export interface CreatedApiToken extends Omit<ApiTokenDto, 'createdBy' | 'project' | 'lastUsedAt'> {
  token: string; // full token — shown ONCE
}

export function fetchApiTokens() {
  return apiFetch<ApiTokenDto[]>('/api-tokens');
}

export function createApiToken(data: {
  name: string;
  projectId?: string | null;
  scope?: 'read' | 'write';
  expiresInDays?: number;
}) {
  return apiFetch<CreatedApiToken>('/api-tokens', { method: 'POST', body: JSON.stringify(data) });
}

export function deleteApiToken(id: string) {
  return apiFetch<{ success: true }>(`/api-tokens/${id}`, { method: 'DELETE' });
}
