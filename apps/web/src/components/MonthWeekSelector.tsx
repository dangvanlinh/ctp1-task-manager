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
}

const MONTH_NAMES = [
  'Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6',
  'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12',
];

export default function MonthWeekSelector({ month, year, onChangeMonth, revenues = [], canEdit, onSaveRevenue }: Props) {
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

  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMonth !== null) inputRef.current?.focus();
  }, [editingMonth]);

  const startEdit = (m: number) => {
    if (!canEdit) return;
    const current = revMap.get(m);
    setDraft(current ? String(current) : '');
    setError(null);
    setEditingMonth(m);
  };

  const commit = () => {
    if (editingMonth === null) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      onSaveRevenue?.(editingMonth, 0);
      setEditingMonth(null);
      return;
    }
    const parsed = parseVnd(trimmed);
    if (parsed === null) {
      setError('Sai format. VD: 5200000000 hoặc 5.2B');
      return;
    }
    onSaveRevenue?.(editingMonth, parsed);
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
                          : 'text-gray-300'
                      } ${canEdit ? 'hover:bg-blue-50 hover:text-blue-600 cursor-pointer' : 'cursor-default'}`}
                      title={canEdit ? `Click để sửa doanh thu ${MONTH_NAMES[i]}` : ''}
                    >
                      {amt && amt > 0 ? formatVnd(amt) : '—'}
                    </button>
                  )}
                </div>
              );
            })}
            {/* YTD column header placeholder */}
            <div className="w-[70px] flex justify-center">
              <span className="text-[10px] text-blue-600 font-medium">YTD {year}</span>
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
            {/* YTD cell */}
            <div
              className="w-[70px] py-1.5 rounded-md text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 text-center whitespace-nowrap"
              title={`Tổng doanh thu ${year} tính đến ${ytdCutoff > 0 ? `Thg ${ytdCutoff}` : 'đầu năm'}`}
            >
              {formatVnd(ytdTotal)}
            </div>
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
