import { useSyncExternalStore } from 'react';
import type { UserDto } from '@ctp1/shared';

interface AuthState {
  user: UserDto | null;
  token: string | null;
}

let state: AuthState = {
  user: null,
  token: localStorage.getItem('accessToken'),
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setAuth(token: string, user: UserDto) {
  localStorage.setItem('accessToken', token);
  state = { user, token };
  emit();
}

export function clearAuth() {
  localStorage.removeItem('accessToken');
  state = { user: null, token: null };
  emit();
}

export function useAuthStore() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}
