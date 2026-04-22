import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApiTokens, createApiToken, deleteApiToken, type CreatedApiToken } from '../api/apiTokens';
import { useProjects } from '../hooks/useProjects';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ApiTokensPage() {
  const qc = useQueryClient();
  const { data: tokens = [], isLoading } = useQuery({ queryKey: ['apiTokens'], queryFn: fetchApiTokens });
  const { data: projects = [] } = useProjects();

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProjectId, setNewProjectId] = useState<string>('');
  const [newScope, setNewScope] = useState<'read' | 'write'>('read');
  const [newExpiresInDays, setNewExpiresInDays] = useState<string>('365');
  const [justCreated, setJustCreated] = useState<CreatedApiToken | null>(null);
  const [copyOk, setCopyOk] = useState(false);

  const createMut = useMutation({
    mutationFn: createApiToken,
    onSuccess: (data) => {
      setJustCreated(data);
      setNewName('');
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['apiTokens'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteApiToken,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apiTokens'] }),
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMut.mutate({
      name: newName.trim(),
      projectId: newProjectId || null,
      scope: newScope,
      expiresInDays: newExpiresInDays ? parseInt(newExpiresInDays) : undefined,
    });
  };

  const handleCopy = async () => {
    if (!justCreated) return;
    await navigator.clipboard.writeText(justCreated.token);
    setCopyOk(true);
    setTimeout(() => setCopyOk(false), 2000);
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">API Tokens</h1>
          <p className="text-sm text-gray-500 mt-1">
            Long-lived token cho bot / external agent. Dùng header <code className="bg-gray-100 px-1 rounded text-xs">Authorization: Bearer &lt;token&gt;</code>.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setJustCreated(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          + Tạo token
        </button>
      </div>

      {/* Just-created token banner */}
      {justCreated && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-green-800 mb-1">Token đã tạo — copy ngay, sẽ không hiện lại!</div>
              <div className="text-xs text-green-700 mb-2">
                {justCreated.name} · scope: {justCreated.scope} · expires: {formatDate(justCreated.expiresAt)}
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-green-200 rounded px-2 py-1.5 text-xs font-mono break-all">
                  {justCreated.token}
                </code>
                <button
                  onClick={handleCopy}
                  className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 whitespace-nowrap"
                >
                  {copyOk ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <button
              onClick={() => setJustCreated(null)}
              className="text-green-700 hover:text-green-900 ml-3"
              title="Đóng (em đã copy rồi)"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tên token</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: CTP1_DASHBOARD_BOT"
                className="w-full text-sm border rounded px-3 py-2 outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Scope project</label>
              <select
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 outline-none focus:border-blue-400"
              >
                <option value="">Tất cả project (admin)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Permission</label>
              <select
                value={newScope}
                onChange={(e) => setNewScope(e.target.value as 'read' | 'write')}
                className="w-full text-sm border rounded px-3 py-2 outline-none focus:border-blue-400"
              >
                <option value="read">Read-only (recommended)</option>
                <option value="write">Read + write</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hết hạn sau (ngày)</label>
              <input
                type="number"
                value={newExpiresInDays}
                onChange={(e) => setNewExpiresInDays(e.target.value)}
                placeholder="Để trống = không hết hạn"
                className="w-full text-sm border rounded px-3 py-2 outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createMut.isPending || !newName.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {createMut.isPending ? '...' : 'Tạo'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700 text-sm px-2">
              Hủy
            </button>
          </div>
          {createMut.isError && (
            <div className="text-red-500 text-xs mt-2">{(createMut.error as any)?.message || 'Lỗi tạo token'}</div>
          )}
        </div>
      )}

      {/* Token list */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tên</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Prefix</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Project</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Scope</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Last used</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Expires</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {tokens.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Chưa có API token nào. Tạo token để cho bot truy cập.
                </td>
              </tr>
            ) : (
              tokens.map((t) => (
                <tr key={t.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.tokenPrefix}…</td>
                  <td className="px-4 py-3 text-gray-600">{t.project?.name ?? <span className="text-gray-400 italic">All</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${t.scope === 'read' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{t.scope}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(t.lastUsedAt)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(t.expiresAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { if (confirm(`Revoke token "${t.name}"? Bot dùng token này sẽ mất quyền truy cập.`)) deleteMut.mutate(t.id); }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Usage example */}
      <div className="mt-6 bg-gray-50 border rounded-lg p-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Cách dùng</div>
        <pre className="text-xs bg-white border rounded p-3 overflow-x-auto font-mono">{`# Lấy danh sách tasks của project trong tháng
curl -H "Authorization: Bearer ctp1_xxxxxxxx..." \\
  "${window.location.origin}/api/tasks?projectId=<projectId>&month=4&year=2026"

# Lấy danh sách builds (roadmap)
curl -H "Authorization: Bearer ctp1_xxxxxxxx..." \\
  "${window.location.origin}/api/builds?projectId=<projectId>&month=4&year=2026"`}</pre>
      </div>
    </div>
  );
}
