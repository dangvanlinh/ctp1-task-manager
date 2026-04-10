import { apiFetch } from './client';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export function login(name: string, password: string) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name, password }),
  });
}

export function register(email: string, password: string, name: string) {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}
