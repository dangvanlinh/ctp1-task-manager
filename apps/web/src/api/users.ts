import { apiFetch } from './client';
import type { UserDto } from '@ctp1/shared';

export function fetchUsers() {
  return apiFetch<UserDto[]>('/users');
}

export function createUser(data: { email?: string; ssoEmail?: string | null; name: string; role?: string; position?: string }) {
  return apiFetch<UserDto>('/users', { method: 'POST', body: JSON.stringify(data) });
}

export function updateUser(id: string, data: { name?: string; email?: string; ssoEmail?: string | null; role?: string; position?: string }) {
  return apiFetch<UserDto>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteUser(id: string) {
  return apiFetch(`/users/${id}`, { method: 'DELETE' });
}

export function resetUserPassword(id: string) {
  return apiFetch<UserDto>(`/users/${id}/reset-password`, { method: 'PATCH' });
}
