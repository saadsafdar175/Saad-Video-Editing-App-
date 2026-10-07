import React, { useEffect, useRef, useState } from 'react';
import { Activity, X, BarChart3, LineChart, PieChart, Layers } from 'lucide-react';
import { ScopeEngine, ScopeType } from '../../engine/scopeEngine';

interface VideoScopesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentTime: number;
}

export const VideoScopesPanel: React.FC<VideoScopesPanelProps> = ({
  isOpen,
  onClose,
  sourceCanvasRef,
  currentTime,
}) => {
  const [activeScope, setActiveScope] = useState<ScopeType>('waveform');
  const scopeCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !scopeCanvasRef.current || !sourceCanvasRef.current) return;

    const sourceCanvas = sourceCanvasRef.current;
    const scopeCanvas = scopeCanvasRef.current;
    const scopeCtx = scopeCanvas.getContext('2d');
    if (!scopeCtx) return;

    const imgData = ScopeEngine.extractFrameData(sourceCanvas);
    if (!imgData) return;

    const w = scopeCanvas.width;
    const h = scopeCanvas.height;

    switch (activeScope) {
      case 'histogram':
        ScopeEngine.renderHistogram(scopeCtx, w, h, imgData);
        break;
      case 'waveform':
        ScopeEngine.renderWaveform(scopeCtx, w, h, imgData);
        break;
      case 'parade':
        ScopeEngine.renderRGBParade(scopeCtx, w, h, imgData);
        break;
      case 'vectorscope':
        ScopeEngine.renderVectorscope(scopeCtx, w, h, imgData);
        break;
    }
  }, [isOpen, activeScope, currentTime, sourceCanvasRef]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-12 right-84 z-40 w-80 bg-[#0e1118]/95 backdrop-blur-md border border-[#232a38] rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 select-none animate-fadeIn">
      {/* Header */}
      <div className="h-10 border-b border-[#1f2633] px-3 flex items-center justify-between bg-[#0a0d14]">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">Video Scopes Monitor</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#1a202c] text-slate-400 hover:text-white rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scope Switcher Tabs */}
      <div className="grid grid-cols-4 border-b border-[#1f2633] bg-[#0c0f16] text-[10px]">
        {[
          { id: 'waveform', label: 'Waveform' },
          { id: 'parade', label: 'Parade' },
          { id: 'vectorscope', label: 'Vector' },
          { id: 'histogram', label: 'Histo' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveScope(tab.id as ScopeType)}
            className={`py-1.5 font-semibold text-center transition-colors ${
              activeScope === tab.id
                ? 'bg-[#181e2b] text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scope Viewport Canvas */}
      <div className="p-2.5 flex items-center justify-center bg-[#07090e]">
        <canvas
          ref={scopeCanvasRef}
          width={280}
          height={180}
          className="rounded border border-[#1b222f] shadow-inner"
        />
      </div>

      <div className="px-3 py-1 bg-[#090b10] border-t border-[#18202d] text-[10px] text-slate-500 flex justify-between">
        <span>Real-time Video Analysis</span>
        <span className="text-cyan-400 font-mono">100% Offline</span>
      </div>
    </div>
  );
};
