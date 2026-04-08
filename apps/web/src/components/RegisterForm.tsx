import { useState } from 'react';
import { useRegister } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const registerMutation = useRegister();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        registerMutation.mutate({ email, password, name });
      }}
      className="flex flex-col gap-4 w-80"
    >
      <h1 className="text-2xl font-bold">Dang ky</h1>
      {registerMutation.error && <p className="text-red-500 text-sm">{registerMutation.error.message}</p>}
      <input type="text" placeholder="Ho ten" value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-3 py-2" required />
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="border rounded px-3 py-2" required />
      <input type="password" placeholder="Mat khau (min 6 ky tu)" value={password} onChange={(e) => setPassword(e.target.value)} className="border rounded px-3 py-2" required minLength={6} />
      <button type="submit" disabled={registerMutation.isPending} className="bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700 disabled:opacity-50">
        {registerMutation.isPending ? 'Dang dang ky...' : 'Dang ky'}
      </button>
      <Link to="/login" className="text-blue-600 text-sm text-center">Da co tai khoan? Dang nhap</Link>
    </form>
  );
}
