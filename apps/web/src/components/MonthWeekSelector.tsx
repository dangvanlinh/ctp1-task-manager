interface Props {
  month: number;
  year: number;
  onChangeMonth: (month: number, year: number) => void;
}

const MONTH_NAMES = [
  'Thang 1', 'Thang 2', 'Thang 3', 'Thang 4', 'Thang 5', 'Thang 6',
  'Thang 7', 'Thang 8', 'Thang 9', 'Thang 10', 'Thang 11', 'Thang 12',
];

export default function MonthWeekSelector({ month, year, onChangeMonth }: Props) {
  const prev = () => {
    if (month === 1) onChangeMonth(12, year - 1);
    else onChangeMonth(month - 1, year);
  };
  const next = () => {
    if (month === 12) onChangeMonth(1, year + 1);
    else onChangeMonth(month + 1, year);
  };

  return (
    <div className="flex items-center gap-4">
      <button onClick={prev} className="px-2 py-1 rounded hover:bg-gray-200">&#9664;</button>
      <span className="font-semibold text-lg">{MONTH_NAMES[month - 1]} {year}</span>
      <button onClick={next} className="px-2 py-1 rounded hover:bg-gray-200">&#9654;</button>
    </div>
  );
}
