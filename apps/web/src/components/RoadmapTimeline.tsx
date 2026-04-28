import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRoadmap, createRoadmap, updateRoadmap, deleteRoadmap, type RoadmapUpdateDto } from '../api/roadmap';

interface Props {
  projectId: string;
  canEdit?: boolean;
}

const COLOR_PALETTE: Record<string, { bar: string; chipBg: string; chipText: string; label: string }> = {
  'bg-blue-500':   { bar: 'bg-blue-500',    chipBg: 'bg-blue-50',    chipText: 'text-blue-700',    label: 'Blue' },
  'bg-green-500':  { bar: 'bg-emerald-500', chipBg: 'bg-emerald-50', chipText: 'text-emerald-700', label: 'Green' },
  'bg-purple-500': { bar: 'bg-purple-500',  chipBg: 'bg-purple-50',  chipText: 'text-purple-700',  label: 'Purple' },
  'bg-orange-500': { bar: 'bg-orange-500',  chipBg: 'bg-orange-50',  chipText: 'text-orange-700',  label: 'Orange' },
  'bg-red-500':    { bar: 'bg-rose-500',    chipBg: 'bg-rose-50',    chipText: 'text-rose-700',    label: 'Red' },
  'bg-yellow-500': { bar: 'bg-amber-500',   chipBg: 'bg-amber-50',   chipText: 'text-amber-700',   label: 'Yellow' },
  'bg-pink-500':   { bar: 'bg-pink-500',    chipBg: 'bg-pink-50',    chipText: 'text-pink-700',    label: 'Pink' },
  'bg-gray-500':   { bar: 'bg-slate-500',   chipBg: 'bg-slate-50',   chipText: 'text-slate-700',   label: 'Gray' },
};
const COLOR_KEYS = Object.keys(COLOR_PALETTE);
const palette = (key: string) => COLOR_PALETTE[key] ?? COLOR_PALETTE['bg-blue-500'];

const MONTH_SHORT = ['Thg 1','Thg 2','Thg 3','Thg 4','Thg 5','Thg 6','Thg 7','Thg 8','Thg 9','Thg 10','Thg 11','Thg 12'];

// Layout: 12 months distributed evenly across full container width using CSS grid (no scroll).
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 32;

function firstOfMonth(y: number, m: number) { return new Date(y, m - 1, 1); }
function lastOfMonth(y: number, m: number)  { return new Date(y, m, 0); }
function fmtIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function RoadmapTimeline({ projectId, canEdit }: Props) {
  const qc = useQueryClient();
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());

  const { data: items = [] } = useQuery({
    queryKey: ['roadmap', projectId],
    queryFn: () => fetchRoadmap(projectId),
    enabled: !!projectId,
  });

  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState<RoadmapUpdateDto | { kind: 'new'; startMonth: number } | null>(null);
  const [draft, setDraft] = useState({
    name: '', description: '', color: 'bg-blue-500',
    startMonth: 1, endMonth: 1, year: year,
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);

  // Filter items overlapping with `year`
  const yearItems = useMemo(() => {
    return items.filter((it) => {
      const s = new Date(it.startDate);
      const e = new Date(it.endDate);
      // overlaps the calendar year
      return s.getFullYear() <= year && e.getFullYear() >= year;
    });
  }, [items, year]);

  // Layout: assign each item to a row (avoid overlaps stacking)
  // Simple greedy: sort by startMonth, place into first row whose end < this start.
  const itemsLaidOut = useMemo(() => {
    const sorted = [...yearItems].sort((a, b) => {
      const sa = Math.max(1, monthInYear(a.startDate, year));
      const sb = Math.max(1, monthInYear(b.startDate, year));
      return sa - sb || a.order - b.order;
    });
    const rowsLastEnd: number[] = []; // last endMonth for each row
    return sorted.map((item) => {
      const sM = Math.max(1, monthInYear(item.startDate, year));
      const eM = Math.min(12, monthInYear(item.endDate, year));
      let row = -1;
      for (let r = 0; r < rowsLastEnd.length; r++) {
        if (rowsLastEnd[r] < sM) { row = r; break; }
      }
      if (row === -1) {
        rowsLastEnd.push(eM);
        row = rowsLastEnd.length - 1;
      } else {
        rowsLastEnd[row] = eM;
      }
      return { item, sM, eM, row };
    });
  }, [yearItems, year]);
  const totalRows = Math.max(2, itemsLaidOut.reduce((max, l) => Math.max(max, l.row + 1), 0));

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

  const openNew = (startMonth: number) => {
    setDraft({ name: '', description: '', color: 'bg-blue-500', startMonth, endMonth: startMonth, year });
    setEditing({ kind: 'new', startMonth });
  };
  const openEdit = (item: RoadmapUpdateDto) => {
    const s = new Date(item.startDate);
    const e = new Date(item.endDate);
    setDraft({
      name: item.name,
      description: item.description ?? '',
      color: item.color,
      startMonth: s.getMonth() + 1,
      endMonth: e.getMonth() + 1,
      year: s.getFullYear(),
    });
    setEditing(item);
  };
  const closeEdit = () => setEditing(null);
  const submit = () => {
    if (!draft.name.trim()) return;
    const sm = Math.min(draft.startMonth, draft.endMonth);
    const em = Math.max(draft.startMonth, draft.endMonth);
    const startDate = fmtIsoDate(firstOfMonth(draft.year, sm));
    const endDate = fmtIsoDate(lastOfMonth(draft.year, em));
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      color: draft.color,
      startDate,
      endDate,
    };
    if (editing && 'kind' in editing && editing.kind === 'new') {
      createMut.mutate({ projectId, ...payload, order: yearItems.length }, { onSuccess: closeEdit });
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

  // Drag bar to a different month (preserving span length)
  const moveItem = (item: RoadmapUpdateDto, targetStartMonth: number) => {
    const s = new Date(item.startDate);
    const e = new Date(item.endDate);
    const span = (e.getMonth() - s.getMonth()) + 12 * (e.getFullYear() - s.getFullYear());
    const newStart = firstOfMonth(year, targetStartMonth);
    const newEnd = lastOfMonth(year, Math.min(12, targetStartMonth + span));
    updMut.mutate({
      id: item.id,
      data: { startDate: fmtIsoDate(newStart), endDate: fmtIsoDate(newEnd) },
    });
  };

  // Reorder: dragged → before/after target. Swaps order values within same start-month group.
  const reorderItems = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const dragged = items.find((it) => it.id === draggedId);
    const target = items.find((it) => it.id === targetId);
    if (!dragged || !target) return;
    const dM = new Date(dragged.startDate).getMonth();
    const tM = new Date(target.startDate).getMonth();
    if (dM !== tM) {
      // Different months → move to target's month + put before target
      moveItem(dragged, tM + 1);
      return;
    }
    // Same month: rebuild order in that month
    const monthGroup = items
      .filter((it) => new Date(it.startDate).getMonth() === tM && new Date(it.startDate).getFullYear() === year)
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
    const ids = monthGroup.map((x) => x.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggedId);
    ids.forEach((id, i) => updMut.mutate({ id, data: { order: i } }));
  };

  const isCurrentYear = year === today.getFullYear();
  // Today's horizontal position as percentage (0-100) of the 12-month span
  const todayLeftPct = isCurrentYear
    ? ((today.getMonth() + (today.getDate() - 1) / daysInMonth(year, today.getMonth() + 1)) / 12) * 100
    : -1;

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-5 py-3 border-b border-gray-100 gap-3">
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-gray-600 text-sm">
          {collapsed ? '▶' : '▼'}
        </button>
        <span className="text-base font-semibold text-gray-900">Roadmap</span>
        <div className="flex items-center gap-1 ml-3">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="text-gray-400 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100"
          >
            ◀
          </button>
          <span className="font-semibold text-sm text-gray-700 w-12 text-center">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="text-gray-400 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100"
          >
            ▶
          </button>
          {!isCurrentYear && (
            <button
              onClick={() => setYear(today.getFullYear())}
              className="ml-1 text-[11px] text-indigo-600 hover:text-indigo-800"
            >
              Hôm nay
            </button>
          )}
        </div>
        <span className="ml-auto text-xs text-gray-400">{yearItems.length} updates</span>
      </div>

      {!collapsed && (
        <div className="bg-gray-50/40">
          {/* Month header — 12 equal columns */}
          <div
            className="grid border-b border-gray-200 bg-white"
            style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', height: HEADER_HEIGHT }}
          >
            {MONTH_SHORT.map((label, i) => {
              const m = i + 1;
              const isCurrentMonth = isCurrentYear && m === today.getMonth() + 1;
              return (
                <div
                  key={i}
                  className={`text-center text-xs font-semibold border-r last:border-r-0 border-gray-200 flex items-center justify-center ${
                    isCurrentMonth ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Grid body */}
          <div className="relative" style={{ height: totalRows * ROW_HEIGHT + 8 }}>
            {/* Vertical month cells (clickable to add + drop targets) */}
            <div
              className="absolute inset-0 grid"
              style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}
            >
              {MONTH_SHORT.map((_, i) => {
                const m = i + 1;
                const isCurrentMonth = isCurrentYear && m === today.getMonth() + 1;
                const isHover = hoverMonth === m;
                return (
                  <div
                    key={i}
                    className={`border-r last:border-r-0 border-gray-200 h-full transition-colors ${
                      isCurrentMonth ? 'bg-indigo-50/30' : ''
                    } ${isHover && draggingId ? 'bg-indigo-100/40' : ''} ${
                      canEdit ? 'cursor-pointer hover:bg-gray-100/40 group/col' : ''
                    }`}
                    onClick={(e) => {
                      if (!canEdit) return;
                      if (e.target === e.currentTarget) openNew(m);
                    }}
                    onDragOver={(e) => {
                      if (!draggingId) return;
                      e.preventDefault();
                      setHoverMonth(m);
                    }}
                    onDragLeave={() => setHoverMonth(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData('text/roadmap-id');
                      if (!id) return;
                      const item = items.find((it) => it.id === id);
                      if (item) moveItem(item, m);
                      setDraggingId(null);
                      setHoverMonth(null);
                    }}
                  >
                    {canEdit && (
                      <div className="opacity-0 group-hover/col:opacity-100 h-full flex items-center justify-center text-gray-400 text-lg pointer-events-none transition-opacity">
                        +
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Today line */}
            {todayLeftPct >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-10 pointer-events-none"
                style={{ left: `${todayLeftPct}%` }}
                title="Hôm nay"
              />
            )}

            {/* Item bars (percentage-based positioning) */}
            {itemsLaidOut.map(({ item, sM, eM, row }) => {
              const c = palette(item.color);
              const leftPct = ((sM - 1) / 12) * 100;
              const widthPct = ((eM - sM + 1) / 12) * 100;
              const top = row * ROW_HEIGHT + 4;
              return (
                <div
                  key={item.id}
                  draggable={canEdit}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/roadmap-id', item.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggingId(item.id);
                  }}
                  onDragEnd={() => { setDraggingId(null); setHoverMonth(null); }}
                  onDragOver={(e) => {
                    if (!canEdit || !draggingId || draggingId === item.id) return;
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    if (!canEdit) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const draggedId = e.dataTransfer.getData('text/roadmap-id');
                    if (!draggedId || draggedId === item.id) return;
                    reorderItems(draggedId, item.id);
                    setDraggingId(null);
                    setHoverMonth(null);
                  }}
                  onClick={(e) => { e.stopPropagation(); if (canEdit) openEdit(item); }}
                  className={`absolute ${c.bar} text-white rounded-md shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing flex items-center px-2.5 transition-all ${
                    draggingId === item.id ? 'opacity-50' : 'opacity-95 hover:opacity-100'
                  }`}
                  style={{
                    left: `calc(${leftPct}% + 4px)`,
                    width: `calc(${widthPct}% - 8px)`,
                    top,
                    height: ROW_HEIGHT - 8,
                  }}
                  title={`${item.name}${item.description ? ' — ' + item.description : ''}`}
                >
                  <span className="text-xs font-medium truncate">{item.name}</span>
                </div>
              );
            })}

            {/* Empty state */}
            {yearItems.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 italic pointer-events-none">
                Chưa có update nào trong năm {year}. {canEdit ? 'Click vào ô tháng để thêm.' : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit/Create modal */}
      {editing && canEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeEdit}>
          <div className="bg-white rounded-xl w-[480px] max-w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
                  placeholder="Mô tả ngắn (optional)"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition resize-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Năm</label>
                  <input
                    type="number"
                    value={draft.year}
                    onChange={(e) => setDraft((p) => ({ ...p, year: parseInt(e.target.value) || p.year }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Từ tháng</label>
                  <select
                    value={draft.startMonth}
                    onChange={(e) => setDraft((p) => ({ ...p, startMonth: parseInt(e.target.value) }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white"
                  >
                    {MONTH_SHORT.map((label, i) => <option key={i} value={i + 1}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Đến tháng</label>
                  <select
                    value={draft.endMonth}
                    onChange={(e) => setDraft((p) => ({ ...p, endMonth: parseInt(e.target.value) }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white"
                  >
                    {MONTH_SHORT.map((label, i) => <option key={i} value={i + 1}>{label}</option>)}
                  </select>
                </div>
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

// ----- helpers -----
function monthInYear(iso: string, year: number): number {
  const d = new Date(iso);
  if (d.getFullYear() < year) return 1;
  if (d.getFullYear() > year) return 12;
  return d.getMonth() + 1;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
