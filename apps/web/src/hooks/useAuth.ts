import { useMutation } from '@tanstack/react-query';
import { login, register } from '../api/auth';
import { setAuth, clearAuth } from '../stores/authStore';

function parseJwt(token: string) {
  const base64 = token.split('.')[1];
  return JSON.parse(atob(base64));
}

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    onSuccess: (data) => {
      const payload = parseJwt(data.accessToken);
      setAuth(data.accessToken, {
        id: payload.sub,
        email: payload.email,
        name: payload.email.split('@')[0],
        role: payload.role,
        createdAt: '',
      });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      register(email, password, name),
    onSuccess: (data) => {
      const payload = parseJwt(data.accessToken);
      setAuth(data.accessToken, {
        id: payload.sub,
        email: payload.email,
        name: payload.email.split('@')[0],
        role: payload.role,
        createdAt: '',
      });
    },
  });
}

export function useLogout() {
  return clearAuth;
}
