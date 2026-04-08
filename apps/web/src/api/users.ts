import { apiFetch } from './client';
import type { UserDto } from '@ctp1/shared';

export function fetchUsers() {
  return apiFetch<UserDto[]>('/users');
}
