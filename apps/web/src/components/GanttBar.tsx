import { useRef, useState, useEffect } from 'react';

const STATUS_COLORS: Record<string, string> = {
  TODO: '#9CA3AF',
  IN_PROGRESS: '#3B82F6',
  DONE: '#22C55E',
};

const STATUS_COLORS_PAST: Record<string, string> = {
  TODO: '#D1D5DB',
  IN_PROGRESS: '#93C5FD',
  DONE: '#86EFAC',
};

interface Props {
  taskId: string;
  title: string;
  status: string;
  startDate: Date;
  endDate: Date;
  dayWidth: number;
  timelineStart: Date;
  isPast?: boolean;
  onDateChange: (taskId: string, startDate: Date, endDate: Date) => void;
}

function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export default function GanttBar({ taskId, title, status, startDate, endDate, dayWidth, timelineStart, isPast, onDateChange }: Props) {
  const dragStartX = useRef(0);
  const origStart = useRef(startDate);
  const origEnd = useRef(endDate);
  const [dragStart, setDragStart] = useState(startDate);
  const [dragEnd, setDragEnd] = useState(endDate);
  const [isDragging, setIsDragging] = useState(false);

  // Sync props when not dragging
  useEffect(() => {
    if (!isDragging) {
      setDragStart(startDate);
      setDragEnd(endDate);
    }
  }, [startDate, endDate, isDragging]);

  const displayStart = isDragging ? dragStart : startDate;
  const displayEnd = isDragging ? dragEnd : endDate;
  const left = diffDays(timelineStart, displayStart) * dayWidth;
  const width = Math.max((diffDays(displayStart, displayEnd) + 1) * dayWidth, dayWidth);

  const handleMouseDown = (type: 'move' | 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartX.current = e.clientX;
    origStart.current = startDate;
    origEnd.current = endDate;
    setIsDragging(true);

    let latestStart = startDate;
    let latestEnd = endDate;

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStartX.current;
      const daysDelta = Math.round(dx / dayWidth);

      let newStart = origStart.current;
      let newEnd = origEnd.current;

      if (type === 'move') {
        newStart = new Date(origStart.current.getTime() + daysDelta * 86400000);
        newEnd = new Date(origEnd.current.getTime() + daysDelta * 86400000);
      } else if (type === 'left') {
        newStart = new Date(origStart.current.getTime() + daysDelta * 86400000);
        if (newStart >= origEnd.current) return;
      } else if (type === 'right') {
        newEnd = new Date(origEnd.current.getTime() + daysDelta * 86400000);
        if (newEnd <= origStart.current) return;
      }

      latestStart = newStart;
      latestEnd = newEnd;
      setDragStart(newStart);
      setDragEnd(newEnd);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsDragging(false);
      // Only call API if dates actually changed
      if (latestStart.getTime() !== startDate.getTime() || latestEnd.getTime() !== endDate.getTime()) {
        onDateChange(taskId, latestStart, latestEnd);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className="absolute h-6 rounded flex items-center cursor-grab group"
      style={{
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: isPast ? (STATUS_COLORS_PAST[status] || '#D1D5DB') : (STATUS_COLORS[status] || '#9CA3AF'),
        opacity: isPast ? 0.7 : 1,
        top: '50%',
        transform: 'translateY(-50%)',
      }}
      onMouseDown={handleMouseDown('move')}
    >
      <div className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-l" onMouseDown={handleMouseDown('left')} />
      <span className="text-xs text-white px-2 truncate select-none pointer-events-none">{title}</span>
      <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-r" onMouseDown={handleMouseDown('right')} />
    </div>
  );
}
