import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { ColorWheelValue } from '../../types/editor';

interface ColorWheelProps {
  label: string;
  value: ColorWheelValue;
  onChange: (val: ColorWheelValue) => void;
}

export const ColorWheel: React.FC<ColorWheelProps> = ({ label, value, onChange }) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const radius = 45; // wheel radius in px

  // Calculate puck x, y from r and b values
  // r corresponds to 0 deg (right), b corresponds to 240 deg (bottom-left), g corresponds to 120 deg
  const puckX = value.r * radius * 0.8;
  const puckY = -value.b * radius * 0.8;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateFromPointer(e.clientX, e.clientY);
  };

  const updateFromPointer = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(radius, dist);
    const normDist = clampedDist / radius;

    const angle = Math.atan2(dy, dx);
    const normX = (clampedDist * Math.cos(angle)) / radius;
    const normY = -(clampedDist * Math.sin(angle)) / radius;

    // Map Cartesian offset to RGB adjustments
    const r = Math.max(-1, Math.min(1, normX * 0.8));
    const b = Math.max(-1, Math.min(1, normY * 0.8));
    const g = Math.max(-1, Math.min(1, -normX * 0.4 - normY * 0.4));

    onChange({
      ...value,
      r: parseFloat(r.toFixed(3)),
      g: parseFloat(g.toFixed(3)),
      b: parseFloat(b.toFixed(3)),
    });
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) updateFromPointer(e.clientX, e.clientY);
    };
    const handlePointerUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  const handleReset = () => {
    onChange({ r: 0, g: 0, b: 0, luma: 0 });
  };

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-[#121622] border border-[#1f2635] rounded-xl text-slate-300 select-none">
      <div className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-300 px-1">
        <span>{label}</span>
        <button
          onClick={handleReset}
          className="p-1 hover:text-cyan-400 text-slate-500 rounded"
          title={`Reset ${label}`}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Circular Color Wheel Canvas / SVG */}
      <div
        ref={wheelRef}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleReset}
        className="w-[100px] h-[100px] rounded-full relative cursor-crosshair border border-[#2b3547] shadow-inner overflow-hidden flex items-center justify-center"
        style={{
          background: `conic-gradient(from 90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)`,
        }}
      >
        {/* Desaturating center gradient overlay */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(18,22,34,0.92) 0%, rgba(18,22,34,0.4) 70%, transparent 100%)',
          }}
        />

        {/* Crosshairs */}
        <div className="absolute w-full h-[1px] bg-white/15 pointer-events-none" />
        <div className="absolute h-full w-[1px] bg-white/15 pointer-events-none" />

        {/* Draggable indicator puck */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform"
          style={{
            left: `calc(50% + ${puckX}px)`,
            top: `calc(50% + ${puckY}px)`,
            backgroundColor:
              value.r !== 0 || value.b !== 0
                ? `rgb(${Math.round(128 + value.r * 120)}, ${Math.round(128 + value.g * 120)}, ${Math.round(128 + value.b * 120)})`
                : '#00e5ff',
          }}
        />
      </div>

      {/* Luminance Slider */}
      <div className="w-full flex flex-col gap-0.5 mt-1 px-1">
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Luma</span>
          <span className="font-mono text-cyan-400">
            {value.luma > 0 ? `+${value.luma.toFixed(2)}` : value.luma.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={value.luma}
          onChange={(e) => onChange({ ...value, luma: parseFloat(e.target.value) })}
          className="w-full accent-cyan-400 h-1 bg-[#1a202c] rounded cursor-pointer"
        />
      </div>

      {/* RGB readout */}
      <div className="w-full grid grid-cols-3 gap-1 text-[9px] font-mono text-center text-slate-400 pt-0.5 border-t border-[#1a202c]">
        <span className="text-red-400">R:{value.r > 0 ? `+${value.r}` : value.r}</span>
        <span className="text-green-400">G:{value.g > 0 ? `+${value.g}` : value.g}</span>
        <span className="text-blue-400">B:{value.b > 0 ? `+${value.b}` : value.b}</span>
      </div>
    </div>
  );
};
