import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBacklog, createBacklog, updateBacklog, deleteBacklog, bulkBacklog,
  type BacklogItemDto,
} from '../api/backlog';
import { fetchUsers } from '../api/users';
import type { UserDto } from '@ctp1/shared';

const LEGACY_KEY = (projectId: string) => `backlog-${projectId}`;

const TAB_ALL = '__all__';
const TAB_UNASSIGNED = '__none__';

export default function BacklogBox({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data: items = [], isFetched } = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: () => fetchBacklog(projectId),
    enabled: !!projectId,
  });
  const { data: allUsers = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const users = useMemo(() => allUsers.filter((u) => u.role !== 'ADMIN'), [allUsers]);

  const [collapsed, setCollapsed] = useState(false);
  const [newText, setNewText] = useState('');
  const [activeTab, setActiveTab] = useState<string>(TAB_ALL);
  const migrated = useRef(false);

  // One-time migration from localStorage
  useEffect(() => {
    if (migrated.current || !isFetched) return;
    if (items.length > 0) { migrated.current = true; return; }
    if (localStorage.getItem(LEGACY_KEY(projectId) + '-migrated')) {
      migrated.current = true;
      return;
    }
    try {
      const raw = localStorage.getItem(LEGACY_KEY(projectId));
      if (!raw) { migrated.current = true; return; }
      const legacy: { text: string; done: boolean }[] = JSON.parse(raw);
      if (!Array.isArray(legacy) || legacy.length === 0) { migrated.current = true; return; }
      migrated.current = true;
      localStorage.setItem(LEGACY_KEY(projectId) + '-migrated', '1');
      bulkBacklog(projectId, legacy.map((it, i) => ({ text: it.text, done: it.done, order: i })))
        .then(() => qc.invalidateQueries({ queryKey: ['backlog', projectId] }))
        .catch(() => { /* ignore */ });
    } catch { migrated.current = true; }
  }, [projectId, items.length, isFetched, qc]);

  const addMut = useMutation({
    mutationFn: createBacklog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backlog', projectId] }),
  });
  const updMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BacklogItemDto> }) => updateBacklog(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backlog', projectId] }),
  });
  const delMut = useMutation({
    mutationFn: deleteBacklog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backlog', projectId] }),
  });

  // Filter items by active tab
  const filteredItems = useMemo(() => {
    if (activeTab === TAB_ALL) return items;
    if (activeTab === TAB_UNASSIGNED) return items.filter((it) => !it.assigneeId);
    return items.filter((it) => it.assigneeId === activeTab);
  }, [items, activeTab]);

  // Compute counts per tab
  const counts = useMemo(() => {
    const map: Record<string, number> = { [TAB_ALL]: 0, [TAB_UNASSIGNED]: 0 };
    for (const it of items) {
      if (it.done) continue;
      map[TAB_ALL] = (map[TAB_ALL] || 0) + 1;
      const k = it.assigneeId || TAB_UNASSIGNED;
      map[k] = (map[k] || 0) + 1;
    }
    return map;
  }, [items]);

  const addItem = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const assigneeId = activeTab === TAB_ALL || activeTab === TAB_UNASSIGNED ? null : activeTab;
    addMut.mutate({
      projectId,
      text: trimmed,
      assigneeId,
      order: filteredItems.length,
    });
    setNewText('');
  };

  const userById = (id: string | null | undefined): UserDto | undefined =>
    id ? users.find((u) => u.id === id) : undefined;

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="flex items-center px-4 py-2 border-b bg-gradient-to-r from-amber-50 to-orange-50 gap-2">
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-gray-700 text-xs">
          {collapsed ? '▶' : '▼'}
        </button>
        <h2 className="font-semibold text-gray-700 text-sm">📋 Backlog</h2>
        <span className="text-[10px] text-gray-400">{counts[TAB_ALL] || 0} active</span>
      </div>

      {!collapsed && (
        <div>
          {/* Tab strip */}
          <div className="flex items-center gap-1 px-3 pt-2 border-b border-gray-100 overflow-x-auto">
            <TabBtn label="All" count={counts[TAB_ALL] || 0} active={activeTab === TAB_ALL} onClick={() => setActiveTab(TAB_ALL)} />
            <TabBtn label="Unassigned" count={counts[TAB_UNASSIGNED] || 0} active={activeTab === TAB_UNASSIGNED} onClick={() => setActiveTab(TAB_UNASSIGNED)} dim />
            <span className="mx-1 text-gray-300">·</span>
            {users.map((u) => (
              <TabBtn
                key={u.id}
                label={u.name}
                count={counts[u.id] || 0}
                active={activeTab === u.id}
                onClick={() => setActiveTab(u.id)}
              />
            ))}
          </div>

          <div className="px-4 py-3">
            <div className="space-y-1.5">
              {filteredItems.map((item) => {
                const owner = userById(item.assigneeId);
                return (
                  <div key={item.id} className="flex items-center gap-2 group/bl text-xs">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => updMut.mutate({ id: item.id, data: { done: !item.done } })}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 flex-shrink-0"
                    />
                    <input
                      defaultValue={item.text}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== item.text) updMut.mutate({ id: item.id, data: { text: v } });
                      }}
                      className={`flex-1 bg-transparent outline-none border-0 px-1 py-0.5 hover:bg-gray-50 rounded ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}
                    />
                    <select
                      value={item.assigneeId ?? ''}
                      onChange={(e) => updMut.mutate({ id: item.id, data: { assigneeId: e.target.value || null } })}
                      className="text-[10px] border-0 bg-gray-50 hover:bg-gray-100 rounded px-1.5 py-0.5 text-gray-600 outline-none cursor-pointer max-w-[100px]"
                      title="Đổi người phụ trách"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    {owner && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium hidden">
                        {owner.name}
                      </span>
                    )}
                    <button
                      onClick={() => delMut.mutate(item.id)}
                      className="opacity-0 group-hover/bl:opacity-100 text-red-400 hover:text-red-600 text-xs flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="text-center text-[11px] text-gray-400 italic py-4">
                  {activeTab === TAB_ALL ? 'Chưa có item nào.' :
                    activeTab === TAB_UNASSIGNED ? 'Không có item chưa assign.' :
                    `${userById(activeTab)?.name ?? 'Người này'} chưa có item nào.`}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
                placeholder={
                  activeTab === TAB_ALL || activeTab === TAB_UNASSIGNED
                    ? 'Thêm backlog item...'
                    : `Thêm cho ${userById(activeTab)?.name ?? 'member'}...`
                }
                className="flex-1 text-xs border rounded px-2 py-1.5 outline-none focus:border-blue-400 bg-gray-50"
              />
              <button
                onClick={addItem}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1.5"
              >
                + Thêm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ label, count, active, onClick, dim }: { label: string; count: number; active: boolean; onClick: () => void; dim?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] rounded-md whitespace-nowrap transition-colors ${
        active
          ? 'bg-amber-100 text-amber-800 font-medium'
          : dim
          ? 'text-gray-400 hover:bg-gray-100'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`ml-1 text-[10px] ${active ? 'text-amber-600' : 'text-gray-400'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
