import { useState, useRef, useEffect, useCallback } from 'react';
import type { BuildDto, UserDto } from '@ctp1/shared';

interface DevPhase {
  id: string;
  label: string;
  startDay: number;
  endDay: number;
  type: 'build' | 'live';
}

interface Props {
  builds: BuildDto[];
  users: UserDto[];
  month: number;
  year: number;
  dayWidth: number;
  totalDays: number;
  onCreateBuild: (name: string) => void;
  onDeleteBuild: (id: string) => void;
  onUpdateBuild: (id: string, data: any) => void;
  onAddMilestone: (buildId: string, data: { name: string; date: string; type: string }) => void;
  onDeleteMilestone: (milestoneId: string, buildId: string) => void;
  onAssignBuild?: (buildId: string, userId: string, buildName: string, startDay: number, endDay: number) => void;
  onUnassignBuild?: (buildId: string, userId: string) => void;
  onPhaseResize?: (buildId: string, startDay: number, endDay: number) => void;
  onReorderBuild?: (buildId: string, direction: 'up' | 'down') => void;
  onReorderBuilds?: (orderedIds: string[]) => void;
  syncKey?: number;
}

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function isWeekend(year: number, month: number, day: number) {
  const d = new Date(year, month - 1, day).getDay();
  return d === 0 || d === 6;
}

const ROW_HEIGHT = 32;

const PHASE_COLORS = [
  'bg-blue-400', 'bg-indigo-400', 'bg-violet-400', 'bg-purple-400', 'bg-fuchsia-400',
];
const LIVE_COLOR = 'bg-green-500';

// --- Persistence: build.phases / build.notes are stored in DB now; localStorage = fallback / cache ---
function getNotesKey(buildId: string) { return `buildNotes-${buildId}`; }
function getPhasesKey(buildId: string) { return `devPhases-${buildId}`; }

function defaultPhases(buildId: string, todayDay: number): DevPhase[] {
  return [
    { id: `${buildId}-b1`, label: 'Build 1', startDay: todayDay, endDay: Math.min(todayDay + 6, 31), type: 'build' },
    { id: `${buildId}-live`, label: 'Live', startDay: Math.min(todayDay + 10, 31), endDay: Math.min(todayDay + 17, 31), type: 'live' },
  ];
}

function loadPhases(build: BuildDto, todayDay: number): DevPhase[] {
  // 1. DB (source of truth)
  const fromDb = Array.isArray((build as any).phases) ? (build as any).phases as DevPhase[] : null;
  if (fromDb && fromDb.length > 0) return fromDb;
  // 2. localStorage migration fallback
  try {
    const raw = localStorage.getItem(getPhasesKey(build.id));
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch { /* ignore */ }
  // 3. Default
  return defaultPhases(build.id, todayDay);
}

function loadNotes(build: BuildDto): string {
  if (typeof (build as any).notes === 'string' && (build as any).notes.length > 0) return (build as any).notes;
  try { return localStorage.getItem(getNotesKey(build.id)) ?? ''; } catch { return ''; }
}

function savePhasesLocal(buildId: string, phases: DevPhase[]) {
  try { localStorage.setItem(getPhasesKey(buildId), JSON.stringify(phases)); } catch { /* ignore */ }
}
function saveNotesLocal(buildId: string, notes: string) {
  try { localStorage.setItem(getNotesKey(buildId), notes); } catch { /* ignore */ }
}

export default function BuildTimeline({ builds, users, month, year, dayWidth, totalDays, onCreateBuild, onDeleteBuild, onUpdateBuild, onAssignBuild, onUnassignBuild, onPhaseResize, onReorderBuild, onReorderBuilds, syncKey }: Props) {
  const [draggingBuildId, setDraggingBuildId] = useState<string | null>(null);
  const [dragOverBuildId, setDragOverBuildId] = useState<string | null>(null);
  const [isAddingBuild, setIsAddingBuild] = useState(false);
  const [newBuildName, setNewBuildName] = useState('');
  const [editingBuildName, setEditingBuildName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState('');
  const [assigneePopup, setAssigneePopup] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [expandedBuilds, setExpandedBuilds] = useState<Set<string>>(new Set());
  const now = new Date();
  const todayDay = now.getMonth() + 1 === month && now.getFullYear() === year ? now.getDate() : 1;

  const [notesMap, setNotesMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const b of builds) map[b.id] = loadNotes(b);
    return map;
  });

  // Phase state per build — keyed by build id
  const [phasesMap, setPhasesMap] = useState<Record<string, DevPhase[]>>(() => {
    const map: Record<string, DevPhase[]> = {};
    for (const b of builds) map[b.id] = loadPhases(b, todayDay);
    return map;
  });

  // One-time migration: if a build has no phases in DB but localStorage does, push to DB
  useEffect(() => {
    for (const b of builds) {
      const dbPhases = (b as any).phases as DevPhase[] | undefined;
      if (Array.isArray(dbPhases) && dbPhases.length > 0) continue; // already in DB
      try {
        const raw = localStorage.getItem(getPhasesKey(b.id));
        if (!raw) continue;
        const local = JSON.parse(raw);
        if (Array.isArray(local) && local.length > 0) {
          onUpdateBuild(b.id, { phases: local });
        }
      } catch { /* ignore */ }
      // Notes too
      const dbNotes = (b as any).notes as string | undefined;
      if (typeof dbNotes !== 'string' || dbNotes.length === 0) {
        try {
          const localN = localStorage.getItem(getNotesKey(b.id));
          if (localN && localN.length > 0) onUpdateBuild(b.id, { notes: localN });
        } catch { /* ignore */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builds.map((b) => b.id).join(',')]);

  const toggleExpand = (buildId: string) => {
    setExpandedBuilds((prev) => {
      const next = new Set(prev);
      if (next.has(buildId)) next.delete(buildId); else next.add(buildId);
      return next;
    });
  };

  // Debounced save: keeps DB synced with edits without spamming during drag-resize
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const scheduleSavePhases = useCallback((buildId: string, phases: DevPhase[]) => {
    if (saveTimers.current[buildId]) clearTimeout(saveTimers.current[buildId]);
    saveTimers.current[buildId] = setTimeout(() => {
      onUpdateBuild(buildId, { phases });
    }, 400);
  }, [onUpdateBuild]);
  const scheduleSaveNotes = useCallback((buildId: string, notes: string) => {
    const k = `notes-${buildId}`;
    if (saveTimers.current[k]) clearTimeout(saveTimers.current[k]);
    saveTimers.current[k] = setTimeout(() => {
      onUpdateBuild(buildId, { notes });
    }, 600);
  }, [onUpdateBuild]);

  const updateNotes = useCallback((buildId: string, text: string) => {
    setNotesMap((prev) => ({ ...prev, [buildId]: text }));
    saveNotesLocal(buildId, text);
    scheduleSaveNotes(buildId, text);
  }, [scheduleSaveNotes]);

  // Sync when builds list changes (new build added or remote refresh)
  useEffect(() => {
    setPhasesMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const b of builds) {
        const dbPhases = (b as any).phases as DevPhase[] | undefined;
        if (Array.isArray(dbPhases) && dbPhases.length > 0) {
          // Use DB version (latest from server) — but only if local doesn't have unsaved changes
          if (!next[b.id] || JSON.stringify(next[b.id]) !== JSON.stringify(dbPhases)) {
            // Avoid clobbering if user is actively editing — only update on first load
            if (!next[b.id]) { next[b.id] = dbPhases; changed = true; }
          }
        } else if (!next[b.id]) {
          next[b.id] = loadPhases(b, todayDay);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setNotesMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const b of builds) {
        if (!(b.id in next)) { next[b.id] = loadNotes(b); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [builds, todayDay]);

  // Reload phases when external sync happens (task dates changed)
  useEffect(() => {
    if (syncKey && syncKey > 0) {
      setPhasesMap(() => {
        const next: Record<string, DevPhase[]> = {};
        for (const b of builds) next[b.id] = loadPhases(b, todayDay);
        return next;
      });
    }
  }, [syncKey, builds, todayDay]);

  const updatePhases = useCallback((buildId: string, updater: (prev: DevPhase[]) => DevPhase[]) => {
    setPhasesMap((prev) => {
      const old = prev[buildId] ?? [];
      const next = updater(old);
      savePhasesLocal(buildId, next);
      scheduleSavePhases(buildId, next);
      return { ...prev, [buildId]: next };
    });
  }, [scheduleSavePhases]);

  const daysInMonth = getDaysInMonth(month, year);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;

  const addInputRef = useRef<HTMLInputElement>(null);
  const editNameRef = useRef<HTMLInputElement>(null);
  const editLabelRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isAddingBuild) addInputRef.current?.focus(); }, [isAddingBuild]);
  useEffect(() => { if (editingBuildName) editNameRef.current?.focus(); }, [editingBuildName]);
  useEffect(() => { if (editingLabel) editLabelRef.current?.focus(); }, [editingLabel]);

  const handleAddBuild = () => {
    const trimmed = newBuildName.trim();
    if (!trimmed) { setIsAddingBuild(false); return; }
    onCreateBuild(trimmed);
    setNewBuildName('');
    setIsAddingBuild(false);
  };

  const handleRenameBuild = (buildId: string) => {
    const trimmed = editNameValue.trim();
    setEditingBuildName(null);
    if (trimmed) {
      onUpdateBuild(buildId, { name: trimmed });
    }
  };

  const addBuildPhase = (buildId: string) => {
    updatePhases(buildId, (prev) => {
      const buildPhases = prev.filter((p) => p.type === 'build');
      const lastBuild = buildPhases[buildPhases.length - 1];
      const newNum = buildPhases.length + 1;
      const startDay = lastBuild ? lastBuild.endDay + 1 : todayDay;
      const endDay = Math.min(startDay + 4, daysInMonth);
      const newPhase: DevPhase = {
        id: `${buildId}-b${newNum}-${Date.now()}`,
        label: `Build ${newNum}`,
        startDay,
        endDay,
        type: 'build',
      };
      // Insert before live phase
      const liveIdx = prev.findIndex((p) => p.type === 'live');
      if (liveIdx >= 0) {
        const next = [...prev];
        next.splice(liveIdx, 0, newPhase);
        return next;
      }
      return [...prev, newPhase];
    });
  };

  const removePhase = (buildId: string, phaseId: string) => {
    updatePhases(buildId, (prev) => prev.filter((p) => p.id !== phaseId));
  };

  const updatePhaseDay = (buildId: string, phaseId: string, field: 'startDay' | 'endDay', value: number) => {
    updatePhases(buildId, (prev) => {
      const next = prev.map((p) => p.id === phaseId ? { ...p, [field]: value } : p);
      // Notify parent with overall build range for task sync
      if (onPhaseResize) {
        const startDay = Math.min(...next.map((p) => p.startDay));
        const endDay = Math.max(...next.map((p) => p.endDay));
        onPhaseResize(buildId, startDay, endDay);
      }
      return next;
    });
  };

  const updatePhaseLabel = (buildId: string, phaseId: string, label: string) => {
    updatePhases(buildId, (prev) =>
      prev.map((p) => p.id === phaseId ? { ...p, label } : p)
    );
  };


  // No need for document click listener - using backdrop overlay instead

  return (
    <>
      {/* Section divider */}
      <div className="flex items-center justify-between px-2 py-1 bg-gray-50 border-t border-b">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dev Timeline</span>
        <button onClick={() => setIsAddingBuild(true)} className="text-xs text-blue-600 hover:text-blue-800">+ Thêm Build</button>
      </div>

      {/* Inline add build */}
      {isAddingBuild && (
        <div className="px-2 py-1 border-b bg-blue-50">
          <input
            ref={addInputRef}
            value={newBuildName}
            onChange={(e) => setNewBuildName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleAddBuild(); }
              if (e.key === 'Escape') { setIsAddingBuild(false); setNewBuildName(''); }
            }}
            onBlur={() => { if (!newBuildName.trim()) setIsAddingBuild(false); }}
            placeholder="Tên tính năng..."
            className="w-full text-sm border rounded px-2 py-1 outline-none focus:border-blue-400 bg-white"
          />
        </div>
      )}

      {/* Build rows */}
      {builds.map((build) => {
        const phases = phasesMap[build.id] ?? [];
        const isEditingName = editingBuildName === build.id;
        const isExpanded = expandedBuilds.has(build.id);
        const notes = notesMap[build.id] ?? '';

        return (
          <div key={build.id}>
          <div
            className={`relative border-b group/row ${draggingBuildId === build.id ? 'opacity-40' : ''} ${dragOverBuildId === build.id ? 'border-t-2 border-blue-400' : ''}`}
            style={{ height: ROW_HEIGHT }}
            draggable={!!onReorderBuilds}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/build-id', build.id);
              e.dataTransfer.effectAllowed = 'move';
              setDraggingBuildId(build.id);
            }}
            onDragEnd={() => { setDraggingBuildId(null); setDragOverBuildId(null); }}
            onDragOver={(e) => {
              if (!onReorderBuilds) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (draggingBuildId && draggingBuildId !== build.id) setDragOverBuildId(build.id);
            }}
            onDragLeave={() => setDragOverBuildId(null)}
            onDrop={(e) => {
              if (!onReorderBuilds) return;
              e.preventDefault();
              const draggedId = e.dataTransfer.getData('text/build-id');
              setDragOverBuildId(null);
              setDraggingBuildId(null);
              if (!draggedId || draggedId === build.id) return;
              const ids = builds.map((b) => b.id);
              const fromIdx = ids.indexOf(draggedId);
              const toIdx = ids.indexOf(build.id);
              if (fromIdx < 0 || toIdx < 0) return;
              ids.splice(fromIdx, 1);
              ids.splice(toIdx, 0, draggedId);
              onReorderBuilds(ids);
            }}
          >
            {/* Background grid */}
            <div className="absolute inset-0 flex">
              {days.map((d) => (
                <div key={d} className={`border-r h-full ${d <= daysInMonth && isWeekend(year, month, d) ? 'bg-gray-50' : ''}`} style={{ width: dayWidth, minWidth: dayWidth }} />
              ))}
            </div>

            {/* Build name "info pill" — solid bg with right shadow, sits ON TOP of timeline bars */}
            <div
              className="absolute left-0 top-0 h-full flex items-center z-20 px-1.5 gap-1"
              style={{
                background: 'linear-gradient(to right, #FFFFFF 0%, #FFFFFF 90%, rgba(255,255,255,0.85) 100%)',
                boxShadow: '6px 0 12px -4px rgba(45,27,20,0.18)',
                borderRight: '1px solid #FFE4D6',
                maxWidth: '40%',
              }}
            >
              <button
                onClick={() => toggleExpand(build.id)}
                className="text-[10px] text-[#8B6E60] hover:text-[#E8341A] w-3 flex-shrink-0"
              >
                {isExpanded ? '▼' : '▶'}
              </button>
              {isEditingName ? (
                <input
                  ref={editNameRef}
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameBuild(build.id);
                    if (e.key === 'Escape') setEditingBuildName(null);
                  }}
                  onBlur={() => handleRenameBuild(build.id)}
                  className="text-xs font-medium bg-white border border-[#F5A623] rounded px-1 py-0.5 outline-none w-[140px] flex-shrink-0"
                />
              ) : (
                <span
                  className="text-xs text-[#2D1B14] font-semibold px-1 rounded cursor-pointer hover:text-[#E8341A] truncate max-w-[140px] flex-shrink-0"
                  title={`${build.name} (Double-click để đổi tên)`}
                  onDoubleClick={() => { setEditingBuildName(build.id); setEditNameValue(build.name); }}
                >
                  {build.name}
                </span>
              )}
              {/* Assignee avatars */}
              {build.assignees?.map((a) => (
                <span
                  key={a.userId}
                  className="text-[10px] px-1.5 rounded cursor-pointer whitespace-nowrap font-medium flex-shrink-0"
                  style={{ background: '#FFF0EB', color: '#E8341A' }}
                  onClick={(e) => {
                    if (assigneePopup === build.id) { setAssigneePopup(null); return; }
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPopupPos({ top: rect.bottom + 4, left: rect.left });
                    setAssigneePopup(build.id);
                  }}
                >
                  {a.user?.name ?? a.userId}
                </span>
              ))}
              {/* "+" assign button - always visible */}
              <button
                onClick={(e) => {
                  if (assigneePopup === build.id) { setAssigneePopup(null); return; }
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPopupPos({ top: rect.bottom + 4, left: rect.left });
                  setAssigneePopup(build.id);
                }}
                className="text-gray-400 hover:text-blue-600 text-xs ml-1 bg-gray-100 hover:bg-blue-50 rounded-full w-5 h-5 flex items-center justify-center"
                title="Assign member"
              >
                +
              </button>
              {/* Delete & add phase - hover only */}
              <button
                onClick={() => addBuildPhase(build.id)}
                className="opacity-0 group-hover/row:opacity-100 text-blue-400 hover:text-blue-600 text-xs ml-0.5"
                title="Thêm build phase"
              >
                ⊕
              </button>
              <button
                onClick={() => onDeleteBuild(build.id)}
                className="opacity-0 group-hover/row:opacity-100 text-red-400 hover:text-red-600 text-xs ml-0.5"
              >
                ✕
              </button>
              {/* Reorder arrows */}
              {onReorderBuild && (
                <>
                  <button
                    onClick={() => onReorderBuild(build.id, 'up')}
                    disabled={builds.indexOf(build) === 0}
                    className="opacity-0 group-hover/row:opacity-100 text-gray-400 hover:text-gray-700 disabled:text-gray-200 disabled:hover:text-gray-200 text-xs ml-1"
                    title="Di chuyển lên"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => onReorderBuild(build.id, 'down')}
                    disabled={builds.indexOf(build) === builds.length - 1}
                    className="opacity-0 group-hover/row:opacity-100 text-gray-400 hover:text-gray-700 disabled:text-gray-200 disabled:hover:text-gray-200 text-xs"
                    title="Di chuyển xuống"
                  >
                    ▼
                  </button>
                </>
              )}
              {/* Assignee popup */}
              {assigneePopup === build.id && (
                <>
                <div
                  className="fixed inset-0 z-[100]"
                  onClick={() => setAssigneePopup(null)}
                />
                <div
                  data-assignee-popup
                  className="fixed z-[110] bg-white border border-[#FFE4D6] rounded-lg shadow-xl p-2 w-52 max-h-[60vh] overflow-y-auto"
                  style={{
                    top: Math.min(popupPos.top, window.innerHeight - 320),
                    left: Math.min(popupPos.left, window.innerWidth - 220),
                    boxShadow: '0 12px 40px rgba(45,27,20,0.18)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="text-xs text-[#8B6E60] mb-1.5 font-semibold uppercase tracking-wider px-1">
                    Assign member · {build.name}
                  </div>
                  {users.map((u) => {
                    const isAssigned = build.assignees?.some((a) => a.userId === u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const firstPhase = phases[0];
                          const lastPhase = phases[phases.length - 1];
                          const startDay = firstPhase?.startDay ?? 1;
                          const endDay = lastPhase?.endDay ?? 7;
                          if (isAssigned) {
                            onUnassignBuild?.(build.id, u.id);
                          } else {
                            onAssignBuild?.(build.id, u.id, build.name, startDay, endDay);
                          }
                        }}
                        className={`flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${
                          isAssigned ? 'bg-[#FFF0EB] text-[#E8341A]' : 'hover:bg-[#FFF8F5] text-[#2D1B14]'
                        }`}
                      >
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{
                            background: isAssigned
                              ? 'linear-gradient(135deg, #E8341A 0%, #F5A623 100%)'
                              : '#8B6E60',
                          }}
                        >
                          {u.name?.charAt(0).toUpperCase()}
                        </span>
                        <span className="flex-1">{u.name}</span>
                        {isAssigned && <span className="text-[#E8341A] font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
                </>
              )}
            </div>

            {/* Phase bars */}
            {phases.map((phase, pi) => {
              const left = (phase.startDay - 1) * dayWidth;
              const width = (phase.endDay - phase.startDay + 1) * dayWidth;
              const isPastPhase = isCurrentMonth ? phase.endDay < todayDay : year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
              const color = isPastPhase ? 'bg-gray-300' : (phase.type === 'live' ? LIVE_COLOR : PHASE_COLORS[pi % PHASE_COLORS.length]);
              const isEditing = editingLabel === phase.id;

              if (width <= 0) return null;

              return (
                <div
                  key={phase.id}
                  className={`absolute ${color} ${isPastPhase ? 'opacity-50' : 'opacity-80 hover:opacity-100'} flex items-center justify-center transition-opacity group/phase ${isEditing ? '' : 'cursor-grab active:cursor-grabbing'}`}
                  style={{ left, width, height: ROW_HEIGHT - 6, top: 3, borderRadius: 3 }}
                  onMouseDown={(e) => {
                    if (isEditing) return;
                    // Ignore clicks on resize handles or buttons (they have higher z + their own handlers stop propagation)
                    const target = e.target as HTMLElement;
                    if (target.closest('button, input')) return;
                    if (target.classList.contains('cursor-col-resize')) return;
                    e.preventDefault();
                    const startX = e.clientX;
                    const origStart = phase.startDay;
                    const origEnd = phase.endDay;
                    let lastDelta = 0;
                    const onMove = (ev: MouseEvent) => {
                      const dx = ev.clientX - startX;
                      const delta = Math.round(dx / dayWidth);
                      if (delta === lastDelta) return;
                      lastDelta = delta;
                      // Compute new positions but don't go below day 1
                      const newStart = Math.max(1, origStart + delta);
                      const newEnd = newStart + (origEnd - origStart);
                      // Apply by setting both startDay and endDay
                      updatePhases(build.id, (prev) =>
                        prev.map((p) => p.id === phase.id ? { ...p, startDay: newStart, endDay: newEnd } : p)
                      );
                    };
                    const onUp = () => {
                      document.removeEventListener('mousemove', onMove);
                      document.removeEventListener('mouseup', onUp);
                      // Final notify parent for task sync
                      if (onPhaseResize) {
                        // Use latest phasesMap by reading via callback
                        setPhasesMap((cur) => {
                          const list = cur[build.id] ?? [];
                          if (list.length > 0) {
                            const startDay = Math.min(...list.map((p) => p.startDay));
                            const endDay = Math.max(...list.map((p) => p.endDay));
                            onPhaseResize(build.id, startDay, endDay);
                          }
                          return cur;
                        });
                      }
                    };
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                  }}
                  onDoubleClick={() => {
                    setEditingLabel(phase.id);
                    setEditLabelValue(phase.label);
                  }}
                  title={`${phase.label}: ngày ${phase.startDay} → ${phase.endDay} (kéo để đổi thời gian)`}
                >
                  {isEditing ? (
                    <input
                      ref={editLabelRef}
                      value={editLabelValue}
                      onChange={(e) => setEditLabelValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updatePhaseLabel(build.id, phase.id, editLabelValue);
                          setEditingLabel(null);
                        }
                        if (e.key === 'Escape') setEditingLabel(null);
                      }}
                      onBlur={() => {
                        updatePhaseLabel(build.id, phase.id, editLabelValue);
                        setEditingLabel(null);
                      }}
                      className="bg-transparent text-white text-xs font-medium text-center w-full outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-xs text-white font-medium pointer-events-none select-none truncate px-1">
                      {phase.label}
                    </span>
                  )}

                  {/* Delete phase button — works for both build & live phases */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removePhase(build.id, phase.id); }}
                    className="absolute -top-1.5 -right-1.5 opacity-0 group-hover/phase:opacity-100 bg-white text-red-500 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold shadow z-30"
                    title={`Xoá phase "${phase.label}"`}
                  >
                    ✕
                  </button>

                  {/* Resize handles */}
                  <ResizeHandle
                    side="left"
                    dayWidth={dayWidth}
                    startDay={phase.startDay}
                    endDay={phase.endDay}
                    onDrag={(newStart) => updatePhaseDay(build.id, phase.id, 'startDay', Math.max(1, newStart))}
                  />
                  <ResizeHandle
                    side="right"
                    dayWidth={dayWidth}
                    startDay={phase.startDay}
                    endDay={phase.endDay}
                    onDrag={(newEnd) => updatePhaseDay(build.id, phase.id, 'endDay', newEnd)}
                  />
                </div>
              );
            })}

            {/* Today indicator */}
            {isCurrentMonth && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none" style={{ left: (todayDay - 1) * dayWidth + dayWidth / 2 }} />
            )}
          </div>

          {/* Expandable notes area */}
          {isExpanded && (
            <div className="border-b bg-slate-50 px-3 py-2">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-1">KPI / Mục tiêu</div>
                  <textarea
                    value={notes}
                    onChange={(e) => updateNotes(build.id, e.target.value)}
                    placeholder="VD: Tăng 20% conversion rate, hoàn thành trước 15/4..."
                    className="w-full text-xs text-gray-700 bg-white border rounded px-2 py-1.5 outline-none focus:border-blue-400 resize-none leading-relaxed"
                    rows={3}
                  />
                </div>
                <div className="w-48 flex-shrink-0">
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-1">Phases</div>
                  <div className="space-y-0.5">
                    {phases.map((p) => (
                      <div key={p.id} className="flex items-center gap-1 text-xs text-gray-600">
                        <span className={`inline-block w-2 h-2 rounded-sm ${p.type === 'live' ? 'bg-green-500' : 'bg-blue-400'}`} />
                        <span className="font-medium">{p.label}</span>
                        <span className="text-gray-400">ngày {p.startDay}–{p.endDay}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        );
      })}

      {builds.length === 0 && !isAddingBuild && (
        <div className="text-center text-xs text-gray-400 py-2 border-b">Chưa có build nào</div>
      )}
    </>
  );
}

// Drag resize handle for phase bars
function ResizeHandle({ side, dayWidth, startDay, endDay, onDrag }: {
  side: 'left' | 'right';
  dayWidth: number;
  startDay: number;
  endDay: number;
  onDrag: (newDay: number) => void;
}) {
  const dragging = useRef<{ startX: number; origDay: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const origDay = side === 'left' ? startDay : endDay;
    dragging.current = { startX: e.clientX, origDay };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragging.current.startX;
      const dayDelta = Math.round(dx / dayWidth);
      const newDay = dragging.current.origDay + dayDelta;

      if (side === 'left') {
        if (newDay >= 1 && newDay <= endDay) onDrag(newDay);
      } else {
        if (newDay >= startDay) onDrag(newDay);
      }
    };

    const handleMouseUp = () => {
      dragging.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [side, dayWidth, startDay, endDay, onDrag]);

  return (
    <div
      className={`absolute ${side === 'left' ? 'left-0' : 'right-0'} top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20`}
      onMouseDown={handleMouseDown}
    />
  );
}
