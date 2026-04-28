import { useState } from 'react';
import { useLogin } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          'radial-gradient(circle at 25% 20%, rgba(232,52,26,0.08), transparent 50%), radial-gradient(circle at 80% 80%, rgba(245,166,35,0.08), transparent 50%), #FFF8F5',
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo splash */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo_small.png"
            alt="ZPS Studio"
            className="w-32 h-32 mb-4 object-contain"
            style={{ filter: 'drop-shadow(0 8px 24px rgba(232,52,26,0.18))' }}
          />
          <h1 className="text-2xl font-extrabold text-[#2D1B14]">CTP1 Task Manager</h1>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#8B6E60] font-semibold mt-1">ZPS Studio</p>
        </div>

        {/* Login card */}
        <div
          className="bg-white rounded-2xl p-7"
          style={{ boxShadow: '0 12px 40px rgba(45,27,20,0.08)', border: '1px solid #FFE4D6' }}
        >
          <h2 className="text-lg font-bold text-[#2D1B14] mb-1">Đăng nhập</h2>
          <p className="text-sm text-[#8B6E60] mb-5">Vào lại sau khi SSO hết hạn</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loginMutation.mutate({ name, password }, { onSuccess: () => navigate('/') });
            }}
            className="flex flex-col gap-3"
          >
            {loginMutation.error && (
              <div className="text-[#E8341A] text-sm bg-[#FFF0EB] border border-[#FFD4C4] rounded-lg px-3 py-2">
                {loginMutation.error.message}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#8B6E60] uppercase tracking-wider mb-1.5">Tên đăng nhập</label>
              <input
                type="text"
                placeholder="VD: PM"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-[#FFE4D6] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623]/20 bg-[#FFF8F5] transition"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8B6E60] uppercase tracking-wider mb-1.5">Mật khẩu</label>
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#FFE4D6] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623]/20 bg-[#FFF8F5] transition"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="mt-2 text-white font-semibold rounded-lg px-4 py-2.5 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 transition-all"
              style={{
                background: 'linear-gradient(135deg, #E8341A 0%, #F5A623 100%)',
                boxShadow: '0 6px 20px rgba(232,52,26,0.3)',
              }}
            >
              {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#8B6E60] mt-6">© ZPS Studio · CTP1</p>
      </div>
    </div>
  );
}
