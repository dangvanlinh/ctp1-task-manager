import { useRef, useCallback } from 'react';

interface Props {
  left: number;
  width: number;
  color: string;
  roundedClass: string;
  height: number;
  top: number;
  label?: string;
  onResize: (newLeft: number, newWidth: number) => void;
  dayWidth: number;
}

export default function BuildPhaseBar({ left, width, color, roundedClass, height, top, label, onResize, dayWidth }: Props) {
  const dragging = useRef<{ side: 'left' | 'right'; startX: number; origLeft: number; origWidth: number } | null>(null);

  const handleMouseDown = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragging.current = { side, startX: e.clientX, origLeft: left, origWidth: width };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragging.current.startX;
      const snappedDx = Math.round(dx / dayWidth) * dayWidth;

      if (dragging.current.side === 'left') {
        const newLeft = dragging.current.origLeft + snappedDx;
        const newWidth = dragging.current.origWidth - snappedDx;
        if (newWidth >= dayWidth && newLeft >= 0) {
          onResize(newLeft, newWidth);
        }
      } else {
        const newWidth = dragging.current.origWidth + snappedDx;
        if (newWidth >= dayWidth) {
          onResize(dragging.current.origLeft, newWidth);
        }
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

  if (width <= 0) return null;

  return (
    <div
      className={`absolute ${color} ${roundedClass} opacity-70 flex items-center justify-center group/bar`}
      style={{ left, width, height, top }}
    >
      {label && <span className="text-[9px] text-white font-medium pointer-events-none select-none">{label}</span>}
      {/* Left handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 rounded-l"
        onMouseDown={(e) => handleMouseDown('left', e)}
      />
      {/* Right handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 rounded-r"
        onMouseDown={(e) => handleMouseDown('right', e)}
      />
    </div>
  );
}
