import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRoadmap, createRoadmap, updateRoadmap, deleteRoadmap, type RoadmapUpdateDto } from '../api/roadmap';

interface Props {
  projectId: string;
  canEdit?: boolean;
  /** Number of months to show, starting from current month. Default 3. */
  monthsAhead?: number;
}

const DAY_WIDTH = 16;
const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 36;

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

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function diffDays(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}
function isWeekend(d: Date) {
  const w = d.getDay();
  return w === 0 || w === 6;
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
  const [editing, setEditing] = useState<RoadmapUpdateDto | 'new' | null>(null);
  const [draft, setDraft] = useState({ name: '', description: '', color: 'bg-blue-500', startDate: '', endDate: '' });

  // Date range: first day of current month → last day of (current + monthsAhead - 1)
  const today = useMemo(() => new Date(), []);
  const rangeStart = startOfMonth(today);
  const rangeEnd = new Date(addMonths(rangeStart, monthsAhead).getTime() - 86400000); // last day of last month
  const totalDays = diffDays(rangeEnd, rangeStart) + 1;

  // Header: list of all days in range, group by month for label
  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(rangeStart);
    d.setDate(rangeStart.getDate() + i);
    return d;
  });
  const monthGroups = useMemo(() => {
    const groups: { month: number; year: number; startCol: number; days: number }[] = [];
    days.forEach((d, i) => {
      const last = groups[groups.length - 1];
      if (!last || last.month !== d.getMonth() || last.year !== d.getFullYear()) {
        groups.push({ month: d.getMonth() + 1, year: d.getFullYear(), startCol: i, days: 1 });
      } else {
        last.days += 1;
      }
    });
    return groups;
  }, [days]);

  const todayOffset = today >= rangeStart && today <= rangeEnd ? diffDays(today, rangeStart) * DAY_WIDTH + DAY_WIDTH / 2 : -1;

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

  const openNew = () => {
    const start = today;
    const end = new Date(today.getTime() + 7 * 86400000);
    setDraft({ name: '', description: '', color: 'bg-blue-500', startDate: fmtIsoDate(start), endDate: fmtIsoDate(end) });
    setEditing('new');
  };
  const openEdit = (item: RoadmapUpdateDto) => {
    setDraft({
      name: item.name,
      description: item.description ?? '',
      color: item.color,
      startDate: fmtIsoDate(new Date(item.startDate)),
      endDate: fmtIsoDate(new Date(item.endDate)),
    });
    setEditing(item);
  };
  const closeEdit = () => setEditing(null);
  const submit = () => {
    if (!draft.name.trim()) return;
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      color: draft.color,
      startDate: draft.startDate,
      endDate: draft.endDate,
    };
    if (editing === 'new') {
      createMut.mutate({ projectId, ...payload, order: items.length }, { onSuccess: closeEdit });
    } else if (editing) {
      updMut.mutate({ id: editing.id, data: payload }, { onSuccess: closeEdit });
    }
  };
  const handleDelete = () => {
    if (editing && editing !== 'new') {
      if (confirm(`Xoá "${editing.name}"?`)) {
        delMut.mutate(editing.id, { onSuccess: closeEdit });
      }
    }
  };

  // For each item, compute pixel position
  const renderItem = (item: RoadmapUpdateDto, rowIdx: number) => {
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    const startCol = Math.max(0, diffDays(start, rangeStart));
    const endCol = Math.min(totalDays - 1, diffDays(end, rangeStart));
    if (endCol < 0 || startCol >= totalDays) return null;
    const left = startCol * DAY_WIDTH;
    const width = (endCol - startCol + 1) * DAY_WIDTH;
    return (
      <div
        key={item.id}
        className={`absolute ${item.color} rounded text-white text-xs font-medium flex items-center px-2 cursor-pointer hover:brightness-110 truncate shadow-sm`}
        style={{
          left,
          width,
          top: rowIdx * ROW_HEIGHT + 4,
          height: ROW_HEIGHT - 8,
        }}
        onClick={() => canEdit && openEdit(item)}
        title={`${item.name}${item.description ? ' — ' + item.description : ''}`}
      >
        <span className="truncate">{item.name}</span>
      </div>
    );
  };

  return (
    <div className="bg-white border rounded-lg mb-4 mx-auto relative">
      <div className="flex items-center px-4 py-2 border-b bg-gradient-to-r from-indigo-50 to-purple-50 gap-3">
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-gray-700">
          {collapsed ? '▶' : '▼'}
        </button>
        <h2 className="font-semibold text-gray-700">🗺️ Roadmap {monthsAhead} tháng tới</h2>
        <span className="text-[11px] text-gray-400">{items.length} updates</span>
        {canEdit && (
          <button
            onClick={openNew}
            className="ml-auto bg-indigo-600 text-white text-xs px-3 py-1 rounded hover:bg-indigo-700"
          >
            + Thêm update
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <div className="mx-auto" style={{ width: totalDays * DAY_WIDTH }}>
            {/* Month header */}
            <div className="flex border-b bg-gray-100" style={{ height: 22 }}>
              {monthGroups.map((g) => (
                <div
                  key={`${g.year}-${g.month}`}
                  className="text-xs font-semibold text-gray-700 border-r flex items-center justify-center"
                  style={{ width: g.days * DAY_WIDTH }}
                >
                  Thg {g.month}/{g.year}
                </div>
              ))}
            </div>
            {/* Day header */}
            <div className="flex border-b bg-gray-50" style={{ height: HEADER_HEIGHT - 22 }}>
              {days.map((d, i) => {
                const weekend = isWeekend(d);
                const isToday = today.toDateString() === d.toDateString();
                return (
                  <div
                    key={i}
                    className={`text-center text-[10px] border-r flex items-center justify-center ${
                      isToday ? 'bg-blue-600 text-white font-bold' : weekend ? 'bg-gray-200 text-gray-400' : 'text-gray-500'
                    }`}
                    style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            <div className="relative" style={{ height: Math.max(items.length, 1) * ROW_HEIGHT }}>
              {/* Day grid background */}
              <div className="absolute inset-0 flex">
                {days.map((d, i) => (
                  <div
                    key={i}
                    className={`border-r h-full ${isWeekend(d) ? 'bg-gray-50' : ''}`}
                    style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                  />
                ))}
              </div>
              {/* Today line */}
              {todayOffset >= 0 && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none" style={{ left: todayOffset }} />
              )}
              {/* Item bars */}
              {items.map((item, idx) => renderItem(item, idx))}
              {items.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                  Chưa có update nào. {canEdit ? 'Bấm "+ Thêm update" để bắt đầu.' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create modal */}
      {editing && canEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={closeEdit}>
          <div className="bg-white rounded-lg p-5 w-[440px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800 mb-3">
              {editing === 'new' ? 'Thêm roadmap update' : 'Sửa roadmap update'}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bắt đầu</label>
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full text-sm border rounded px-3 py-2 outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kết thúc</label>
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full text-sm border rounded px-3 py-2 outline-none focus:border-indigo-400"
                  />
                </div>
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
                {editing === 'new' ? 'Tạo' : 'Lưu'}
              </button>
              <button onClick={closeEdit} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2">
                Hủy
              </button>
              {editing !== 'new' && (
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
