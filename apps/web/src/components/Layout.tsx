import { useAuthStore, clearAuth } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">CTP1 Task Manager</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name} ({user?.role})</span>
          <button onClick={() => { clearAuth(); navigate('/login'); }} className="text-sm text-red-500 hover:text-red-700">Dang xuat</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
