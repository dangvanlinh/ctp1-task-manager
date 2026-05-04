import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import EventBar from './EventBar';
import BuildTimeline from './BuildTimeline';
import type { BuildDto, UserDto } from '@ctp1/shared';
import { fetchWeeklyEvents, saveWeeklyEvents } from '../api/weeklyEvents';
import { getWeeksInMonth } from '../utils/weekUtils';

interface EventVariant {
  id: string;
  name: string;
  color: string;
}

interface EventConfig {
  id: string;
  name: string;
  color: string;
  variants: [EventVariant, EventVariant]; // odd week, even week
}

interface EventWeek {
  eventId: string;
  week: number;
  buildStart: number; // day of month
  buildEnd: number;
  liveStart: number;
  liveEnd: number;
  label: string; // e.g. "Trứng 1 (sheet config trứng)"
}

interface Props {
  month: number;
  year: number;
  dayWidth: number;
  events: EventConfig[];
  eventWeeks: EventWeek[];
  onUpdateEventWeek?: (ew: EventWeek, field: 'buildStart' | 'buildEnd' | 'liveStart' | 'liveEnd', newDay: number) => void;
  onAddEventWeek?: (eventId: string, week: number) => void;
}

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function isWeekend(year: number, month: number, day: number) {
  const d = new Date(year, month - 1, day).getDay();
  return d === 0 || d === 6;
}

const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 32;

// 3 event categories, each with 2 variants alternating odd/even weeks
const DEFAULT_EVENTS: EventConfig[] = [
  {
    id: 'nv', name: 'Bán NV', color: 'bg-green-500',
    variants: [
      { id: 'chd', name: 'CHĐ', color: 'bg-green-500' },
      { id: 'skb', name: 'SKB', color: 'bg-emerald-400' },
    ],
  },
  {
    id: 'trangsuc', name: 'Bán Trang sức', color: 'bg-yellow-400',
    variants: [
      { id: 'tinhthach', name: 'Tinh Thạch', color: 'bg-yellow-400' },
      { id: 'daptrung', name: 'Đập Trứng', color: 'bg-amber-400' },
    ],
  },
  {
    id: 'dautruong', name: 'Đấu trường', color: 'bg-orange-400',
    variants: [
      { id: 'dt2v2', name: 'Đấu trường 2vs2', color: 'bg-orange-400' },
      { id: 'dtwallstreet', name: 'Đấu Trường Wallstreet', color: 'bg-red-400' },
    ],
  },
];

// Gap rules: dautruong has 1-day gap between consecutive events, others are seamless
function getGapDays(eventId: string): number {
  return eventId === 'dautruong' ? 1 : 0;
}

// Get variant for a week (odd=0, even=1)
function getVariantIndex(week: number): 0 | 1 {
  return week % 2 === 1 ? 0 : 1;
}

// Find the most recent Thursday on or before a given day.
function getThursdayBefore(day: number, month: number, year: number): number {
  for (let d = day; d >= 1; d--) {
    if (new Date(year, month - 1, d).getDay() === 4) return d; // Thursday = 4
  }
  return Math.max(1, day - 3);
}

// Generate default weekly events for a month based on calendar weeks.
// One event per type per calendar week, build = Thursday before liveStart.
function generateDefaultEventWeeks(month: number, year: number): EventWeek[] {
  const weeks = getWeeksInMonth(month, year);
  const result: EventWeek[] = [];
  for (const w of weeks) {
    for (const evt of DEFAULT_EVENTS) {
      const vi = getVariantIndex(w.week);
      const variant = evt.variants[vi];
      const buildDay = getThursdayBefore(w.startDay, month, year);
      result.push({
        eventId: evt.id,
        week: w.week,
        buildStart: buildDay,
        buildEnd: buildDay,
        liveStart: w.startDay,
        liveEnd: w.endDay,
        label: variant.name,
      });
    }
  }
  return result;
}

function getStorageKey(projectId: string, month: number, year: number) {
  return `eventWeeks-${projectId}-${year}-${month}`;
}

// Legacy (pre-scoped) key from before 2026-04-22 — used for one-time migration fallback.
function getLegacyEventWeeksKey(month: number, year: number) {
  return `eventWeeks-${year}-${month}`;
}

function loadEventWeeks(projectId: string, month: number, year: number): EventWeek[] {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId, month, year));
    if (raw) return JSON.parse(raw);
    // Migration fallback: read legacy (un-scoped) key and copy into scoped key.
    const legacy = localStorage.getItem(getLegacyEventWeeksKey(month, year));
    if (legacy) {
      localStorage.setItem(getStorageKey(projectId, month, year), legacy);
      return JSON.parse(legacy);
    }
  } catch { /* ignore */ }
  return generateDefaultEventWeeks(month, year);
}

function saveEventWeeks(projectId: string, month: number, year: number, data: EventWeek[]) {
  try {
    localStorage.setItem(getStorageKey(projectId, month, year), JSON.stringify(data));
  } catch { /* ignore */ }
}

interface TimelineProps {
  projectId: string;
  month: number;
  year: number;
  dayWidth: number;
  builds?: BuildDto[];
  users?: UserDto[];
  onCreateBuild?: (name: string) => void;
  onDeleteBuild?: (id: string) => void;
  onUpdateBuild?: (id: string, data: any) => void;
  onAddMilestone?: (buildId: string, data: { name: string; date: string; type: string }) => void;
  onDeleteMilestone?: (milestoneId: string, buildId: string) => void;
  onAssignBuild?: (buildId: string, userId: string, buildName: string, startDay: number, endDay: number) => void;
  onUnassignBuild?: (buildId: string, userId: string) => void;
  onPhaseResize?: (buildId: string, startDay: number, endDay: number) => void;
  onReorderBuild?: (buildId: string, direction: 'up' | 'down') => void;
  onReorderBuilds?: (orderedIds: string[]) => void;
  onWeekBuildResize?: (week: number, buildLabel: string, startDay: number, endDay: number) => void;
  syncKey?: number;
  onAssignWeek?: (userId: string, week: number, buildLabel: string, buildStart: number, buildEnd: number) => void;
  onUnassignWeek?: (userId: string, week: number, buildLabel: string) => void;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export default function WeeklyEventTimeline({ projectId, month, year, dayWidth, builds = [], users = [], onCreateBuild, onDeleteBuild, onUpdateBuild, onAddMilestone, onDeleteMilestone, onAssignBuild, onUnassignBuild, onPhaseResize, onReorderBuild, onReorderBuilds, onWeekBuildResize, syncKey, onAssignWeek, onUnassignWeek, leftPanel, rightPanel }: TimelineProps) {
  const eventConfigsKey = `eventConfigs-${projectId}`;
  const [events, setEvents] = useState<EventConfig[]>(() => {
    try {
      const raw = localStorage.getItem(eventConfigsKey);
      if (raw) return JSON.parse(raw);
      // Migration fallback from legacy un-scoped key
      const legacy = localStorage.getItem('eventConfigs');
      if (legacy) {
        localStorage.setItem(eventConfigsKey, legacy);
        return JSON.parse(legacy);
      }
    } catch { /* ignore */ }
    return DEFAULT_EVENTS;
  });
  const [eventWeeks, setEventWeeksRaw] = useState<EventWeek[]>(() => loadEventWeeks(projectId, month, year));
  const [prevKey, setPrevKey] = useState(`${projectId}-${month}-${year}`);
  const [collapsed, setCollapsed] = useState(false);
  const [weekAssigneePopup, setWeekAssigneePopup] = useState<number | null>(null);
  const [weekPopupPos, setWeekPopupPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Week assignees stored in localStorage
  const weekAssignKey = `weekAssignees-${projectId}-${year}-${month}`;
  const [weekAssignees, setWeekAssignees] = useState<Record<number, string[]>>(() => {
    try {
      const raw = localStorage.getItem(weekAssignKey);
      if (raw) return JSON.parse(raw);
      // Migration fallback from legacy un-scoped key
      const legacy = localStorage.getItem(`weekAssignees-${year}-${month}`);
      if (legacy) {
        localStorage.setItem(weekAssignKey, legacy);
        return JSON.parse(legacy);
      }
    } catch {}
    return {};
  });
  const updateWeekAssignees = useCallback((week: number, userIds: string[]) => {
    setWeekAssignees((prev) => {
      const next = { ...prev, [week]: userIds };
      localStorage.setItem(weekAssignKey, JSON.stringify(next));
      return next;
    });
  }, [weekAssignKey]);

  // No need for document click listener - using backdrop overlay instead

  // Debounced API sync (300ms): keeps DB in sync with local edits without spamming during drag-resize.
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSnapshot = useRef<{ data: EventWeek[]; configs: EventConfig[] }>({ data: eventWeeks, configs: events });
  latestSnapshot.current = { data: eventWeeks, configs: events };
  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const snap = latestSnapshot.current;
      saveWeeklyEvents({ projectId, month, year, data: snap.data, configs: snap.configs })
        .catch((err) => console.error('[WeeklyEventTimeline] save failed:', err?.message || err, { projectId, month, year }));
    }, 300);
  }, [projectId, month, year]);

  // Wrapper that also persists to localStorage + triggers DB sync
  const setEventWeeks: typeof setEventWeeksRaw = useCallback((updater) => {
    setEventWeeksRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveEventWeeks(projectId, month, year, next);
      return next;
    });
    scheduleSync();
  }, [projectId, month, year, scheduleSync]);

  // On mount / when project/month/year changes: fetch from DB. If DB has data, overwrite local.
  // If DB empty but local has data, push local → DB (one-time migration per project/month/year).
  useEffect(() => {
    let cancelled = false;
    fetchWeeklyEvents(projectId, month, year)
      .then((remote) => {
        if (cancelled) return;
        if (remote.data && remote.data.length > 0) {
          setEventWeeksRaw(remote.data);
          saveEventWeeks(projectId, month, year, remote.data);
        } else {
          // DB empty — migrate local → DB if we have anything
          const localWeeks = loadEventWeeks(projectId, month, year);
          if (localWeeks.length > 0) {
            saveWeeklyEvents({ projectId, month, year, data: localWeeks, configs: events })
              .catch((err) => console.error('[WeeklyEventTimeline] initial migrate failed:', err?.message || err, { projectId, month, year }));
          }
        }
        if (remote.configs && (remote.configs as any[]).length > 0) {
          setEvents(remote.configs as any);
          localStorage.setItem(eventConfigsKey, JSON.stringify(remote.configs));
        }
      })
      .catch((err) => console.error('[WeeklyEventTimeline] fetch failed:', err?.message || err, { projectId, month, year }));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, month, year]);

  // Reset when project/month/year changes
  const key = `${projectId}-${month}-${year}`;
  if (key !== prevKey) {
    const loaded = loadEventWeeks(projectId, month, year);
    setEventWeeksRaw(loaded);
    setPrevKey(key);
  }

  // Reload from localStorage when external sync happens (task dates changed)
  useEffect(() => {
    if (syncKey && syncKey > 0) {
      setEventWeeksRaw(loadEventWeeks(projectId, month, year));
    }
  }, [syncKey, projectId, month, year]);

  const renameVariant = useCallback((eventId: string, variantIdx: 0 | 1, newName: string) => {
    setEvents((prev) => {
      const next = prev.map((evt) => {
        if (evt.id !== eventId) return evt;
        const variants = [...evt.variants] as [EventVariant, EventVariant];
        variants[variantIdx] = { ...variants[variantIdx], name: newName };
        return { ...evt, variants };
      });
      localStorage.setItem(eventConfigsKey, JSON.stringify(next));
      return next;
    });
    scheduleSync();
    // Also update all matching bar labels
    setEventWeeks((prev) =>
      prev.map((ew) => {
        if (ew.eventId !== eventId) return ew;
        const vi = getVariantIndex(ew.week);
        if (vi !== variantIdx) return ew;
        return { ...ew, label: newName };
      })
    );
  }, [setEventWeeks, eventConfigsKey, scheduleSync]);

  // Shift all builds: they are 7 days apart. Changing one shifts all others.
  const updateBuild = useCallback((weekNum: number, newBuildStart: number, newBuildEnd: number) => {
    setEventWeeks((prev) => {
      const sorted = [...new Set(prev.map((ew) => ew.week))].sort((a, b) => a - b);
      const changedIdx = sorted.indexOf(weekNum);
      if (changedIdx < 0) return prev;

      const buildDuration = newBuildEnd - newBuildStart;
      const buildByWeek = new Map<number, { start: number; end: number }>();
      buildByWeek.set(weekNum, { start: newBuildStart, end: newBuildEnd });

      // Shift forward (weeks after changed)
      for (let i = changedIdx + 1; i < sorted.length; i++) {
        const prevB = buildByWeek.get(sorted[i - 1])!;
        const start = prevB.start + 7;
        buildByWeek.set(sorted[i], { start, end: start + buildDuration });
      }
      // Shift backward (weeks before changed)
      for (let i = changedIdx - 1; i >= 0; i--) {
        const nextB = buildByWeek.get(sorted[i + 1])!;
        const start = nextB.start - 7;
        buildByWeek.set(sorted[i], { start, end: start + buildDuration });
      }

      // Notify parent about each affected week's new build range
      if (onWeekBuildResize) {
        buildByWeek.forEach(({ start, end }, w) => {
          onWeekBuildResize(w, `T${w} Build`, start, end);
        });
      }

      return prev.map((ew) => {
        const b = buildByWeek.get(ew.week);
        if (!b) return ew;
        return { ...ew, buildStart: b.start, buildEnd: b.end };
      });
    });
  }, [setEventWeeks]);

  const updateEventWeek = useCallback((weekNum: number, eventId: string, updates: Partial<EventWeek>) => {
    setEventWeeks((prev) => {
      const next = prev.map((ew) =>
        ew.week === weekNum && ew.eventId === eventId ? { ...ew, ...updates } : ew
      );

      // Shift subsequent events of the same type
      const sameType = next
        .filter((ew) => ew.eventId === eventId)
        .sort((a, b) => a.week - b.week);

      const changedIdx = sameType.findIndex((ew) => ew.week === weekNum);
      if (changedIdx < 0) return next;

      const gap = getGapDays(eventId);

      // Shift all events AFTER the changed one based on liveEnd → liveStart
      for (let i = changedIdx + 1; i < sameType.length; i++) {
        const prevEw = sameType[i - 1];
        const curEw = sameType[i];
        const expectedLiveStart = prevEw.liveEnd + 1 + gap;
        const shift = expectedLiveStart - curEw.liveStart;
        if (shift !== 0) {
          const buildDuration = curEw.buildEnd - curEw.buildStart;
          const liveDuration = curEw.liveEnd - curEw.liveStart;
          curEw.liveStart = expectedLiveStart;
          curEw.liveEnd = curEw.liveStart + liveDuration;
          curEw.buildStart = curEw.liveStart - buildDuration - 1;
          curEw.buildEnd = curEw.liveStart - 1;
        }
      }

      // Write shifted values back
      const map = new Map(sameType.map((ew) => [`${ew.eventId}-${ew.week}`, ew]));
      return next.map((ew) => {
        const key = `${ew.eventId}-${ew.week}`;
        return map.get(key) ?? ew;
      });
    });
  }, [setEventWeeks]);

  const daysInMonth = getDaysInMonth(month, year);

  const totalDays = daysInMonth;
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const todayDay = now.getDate();
  const todayOffset = isCurrentMonth ? (todayDay - 1) * dayWidth + dayWidth / 2 : -1;

  // Group by week
  // Sort weeks descending (latest week at top, earliest at bottom) — events flow upward (phong thủy 'đi lên')
  const weeks = Array.from(new Set(eventWeeks.map((ew) => ew.week))).sort((a, b) => b - a);

  return (
    <div className="bg-white border border-[#FFE4D6] rounded-xl mb-4 mx-auto relative" style={{ boxShadow: '0 4px 16px rgba(45,27,20,0.04)' }}>
      {/* Header */}
      <div className="flex items-center px-5 py-3 border-b border-[#FFE4D6] gap-3">
        <button onClick={() => setCollapsed(!collapsed)} className="text-[#8B6E60] hover:text-[#E8341A] text-sm">
          {collapsed ? '▶' : '▼'}
        </button>
        <h2 className="font-bold text-[#2D1B14]">Config Event (tuần)</h2>
        <div className="flex gap-2 ml-auto">
          {events.map((evt) => (
            <span key={evt.id} className={`text-[10px] px-2 py-0.5 rounded text-white ${evt.color}`}>{evt.name}</span>
          ))}
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <div className="mx-auto" style={{ width: totalDays * dayWidth }}>
          <div className="overflow-hidden">
          {/* Day headers */}
          <div className="flex border-b border-[#FFE4D6] bg-[#FFF8F5]" style={{ height: HEADER_HEIGHT }}>
            {days.map((d) => {
              const weekend = isWeekend(year, month, d);
              const isToday = isCurrentMonth && d === todayDay;
              return (
                <div
                  key={d}
                  className={`text-center text-sm border-r border-[#FFE4D6] flex items-center justify-center ${isToday ? 'text-white font-bold' : weekend ? 'bg-[#FFF0EB] text-[#8B6E60]' : 'text-[#8B6E60]'}`}
                  style={
                    isToday
                      ? { width: dayWidth, minWidth: dayWidth, background: 'linear-gradient(135deg, #E8341A 0%, #F5A623 100%)' }
                      : { width: dayWidth, minWidth: dayWidth }
                  }
                >
                  {d}
                </div>
              );
            })}
          </div>

          {/* Rows */}
          <div className="relative">
            {/* Today line */}
            {isCurrentMonth && (
              <div className="absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none" style={{ left: todayOffset, background: '#E8341A' }} />
            )}

            {weeks.map((w) => {
              // Get build info from the first event of this week (shared build)
              const firstEw = eventWeeks.find((e) => e.week === w);
              const buildStart = firstEw?.buildStart ?? 1;
              const buildEnd = firstEw?.buildEnd ?? 1;

              const wAssignees = weekAssignees[w] ?? [];

              const buildLabel = `T${w} Build`;

              return (
                <div key={w}>
                  {/* Event rows — first row has build bar + assignees merged */}
                  {events.map((evt, ei) => {
                    const ew = eventWeeks.find((e) => e.week === w && e.eventId === evt.id);
                    const vi = getVariantIndex(w);
                    const variant = evt.variants[vi];
                    const isFirst = ei === 0;
                    return (
                      <div key={`${w}-${evt.id}`} className={`relative border-b ${isFirst ? 'border-t border-gray-300' : ''}`} style={{ height: ROW_HEIGHT }}>
                        <div className="absolute inset-0 flex">
                          {days.map((d) => (
                            <div key={d} className={`border-r border-[#FFE4D6]/60 h-full ${isWeekend(year, month, d) ? 'bg-[#FFF0EB]/40' : ''}`} style={{ width: dayWidth, minWidth: dayWidth }} />
                          ))}
                        </div>
                        {/* Build bar on first row with assignees integrated */}
                        {isFirst && buildStart <= buildEnd && (
                          <>
                            <EventBar
                              left={(buildStart - 1) * dayWidth}
                              width={(buildEnd - buildStart + 1) * dayWidth}
                              color="bg-gray-400"
                              label={buildLabel}
                              height={ROW_HEIGHT - 4}
                              top={2}
                              dayWidth={dayWidth}
                              isPast={isCurrentMonth ? buildEnd < todayDay : year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)}
                              onResize={(newStart, newEnd) => updateBuild(w, newStart, newEnd)}
                              onLabelChange={() => {}}
                            />
                            {/* Assignee badges + add button overlaid on left of build bar */}
                            <div className="absolute z-20 flex items-center gap-0.5" style={{ left: Math.max((buildEnd) * dayWidth + 4, 0), top: 3, height: ROW_HEIGHT - 6 }}>
                              {wAssignees.map((uid) => {
                                const u = users.find((u) => u.id === uid);
                                return u ? (
                                  <span key={uid} className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded leading-tight">{u.name?.split(' ').pop()}</span>
                                ) : null;
                              })}
                              <button
                                onClick={(e) => {
                                  if (weekAssigneePopup === w) { setWeekAssigneePopup(null); return; }
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setWeekPopupPos({ top: rect.bottom + 4, left: rect.left });
                                  setWeekAssigneePopup(w);
                                }}
                                className="text-gray-400 hover:text-blue-600 text-[10px] bg-gray-200 hover:bg-blue-50 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0"
                                title="Assign member"
                              >
                                +
                              </button>
                            </div>
                          </>
                        )}
                        {/* Assignee popup (rendered outside build bar for proper positioning) */}
                        {isFirst && weekAssigneePopup === w && (
                          <>
                          <div className="fixed inset-0 z-40" onClick={() => setWeekAssigneePopup(null)} />
                          <div
                            data-week-assignee-popup
                            className="fixed z-50 bg-white border rounded-lg shadow-xl p-2 w-48"
                            style={{ top: weekPopupPos.top, left: weekPopupPos.left }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="text-xs text-gray-500 mb-1.5 font-medium">Assign member {buildLabel}:</div>
                            {users.map((u) => {
                              const isAssigned = wAssignees.includes(u.id);
                              return (
                                <button
                                  key={u.id}
                                  onClick={() => {
                                    const newIds = isAssigned ? wAssignees.filter((id) => id !== u.id) : [...wAssignees, u.id];
                                    updateWeekAssignees(w, newIds);
                                    if (!isAssigned) {
                                      onAssignWeek?.(u.id, w, buildLabel, buildStart, buildEnd);
                                    } else {
                                      onUnassignWeek?.(u.id, w, buildLabel);
                                    }
                                  }}
                                  className={`flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded ${isAssigned ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                                >
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${isAssigned ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {u.name?.charAt(0)}
                                  </span>
                                  <span>{u.name}</span>
                                  {isAssigned && <span className="ml-auto text-blue-500">✓</span>}
                                </button>
                              );
                            })}
                          </div>
                          </>
                        )}
                        {/* Live bar */}
                        {ew && (
                          <EventBar
                            left={(ew.liveStart - 1) * dayWidth}
                            width={(ew.liveEnd - ew.liveStart + 1) * dayWidth}
                            color={evt.color}
                            label={ew.label}
                            height={ROW_HEIGHT - 4}
                            top={2}
                            dayWidth={dayWidth}
                            isPast={isCurrentMonth ? ew.liveEnd < todayDay : year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)}
                            onResize={(newStart, newEnd) => updateEventWeek(w, evt.id, { liveStart: newStart, liveEnd: newEnd })}
                            onLabelChange={(newLabel) => updateEventWeek(w, evt.id, { label: newLabel })}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          </div>

          {/* Dev Timeline section — same day axis, inside mx-auto */}
          {onCreateBuild && (
            <BuildTimeline
              builds={builds}
              users={users}
              month={month}
              year={year}
              dayWidth={dayWidth}
              totalDays={totalDays}
              onCreateBuild={onCreateBuild}
              onDeleteBuild={onDeleteBuild ?? (() => {})}
              onUpdateBuild={onUpdateBuild ?? (() => {})}
              onAddMilestone={onAddMilestone ?? (() => {})}
              onDeleteMilestone={onDeleteMilestone ?? (() => {})}
              onAssignBuild={onAssignBuild}
              onUnassignBuild={onUnassignBuild}
              onPhaseResize={onPhaseResize}
              onReorderBuild={onReorderBuild}
              onReorderBuilds={onReorderBuilds}
              syncKey={syncKey}
            />
          )}
          </div>
        </div>
      )}

      {/* Backlog (left) & DocLinks (right) panels */}
      {(leftPanel || rightPanel) && (
        <div className="flex gap-4 px-4 py-3 border-t">
          <div className="w-1/2 min-w-0">{leftPanel}</div>
          <div className="w-1/2 min-w-0">{rightPanel}</div>
        </div>
      )}
    </div>
  );
}
