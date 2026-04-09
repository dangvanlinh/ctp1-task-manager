import { useAuthStore, clearAuth } from '../stores/authStore';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isPmOrAdmin = user?.role === 'PM' || user?.role === 'ADMIN';

  const navItem = (path: string, label: string) => (
    <button
      onClick={() => navigate(path)}
      className={`text-sm px-3 py-1 rounded ${location.pathname === path ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-800 cursor-pointer" onClick={() => navigate('/')}>CTP1 Task Manager</h1>
          <nav className="flex items-center gap-1">
            {navItem('/', 'Projects')}
            {isPmOrAdmin && navItem('/members', 'Members')}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name} <span className={`text-xs px-1.5 py-0.5 rounded ${user?.role === 'ADMIN' ? 'bg-red-100 text-red-600' : user?.role === 'PM' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{user?.role}</span></span>
          <button onClick={() => { clearAuth(); navigate('/login'); }} className="text-sm text-red-500 hover:text-red-700">Đăng xuất</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
