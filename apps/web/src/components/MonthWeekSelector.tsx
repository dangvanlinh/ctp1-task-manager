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
  const currentMonthRev = revMap.get(month) ?? 0;

  // YTD cutoff: current year → up to current real month; past year → all 12; future → 0
  const today = new Date();
  const ytdCutoff =
    year < today.getFullYear() ? 12 :
    year > today.getFullYear() ? 0 :
    today.getMonth() + 1;
  const ytdTotal = Array.from(revMap.entries())
    .filter(([m]) => m <= ytdCutoff)
    .reduce((sum, [, amt]) => sum + amt, 0);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEdit = () => {
    if (!canEdit) return;
    setDraft(currentMonthRev ? String(currentMonthRev) : '');
    setError(null);
    setEditing(true);
  };

  const commit = () => {
    const parsed = parseVnd(draft);
    if (parsed === null) {
      // Empty input → save as 0
      if (!draft.trim()) {
        onSaveRevenue?.(month, 0);
        setEditing(false);
        return;
      }
      setError('Invalid. VD: 5200000000 hoặc 5.2B');
      return;
    }
    onSaveRevenue?.(month, parsed);
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Revenue banner */}
      <div className="flex items-center gap-3 px-1 text-sm">
        <span className="text-gray-500">Doanh thu {MONTH_NAMES[month - 1]}/{year}:</span>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setError(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') { setEditing(false); setError(null); }
              }}
              onBlur={commit}
              placeholder="5200000000 hoặc 5.2B"
              className="text-sm border-b border-blue-400 outline-none px-1 w-44 bg-transparent"
            />
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
        ) : (
          <button
            onClick={startEdit}
            disabled={!canEdit}
            className={`font-semibold text-gray-800 ${canEdit ? 'hover:text-blue-600 cursor-pointer' : 'cursor-default'}`}
            title={canEdit ? 'Click để sửa' : ''}
          >
            {formatVnd(currentMonthRev)} VND
          </button>
        )}
      </div>

      {/* Month tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChangeMonth(month, year - 1)}
          className="px-2 py-1 text-gray-400 hover:text-gray-700"
        >
          &#9664;
        </button>
        <span className="font-semibold text-lg mr-2">{year}</span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 items-center">
          {MONTH_NAMES.map((name, i) => {
            const m = i + 1;
            const isActive = m === month;
            const amt = revMap.get(m);
            return (
              <button
                key={m}
                onClick={() => onChangeMonth(m, year)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
                title={amt ? `Doanh thu: ${formatVnd(amt)} VND` : ''}
              >
                {name}
              </button>
            );
          })}
          {/* YTD cell at the end */}
          <div
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 ml-1 whitespace-nowrap"
            title={`Tổng doanh thu ${year} tính đến ${ytdCutoff > 0 ? `Thg ${ytdCutoff}` : 'đầu năm'}`}
          >
            YTD: {formatVnd(ytdTotal)}
          </div>
        </div>
        <button
          onClick={() => onChangeMonth(month, year + 1)}
          className="px-2 py-1 text-gray-400 hover:text-gray-700"
        >
          &#9654;
        </button>
      </div>
    </div>
  );
}
