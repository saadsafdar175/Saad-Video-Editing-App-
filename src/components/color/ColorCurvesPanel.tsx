import React, { useRef, useState } from 'react';
import { RotateCcw, TrendingUp } from 'lucide-react';
import { ColorCurves, CurvePoint } from '../../types/editor';

interface ColorCurvesPanelProps {
  curves: ColorCurves;
  onChange: (curves: ColorCurves) => void;
}

export const ColorCurvesPanel: React.FC<ColorCurvesPanelProps> = ({ curves, onChange }) => {
  const [activeChannel, setActiveChannel] = useState<'rgb' | 'red' | 'green' | 'blue'>('rgb');
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const currentPoints = curves[activeChannel] || [{ x: 0, y: 0 }, { x: 1, y: 1 }];

  const channelColors = {
    rgb: '#ffffff',
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6',
  };

  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingIdx(index);
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    // Check if clicked close to an existing point
    const threshold = 0.08;
    const existingIdx = currentPoints.findIndex(
      (p) => Math.hypot(p.x - x, p.y - y) < threshold
    );

    if (existingIdx !== -1) {
      setDraggingIdx(existingIdx);
      return;
    }

    // Add new control point
    const newPoints = [...currentPoints, { x, y }].sort((a, b) => a.x - b.x);
    onChange({
      ...curves,
      [activeChannel]: newPoints,
    });
    const newIdx = newPoints.findIndex((p) => p.x === x && p.y === y);
    setDraggingIdx(newIdx);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingIdx === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    let x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    // Keep endpoints at x=0 and x=1 if dragging first/last
    if (draggingIdx === 0) x = 0;
    if (draggingIdx === currentPoints.length - 1) x = 1;

    const updated = [...currentPoints];
    updated[draggingIdx] = { x: parseFloat(x.toFixed(3)), y: parseFloat(y.toFixed(3)) };

    // Maintain sorted order by x
    updated.sort((a, b) => a.x - b.x);
    const newIdx = updated.findIndex((p) => p.x === x && p.y === y);
    setDraggingIdx(newIdx);

    onChange({
      ...curves,
      [activeChannel]: updated,
    });
  };

  const handlePointerUp = () => {
    setDraggingIdx(null);
  };

  const handleDeletePoint = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (idx === 0 || idx === currentPoints.length - 1) return; // Don't delete endpoints
    const updated = currentPoints.filter((_, i) => i !== idx);
    onChange({
      ...curves,
      [activeChannel]: updated,
    });
  };

  const handleApplySCurve = () => {
    const sCurve: CurvePoint[] = [
      { x: 0, y: 0 },
      { x: 0.25, y: 0.18 },
      { x: 0.5, y: 0.5 },
      { x: 0.75, y: 0.82 },
      { x: 1, y: 1 },
    ];
    onChange({
      ...curves,
      [activeChannel]: sCurve,
    });
  };

  const handleResetCurve = () => {
    onChange({
      ...curves,
      [activeChannel]: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    });
  };

  // Generate SVG path string with smooth bezier curve
  const generatePath = () => {
    if (currentPoints.length === 0) return '';
    const w = 200;
    const h = 180;
    const pts = currentPoints.map((p) => ({ px: p.x * w, py: (1 - p.y) * h }));

    let d = `M ${pts[0].px} ${pts[0].py}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1.px + (p2.px - p0.px) / 6;
      const cp1y = p1.py + (p2.py - p0.py) / 6;
      const cp2x = p2.px - (p3.px - p1.px) / 6;
      const cp2y = p2.py - (p3.py - p1.py) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.px} ${p2.py}`;
    }
    return d;
  };

  return (
    <div className="flex flex-col gap-2.5 p-3 bg-[#11141e] border border-[#1f2635] rounded-xl text-slate-300 select-none">
      {/* Top Channel Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#0b0e15] p-0.5 rounded-lg border border-[#1b2230]">
          {(['rgb', 'red', 'green', 'blue'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setActiveChannel(ch)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded capitalize transition-colors ${
                activeChannel === ch
                  ? 'bg-[#1e2535] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={{
                color: activeChannel === ch ? channelColors[ch] : undefined,
              }}
            >
              {ch}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleApplySCurve}
            className="flex items-center gap-1 px-2 py-1 bg-[#181e2b] hover:bg-[#202737] border border-[#242c3c] rounded text-[10px] text-cyan-400 font-medium transition-colors"
            title="Apply Cinematic S-Curve"
          >
            <TrendingUp className="w-3 h-3" />
            <span>S-Curve</span>
          </button>
          <button
            onClick={handleResetCurve}
            className="p-1 hover:text-cyan-400 text-slate-500 rounded"
            title="Reset Curve"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Interactive SVG Curve Canvas */}
      <div className="w-full h-44 bg-[#080a0f] rounded-lg border border-[#1c2331] relative overflow-hidden flex items-center justify-center">
        <svg
          ref={svgRef}
          viewBox="0 0 200 180"
          className="w-full h-full cursor-crosshair"
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Grid lines (25%, 50%, 75%) */}
          {[0.25, 0.5, 0.75].map((val) => (
            <g key={val}>
              <line
                x1={val * 200}
                y1="0"
                x2={val * 200}
                y2="180"
                stroke="#18202c"
                strokeDasharray="2,2"
              />
              <line
                x1="0"
                y1={val * 180}
                x2="200"
                y2={val * 180}
                stroke="#18202c"
                strokeDasharray="2,2"
              />
            </g>
          ))}

          {/* Neutral diagonal identity line */}
          <line x1="0" y1="180" x2="200" y2="0" stroke="#1f2937" strokeWidth="1" />

          {/* Interpolated spline curve line */}
          <path
            d={generatePath()}
            fill="none"
            stroke={channelColors[activeChannel]}
            strokeWidth="2.5"
            className="transition-all duration-75"
          />

          {/* Control point pucks */}
          {currentPoints.map((pt, i) => {
            const cx = pt.x * 200;
            const cy = (1 - pt.y) * 180;
            const isEndpoint = i === 0 || i === currentPoints.length - 1;

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={draggingIdx === i ? 6 : 4.5}
                fill={channelColors[activeChannel]}
                stroke="#ffffff"
                strokeWidth="1.5"
                onPointerDown={(e) => handlePointerDown(i, e)}
                onDoubleClick={(e) => handleDeletePoint(i, e)}
                className="cursor-pointer hover:scale-125 transition-transform"
              />
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
        <span>Click to add control point</span>
        <span>Double click to remove point</span>
      </div>
    </div>
  );
};
