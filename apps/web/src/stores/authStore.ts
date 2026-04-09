import { useSyncExternalStore } from 'react';
import type { UserDto } from '@ctp1/shared';

interface AuthState {
  user: UserDto | null;
  token: string | null;
}

function parseUserFromToken(token: string | null): UserDto | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('accessToken');
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      role: payload.role,
      createdAt: '',
    } as UserDto;
  } catch {
    return null;
  }
}

const savedToken = localStorage.getItem('accessToken');

let state: AuthState = {
  user: parseUserFromToken(savedToken),
  token: savedToken,
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
  localStorage.removeItem('refreshToken');
  state = { user: null, token: null };
  emit();
}

export function useAuthStore(): AuthState;
export function useAuthStore<T>(selector: (s: AuthState) => T): T;
export function useAuthStore<T>(selector?: (s: AuthState) => T) {
  const snapshot = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
  return selector ? selector(snapshot) : snapshot;
}
