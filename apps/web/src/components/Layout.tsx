import { useAuthStore, clearAuth } from '../stores/authStore';
import { useNavigate, useLocation, useMatch } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isPmOrAdmin = user?.role === 'PM' || user?.role === 'ADMIN';

  const projectMatch = useMatch('/projects/:projectId');
  const { data: projects } = useProjects();
  const currentProject = projectMatch
    ? projects?.find((p) => p.id === projectMatch.params.projectId)
    : null;
  const title = currentProject?.name ?? 'CTP1 Task Manager';

  const navItem = (path: string, label: string) => {
    const active = location.pathname === path;
    return (
      <button
        onClick={() => navigate(path)}
        className={`text-sm px-3.5 py-1.5 rounded-lg font-medium transition-all ${
          active
            ? 'text-white shadow-md'
            : 'text-[#8B6E60] hover:text-[#E8341A] hover:bg-[#FFF0EB]'
        }`}
        style={
          active
            ? { background: 'linear-gradient(135deg, #E8341A 0%, #F5A623 100%)', boxShadow: '0 4px 14px rgba(232,52,26,0.25)' }
            : undefined
        }
      >
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: '#FFF8F5' }}>
      <header className="bg-white border-b border-[#FFE4D6] px-6 py-3 flex items-center justify-between sticky top-0 z-30" style={{ boxShadow: '0 1px 8px rgba(45,27,20,0.04)' }}>
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 group"
          >
            <img
              src="/fox_small.png"
              alt="ZPS"
              className="w-9 h-9 rounded-[10px] object-contain group-hover:scale-105 transition-transform"
              style={{ filter: 'drop-shadow(0 2px 6px rgba(232,52,26,0.2))' }}
            />
            <div className="flex flex-col items-start leading-tight">
              <span className="zps-brand-text text-base">{title}</span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#8B6E60] font-semibold">ZPS Studio</span>
            </div>
          </button>
          <nav className="flex items-center gap-1.5">
            {navItem('/', 'Projects')}
            {isPmOrAdmin && navItem('/members', 'Members')}
            {isPmOrAdmin && navItem('/api-tokens', 'API Tokens')}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #E8341A 0%, #F5A623 100%)' }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-sm font-semibold text-[#2D1B14]">{user?.name}</span>
              <span
                className={`text-[10px] uppercase tracking-wider font-semibold ${
                  user?.role === 'ADMIN' ? 'text-[#E8341A]' :
                  user?.role === 'PM' ? 'text-[#7C4DFF]' :
                  'text-[#8B6E60]'
                }`}
              >
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={() => { clearAuth(); navigate('/login'); }}
            className="text-sm text-[#8B6E60] hover:text-[#E8341A] px-3 py-1.5 rounded-lg hover:bg-[#FFF0EB] transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
