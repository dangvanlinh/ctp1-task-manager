import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRoadmap, createRoadmap, updateRoadmap, deleteRoadmap, type RoadmapUpdateDto } from '../api/roadmap';

interface Props {
  projectId: string;
  canEdit?: boolean;
  /** Number of months to show, starting from current month. Default 3. */
  monthsAhead?: number;
}

const COLOR_OPTIONS = [
  { class: 'bg-blue-500', label: 'Blue' },
  { class: 'bg-green-500', label: 'Green' },
  { class: 'bg-purple-500', label: 'Purple' },
  { class: 'bg-orange-500', label: 'Orange' },
  { class: 'bg-red-500', label: 'Red' },
  { class: 'bg-yellow-500', label: 'Yellow' },
  { class: 'bg-pink-500', label: 'Pink' },
  { class: 'bg-gray-500', label: 'Gray' },
];

const MONTH_NAMES = ['Thg 1','Thg 2','Thg 3','Thg 4','Thg 5','Thg 6','Thg 7','Thg 8','Thg 9','Thg 10','Thg 11','Thg 12'];

function firstOfMonth(y: number, m: number) {
  // m: 1-12
  return new Date(y, m - 1, 1);
}
function lastOfMonth(y: number, m: number) {
  return new Date(y, m, 0); // day 0 of next month = last day of this month
}
function fmtIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function RoadmapTimeline({ projectId, canEdit, monthsAhead = 3 }: Props) {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ['roadmap', projectId],
    queryFn: () => fetchRoadmap(projectId),
    enabled: !!projectId,
  });

  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState<RoadmapUpdateDto | { kind: 'new'; month: number; year: number } | null>(null);
  const [draft, setDraft] = useState({ name: '', description: '', color: 'bg-blue-500', month: 0, year: 0 });
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  // Build months list: current month, +1, +2 (or N)
  const months = useMemo(() => {
    const arr: { month: number; year: number; key: string }[] = [];
    for (let i = 0; i < monthsAhead; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      arr.push({ month: d.getMonth() + 1, year: d.getFullYear(), key: `${d.getFullYear()}-${d.getMonth() + 1}` });
    }
    return arr;
  }, [today, monthsAhead]);

  // Group items by month/year (based on startDate)
  const grouped = useMemo(() => {
    const map = new Map<string, RoadmapUpdateDto[]>();
    months.forEach((m) => map.set(m.key, []));
    for (const item of items) {
      const d = new Date(item.startDate);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (map.has(key)) map.get(key)!.push(item);
    }
    // Sort within each month by `order` then by `createdAt`
    map.forEach((list) =>
      list.sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)),
    );
    return map;
  }, [items, months]);

  const createMut = useMutation({
    mutationFn: createRoadmap,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap', projectId] }),
  });
  const updMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateRoadmap(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap', projectId] }),
  });
  const delMut = useMutation({
    mutationFn: deleteRoadmap,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap', projectId] }),
  });

  const openNew = (m: number, y: number) => {
    setDraft({ name: '', description: '', color: 'bg-blue-500', month: m, year: y });
    setEditing({ kind: 'new', month: m, year: y });
  };
  const openEdit = (item: RoadmapUpdateDto) => {
    const d = new Date(item.startDate);
    setDraft({
      name: item.name,
      description: item.description ?? '',
      color: item.color,
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    });
    setEditing(item);
  };
  const closeEdit = () => setEditing(null);
  const submit = () => {
    if (!draft.name.trim()) return;
    const startDate = fmtIsoDate(firstOfMonth(draft.year, draft.month));
    const endDate = fmtIsoDate(lastOfMonth(draft.year, draft.month));
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      color: draft.color,
      startDate,
      endDate,
    };
    if (editing && 'kind' in editing && editing.kind === 'new') {
      createMut.mutate({ projectId, ...payload, order: (grouped.get(`${draft.year}-${draft.month}`)?.length ?? 0) }, { onSuccess: closeEdit });
    } else if (editing && 'id' in editing) {
      updMut.mutate({ id: editing.id, data: payload }, { onSuccess: closeEdit });
    }
  };
  const handleDelete = () => {
    if (editing && 'id' in editing) {
      if (confirm(`Xoá "${editing.name}"?`)) {
        delMut.mutate(editing.id, { onSuccess: closeEdit });
      }
    }
  };

  // Drag & drop: change month by dropping into a different column
  const moveItemToMonth = (id: string, m: number, y: number) => {
    const startDate = fmtIsoDate(firstOfMonth(y, m));
    const endDate = fmtIsoDate(lastOfMonth(y, m));
    updMut.mutate({ id, data: { startDate, endDate } });
  };

  const reorderInMonth = (monthKey: string, draggedId: string, targetId: string) => {
    const list = grouped.get(monthKey) || [];
    const ids = list.map((x) => x.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggedId);
    // Persist new orders
    ids.forEach((id, i) => updMut.mutate({ id, data: { order: i } }));
  };

  return (
    <div className="bg-white border rounded-lg mb-4 mx-auto relative">
      <div className="flex items-center px-4 py-2 border-b bg-gradient-to-r from-indigo-50 to-purple-50 gap-3">
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-gray-700">
          {collapsed ? '▶' : '▼'}
        </button>
        <h2 className="font-semibold text-gray-700">🗺️ Roadmap {monthsAhead} tháng tới</h2>
        <span className="text-[11px] text-gray-400">{items.length} updates</span>
      </div>

      {!collapsed && (
        <div className="grid p-3 gap-3" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
          {months.map(({ month, year, key }) => {
            const list = grouped.get(key) || [];
            const isCurrent = month === today.getMonth() + 1 && year === today.getFullYear();
            const isDragOver = dragOverKey === key;
            return (
              <div
                key={key}
                className={`border rounded-lg overflow-hidden ${isDragOver ? 'ring-2 ring-indigo-400 bg-indigo-50/30' : 'bg-gray-50'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverKey(key); }}
                onDragLeave={() => setDragOverKey(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverKey(null);
                  const draggedId = e.dataTransfer.getData('text/roadmap-id');
                  const sourceKey = e.dataTransfer.getData('text/source-key');
                  if (!draggedId) return;
                  if (sourceKey !== key) {
                    moveItemToMonth(draggedId, month, year);
                  }
                }}
              >
                <div className={`px-3 py-2 text-sm font-semibold border-b flex items-center justify-between ${isCurrent ? 'bg-blue-100 text-blue-800' : 'bg-white text-gray-700'}`}>
                  <span>
                    {MONTH_NAMES[month - 1]}/{year}
                    {isCurrent && <span className="ml-2 text-[10px] font-normal bg-blue-600 text-white px-1.5 py-0.5 rounded">Hiện tại</span>}
                  </span>
                  <span className="text-[11px] text-gray-400">{list.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[80px]">
                  {list.map((item) => (
                    <div
                      key={item.id}
                      draggable={canEdit}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/roadmap-id', item.id);
                        e.dataTransfer.setData('text/source-key', key);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverKey(null);
                        const draggedId = e.dataTransfer.getData('text/roadmap-id');
                        const sourceKey = e.dataTransfer.getData('text/source-key');
                        if (!draggedId || draggedId === item.id) return;
                        if (sourceKey === key) {
                          reorderInMonth(key, draggedId, item.id);
                        } else {
                          moveItemToMonth(draggedId, month, year);
                        }
                      }}
                      onClick={() => canEdit && openEdit(item)}
                      className={`${item.color} rounded px-2.5 py-2 text-white text-xs cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md`}
                      title={item.description || ''}
                    >
                      <div className="font-medium truncate">{item.name}</div>
                      {item.description && (
                        <div className="text-[10px] opacity-90 truncate">{item.description}</div>
                      )}
                    </div>
                  ))}
                  {canEdit && (
                    <button
                      onClick={() => openNew(month, year)}
                      className="w-full text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded px-2 py-1.5 border border-dashed border-indigo-200 transition-colors"
                    >
                      + Thêm update
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Create modal */}
      {editing && canEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={closeEdit}>
          <div className="bg-white rounded-lg p-5 w-[440px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800 mb-3">
              {editing && 'kind' in editing ? 'Thêm roadmap update' : 'Sửa roadmap update'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tên</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="VD: Ra mắt tính năng X"
                  className="w-full text-sm border rounded px-3 py-2 outline-none focus:border-indigo-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mô tả (optional)</label>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full text-sm border rounded px-3 py-2 outline-none focus:border-indigo-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tháng</label>
                <select
                  value={`${draft.year}-${draft.month}`}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split('-').map(Number);
                    setDraft((p) => ({ ...p, month: m, year: y }));
                  }}
                  className="w-full text-sm border rounded px-3 py-2 outline-none focus:border-indigo-400"
                >
                  {months.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {MONTH_NAMES[opt.month - 1]}/{opt.year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Màu</label>
                <div className="flex gap-1.5 flex-wrap">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.class}
                      onClick={() => setDraft((p) => ({ ...p, color: opt.class }))}
                      className={`${opt.class} w-7 h-7 rounded ${draft.color === opt.class ? 'ring-2 ring-offset-1 ring-gray-700' : ''}`}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={submit}
                disabled={!draft.name.trim() || createMut.isPending || updMut.isPending}
                className="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {editing && 'kind' in editing ? 'Tạo' : 'Lưu'}
              </button>
              <button onClick={closeEdit} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2">
                Hủy
              </button>
              {editing && 'id' in editing && (
                <button onClick={handleDelete} className="ml-auto text-sm text-red-500 hover:text-red-700">
                  Xoá
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
