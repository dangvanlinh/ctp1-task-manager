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

  const [editingMonth, setEditingMonth] = useState<number | 'kpi' | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMonth !== null) inputRef.current?.focus();
  }, [editingMonth]);

  const pct = kpi > 0 ? Math.round((ytdTotal / kpi) * 100) : null;

  // Forecast for un-set months
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
    <div className="w-full">
      {/* Top header: year nav only */}
      <div className="flex items-center gap-1 mb-2 px-1">
        <button
          onClick={() => onChangeMonth(month, year - 1)}
          className="text-gray-400 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100"
        >
          ◀
        </button>
        <span className="font-bold text-base text-gray-800 w-14 text-center">{year}</span>
        <button
          onClick={() => onChangeMonth(month, year + 1)}
          className="text-gray-400 hover:text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-100"
        >
          ▶
        </button>
      </div>

      {/* Revenue per month — 12 columns aligned with Roadmap */}
      <div
        className="grid w-full"
        style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}
      >
        {MONTH_NAMES.map((_, i) => {
          const m = i + 1;
          const amt = revMap.get(m);
          const isEditing = editingMonth === m;
          const showTarget = (!amt || amt === 0) && targetPerRemaining > 0;
          return (
            <div key={m} className="flex justify-center items-end pb-1">
              {isEditing ? (
                <div className="flex flex-col items-stretch w-full px-1">
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
                  {error && <span className="text-[9px] text-red-500 whitespace-nowrap text-center">{error}</span>}
                </div>
              ) : (
                <button
                  onClick={() => startEdit(m)}
                  disabled={!canEdit}
                  className={`text-xs font-semibold rounded w-full ${
                    amt && amt > 0
                      ? 'text-gray-700'
                      : showTarget
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
                  {amt && amt > 0 ? formatVnd(amt) : showTarget ? formatVnd(targetPerRemaining) : '—'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Month tabs row — 12 columns same grid */}
      <div
        className="grid w-full rounded-lg p-1 gap-1"
        style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', background: '#FFF0EB' }}
      >
        {MONTH_NAMES.map((name, i) => {
          const m = i + 1;
          const isActive = m === month;
          return (
            <button
              key={m}
              onClick={() => onChangeMonth(m, year)}
              className={`py-1.5 rounded-md text-sm font-semibold transition-all ${
                isActive ? 'text-white' : 'text-[#8B6E60] hover:bg-[#FFE4D6] hover:text-[#E8341A]'
              }`}
              style={
                isActive
                  ? { background: 'linear-gradient(135deg, #E8341A 0%, #F5A623 100%)', boxShadow: '0 4px 14px rgba(232,52,26,0.25)' }
                  : undefined
              }
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* Full-width Progress bar — under month tabs */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#8B6E60] font-bold">
            Progress {year}
          </span>
          <span className="text-[11px] text-[#8B6E60]">
            <span className="font-bold text-[#2D1B14]">{formatVnd(ytdTotal)}</span>
            {pct !== null && <span className="font-semibold ml-1" style={{ color: '#E8341A' }}>({pct}%)</span>}
            <span className="mx-1.5 text-[#FFD4C4]">/</span>
            {editingMonth === 'kpi' ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setError(null); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit();
                  if (e.key === 'Escape') { setEditingMonth(null); setError(null); }
                }}
                onBlur={commit}
                placeholder="KPI VD: 50B"
                className="text-[11px] border border-[#F5A623] rounded outline-none px-1.5 py-0.5 w-24 bg-white inline-block"
              />
            ) : (
              <button
                onClick={() => startEdit('kpi')}
                disabled={!canEdit}
                className={`font-bold ${canEdit ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                style={{ color: '#7C4DFF' }}
                title={canEdit ? 'Click để sửa KPI năm' : ''}
              >
                KPI {kpi > 0 ? formatVnd(kpi) : '— Set KPI'}
              </button>
            )}
            {error && <span className="text-[10px] text-[#E8341A] ml-2">{error}</span>}
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
    </div>
  );
}
