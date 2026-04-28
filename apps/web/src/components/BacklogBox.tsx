import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBacklog, createBacklog, updateBacklog, deleteBacklog, bulkBacklog,
  type BacklogItemDto,
} from '../api/backlog';

const LEGACY_KEY = (projectId: string) => `backlog-${projectId}`;

export default function BacklogBox({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data: items = [], isFetched } = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: () => fetchBacklog(projectId),
    enabled: !!projectId,
  });

  const [collapsed, setCollapsed] = useState(false);
  const [newText, setNewText] = useState('');
  const migrated = useRef(false);

  // One-time migration: if API empty AND localStorage has items AND never migrated before → push to DB
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
      // Mark BEFORE the request to prevent double-fire on race
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

  const addItem = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    addMut.mutate({ projectId, text: trimmed, order: items.length });
    setNewText('');
  };

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="flex items-center px-4 py-2 border-b bg-gradient-to-r from-amber-50 to-orange-50 gap-2">
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-gray-700 text-xs">
          {collapsed ? '▶' : '▼'}
        </button>
        <h2 className="font-semibold text-gray-700 text-sm">📋 Backlog</h2>
        <span className="text-[10px] text-gray-400">{items.filter((i) => !i.done).length} items</span>
      </div>
      {!collapsed && (
        <div className="px-4 py-3">
          <div className="space-y-1.5">
            {items.map((item) => (
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
                <button
                  onClick={() => delMut.mutate(item.id)}
                  className="opacity-0 group-hover/bl:opacity-100 text-red-400 hover:text-red-600 text-xs flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
              placeholder="Thêm backlog item..."
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
      )}
    </div>
  );
}
