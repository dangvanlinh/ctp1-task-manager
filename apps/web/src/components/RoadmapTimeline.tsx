import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRoadmap, createRoadmap, updateRoadmap, deleteRoadmap, type RoadmapUpdateDto } from '../api/roadmap';
import type { MonthlyRevenueDto } from '../api/monthlyRevenue';
import { formatVnd, parseVnd } from '../utils/formatVnd';

interface Props {
  projectId: string;
  canEdit?: boolean;
  // Unified with MonthWeekSelector props
  month: number;
  year: number;
  onChangeMonth: (month: number, year: number) => void;
  revenues?: MonthlyRevenueDto[];
  onSaveRevenue?: (month: number, amount: number) => void;
  kpi?: number;
  onSaveKpi?: (amount: number) => void;
}

// ZPS brand palette
const COLOR_PALETTE: Record<string, { bar: string; chipBg: string; chipText: string; label: string }> = {
  'bg-blue-500':   { bar: '#4A90D9', chipBg: 'bg-blue-50',    chipText: 'text-[#4A90D9]',  label: 'Blue' },
  'bg-green-500':  { bar: '#00D68F', chipBg: 'bg-emerald-50', chipText: 'text-[#00A86F]',  label: 'Green' },
  'bg-purple-500': { bar: '#7C4DFF', chipBg: 'bg-purple-50',  chipText: 'text-[#7C4DFF]',  label: 'Purple' },
  'bg-orange-500': { bar: '#F5A623', chipBg: 'bg-amber-50',   chipText: 'text-[#C97F0B]',  label: 'Orange' },
  'bg-red-500':    { bar: '#E8341A', chipBg: 'bg-rose-50',    chipText: 'text-[#E8341A]',  label: 'Red' },
  'bg-yellow-500': { bar: '#FFC940', chipBg: 'bg-amber-50',   chipText: 'text-[#A87B00]',  label: 'Yellow' },
  'bg-pink-500':   { bar: '#FF5DA2', chipBg: 'bg-pink-50',    chipText: 'text-[#D63384]',  label: 'Pink' },
  'bg-gray-500':   { bar: '#8B6E60', chipBg: 'bg-slate-50',   chipText: 'text-[#8B6E60]',  label: 'Gray' },
};
const COLOR_KEYS = Object.keys(COLOR_PALETTE);
const palette = (key: string) => COLOR_PALETTE[key] ?? COLOR_PALETTE['bg-blue-500'];

const MONTH_SHORT = ['Thg 1','Thg 2','Thg 3','Thg 4','Thg 5','Thg 6','Thg 7','Thg 8','Thg 9','Thg 10','Thg 11','Thg 12'];

const ROW_HEIGHT = 36;

function firstOfMonth(y: number, m: number) { return new Date(y, m - 1, 1); }
function lastOfMonth(y: number, m: number)  { return new Date(y, m, 0); }
function fmtIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function monthInYear(iso: string, year: number): number {
  const d = new Date(iso);
  if (d.getFullYear() < year) return 1;
  if (d.getFullYear() > year) return 12;
  return d.getMonth() + 1;
}

export default function RoadmapTimeline({
  projectId, canEdit,
  month, year, onChangeMonth,
  revenues = [], onSaveRevenue,
  kpi = 0, onSaveKpi,
}: Props) {
  const qc = useQueryClient();
  const today = useMemo(() => new Date(), []);

  const { data: items = [] } = useQuery({
    queryKey: ['roadmap', projectId],
    queryFn: () => fetchRoadmap(projectId),
    enabled: !!projectId,
  });

  const [collapsed, setCollapsed] = useState(false);

  // ----- Roadmap edit modal state -----
  const [editing, setEditing] = useState<RoadmapUpdateDto | { kind: 'new'; startMonth: number } | null>(null);
  const [draft, setDraft] = useState({
    name: '', description: '', color: 'bg-blue-500',
    startMonth: 1, endMonth: 1, year: year,
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);

  // ----- Revenue/KPI inline edit state -----
  const [editingRev, setEditingRev] = useState<number | 'kpi' | null>(null);
  const [revDraft, setRevDraft] = useState('');
  const [revError, setRevError] = useState<string | null>(null);
  const revInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editingRev !== null) revInputRef.current?.focus();
  }, [editingRev]);

  const revMap = new Map(revenues.map((r) => [r.month, Number(r.amount)]));
  // YTD cutoff: include all months that have ENDED.
  // Current year → only months strictly before current month (current month not yet finished).
  // Past year → all 12. Future year → 0.
  const ytdCutoff =
    year < today.getFullYear() ? 12 :
    year > today.getFullYear() ? 0 :
    today.getMonth(); // 0-based current month index = number of completed months
  const ytdTotal = Array.from(revMap.entries())
    .filter(([m]) => m <= ytdCutoff)
    .reduce((sum, [, amt]) => sum + amt, 0);
  const pct = kpi > 0 ? Math.round((ytdTotal / kpi) * 100) : null;

  const monthsWithData = revMap.size;
  const monthsWithoutData = 12 - monthsWithData;
  const totalActual = Array.from(revMap.values()).reduce((s, v) => s + v, 0);
  const remainingKpi = Math.max(0, kpi - totalActual);
  const targetPerRemaining = monthsWithoutData > 0 && remainingKpi > 0
    ? Math.round(remainingKpi / monthsWithoutData)
    : 0;

  const startEditRev = (target: number | 'kpi') => {
    console.log('[Rev] startEdit', { target, canEdit });
    if (!canEdit) { console.warn('[Rev] startEdit blocked: canEdit=false'); return; }
    const current = target === 'kpi' ? kpi : revMap.get(target);
    setRevDraft(current ? String(current) : '');
    setRevError(null);
    setEditingRev(target);
  };
  const commitRev = () => {
    if (editingRev === null) return;
    const trimmed = revDraft.trim();
    console.log('[Rev] commit', { editingRev, draft: trimmed });
    const apply = (amount: number) => {
      console.log('[Rev] applying', { editingRev, amount });
      if (editingRev === 'kpi') onSaveKpi?.(amount);
      else onSaveRevenue?.(editingRev, amount);
    };
    if (!trimmed) { apply(0); setEditingRev(null); return; }
    const parsed = parseVnd(trimmed);
    if (parsed === null) { setRevError('Sai format. VD: 5200000000 hoặc 5.2B'); return; }
    apply(parsed);
    setEditingRev(null);
  };

  // ----- Roadmap layout -----
  const yearItems = useMemo(() => {
    return items.filter((it) => {
      const s = new Date(it.startDate);
      const e = new Date(it.endDate);
      return s.getFullYear() <= year && e.getFullYear() >= year;
    });
  }, [items, year]);

  const itemsLaidOut = useMemo(() => {
    const sorted = [...yearItems].sort((a, b) => {
      const sa = Math.max(1, monthInYear(a.startDate, year));
      const sb = Math.max(1, monthInYear(b.startDate, year));
      return sa - sb || a.order - b.order;
    });
    const rowsLastEnd: number[] = [];
    return sorted.map((item) => {
      const sM = Math.max(1, monthInYear(item.startDate, year));
      const eM = Math.min(12, monthInYear(item.endDate, year));
      let row = -1;
      for (let r = 0; r < rowsLastEnd.length; r++) {
        if (rowsLastEnd[r] < sM) { row = r; break; }
      }
      if (row === -1) { rowsLastEnd.push(eM); row = rowsLastEnd.length - 1; }
      else rowsLastEnd[row] = eM;
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

  const moveItem = (item: RoadmapUpdateDto, targetStartMonth: number) => {
    const s = new Date(item.startDate);
    const e = new Date(item.endDate);
    const span = (e.getMonth() - s.getMonth()) + 12 * (e.getFullYear() - s.getFullYear());
    const newStart = firstOfMonth(year, targetStartMonth);
    const newEnd = lastOfMonth(year, Math.min(12, targetStartMonth + span));
    updMut.mutate({ id: item.id, data: { startDate: fmtIsoDate(newStart), endDate: fmtIsoDate(newEnd) } });
  };
  const reorderItems = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const dragged = items.find((it) => it.id === draggedId);
    const target = items.find((it) => it.id === targetId);
    if (!dragged || !target) return;
    const dM = new Date(dragged.startDate).getMonth();
    const tM = new Date(target.startDate).getMonth();
    if (dM !== tM) { moveItem(dragged, tM + 1); return; }
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
  const todayLeftPct = isCurrentYear
    ? ((today.getMonth() + (today.getDate() - 1) / new Date(year, today.getMonth() + 1, 0).getDate()) / 12) * 100
    : -1;

  return (
    <div className="bg-white border border-[#FFE4D6] rounded-xl mb-4 overflow-hidden" style={{ boxShadow: '0 4px 16px rgba(45,27,20,0.04)' }}>
      {/* Top header: collapse toggle + year nav + counts */}
      <div className="flex items-center px-5 py-3 border-b border-[#FFE4D6] gap-3">
        <button onClick={() => setCollapsed(!collapsed)} className="text-[#8B6E60] hover:text-[#E8341A] text-sm">
          {collapsed ? '▶' : '▼'}
        </button>
        <span className="text-base font-bold text-[#2D1B14]">Roadmap</span>
        <div className="flex items-center gap-1 ml-2">
          <button onClick={() => onChangeMonth(month, year - 1)} className="text-[#8B6E60] hover:text-[#E8341A] px-1.5 py-0.5 rounded hover:bg-[#FFF0EB]">◀</button>
          <span className="font-bold text-sm text-[#2D1B14] w-12 text-center">{year}</span>
          <button onClick={() => onChangeMonth(month, year + 1)} className="text-[#8B6E60] hover:text-[#E8341A] px-1.5 py-0.5 rounded hover:bg-[#FFF0EB]">▶</button>
          {!isCurrentYear && (
            <button onClick={() => onChangeMonth(month, today.getFullYear())} className="ml-1 text-[11px] text-[#E8341A] hover:underline">Hôm nay</button>
          )}
        </div>
        <span className="ml-auto text-[11px] text-[#8B6E60]">{yearItems.length} updates</span>
      </div>

      {!collapsed && (
        <div>
          {/* Revenue numbers — 12 cols above month tabs */}
          <div className="grid w-full px-1 pt-3" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}>
            {MONTH_SHORT.map((_, i) => {
              const m = i + 1;
              const amt = revMap.get(m);
              const isEditing = editingRev === m;
              const showTarget = (!amt || amt === 0) && targetPerRemaining > 0;
              return (
                <div key={m} className="flex justify-center items-end pb-1.5">
                  {isEditing ? (
                    <div className="flex flex-col items-stretch w-full px-1">
                      <input
                        ref={revInputRef}
                        value={revDraft}
                        onChange={(e) => { setRevDraft(e.target.value); setRevError(null); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRev();
                          if (e.key === 'Escape') { setEditingRev(null); setRevError(null); }
                        }}
                        onBlur={commitRev}
                        placeholder="5.2B"
                        className="text-xs border-b border-[#F5A623] outline-none px-1 w-full text-center bg-transparent"
                      />
                      {revError && <span className="text-[9px] text-[#E8341A] whitespace-nowrap text-center">{revError}</span>}
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditRev(m)}
                      disabled={!canEdit}
                      className={`text-xs font-bold rounded w-full ${
                        amt && amt > 0 ? 'text-[#2D1B14]' : showTarget ? 'text-[#F5A623] italic' : 'text-[#FFD4C4]'
                      } ${canEdit ? 'hover:bg-[#FFF0EB] hover:text-[#E8341A] cursor-pointer' : 'cursor-default'}`}
                      title={
                        canEdit
                          ? amt && amt > 0
                            ? `Doanh thu thực: ${formatVnd(amt)} VND`
                            : `Mục tiêu: ${formatVnd(targetPerRemaining)} VND`
                          : ''
                      }
                    >
                      {amt && amt > 0 ? formatVnd(amt) : showTarget ? formatVnd(targetPerRemaining) : '—'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Month tabs row — clickable to switch active month */}
          <div className="px-1">
            <div className="grid w-full rounded-lg p-1 gap-1" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', background: '#FFF0EB' }}>
              {MONTH_SHORT.map((name, i) => {
                const m = i + 1;
                const isActive = m === month;
                return (
                  <button
                    key={m}
                    onClick={() => onChangeMonth(m, year)}
                    className={`py-1.5 rounded-md text-sm font-semibold transition-all ${
                      isActive ? 'text-white' : 'text-[#8B6E60] hover:bg-[#FFE4D6] hover:text-[#E8341A]'
                    }`}
                    style={isActive ? { background: 'linear-gradient(135deg, #E8341A 0%, #F5A623 100%)', boxShadow: '0 4px 14px rgba(232,52,26,0.25)' } : undefined}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-2 pt-3 pb-2">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-[0.12em] text-[#8B6E60] font-bold">Progress {year}</span>
                <span className="text-[11px] font-bold text-[#2D1B14]">{formatVnd(ytdTotal)}</span>
                {pct !== null && <span className="text-[11px] font-semibold" style={{ color: '#E8341A' }}>({pct}%)</span>}
                <span className="text-[10px] text-[#8B6E60] italic">cộng dồn các tháng đã đi qua</span>
              </span>
              <span className="text-[11px] text-[#8B6E60]">
                {editingRev === 'kpi' ? (
                  <input
                    ref={revInputRef}
                    value={revDraft}
                    onChange={(e) => { setRevDraft(e.target.value); setRevError(null); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRev();
                      if (e.key === 'Escape') { setEditingRev(null); setRevError(null); }
                    }}
                    onBlur={commitRev}
                    placeholder="KPI VD: 50B"
                    className="text-[11px] border border-[#F5A623] rounded outline-none px-1.5 py-0.5 w-24 bg-white inline-block"
                  />
                ) : (
                  <button
                    onClick={() => startEditRev('kpi')}
                    disabled={!canEdit}
                    className={`font-bold ${canEdit ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                    style={{ color: '#7C4DFF' }}
                  >
                    KPI {kpi > 0 ? formatVnd(kpi) : '— Set KPI'}
                  </button>
                )}
                {revError && <span className="text-[10px] text-[#E8341A] ml-2">{revError}</span>}
              </span>
            </div>
            <div className="relative h-3 w-full rounded-full overflow-hidden" style={{ background: '#FFF0EB', border: '1px solid #FFE4D6' }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{
                  width: kpi > 0 ? `${Math.min(100, (ytdTotal / kpi) * 100)}%` : '0%',
                  background: 'linear-gradient(90deg, #E8341A 0%, #F5A623 100%)',
                  boxShadow: '0 0 12px rgba(245,166,35,0.45)',
                }}
              />
            </div>
          </div>

          {/* Roadmap timeline body */}
          <div className="bg-[#FFF8F5]/40">
            <div className="relative" style={{ height: totalRows * ROW_HEIGHT + 8 }}>
              {/* Vertical month cells (drop targets + click to add) */}
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}>
                {MONTH_SHORT.map((_, i) => {
                  const m = i + 1;
                  const isCurrentMonth = isCurrentYear && m === today.getMonth() + 1;
                  const isHover = hoverMonth === m;
                  return (
                    <div
                      key={i}
                      className={`border-r last:border-r-0 border-[#FFE4D6] h-full transition-colors ${
                        isCurrentMonth ? 'bg-[#FFF0EB]/50' : ''
                      } ${isHover && draggingId ? 'bg-[#FFE4D6]/60' : ''} ${
                        canEdit ? 'cursor-pointer hover:bg-[#FFF0EB]/60 group/col' : ''
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
                        <div className="opacity-0 group-hover/col:opacity-100 h-full flex items-center justify-center text-[#8B6E60] text-lg pointer-events-none transition-opacity">+</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Today line */}
              {todayLeftPct >= 0 && (
                <div className="absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none" style={{ left: `${todayLeftPct}%`, background: '#E8341A' }} title="Hôm nay" />
              )}

              {/* Item bars */}
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
                      e.preventDefault(); e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      if (!canEdit) return;
                      e.preventDefault(); e.stopPropagation();
                      const draggedId = e.dataTransfer.getData('text/roadmap-id');
                      if (!draggedId || draggedId === item.id) return;
                      reorderItems(draggedId, item.id);
                      setDraggingId(null); setHoverMonth(null);
                    }}
                    onClick={(e) => { e.stopPropagation(); if (canEdit) openEdit(item); }}
                    className={`absolute text-white rounded-md shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing flex items-center px-2.5 transition-all ${
                      draggingId === item.id ? 'opacity-50' : 'opacity-95 hover:opacity-100'
                    }`}
                    style={{
                      left: `calc(${leftPct}% + 4px)`,
                      width: `calc(${widthPct}% - 8px)`,
                      top,
                      height: ROW_HEIGHT - 8,
                      background: c.bar,
                      boxShadow: `0 2px 10px ${c.bar}40`,
                    }}
                    title={`${item.name}${item.description ? ' — ' + item.description : ''}`}
                  >
                    <span className="text-xs font-medium truncate">{item.name}</span>
                  </div>
                );
              })}

              {yearItems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-[#8B6E60] italic pointer-events-none">
                  Chưa có roadmap update nào trong năm {year}. {canEdit ? 'Click vào ô tháng để thêm.' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Roadmap edit modal */}
      {editing && canEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeEdit}>
          <div className="bg-white rounded-xl w-[480px] max-w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-[#2D1B14]">{editing && 'kind' in editing ? 'Thêm roadmap update' : 'Sửa roadmap update'}</h3>
              <button onClick={closeEdit} className="text-[#8B6E60] hover:text-[#E8341A] text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8B6E60] mb-1.5">Tên update</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="VD: Ra mắt tính năng X"
                  className="w-full text-sm border border-[#FFE4D6] rounded-lg px-3 py-2.5 outline-none focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623]/20 transition"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8B6E60] mb-1.5">Mô tả</label>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full text-sm border border-[#FFE4D6] rounded-lg px-3 py-2.5 outline-none focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623]/20 resize-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#8B6E60] mb-1.5">Năm</label>
                  <input type="number" value={draft.year} onChange={(e) => setDraft((p) => ({ ...p, year: parseInt(e.target.value) || p.year }))} className="w-full text-sm border border-[#FFE4D6] rounded-lg px-3 py-2.5 outline-none focus:border-[#F5A623]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8B6E60] mb-1.5">Từ tháng</label>
                  <select value={draft.startMonth} onChange={(e) => setDraft((p) => ({ ...p, startMonth: parseInt(e.target.value) }))} className="w-full text-sm border border-[#FFE4D6] rounded-lg px-3 py-2.5 outline-none focus:border-[#F5A623] bg-white">
                    {MONTH_SHORT.map((label, i) => <option key={i} value={i + 1}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8B6E60] mb-1.5">Đến tháng</label>
                  <select value={draft.endMonth} onChange={(e) => setDraft((p) => ({ ...p, endMonth: parseInt(e.target.value) }))} className="w-full text-sm border border-[#FFE4D6] rounded-lg px-3 py-2.5 outline-none focus:border-[#F5A623] bg-white">
                    {MONTH_SHORT.map((label, i) => <option key={i} value={i + 1}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#8B6E60] mb-1.5">Màu tag</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_KEYS.map((key) => {
                    const c = COLOR_PALETTE[key];
                    const selected = draft.color === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setDraft((p) => ({ ...p, color: key }))}
                        className={`relative w-8 h-8 rounded-lg transition-all hover:scale-110 ${selected ? 'ring-2 ring-offset-2 ring-gray-900' : ''}`}
                        style={{ background: c.bar }}
                        title={c.label}
                      >
                        {selected && <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-[#FFF8F5] flex items-center gap-2">
              {editing && 'id' in editing && (
                <button onClick={handleDelete} className="text-sm text-[#E8341A] hover:bg-[#FFF0EB] px-3 py-1.5 rounded-md">Xoá</button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button onClick={closeEdit} className="text-sm text-[#8B6E60] hover:bg-gray-100 px-3 py-1.5 rounded-md">Hủy</button>
                <button
                  onClick={submit}
                  disabled={!draft.name.trim() || createMut.isPending || updMut.isPending}
                  className="text-sm text-white px-4 py-1.5 rounded-md disabled:opacity-50 transition"
                  style={{ background: 'linear-gradient(135deg, #E8341A 0%, #F5A623 100%)' }}
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
