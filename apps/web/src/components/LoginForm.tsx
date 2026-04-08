import { useState } from 'react';
import { useLogin } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        loginMutation.mutate({ email, password });
      }}
      className="flex flex-col gap-4 w-80"
    >
      <h1 className="text-2xl font-bold">Dang nhap</h1>
      {loginMutation.error && <p className="text-red-500 text-sm">{loginMutation.error.message}</p>}
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="border rounded px-3 py-2" required />
      <input type="password" placeholder="Mat khau" value={password} onChange={(e) => setPassword(e.target.value)} className="border rounded px-3 py-2" required />
      <button type="submit" disabled={loginMutation.isPending} className="bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700 disabled:opacity-50">
        {loginMutation.isPending ? 'Dang dang nhap...' : 'Dang nhap'}
      </button>
      <Link to="/register" className="text-blue-600 text-sm text-center">Chua co tai khoan? Dang ky</Link>
    </form>
  );
}
