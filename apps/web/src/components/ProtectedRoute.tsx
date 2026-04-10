import { Navigate } from 'react-router-dom';
import { useAuthStore, setAuth } from '../stores/authStore';
import { login } from '../api/auth';
import { useEffect, useRef, useState } from 'react';

function parseJwt(token: string) {
  const base64 = token.split('.')[1];
  return JSON.parse(atob(base64));
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const [autoLoginFailed, setAutoLoginFailed] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (!token && !attempted.current && import.meta.env.DEV) {
      attempted.current = true;
      login('PM', '123456')
        .then((data) => {
          const payload = parseJwt(data.accessToken);
          setAuth(data.accessToken, {
            id: payload.sub,
            email: payload.email,
            name: payload.name || 'PM',
            role: payload.role,
            position: payload.position || 'DEV',
            createdAt: '',
          });
        })
        .catch(() => setAutoLoginFailed(true));
    }
  }, [token]);

  if (!token && (autoLoginFailed || !import.meta.env.DEV)) return <Navigate to="/login" replace />;
  if (!token) return <div className="min-h-screen flex items-center justify-center text-gray-400">Đang đăng nhập...</div>;
  return <>{children}</>;
}
