interface Props {
  month: number;
  year: number;
  onChangeMonth: (month: number, year: number) => void;
}

const MONTH_NAMES = [
  'Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6',
  'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12',
];

export default function MonthWeekSelector({ month, year, onChangeMonth }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChangeMonth(month, year - 1)}
        className="px-2 py-1 text-gray-400 hover:text-gray-700"
      >
        &#9664;
      </button>
      <span className="font-semibold text-lg mr-2">{year}</span>
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {MONTH_NAMES.map((name, i) => {
          const m = i + 1;
          const isActive = m === month;
          return (
            <button
              key={m}
              onClick={() => onChangeMonth(m, year)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onChangeMonth(month, year + 1)}
        className="px-2 py-1 text-gray-400 hover:text-gray-700"
      >
        &#9654;
      </button>
    </div>
  );
}
