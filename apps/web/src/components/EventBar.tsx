import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  left: number;
  width: number;
  color: string;
  label: string;
  height: number;
  top: number;
  dayWidth: number;
  isPast?: boolean;
  onResize: (newStartDay: number, newEndDay: number) => void;
  onLabelChange: (newLabel: string) => void;
}

export default function EventBar({ left, width, color, label, height, top, dayWidth, isPast, onResize, onLabelChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragging = useRef<{ side: 'left' | 'right'; startX: number; origLeft: number; origWidth: number } | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => { setEditValue(label); }, [label]);

  const handleMouseDown = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragging.current = { side, startX: e.clientX, origLeft: left, origWidth: width };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragging.current.startX;
      const snappedDx = Math.round(dx / dayWidth) * dayWidth;

      let newLeft = dragging.current.origLeft;
      let newWidth = dragging.current.origWidth;

      if (dragging.current.side === 'left') {
        newLeft = dragging.current.origLeft + snappedDx;
        newWidth = dragging.current.origWidth - snappedDx;
      } else {
        newWidth = dragging.current.origWidth + snappedDx;
      }

      if (newWidth >= dayWidth && newLeft >= 0) {
        const newStartDay = Math.round(newLeft / dayWidth) + 1;
        const newEndDay = Math.round((newLeft + newWidth) / dayWidth);
        onResize(newStartDay, newEndDay);
      }
    };

    const handleMouseUp = () => {
      dragging.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [left, width, dayWidth, onResize]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
  };

  const handleFinishEdit = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) {
      onLabelChange(trimmed);
    } else {
      setEditValue(label);
    }
  };

  if (width <= 0) return null;

  return (
    <div
      className={`absolute ${isPast ? 'bg-gray-400' : color} rounded-sm ${isPast ? 'opacity-80' : 'opacity-80'} flex items-center justify-center cursor-default select-none`}
      style={{ left, width, height, top }}
      onDoubleClick={handleDoubleClick}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleFinishEdit();
            if (e.key === 'Escape') { setEditValue(label); setEditing(false); }
          }}
          onBlur={handleFinishEdit}
          className="w-full h-full bg-transparent text-[12px] text-black font-medium text-center outline-none px-0.5"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="text-[12px] text-black font-medium truncate px-1 pointer-events-none">{label}</span>
      )}
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 rounded-l"
        onMouseDown={(e) => handleMouseDown('left', e)}
      />
      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 rounded-r"
        onMouseDown={(e) => handleMouseDown('right', e)}
      />
    </div>
  );
}
