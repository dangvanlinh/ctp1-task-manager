import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRoadmap, createRoadmap, updateRoadmap, deleteRoadmap, type RoadmapUpdateDto } from '../api/roadmap';

interface Props {
  projectId: string;
  canEdit?: boolean;
  /** Number of months to show, starting from current month. Default 3. */
  monthsAhead?: number;
}

// Colors as semantic accent — paired pastel bg + saturated bar.
const COLOR_PALETTE: Record<string, { bar: string; chipBg: string; chipText: string; label: string }> = {
  'bg-blue-500':   { bar: 'bg-blue-500',   chipBg: 'bg-blue-50',    chipText: 'text-blue-700',    label: 'Blue' },
  'bg-green-500':  { bar: 'bg-emerald-500',chipBg: 'bg-emerald-50', chipText: 'text-emerald-700', label: 'Green' },
  'bg-purple-500': { bar: 'bg-purple-500', chipBg: 'bg-purple-50',  chipText: 'text-purple-700',  label: 'Purple' },
  'bg-orange-500': { bar: 'bg-orange-500', chipBg: 'bg-orange-50',  chipText: 'text-orange-700',  label: 'Orange' },
  'bg-red-500':    { bar: 'bg-rose-500',   chipBg: 'bg-rose-50',    chipText: 'text-rose-700',    label: 'Red' },
  'bg-yellow-500': { bar: 'bg-amber-500',  chipBg: 'bg-amber-50',   chipText: 'text-amber-700',   label: 'Yellow' },
  'bg-pink-500':   { bar: 'bg-pink-500',   chipBg: 'bg-pink-50',    chipText: 'text-pink-700',    label: 'Pink' },
  'bg-gray-500':   { bar: 'bg-slate-500',  chipBg: 'bg-slate-50',   chipText: 'text-slate-700',   label: 'Gray' },
};
const COLOR_KEYS = Object.keys(COLOR_PALETTE);
const palette = (key: string) => COLOR_PALETTE[key] ?? COLOR_PALETTE['bg-blue-500'];

const MONTH_NAMES = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

function firstOfMonth(y: number, m: number) { return new Date(y, m - 1, 1); }
function lastOfMonth(y: number, m: number)  { return new Date(y, m, 0); }
function fmtIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
  const months = useMemo(() => {
    const arr: { month: number; year: number; key: string; label: string; offset: number }[] = [];
    const labels = ['Now', 'Next', 'Later', '+3', '+4', '+5'];
    for (let i = 0; i < monthsAhead; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      arr.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        key: `${d.getFullYear()}-${d.getMonth() + 1}`,
        label: labels[i] ?? `+${i}`,
        offset: i,
      });
    }
    return arr;
  }, [today, monthsAhead]);

  const grouped = useMemo(() => {
    const map = new Map<string, RoadmapUpdateDto[]>();
    months.forEach((m) => map.set(m.key, []));
    for (const item of items) {
      const d = new Date(item.startDate);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (map.has(key)) map.get(key)!.push(item);
    }
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

  const moveItemToMonth = (id: string, m: number, y: number) => {
    updMut.mutate({
      id,
      data: {
        startDate: fmtIsoDate(firstOfMonth(y, m)),
        endDate: fmtIsoDate(lastOfMonth(y, m)),
      },
    });
  };
  const reorderInMonth = (monthKey: string, draggedId: string, targetId: string) => {
    const list = grouped.get(monthKey) || [];
    const ids = list.map((x) => x.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggedId);
    ids.forEach((id, i) => updMut.mutate({ id, data: { order: i } }));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-5 py-3 border-b border-gray-100 gap-3">
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-gray-600 text-sm">
          {collapsed ? '▶' : '▼'}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-gray-900">Roadmap</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{monthsAhead} tháng tới</span>
        </div>
        <span className="ml-auto text-xs text-gray-400">{items.length} updates</span>
      </div>

      {!collapsed && (
        <div className="grid gap-4 p-4 bg-gray-50/40" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
          {months.map(({ month, year, key, label, offset }) => {
            const list = grouped.get(key) || [];
            const isCurrent = offset === 0;
            const isDragOver = dragOverKey === key;
            return (
              <div
                key={key}
                className={`flex flex-col rounded-xl transition-colors ${isDragOver ? 'bg-indigo-50/50 ring-2 ring-indigo-300' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverKey(key); }}
                onDragLeave={() => setDragOverKey(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverKey(null);
                  const draggedId = e.dataTransfer.getData('text/roadmap-id');
                  const sourceKey = e.dataTransfer.getData('text/source-key');
                  if (!draggedId) return;
                  if (sourceKey !== key) moveItemToMonth(draggedId, month, year);
                }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-2 mb-3">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${isCurrent ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {label}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{MONTH_NAMES[month - 1]}</span>
                    <span className="text-xs text-gray-400">{year}</span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium bg-white px-1.5 py-0.5 rounded border border-gray-200">
                    {list.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 min-h-[120px]">
                  {list.map((item) => {
                    const c = palette(item.color);
                    return (
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
                          if (sourceKey === key) reorderInMonth(key, draggedId, item.id);
                          else moveItemToMonth(draggedId, month, year);
                        }}
                        onClick={() => canEdit && openEdit(item)}
                        className="group relative bg-white border border-gray-200 rounded-lg p-3 pl-4 cursor-grab active:cursor-grabbing hover:border-gray-300 hover:shadow-md transition-all"
                      >
                        {/* Color accent bar */}
                        <div className={`absolute left-0 top-2 bottom-2 w-1 ${c.bar} rounded-r`} />
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium text-gray-900 leading-tight flex-1">{item.name}</h4>
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{item.description}</p>
                          )}
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${c.chipBg} ${c.chipText}`}>
                              ●  {c.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add button (always shown for canEdit) */}
                  {canEdit && (
                    <button
                      onClick={() => openNew(month, year)}
                      className="text-xs text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg px-3 py-2.5 border border-dashed border-gray-300 hover:border-indigo-300 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span className="text-base leading-none">+</span>
                      <span>Thêm update</span>
                    </button>
                  )}

                  {/* Empty hint */}
                  {list.length === 0 && !canEdit && (
                    <div className="text-xs text-gray-400 text-center py-6 italic">Chưa có gì</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Create modal */}
      {editing && canEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeEdit}>
          <div className="bg-white rounded-xl w-[480px] max-w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {editing && 'kind' in editing ? 'Thêm roadmap update' : 'Sửa roadmap update'}
              </h3>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tên update</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="VD: Ra mắt tính năng X"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Mô tả</label>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Mô tả ngắn về update này (optional)"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tháng triển khai</label>
                <select
                  value={`${draft.year}-${draft.month}`}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split('-').map(Number);
                    setDraft((p) => ({ ...p, month: m, year: y }));
                  }}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition bg-white"
                >
                  {months.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label} · {MONTH_NAMES[opt.month - 1]}/{opt.year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Màu tag</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_KEYS.map((key) => {
                    const c = COLOR_PALETTE[key];
                    const selected = draft.color === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setDraft((p) => ({ ...p, color: key }))}
                        className={`relative ${c.bar} w-8 h-8 rounded-lg transition-all hover:scale-110 ${selected ? 'ring-2 ring-offset-2 ring-gray-900' : ''}`}
                        title={c.label}
                      >
                        {selected && <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
              {editing && 'id' in editing && (
                <button onClick={handleDelete} className="text-sm text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-md">
                  Xoá
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button onClick={closeEdit} className="text-sm text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-md">
                  Hủy
                </button>
                <button
                  onClick={submit}
                  disabled={!draft.name.trim() || createMut.isPending || updMut.isPending}
                  className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {editing && 'kind' in editing ? 'Tạo' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
