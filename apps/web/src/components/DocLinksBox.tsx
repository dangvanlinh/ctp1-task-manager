import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDocLinks, createDocLink, updateDocLink, deleteDocLink, bulkDocLinks,
  type DocLinkDto,
} from '../api/docLinks';

const LEGACY_KEY = (projectId: string) => `docLinks-${projectId}`;

export default function DocLinksBox({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data: items = [], isFetched } = useQuery({
    queryKey: ['docLinks', projectId],
    queryFn: () => fetchDocLinks(projectId),
    enabled: !!projectId,
  });

  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newAddedBy, setNewAddedBy] = useState('');
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
      const legacy: { title: string; url: string; addedBy?: string }[] = JSON.parse(raw);
      if (!Array.isArray(legacy) || legacy.length === 0) { migrated.current = true; return; }
      migrated.current = true;
      localStorage.setItem(LEGACY_KEY(projectId) + '-migrated', '1');
      bulkDocLinks(
        projectId,
        legacy.map((it, i) => ({ title: it.title, url: it.url, addedBy: it.addedBy ?? 'Ẩn danh', order: i })),
      )
        .then(() => qc.invalidateQueries({ queryKey: ['docLinks', projectId] }))
        .catch(() => { /* ignore */ });
    } catch { migrated.current = true; }
  }, [projectId, items.length, isFetched, qc]);

  const addMut = useMutation({
    mutationFn: createDocLink,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docLinks', projectId] }),
  });
  const updMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DocLinkDto> }) => updateDocLink(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docLinks', projectId] }),
  });
  const delMut = useMutation({
    mutationFn: deleteDocLink,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docLinks', projectId] }),
  });

  const addItem = () => {
    const t = newTitle.trim();
    const u = newUrl.trim();
    if (!t || !u) return;
    addMut.mutate({ projectId, title: t, url: u, addedBy: newAddedBy.trim() || 'Ẩn danh', order: items.length });
    setNewTitle('');
    setNewUrl('');
    setNewAddedBy('');
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.title.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="bg-white border rounded-lg overflow-hidden h-full flex flex-col">
      <div className="flex items-center px-4 py-2 border-b bg-gradient-to-r from-blue-50 to-indigo-50 gap-2">
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-gray-700 text-xs">
          {collapsed ? '▶' : '▼'}
        </button>
        <h2 className="font-semibold text-gray-700 text-sm">📎 Tài liệu dự án</h2>
        <span className="text-[10px] text-gray-400">{items.length} links</span>
      </div>
      {!collapsed && (
        <div className="px-4 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tài liệu..."
            className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:border-blue-400 bg-gray-50 mb-2"
          />
          <div className="space-y-1.5">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center gap-2 group/doc text-xs">
                <span className="text-gray-400 flex-shrink-0">🔗</span>
                <input
                  defaultValue={item.title}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== item.title) updMut.mutate({ id: item.id, data: { title: v } });
                  }}
                  className="flex-1 bg-transparent outline-none border-0 px-1 py-0.5 hover:bg-gray-50 rounded text-gray-700 min-w-0"
                />
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 flex-shrink-0 truncate max-w-[120px]"
                  title={item.url}
                >
                  Mở ↗
                </a>
                <span className="text-gray-400 flex-shrink-0 truncate max-w-[80px]" title={item.addedBy}>
                  {item.addedBy}
                </span>
                <button
                  onClick={() => delMut.mutate(item.id)}
                  className="opacity-0 group-hover/doc:opacity-100 text-red-400 hover:text-red-600 text-xs flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Tên"
              className="w-1/3 text-xs border rounded px-2 py-1 outline-none focus:border-blue-400 bg-gray-50"
            />
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="URL"
              className="flex-1 text-xs border rounded px-2 py-1 outline-none focus:border-blue-400 bg-gray-50"
            />
            <input
              value={newAddedBy}
              onChange={(e) => setNewAddedBy(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
              placeholder="By"
              className="w-16 text-xs border rounded px-2 py-1 outline-none focus:border-blue-400 bg-gray-50"
            />
            <button
              onClick={addItem}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-1.5 py-1 flex-shrink-0"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
