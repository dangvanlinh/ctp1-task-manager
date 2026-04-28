import { useState, useEffect, useRef } from 'react';
import type { MonthlyRevenueDto } from '../api/monthlyRevenue';
import { formatVnd, parseVnd } from '../utils/formatVnd';

interface Props {
  month: number;
  year: number;
  onChangeMonth: (month: number, year: number) => void;
  revenues?: MonthlyRevenueDto[];
  canEdit?: boolean;
  onSaveRevenue?: (month: number, amount: number) => void;
  kpi?: number;
  onSaveKpi?: (amount: number) => void;
}

const MONTH_NAMES = [
  'Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6',
  'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12',
];

export default function MonthWeekSelector({ month, year, onChangeMonth, revenues = [], canEdit, onSaveRevenue, kpi = 0, onSaveKpi }: Props) {
  const revMap = new Map(revenues.map((r) => [r.month, Number(r.amount)]));

  // YTD cutoff: current year → up to current real month; past year → all 12; future → 0
  const today = new Date();
  const ytdCutoff =
    year < today.getFullYear() ? 12 :
    year > today.getFullYear() ? 0 :
    today.getMonth() + 1;
  const ytdTotal = Array.from(revMap.entries())
    .filter(([m]) => m <= ytdCutoff)
    .reduce((sum, [, amt]) => sum + amt, 0);

  // editingMonth: 1..12 = month revenue; 'kpi' = yearly KPI; null = not editing
  const [editingMonth, setEditingMonth] = useState<number | 'kpi' | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMonth !== null) inputRef.current?.focus();
  }, [editingMonth]);

  const pct = kpi > 0 ? Math.round((ytdTotal / kpi) * 100) : null;

  // Forecast target for months with no actual revenue yet:
  // remaining_kpi = KPI - sum(actual revenues set, regardless of month)
  // spread evenly across months that haven't been set
  const monthsWithData = revMap.size;
  const monthsWithoutData = 12 - monthsWithData;
  const totalActual = Array.from(revMap.values()).reduce((s, v) => s + v, 0);
  const remainingKpi = Math.max(0, kpi - totalActual);
  const targetPerRemaining = monthsWithoutData > 0 && remainingKpi > 0
    ? Math.round(remainingKpi / monthsWithoutData)
    : 0;

  const startEdit = (target: number | 'kpi') => {
    if (!canEdit) return;
    const current = target === 'kpi' ? kpi : revMap.get(target);
    setDraft(current ? String(current) : '');
    setError(null);
    setEditingMonth(target);
  };

  const commit = () => {
    if (editingMonth === null) return;
    const trimmed = draft.trim();
    const applySave = (amount: number) => {
      if (editingMonth === 'kpi') onSaveKpi?.(amount);
      else onSaveRevenue?.(editingMonth, amount);
    };
    if (!trimmed) {
      applySave(0);
      setEditingMonth(null);
      return;
    }
    const parsed = parseVnd(trimmed);
    if (parsed === null) {
      setError('Sai format. VD: 5200000000 hoặc 5.2B');
      return;
    }
    applySave(parsed);
    setEditingMonth(null);
  };

  return (
    <div className="inline-flex flex-col items-stretch">
      <div className="flex items-end gap-2">
        <button
          onClick={() => onChangeMonth(month, year - 1)}
          className="px-2 py-1 text-gray-400 hover:text-gray-700 self-center"
        >
          &#9664;
        </button>
        <div className="flex flex-col items-stretch">
          <div className="text-xs font-semibold text-gray-500 mb-0.5 ml-2">{year}</div>
          {/* Revenue row (above month tabs) */}
          <div className="flex gap-1 px-1 items-end">
            {MONTH_NAMES.map((_, i) => {
              const m = i + 1;
              const amt = revMap.get(m);
              const isEditing = editingMonth === m;
              return (
                <div key={m} className="w-[56px] flex justify-center">
                  {isEditing ? (
                    <div className="flex flex-col items-start">
                      <input
                        ref={inputRef}
                        value={draft}
                        onChange={(e) => { setDraft(e.target.value); setError(null); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commit();
                          if (e.key === 'Escape') { setEditingMonth(null); setError(null); }
                        }}
                        onBlur={commit}
                        placeholder="5.2B"
                        className="text-xs border-b border-blue-400 outline-none px-1 w-full text-center bg-transparent"
                      />
                      {error && <span className="text-[9px] text-red-500 whitespace-nowrap">{error}</span>}
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(m)}
                      disabled={!canEdit}
                      className={`text-xs font-semibold px-1 rounded w-full ${
                        amt && amt > 0
                          ? 'text-gray-700'
                          : targetPerRemaining > 0
                          ? 'text-orange-500 italic'
                          : 'text-gray-300'
                      } ${canEdit ? 'hover:bg-blue-50 hover:text-blue-600 cursor-pointer' : 'cursor-default'}`}
                      title={
                        canEdit
                          ? amt && amt > 0
                            ? `Doanh thu thực: ${formatVnd(amt)} VND. Click để sửa.`
                            : `Mục tiêu để đạt KPI: ${formatVnd(targetPerRemaining)} VND. Click để nhập doanh thu thực.`
                          : ''
                      }
                    >
                      {amt && amt > 0 ? formatVnd(amt) : targetPerRemaining > 0 ? formatVnd(targetPerRemaining) : '—'}
                    </button>
                  )}
                </div>
              );
            })}
            {/* Progress label */}
            <div className="w-[180px] flex justify-center">
              <span className="text-[10px] text-gray-500 font-medium">Progress {year}</span>
            </div>
          </div>
          {/* Month tabs row */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 items-center">
            {MONTH_NAMES.map((name, i) => {
              const m = i + 1;
              const isActive = m === month;
              return (
                <button
                  key={m}
                  onClick={() => onChangeMonth(m, year)}
                  className={`w-[56px] py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {name}
                </button>
              );
            })}
            {/* YTD/KPI progress bar — KPI total, YTD fill, click KPI segment to edit */}
            {editingMonth === 'kpi' ? (
              <div className="w-[180px] flex flex-col items-stretch">
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); setError(null); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') { setEditingMonth(null); setError(null); }
                  }}
                  onBlur={commit}
                  placeholder="KPI cả năm, VD: 50B"
                  className="text-xs border border-purple-400 rounded-md outline-none px-2 py-1.5 w-full text-center bg-white"
                />
                {error && <span className="text-[9px] text-red-500 text-center">{error}</span>}
              </div>
            ) : (
              <button
                onClick={() => startEdit('kpi')}
                disabled={!canEdit}
                className={`w-[180px] h-[34px] relative rounded-md border border-gray-200 bg-gray-100 overflow-hidden ${canEdit ? 'hover:border-purple-300 cursor-pointer' : 'cursor-default'}`}
                title={canEdit ? 'Click để sửa KPI năm' : `YTD ${formatVnd(ytdTotal)} / KPI ${formatVnd(kpi)}`}
              >
                {/* Fill = YTD progress */}
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-400"
                  style={{ width: kpi > 0 ? `${Math.min(100, (ytdTotal / kpi) * 100)}%` : '0%' }}
                />
                {/* Overlay text */}
                <div className="relative z-10 flex items-center justify-between h-full px-2 text-xs font-semibold">
                  <span className={`${kpi > 0 && ytdTotal / kpi > 0.3 ? 'text-white' : 'text-blue-700'} drop-shadow-sm`}>
                    {formatVnd(ytdTotal)}
                    {pct !== null && <span className="ml-1 text-[10px] font-normal">({pct}%)</span>}
                  </span>
                  <span className="text-gray-700 text-[11px]">
                    / {kpi > 0 ? formatVnd(kpi) : 'Set KPI'}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => onChangeMonth(month, year + 1)}
          className="px-2 py-1 text-gray-400 hover:text-gray-700 self-center"
        >
          &#9654;
        </button>
      </div>
    </div>
  );
}
