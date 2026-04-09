import { useState } from 'react';
import { useRegister } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const registerMutation = useRegister();
  const navigate = useNavigate();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        registerMutation.mutate({ email, password, name }, { onSuccess: () => navigate('/') });
      }}
      className="flex flex-col gap-4 w-80"
    >
      <h1 className="text-2xl font-bold">Đăng ký</h1>
      {registerMutation.error && <p className="text-red-500 text-sm">{registerMutation.error.message}</p>}
      <input type="text" placeholder="Họ tên" value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-3 py-2" required />
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="border rounded px-3 py-2" required />
      <input type="password" placeholder="Mật khẩu (tối thiểu 6 ký tự)" value={password} onChange={(e) => setPassword(e.target.value)} className="border rounded px-3 py-2" required minLength={6} />
      <button type="submit" disabled={registerMutation.isPending} className="bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700 disabled:opacity-50">
        {registerMutation.isPending ? 'Đang đăng ký...' : 'Đăng ký'}
      </button>
      <Link to="/login" className="text-blue-600 text-sm text-center">Đã có tài khoản? Đăng nhập</Link>
    </form>
  );
}
