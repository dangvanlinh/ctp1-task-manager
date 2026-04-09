import { useState } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useResetUserPassword } from '../hooks/useUsers';
import { useAuthStore } from '../stores/authStore';

export default function MembersPage() {
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();
  const currentUser = useAuthStore((s) => s.user);

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('MEMBER');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    createUser.mutate({ email: newEmail.trim() || undefined, name: newName.trim(), role: newRole }, {
      onSuccess: () => { setNewName(''); setNewEmail(''); setNewRole('MEMBER'); setShowForm(false); },
    });
  };

  const handleUpdate = (id: string) => {
    updateUser.mutate({ id, name: editName, email: editEmail, role: editRole }, {
      onSuccess: () => setEditingId(null),
    });
  };

  const startEdit = (user: { id: string; name: string; email: string; role: string }) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
  };

  const roleColor = (role: string) => {
    if (role === 'ADMIN') return 'bg-red-100 text-red-700';
    if (role === 'PM') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-600';
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Quản lý thành viên</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          + Thêm thành viên
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="text-sm font-medium text-gray-700 mb-3">Thêm thành viên mới (mật khẩu mặc định: 123456)</div>
          <div className="flex items-center gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tên hiển thị"
              className="flex-1 text-sm border rounded px-3 py-2 outline-none focus:border-blue-400"
            />
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email (tùy chọn)"
              className="flex-1 text-sm border rounded px-3 py-2 outline-none focus:border-blue-400"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="text-sm border rounded px-3 py-2 outline-none focus:border-blue-400"
            >
              <option value="MEMBER">Member</option>
              <option value="PM">PM</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={createUser.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {createUser.isPending ? '...' : 'Tạo'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-sm px-2">
              Hủy
            </button>
          </div>
          {createUser.isError && (
            <div className="text-red-500 text-xs mt-2">{(createUser.error as any)?.message || 'Lỗi tạo user'}</div>
          )}
        </div>
      )}

      {/* User list */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tên</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-b-0 hover:bg-gray-50">
                {editingId === user.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-sm border rounded px-2 py-1 w-full outline-none focus:border-blue-400" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="text-sm border rounded px-2 py-1 w-full outline-none focus:border-blue-400" />
                    </td>
                    <td className="px-4 py-2">
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="text-sm border rounded px-2 py-1 outline-none">
                        <option value="MEMBER">Member</option>
                        <option value="PM">PM</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button onClick={() => handleUpdate(user.id)} className="text-blue-600 hover:text-blue-800 text-xs">Lưu</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Hủy</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-800">{user.name}</td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${roleColor(user.role)}`}>{user.role}</span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => startEdit(user)} className="text-blue-500 hover:text-blue-700 text-xs">Sửa</button>
                      <button
                        onClick={() => { if (confirm('Reset mật khẩu về 123456?')) resetPassword.mutate(user.id); }}
                        className="text-orange-500 hover:text-orange-700 text-xs"
                      >
                        Reset MK
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => { if (confirm(`Xóa ${user.name}?`)) deleteUser.mutate(user.id); }}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          Xóa
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
