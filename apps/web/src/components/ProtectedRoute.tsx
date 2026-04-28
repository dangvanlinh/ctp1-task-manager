import { useAuthStore, setAuth } from '../stores/authStore';
import { login, ssoLogin } from '../api/auth';
import { useEffect, useRef, useState } from 'react';

function parseJwt(token: string) {
  const base64 = token.split('.')[1];
  return JSON.parse(atob(base64));
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const [authFailed, setAuthFailed] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (token || attempted.current) return;
    attempted.current = true;

    // Production: SSO login via X-Forwarded-Email header (set by ZPS OAuth2 Proxy)
    // Dev: fallback to PM/123456 password login for convenience
    const loginFlow = import.meta.env.DEV
      ? login('PM', '123456')
      : ssoLogin();

    loginFlow
      .then((data) => {
        const payload = parseJwt(data.accessToken);
        setAuth(data.accessToken, {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          role: payload.role,
          position: 'DEV',
          createdAt: '',
        });
      })
      .catch((err) => {
        setAuthFailed(err?.message || 'Không đăng nhập được');
      });
  }, [token]);

  if (!token && authFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Không có quyền truy cập</h1>
          <p className="text-sm text-gray-600 mb-4">{authFailed}</p>
          <p className="text-xs text-gray-400 mb-4">Liên hệ PM để được thêm vào Members với email SSO của bạn.</p>
          <a href="/login" className="text-sm text-blue-600 hover:underline">Đăng nhập bằng mật khẩu (admin/bootstrap) →</a>
        </div>
      </div>
    );
  }

  if (!token) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Đang đăng nhập qua SSO...</div>;
  }

  return <>{children}</>;
}
