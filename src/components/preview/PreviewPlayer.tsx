import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  RotateCw,
  Crop,
  Layers,
  Sparkles
} from 'lucide-react';
import { CanvasSettings, MediaItem, SubtitleItem, TimelineClip, TimelineTrack } from '../../types/editor';
import { renderFrame } from '../../engine/renderEngine';
import { formatTimecode } from '../../utils/helpers';
import { RESOLUTION_MAP } from '../../utils/constants';

interface PreviewPlayerProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  canvasSettings: CanvasSettings;
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  mediaList: MediaItem[];
  subtitles: SubtitleItem[];
  selectedClip: TimelineClip | null;
  previewQuality: 'full' | 'half' | 'quarter';
  colorComparisonMode?: 'after' | 'before' | 'split';
  splitPosition?: number;
  canvasRefExternal?: React.RefObject<HTMLCanvasElement | null>;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onStepFrame: (frames: number) => void;
  onChangePreviewQuality: (quality: 'full' | 'half' | 'quarter') => void;
  onUpdateClipTransform: (clipId: string, transformUpdate: Partial<TimelineClip['transform']>) => void;
  onSetComparisonMode?: (mode: 'after' | 'before' | 'split') => void;
  onToggleScopes?: () => void;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({
  currentTime,
  duration,
  isPlaying,
  canvasSettings,
  tracks,
  clips,
  mediaList,
  subtitles,
  selectedClip,
  previewQuality,
  colorComparisonMode = 'after',
  splitPosition = 0.5,
  canvasRefExternal,
  onTogglePlay,
  onSeek,
  onStepFrame,
  onChangePreviewQuality,
  onUpdateClipTransform,
  onSetComparisonMode,
  onToggleScopes,
}) => {
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = canvasRefExternal || localCanvasRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDraggingClip, setIsDraggingClip] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initPosX: number; initPosY: number }>({
    mouseX: 0,
    mouseY: 0,
    initPosX: 0,
    initPosY: 0,
  });

  // Calculate target internal canvas resolution based on aspect ratio
  const aspect = canvasSettings.aspectRatio;
  const resPreset = canvasSettings.resolution;
  const mapped = RESOLUTION_MAP[aspect]?.[resPreset] || { width: 1920, height: 1080 };

  const scaleDivisor = previewQuality === 'quarter' ? 4 : previewQuality === 'half' ? 2 : 1;
  const canvasW = Math.round(mapped.width / scaleDivisor);
  const canvasH = Math.round(mapped.height / scaleDivisor);

  // Render on time update or state change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mediaMap = new Map<string, MediaItem>();
    mediaList.forEach((m) => mediaMap.set(m.id, m));

    renderFrame(ctx, canvas.width, canvas.height, {
      currentTime,
      canvasSettings,
      tracks,
      clips,
      mediaMap,
      subtitles,
      previewQuality,
      colorComparisonMode,
      splitPosition,
    });
  }, [
    currentTime,
    canvasSettings,
    tracks,
    clips,
    mediaList,
    subtitles,
    previewQuality,
    colorComparisonMode,
    splitPosition,
  ]);

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Direct canvas drag-to-move for selected clip
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedClip || isPlaying) return;
    setIsDraggingClip(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initPosX: selectedClip.transform.positionX,
      initPosY: selectedClip.transform.positionY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingClip || !selectedClip || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    // Convert pixel delta to percentage offset (-100 to 100)
    const pctX = (dx / (rect.width / 2)) * 100;
    const pctY = (dy / (rect.height / 2)) * 100;

    onUpdateClipTransform(selectedClip.id, {
      positionX: Math.round(dragStartRef.current.initPosX + pctX),
      positionY: Math.round(dragStartRef.current.initPosY + pctY),
    });
  };

  const handleMouseUp = () => {
    setIsDraggingClip(false);
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#0b0d12] flex-1 min-w-0 select-none ${
        isFullscreen ? 'p-0 w-screen h-screen' : 'p-3'
      }`}
    >
      {/* Top Preview Status Bar */}
      <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-400 mb-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Preview</span>
          <span className="text-[10px] text-slate-500">
            {canvasSettings.aspectRatio} · {canvasSettings.resolution}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Quality dropdown */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-500">Quality:</span>
            <select
              value={previewQuality}
              onChange={(e) =>
                onChangePreviewQuality(e.target.value as 'full' | 'half' | 'quarter')
              }
              className="bg-[#151922] border border-[#232a38] rounded px-1.5 py-0.5 text-xs text-slate-300 outline-none cursor-pointer"
            >
              <option value="full">Full (100%)</option>
              <option value="half">1/2 (Fast)</option>
              <option value="quarter">1/4 (Proxy)</option>
            </select>
          </div>

          <button
            onClick={handleToggleFullscreen}
            className="p-1 hover:bg-[#1a202c] text-slate-400 hover:text-white rounded transition-colors"
            title="Fullscreen Preview"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Video Viewport Canvas Container */}
      <div className="flex-1 min-h-0 bg-[#07080b] rounded-lg border border-[#1b212c] overflow-hidden flex items-center justify-center relative shadow-inner">
        {/* Canvas displaying rendered frame */}
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`max-w-full max-h-full object-contain cursor-${
            selectedClip ? 'move' : 'default'
          } shadow-2xl`}
          style={{
            aspectRatio: `${mapped.width} / ${mapped.height}`,
          }}
        />

        {/* Selected Clip Direct Transform Hint Overlay */}
        {selectedClip && !isPlaying && (
          <div className="absolute top-3 left-3 bg-[#11141c]/90 border border-cyan-500/50 rounded px-2.5 py-1 text-[11px] text-cyan-400 pointer-events-none flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>
              Selected: <strong className="text-white">{selectedClip.name}</strong> (Drag canvas to reposition)
            </span>
          </div>
        )}
      </div>

      {/* Transport Controls Bar */}
      <div className="h-11 bg-[#10131a] rounded-lg border border-[#1c222e] mt-2 px-3 flex items-center justify-between">
        {/* Timecode readout: Current / Total */}
        <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-slate-300">
          <span className="text-cyan-400 font-semibold">{formatTimecode(currentTime)}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-500">{formatTimecode(duration)}</span>
        </div>

        {/* Center Playback Buttons */}
        <div className="flex items-center gap-2">
          {/* Previous Frame (-1 frame) */}
          <button
            onClick={() => onStepFrame(-1)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1a202c] rounded transition-colors"
            title="Previous Frame (Left Arrow)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={onTogglePlay}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20'
            }`}
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Next Frame (+1 frame) */}
          <button
            onClick={() => onStepFrame(1)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1a202c] rounded transition-colors"
            title="Next Frame (Right Arrow)"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Fast shortcut helpers */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>Space = Play</span>
          <span>·</span>
          <span>S = Split</span>
        </div>
      </div>
    </div>
  );
};
