import { useState, useMemo, useCallback, useEffect } from 'react';
import EventBar from './EventBar';
import BuildTimeline from './BuildTimeline';
import type { BuildDto, UserDto } from '@ctp1/shared';

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

// Default live duration per event type
function getDefaultLiveDays(eventId: string): number {
  if (eventId === 'dautruong') return 6;
  return 7; // nv, trangsuc
}

// Get variant for a week (odd=0, even=1)
function getVariantIndex(week: number): 0 | 1 {
  return week % 2 === 1 ? 0 : 1;
}

// Find the nearest Thursday before a given day (searching backwards)
function getThursdayBefore(day: number, month: number, year: number): number {
  for (let d = day - 1; d >= 1; d--) {
    if (new Date(year, month - 1, d).getDay() === 4) return d; // Thursday = 4
  }
  // If no Thursday found in this month, return day 1 as fallback
  return 1;
}



// Generate default weekly event data for a month
function generateDefaultEventWeeks(month: number, year: number): EventWeek[] {
  const weeks: EventWeek[] = [];
  const events = DEFAULT_EVENTS;
  const daysInMonth = getDaysInMonth(month, year);

  for (const evt of events) {
    const gap = getGapDays(evt.id);
    const liveDays = getDefaultLiveDays(evt.id);
    // Each month starts independently from day 1
    let cursor = 1;

    const weekCount = Math.min(5, Math.ceil(daysInMonth / 7));
    for (let w = 1; w <= weekCount; w++) {
      if (cursor > daysInMonth) break;

      const vi = getVariantIndex(w);
      const variant = evt.variants[vi];

      const liveStart = cursor;

      // Build = nearest Thursday before liveStart
      const buildDay = getThursdayBefore(liveStart, month, year);
      const liveEnd = liveStart + liveDays - 1; // can extend beyond month

      weeks.push({
        eventId: evt.id,
        week: w,
        buildStart: buildDay,
        buildEnd: buildDay,
        liveStart,
        liveEnd,
        label: variant.name,
      });

      cursor = liveEnd + 1 + gap;
    }
  }
  return weeks;
}

function getStorageKey(month: number, year: number) {
  return `eventWeeks-${year}-${month}`;
}

function loadEventWeeks(month: number, year: number): EventWeek[] {
  try {
    const raw = localStorage.getItem(getStorageKey(month, year));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return generateDefaultEventWeeks(month, year);
}

function saveEventWeeks(month: number, year: number, data: EventWeek[]) {
  try {
    localStorage.setItem(getStorageKey(month, year), JSON.stringify(data));
  } catch { /* ignore */ }
}

interface TimelineProps {
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
  onWeekBuildResize?: (week: number, buildLabel: string, startDay: number, endDay: number) => void;
  syncKey?: number;
  onAssignWeek?: (userId: string, week: number, buildLabel: string, buildStart: number, buildEnd: number) => void;
  onUnassignWeek?: (userId: string, week: number, buildLabel: string) => void;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export default function WeeklyEventTimeline({ month, year, dayWidth, builds = [], users = [], onCreateBuild, onDeleteBuild, onUpdateBuild, onAddMilestone, onDeleteMilestone, onAssignBuild, onUnassignBuild, onPhaseResize, onWeekBuildResize, syncKey, onAssignWeek, onUnassignWeek, leftPanel, rightPanel }: TimelineProps) {
  const [events, setEvents] = useState<EventConfig[]>(() => {
    try {
      const raw = localStorage.getItem('eventConfigs');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return DEFAULT_EVENTS;
  });
  const [eventWeeks, setEventWeeksRaw] = useState<EventWeek[]>(() => loadEventWeeks(month, year));
  const [prevKey, setPrevKey] = useState(`${month}-${year}`);
  const [collapsed, setCollapsed] = useState(false);
  const [weekAssigneePopup, setWeekAssigneePopup] = useState<number | null>(null);
  const [weekPopupPos, setWeekPopupPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Week assignees stored in localStorage
  const weekAssignKey = `weekAssignees-${year}-${month}`;
  const [weekAssignees, setWeekAssignees] = useState<Record<number, string[]>>(() => {
    try { const raw = localStorage.getItem(weekAssignKey); if (raw) return JSON.parse(raw); } catch {}
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

  // Wrapper that also persists to localStorage
  const setEventWeeks: typeof setEventWeeksRaw = useCallback((updater) => {
    setEventWeeksRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveEventWeeks(month, year, next);
      return next;
    });
  }, [month, year]);

  // Reset when month/year changes
  const key = `${month}-${year}`;
  if (key !== prevKey) {
    const loaded = loadEventWeeks(month, year);
    setEventWeeksRaw(loaded);
    setPrevKey(key);
  }

  // Reload from localStorage when external sync happens (task dates changed)
  useEffect(() => {
    if (syncKey && syncKey > 0) {
      setEventWeeksRaw(loadEventWeeks(month, year));
    }
  }, [syncKey, month, year]);

  const renameVariant = useCallback((eventId: string, variantIdx: 0 | 1, newName: string) => {
    setEvents((prev) => {
      const next = prev.map((evt) => {
        if (evt.id !== eventId) return evt;
        const variants = [...evt.variants] as [EventVariant, EventVariant];
        variants[variantIdx] = { ...variants[variantIdx], name: newName };
        return { ...evt, variants };
      });
      localStorage.setItem('eventConfigs', JSON.stringify(next));
      return next;
    });
    // Also update all matching bar labels
    setEventWeeks((prev) =>
      prev.map((ew) => {
        if (ew.eventId !== eventId) return ew;
        const vi = getVariantIndex(ew.week);
        if (vi !== variantIdx) return ew;
        return { ...ew, label: newName };
      })
    );
  }, [setEventWeeks]);

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
  const weeks = Array.from(new Set(eventWeeks.map((ew) => ew.week))).sort((a, b) => a - b);

  return (
    <div className="bg-white border rounded-lg mb-4 mx-auto relative">
      {/* Header */}
      <div className="flex items-center px-4 py-2 border-b bg-gray-50 gap-3">
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-500 hover:text-gray-700">
          {collapsed ? '▶' : '▼'}
        </button>
        <h2 className="font-semibold text-gray-700">Config Event (tuần)</h2>
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
          <div className="flex border-b bg-gray-50" style={{ height: HEADER_HEIGHT }}>
            {days.map((d) => {
              const weekend = isWeekend(year, month, d);
              const isToday = isCurrentMonth && d === todayDay;
              return (
                <div
                  key={d}
                  className={`text-center text-sm border-r flex items-center justify-center ${isToday ? 'bg-blue-600 text-white font-bold' : weekend ? 'bg-gray-200 text-gray-400' : 'text-gray-500'}`}
                  style={{ width: dayWidth, minWidth: dayWidth }}
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
              <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none" style={{ left: todayOffset }} />
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
                            <div key={d} className={`border-r h-full ${isWeekend(year, month, d) ? 'bg-gray-50' : ''}`} style={{ width: dayWidth, minWidth: dayWidth }} />
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
