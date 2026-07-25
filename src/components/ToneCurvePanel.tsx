import React, { useState, useRef, useEffect } from 'react';
import { ToneCurveState, CurvePoint } from '../types/editor';

interface ToneCurvePanelProps {
  toneCurve: ToneCurveState;
  onChange: (state: ToneCurveState) => void;
}

type ChannelKey = 'master' | 'red' | 'green' | 'blue';

export const ToneCurvePanel: React.FC<ToneCurvePanelProps> = ({ toneCurve, onChange }) => {
  const [activeChannel, setActiveChannel] = useState<ChannelKey>('master');
  const [draggedPointIndex, setDraggedPointIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const points = toneCurve[activeChannel] || [{ x: 0, y: 0 }, { x: 255, y: 255 }];

  const handleChannelSelect = (ch: ChannelKey) => {
    setActiveChannel(ch);
  };

  const handlePointerDownPoint = (index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggedPointIndex(index);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggedPointIndex === null || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const nx = Math.max(0, Math.min(255, Math.round(((e.clientX - rect.left) / rect.width) * 255)));
    const ny = Math.max(0, Math.min(255, Math.round((1 - (e.clientY - rect.top) / rect.height) * 255)));

    const newPoints = [...points];

    // Constrain X ordering for internal points
    if (draggedPointIndex === 0) {
      newPoints[0] = { x: 0, y: ny };
    } else if (draggedPointIndex === points.length - 1) {
      newPoints[points.length - 1] = { x: 255, y: ny };
    } else {
      const prevX = points[draggedPointIndex - 1].x + 2;
      const nextX = points[draggedPointIndex + 1].x - 2;
      const clampedX = Math.max(prevX, Math.min(nextX, nx));
      newPoints[draggedPointIndex] = { x: clampedX, y: ny };
    }

    onChange({
      ...toneCurve,
      [activeChannel]: newPoints,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggedPointIndex(null);
  };

  // Add new point on double click or click empty line
  const handleSvgClick = (e: React.MouseEvent) => {
    if (draggedPointIndex !== null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = Math.max(0, Math.min(255, Math.round(((e.clientX - rect.left) / rect.width) * 255)));
    const cy = Math.max(0, Math.min(255, Math.round((1 - (e.clientY - rect.top) / rect.height) * 255)));

    // Check if clicking near existing point
    const near = points.some((p) => Math.hypot(p.x - cx, p.y - cy) < 15);
    if (near) return;

    const newPoints = [...points, { x: cx, y: cy }].sort((a, b) => a.x - b.x);
    onChange({
      ...toneCurve,
      [activeChannel]: newPoints,
    });
  };

  const handleResetChannel = () => {
    onChange({
      ...toneCurve,
      [activeChannel]: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    });
  };

  // Generate SVG path polyline string
  const sortedPoints = [...points].sort((a, b) => a.x - b.x);
  const pathD = sortedPoints
    .map((p, i) => {
      const px = (p.x / 255) * 200;
      const py = 200 - (p.y / 255) * 200;
      return `${i === 0 ? 'M' : 'L'} ${px},${py}`;
    })
    .join(' ');

  const getChannelColor = (ch: ChannelKey) => {
    switch (ch) {
      case 'red':
        return '#ef4444';
      case 'green':
        return '#22c55e';
      case 'blue':
        return '#3b82f6';
      default:
        return '#3b82f6';
    }
  };

  const strokeColor = getChannelColor(activeChannel);

  return (
    <div className="space-y-3">
      {/* Channel Toggles */}
      <div className="flex items-center justify-between">
        <div className="flex rounded bg-[#222222] p-0.5 border border-[#2a2a2a]">
          {(['master', 'red', 'green', 'blue'] as ChannelKey[]).map((ch) => (
            <button
              key={ch}
              onClick={() => handleChannelSelect(ch)}
              className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeChannel === ch
                  ? 'bg-[#181818] text-white shadow ring-1 ring-[#333]'
                  : 'text-neutral-400 hover:text-white'
              }`}
              style={{
                color: activeChannel === ch ? getChannelColor(ch) : undefined,
              }}
            >
              {ch}
            </button>
          ))}
        </div>

        <button
          onClick={handleResetChannel}
          className="text-[10px] font-mono text-neutral-500 hover:text-blue-400 transition-colors cursor-pointer"
        >
          Reset
        </button>
      </div>

      {/* Interactive SVG Curve Editor */}
      <div className="relative flex justify-center rounded bg-[#111111] p-2 border border-[#2a2a2a] shadow-inner">
        <svg
          ref={svgRef}
          viewBox="0 0 200 200"
          onClick={handleSvgClick}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="h-44 w-44 touch-none cursor-crosshair rounded bg-[#0a0a0a] border border-[#222] select-none"
        >
          {/* Grid lines */}
          <line x1="50" y1="0" x2="50" y2="200" stroke="#262626" strokeWidth="1" />
          <line x1="100" y1="0" x2="100" y2="200" stroke="#333333" strokeWidth="1" />
          <line x1="150" y1="0" x2="150" y2="200" stroke="#262626" strokeWidth="1" />
          <line x1="0" y1="50" x2="200" y2="50" stroke="#262626" strokeWidth="1" />
          <line x1="0" y1="100" x2="200" y2="100" stroke="#333333" strokeWidth="1" />
          <line x1="0" y1="150" x2="200" y2="150" stroke="#262626" strokeWidth="1" />

          {/* Reference Diagonal line */}
          <line x1="0" y1="200" x2="200" y2="0" stroke="#383838" strokeWidth="1" strokeDasharray="3 3" />

          {/* Curve Path */}
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" />

          {/* Control Points */}
          {sortedPoints.map((p, idx) => {
            const px = (p.x / 255) * 200;
            const py = 200 - (p.y / 255) * 200;
            const isDragging = draggedPointIndex === idx;

            return (
              <circle
                key={idx}
                cx={px}
                cy={py}
                r={isDragging ? 6 : 4.5}
                fill="#121212"
                stroke={strokeColor}
                strokeWidth={isDragging ? 3 : 2}
                onPointerDown={(e) => handlePointerDownPoint(idx, e)}
                className="cursor-pointer transition-all hover:scale-125"
              />
            );
          })}
        </svg>
      </div>

      <p className="text-center text-[10px] text-neutral-500 font-mono">
        Click curve to add control points. Drag points to adjust tonal response.
      </p>
    </div>
  );
};
